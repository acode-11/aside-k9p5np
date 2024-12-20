// Package repository implements MongoDB persistence layer for the Detection Service
// with enhanced transaction support and performance optimizations.
package repository

import (
    "context"
    "errors"
    "fmt"
    "time"

    "go.mongodb.org/mongo-driver/mongo" // v1.12.1
    "go.mongodb.org/mongo-driver/mongo/options" // v1.12.1
    "go.mongodb.org/mongo-driver/mongo/readpref" // v1.12.1
    "go.mongodb.org/mongo-driver/bson" // v1.12.1
    "go.mongodb.org/mongo-driver/bson/primitive" // v1.12.1

    "github.com/org/detection-platform/internal/models"
    "github.com/org/detection-platform/internal/config"
)

const (
    // Collection names
    detectionsCollection = "detections"
    versionsCollection  = "detection_versions"
    validationCollection = "validation_results"

    // Operation timeouts
    defaultTimeout = 30 * time.Second
    bulkTimeout = 60 * time.Second
    queryTimeout = 15 * time.Second
)

// MongoRepository implements MongoDB persistence with transaction support
type MongoRepository struct {
    client          *mongo.Client
    db              *mongo.Database
    detections      *mongo.Collection
    versions        *mongo.Collection
    validations     *mongo.Collection
    defaultTimeout  time.Duration
}

// NewMongoRepository creates a new MongoDB repository instance with enhanced connection pooling
func NewMongoRepository(cfg *config.Config) (*MongoRepository, error) {
    ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
    defer cancel()

    // Configure MongoDB client options with connection pooling
    clientOpts := options.Client().
        ApplyURI(cfg.MongoURI).
        SetMaxPoolSize(uint64(cfg.MongoPoolSize)).
        SetMinPoolSize(uint64(cfg.MongoPoolSize/4)).
        SetMaxConnecting(uint64(cfg.MongoPoolSize/2)).
        SetRetryWrites(true).
        SetRetryReads(true)

    if cfg.MongoTLSEnabled {
        clientOpts.SetTLS(&options.TLS{})
    }

    // Connect to MongoDB with timeout
    client, err := mongo.Connect(ctx, clientOpts)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
    }

    // Verify connection
    if err := client.Ping(ctx, readpref.Primary()); err != nil {
        return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
    }

    // Initialize database and collections
    db := client.Database(cfg.MongoDatabase)
    repo := &MongoRepository{
        client:         client,
        db:            db,
        detections:    db.Collection(detectionsCollection),
        versions:      db.Collection(versionsCollection),
        validations:   db.Collection(validationCollection),
        defaultTimeout: cfg.MongoTimeout,
    }

    // Initialize indexes in background
    go repo.ensureIndexes(context.Background())

    return repo, nil
}

// CreateDetection creates a new detection with transactional support
func (r *MongoRepository) CreateDetection(ctx context.Context, detection *models.Detection) (primitive.ObjectID, error) {
    ctx, cancel := context.WithTimeout(ctx, r.defaultTimeout)
    defer cancel()

    // Start transaction
    session, err := r.client.StartSession()
    if err != nil {
        return primitive.NilObjectID, fmt.Errorf("failed to start transaction: %w", err)
    }
    defer session.EndSession(ctx)

    // Execute transaction
    var detectionID primitive.ObjectID
    err = mongo.WithSession(ctx, session, func(sc mongo.SessionContext) error {
        if err := session.StartTransaction(); err != nil {
            return fmt.Errorf("failed to start transaction: %w", err)
        }

        // Set creation timestamp
        now := time.Now()
        detection.CreatedAt = now
        detection.UpdatedAt = now

        // Insert detection document
        result, err := r.detections.InsertOne(sc, detection)
        if err != nil {
            return fmt.Errorf("failed to insert detection: %w", err)
        }

        detectionID = result.InsertedID.(primitive.ObjectID)
        detection.ID = detectionID

        // Create initial version
        version := &models.DetectionVersion{
            DetectionID: detectionID,
            Content:    detection.Content,
            Author:     detection.Owner,
            CreatedAt:  now,
        }

        if _, err := r.versions.InsertOne(sc, version); err != nil {
            return fmt.Errorf("failed to insert initial version: %w", err)
        }

        return session.CommitTransaction(sc)
    })

    if err != nil {
        if abortErr := session.AbortTransaction(ctx); abortErr != nil {
            return primitive.NilObjectID, fmt.Errorf("failed to abort transaction: %v (original error: %w)", abortErr, err)
        }
        return primitive.NilObjectID, err
    }

    return detectionID, nil
}

