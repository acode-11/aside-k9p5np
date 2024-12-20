// Package main provides the entry point for the Detection Service with comprehensive
// monitoring, high availability, and performance optimizations.
package main

import (
    "context"
    "fmt"
    "net"
    "net/http"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"

    "go.uber.org/zap" // v1.26.0
    "google.golang.org/grpc" // v1.59
    "google.golang.org/grpc/health/grpc_health_v1" // v1.59
    "google.golang.org/grpc/keepalive" // v1.59
    "github.com/prometheus/client_golang/prometheus" // v1.17.0
    "github.com/prometheus/client_golang/prometheus/promhttp" // v1.17.0
    "go.mongodb.org/mongo-driver/mongo" // v1.12.1

    "github.com/org/detection-platform/internal/config"
    "github.com/org/detection-platform/internal/handlers"
    "github.com/org/detection-platform/internal/services"
    "github.com/org/detection-platform/internal/repository"
    "github.com/org/detection-platform/internal/validation"
)

// Global variables for service components
var (
    logger  *zap.Logger
    metrics *prometheus.Registry
    version = "1.0.0"
)

// Prometheus metrics
var (
    requestCounter = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "detection_service_requests_total",
            Help: "Total number of gRPC requests processed",
        },
        []string{"method", "status"},
    )

    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "detection_service_request_duration_seconds",
            Help:    "Request duration in seconds",
            Buckets: []float64{0.1, 0.5, 1, 2, 5},
        },
        []string{"method"},
    )

    qualityScoreGauge = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "detection_service_quality_score",
            Help: "Detection quality score",
        },
        []string{"detection_id"},
    )
)

func main() {
    // Initialize context with cancellation
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Initialize logger
    var err error
    logger, err = initLogger()
    if err != nil {
        fmt.Printf("Failed to initialize logger: %v\n", err)
        os.Exit(1)
    }
    defer logger.Sync()

    // Load configuration
    cfg, err := config.LoadConfig()
    if err != nil {
        logger.Fatal("Failed to load configuration", zap.Error(err))
    }

    // Initialize metrics registry
    metrics = prometheus.NewRegistry()
    metrics.MustRegister(requestCounter, requestDuration, qualityScoreGauge)

    // Initialize MongoDB repository with optimized connection pooling
    repo, err := initRepository(ctx, cfg)
    if err != nil {
        logger.Fatal("Failed to initialize repository", zap.Error(err))
    }
    defer repo.Close(ctx)

    // Initialize validation service
    validator := validation.NewValidator(cfg)

    // Initialize detection service with resilience patterns
    detectionService := services.NewDetectionService(
        repo,
        validation.NewQualityScorer(cfg),
        validator,
    )

    // Initialize gRPC server with performance optimizations
    grpcServer := initGRPCServer(cfg)

    // Initialize detection handler with middleware
    detectionHandler := handlers.NewDetectionHandler(
        detectionService,
        &config.HandlerConfig{
            MaxPageSize: 100,
            Timeout:    30 * time.Second,
        },
    )

    // Start metrics server
    go startMetricsServer(cfg.MetricsPort)

    // Start gRPC server
    go startGRPCServer(ctx, grpcServer, cfg, detectionHandler)

    // Handle graceful shutdown
    handleShutdown(ctx, cancel, grpcServer, repo)

    logger.Info("Detection Service started successfully",
        zap.String("version", version),
        zap.String("environment", cfg.Environment),
    )

    // Wait for shutdown signal
    <-ctx.Done()
}

func initLogger() (*zap.Logger, error) {
    config := zap.NewProductionConfig()
    config.OutputPaths = []string{"stdout"}
    config.ErrorOutputPaths = []string{"stderr"}
    config.EncoderConfig.TimeKey = "timestamp"
    config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

    return config.Build(
        zap.AddCaller(),
        zap.AddStacktrace(zap.ErrorLevel),
    )
}

func initRepository(ctx context.Context, cfg *config.Config) (*repository.MongoRepository, error) {
    repo, err := repository.NewMongoRepository(cfg)
    if err != nil {
        return nil, fmt.Errorf("failed to create repository: %w", err)
    }

    // Verify repository connection
    if err := repo.Ping(ctx); err != nil {
        return nil, fmt.Errorf("failed to ping repository: %w", err)
    }

    return repo, nil
}

func initGRPCServer(cfg *config.Config) *grpc.Server {
    // Configure gRPC server options for high performance
    opts := []grpc.ServerOption{
        grpc.KeepaliveParams(keepalive.ServerParameters{
            MaxConnectionIdle:     15 * time.Minute,
            MaxConnectionAge:      30 * time.Minute,
            MaxConnectionAgeGrace: 5 * time.Second,
            Time:                  5 * time.Second,
            Timeout:              1 * time.Second,
        }),
        grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
            MinTime:             5 * time.Second,
            PermitWithoutStream: true,
        }),
        grpc.MaxConcurrentStreams(uint32(cfg.GRPCMaxStreams)),
        grpc.ChainUnaryInterceptor(
            metricsInterceptor,
            loggingInterceptor,
            recoveryInterceptor,
        ),
    }

    return grpc.NewServer(opts...)
}

func startMetricsServer(port int) {
    mux := http.NewServeMux()
    mux.Handle("/metrics", promhttp.HandlerFor(metrics, promhttp.HandlerOpts{}))
    
    server := &http.Server{
        Addr:         fmt.Sprintf(":%d", port),
        Handler:      mux,
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 5 * time.Second,
    }

    if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        logger.Error("Metrics server failed", zap.Error(err))
    }
}

func startGRPCServer(ctx context.Context, server *grpc.Server, cfg *config.Config, handler *handlers.DetectionHandler) {
    // Register health check service
    grpc_health_v1.RegisterHealthServer(server, health.NewServer())

    // Register detection service
    detection.RegisterDetectionServiceServer(server, handler)

    // Start gRPC server
    lis, err := net.Listen("tcp", cfg.GetGRPCAddress())
    if err != nil {
        logger.Fatal("Failed to listen", zap.Error(err))
    }

    logger.Info("Starting gRPC server", zap.String("address", cfg.GetGRPCAddress()))
    if err := server.Serve(lis); err != nil {
        logger.Fatal("Failed to serve", zap.Error(err))
    }
}

func handleShutdown(ctx context.Context, cancel context.CancelFunc, server *grpc.Server, repo *repository.MongoRepository) {
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        sig := <-sigChan
        logger.Info("Received shutdown signal", zap.String("signal", sig.String()))

        // Cancel context to notify all operations
        cancel()

        // Graceful shutdown with timeout
        shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer shutdownCancel()

        var wg sync.WaitGroup
        wg.Add(2)

        // Gracefully stop gRPC server
        go func() {
            defer wg.Done()
            server.GracefulStop()
        }()

        // Close repository connection
        go func() {
            defer wg.Done()
            if err := repo.Close(shutdownCtx); err != nil {
                logger.Error("Error closing repository", zap.Error(err))
            }
        }()

        // Wait for all cleanup operations with timeout
        done := make(chan struct{})
        go func() {
            wg.Wait()
            close(done)
        }()

        select {
        case <-shutdownCtx.Done():
            logger.Warn("Shutdown timed out")
        case <-done:
            logger.Info("Graceful shutdown completed")
        }
    }()
}