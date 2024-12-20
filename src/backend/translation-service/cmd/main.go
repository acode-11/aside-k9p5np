// Package main provides the entry point for the Translation Service with enhanced monitoring
package main

import (
    "context"
    "fmt"
    "log"
    "net"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "go.uber.org/zap" // v1.26.0
    "google.golang.org/grpc" // v1.59.0
    "github.com/prometheus/client_golang/prometheus" // v1.17.0
    "github.com/prometheus/client_golang/prometheus/promhttp" // v1.17.0
    "github.com/sony/gobreaker" // v1.0.0

    "github.com/org/detection-platform/internal/config"
    "github.com/org/detection-platform/internal/services/translator"
    "github.com/org/detection-platform/internal/handlers"
    pb "github.com/org/detection-platform/proto/translation"
)

// Global variables for service components
var (
    logger *zap.Logger
    metrics *prometheus.Registry
    circuitBreaker *gobreaker.CircuitBreaker
)

// Prometheus metrics
var (
    translationLatency = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "translation_latency_seconds",
            Help: "Translation operation latency distribution",
            Buckets: prometheus.ExponentialBuckets(0.01, 2, 10),
        },
        []string{"source_platform", "target_platform"},
    )

    translationErrors = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "translation_errors_total",
            Help: "Total number of translation errors",
        },
        []string{"source_platform", "target_platform", "error_type"},
    )

    qualityMetrics = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "translation_quality_score",
            Help: "Translation quality metrics",
        },
        []string{"platform", "metric_type"},
    )
)

func main() {
    // Initialize context with cancellation
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Initialize logger
    if err := initLogger(); err != nil {
        log.Fatalf("Failed to initialize logger: %v", err)
    }
    defer logger.Sync()

    // Load configuration
    cfg, err := config.LoadConfig("")
    if err != nil {
        logger.Fatal("Failed to load configuration", zap.Error(err))
    }

    // Initialize metrics
    if err := setupMetrics(cfg); err != nil {
        logger.Fatal("Failed to setup metrics", zap.Error(err))
    }

    // Initialize circuit breaker
    circuitBreaker = gobreaker.NewCircuitBreaker(gobreaker.Settings{
        Name:        "translation-service",
        MaxRequests: 100,
        Interval:    10 * time.Second,
        Timeout:     30 * time.Second,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests >= 10 && failureRatio >= 0.6
        },
    })

    // Initialize translation service
    translationService := translator.NewTranslationService(ctx)

    // Create gRPC server with interceptors
    grpcServer := grpc.NewServer(
        grpc.UnaryInterceptor(metricsInterceptor),
        grpc.MaxRecvMsgSize(4 * 1024 * 1024), // 4MB
        grpc.MaxSendMsgSize(4 * 1024 * 1024), // 4MB
    )

    // Register translation service handler
    translationHandler := handlers.NewTranslationHandler(translationService, 10)
    pb.RegisterTranslationServiceServer(grpcServer, translationHandler)

    // Start metrics server
    go func() {
        metricsServer := &http.Server{
            Addr:    fmt.Sprintf(":%d", cfg.Metrics.Port),
            Handler: promhttp.Handler(),
        }
        if err := metricsServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            logger.Error("Metrics server failed", zap.Error(err))
        }
    }()

    // Start gRPC server
    listener, err := net.Listen("tcp", cfg.GRPCPort)
    if err != nil {
        logger.Fatal("Failed to start gRPC server", zap.Error(err))
    }

    logger.Info("Starting Translation Service",
        zap.String("port", cfg.GRPCPort),
        zap.String("version", "1.0.0"),
    )

    // Handle graceful shutdown
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        sig := <-sigChan
        logger.Info("Received shutdown signal", zap.String("signal", sig.String()))
        
        // Initiate graceful shutdown
        grpcServer.GracefulStop()
        cancel()
    }()

    // Start serving requests
    if err := grpcServer.Serve(listener); err != nil {
        logger.Fatal("Failed to serve", zap.Error(err))
    }
}

// initLogger initializes the global logger instance
func initLogger() error {
    config := zap.NewProductionConfig()
    config.OutputPaths = []string{"stdout"}
    config.ErrorOutputPaths = []string{"stderr"}
    
    var err error
    logger, err = config.Build(
        zap.AddCaller(),
        zap.AddStacktrace(zap.ErrorLevel),
    )
    if err != nil {
        return fmt.Errorf("failed to initialize logger: %w", err)
    }

    return nil
}

// setupMetrics initializes and configures the metrics collection
func setupMetrics(cfg *config.Config) error {
    metrics = prometheus.NewRegistry()

    // Register custom metrics
    metrics.MustRegister(translationLatency)
    metrics.MustRegister(translationErrors)
    metrics.MustRegister(qualityMetrics)

    // Register default Go metrics
    metrics.MustRegister(prometheus.NewGoCollector())
    metrics.MustRegister(prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}))

    return nil
}

// metricsInterceptor adds metrics collection to gRPC calls
func metricsInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    startTime := time.Now()
    
    // Execute the handler
    resp, err := handler(ctx, req)
    
    // Record metrics
    duration := time.Since(startTime).Seconds()
    
    if translationReq, ok := req.(*pb.TranslationRequest); ok {
        translationLatency.WithLabelValues(
            translationReq.SourcePlatform.String(),
            translationReq.TargetPlatform.String(),
        ).Observe(duration)

        if err != nil {
            translationErrors.WithLabelValues(
                translationReq.SourcePlatform.String(),
                translationReq.TargetPlatform.String(),
                "handler_error",
            ).Inc()
        }
    }

    return resp, err
}