// ListDetections lists detections with cursor-based pagination
func (r *MongoRepository) ListDetections(ctx context.Context, opts ListOptions) ([]*models.Detection, error) {
    ctx, cancel := context.WithTimeout(ctx, queryTimeout)
    defer cancel()

    // Build query filters
    filter := bson.M{}
    if opts.PlatformType != "" {
        filter["platform_type"] = opts.PlatformType
    }
    if len(opts.Tags) > 0 {
        filter["tags"] = bson.M{"$all": opts.Tags}
    }

    // Configure find options with pagination
    findOpts := options.Find().
        SetLimit(int64(opts.PageSize)).
        SetSort(bson.D{{Key: "created_at", Value: -1}})

    if opts.LastID != primitive.NilObjectID {
        filter["_id"] = bson.M{"$lt": opts.LastID}
    }

    // Execute find with read preference
    cursor, err := r.detections.Find(ctx, filter, findOpts.SetReadPreference(readpref.SecondaryPreferred()))
    if err != nil {
        return nil, fmt.Errorf("failed to execute find: %w", err)
    }
    defer cursor.Close(ctx)

    var detections []*models.Detection
    if err := cursor.All(ctx, &detections); err != nil {
        return nil, fmt.Errorf("failed to decode detections: %w", err)
    }

    return detections, nil
}

// ListOptions defines pagination and filtering options
type ListOptions struct {
    PageSize     int32
    LastID       primitive.ObjectID
    PlatformType models.PlatformType
    Tags         []string
}

// ensureIndexes creates required indexes in background
func (r *MongoRepository) ensureIndexes(ctx context.Context) error {
    // Detections collection indexes
    detectionIndexes := []mongo.IndexModel{
        {
            Keys: bson.D{
                {Key: "platform_type", Value: 1},
                {Key: "created_at", Value: -1},
            },
            Options: options.Index().SetBackground(true),
        },
        {
            Keys: bson.D{
                {Key: "tags", Value: 1},
                {Key: "created_at", Value: -1},
            },
            Options: options.Index().SetBackground(true),
        },
        {
            Keys: bson.D{{Key: "quality_score", Value: -1}},
            Options: options.Index().SetBackground(true),
        },
    }

    // Versions collection indexes
    versionIndexes := []mongo.IndexModel{
        {
            Keys: bson.D{
                {Key: "detection_id", Value: 1},
                {Key: "created_at", Value: -1},
            },
            Options: options.Index().SetBackground(true),
        },
    }

    // Validation results TTL index
    validationIndexes := []mongo.IndexModel{
        {
            Keys: bson.D{{Key: "validated_at", Value: 1}},
            Options: options.Index().
                SetBackground(true).
                SetExpireAfterSeconds(86400), // 24 hours TTL
        },
    }

    // Create indexes in background
    for _, idx := range detectionIndexes {
        if _, err := r.detections.Indexes().CreateOne(ctx, idx); err != nil {
            return fmt.Errorf("failed to create detection index: %w", err)
        }
    }

    for _, idx := range versionIndexes {
        if _, err := r.versions.Indexes().CreateOne(ctx, idx); err != nil {
            return fmt.Errorf("failed to create version index: %w", err)
        }
    }

    for _, idx := range validationIndexes {
        if _, err := r.validations.Indexes().CreateOne(ctx, idx); err != nil {
            return fmt.Errorf("failed to create validation index: %w", err)
        }
    }

    return nil
}

// Close cleanly closes the MongoDB connection
func (r *MongoRepository) Close(ctx context.Context) error {
    return r.client.Disconnect(ctx)
}