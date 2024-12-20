-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for detection-related statuses
CREATE TYPE detection_platform_type AS ENUM (
    'siem',
    'edr',
    'nsm',
    'universal'
);

CREATE TYPE validation_status AS ENUM (
    'pending',
    'valid',
    'invalid',
    'warning'
);

CREATE TYPE performance_impact AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- Create detections table with enhanced quality metrics
CREATE TABLE detections (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(256) NOT NULL,
    description text,
    content text NOT NULL,
    platform_type detection_platform_type NOT NULL,
    version varchar(50) NOT NULL,
    owner_id uuid NOT NULL REFERENCES users(id),
    organization_id uuid REFERENCES organizations(id),
    quality_score decimal(5,2) NOT NULL DEFAULT 0.00,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    translation_accuracy decimal(5,2) NOT NULL DEFAULT 0.00,
    performance_impact_score decimal(5,2) NOT NULL DEFAULT 0.00,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_quality_score CHECK (quality_score >= 0.00 AND quality_score <= 100.00),
    CONSTRAINT valid_translation_accuracy CHECK (translation_accuracy >= 0.00 AND translation_accuracy <= 100.00),
    CONSTRAINT valid_performance_score CHECK (performance_impact_score >= 0.00 AND performance_impact_score <= 100.00)
);

-- Create detection versions table with quality impact tracking
CREATE TABLE detection_versions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    detection_id uuid NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
    content text NOT NULL,
    changes text,
    author_id uuid NOT NULL REFERENCES users(id),
    quality_delta decimal(5,2) NOT NULL DEFAULT 0.00,
    version_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create validation results table with comprehensive metrics
CREATE TABLE validation_results (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    detection_id uuid NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
    platform_type detection_platform_type NOT NULL,
    issues jsonb NOT NULL DEFAULT '[]'::jsonb,
    performance_impact performance_impact NOT NULL,
    false_positive_rate decimal(5,2) NOT NULL DEFAULT 0.00,
    translation_accuracy decimal(5,2) NOT NULL DEFAULT 0.00,
    validation_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    validated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_false_positive_rate CHECK (false_positive_rate >= 0.00 AND false_positive_rate <= 100.00),
    CONSTRAINT valid_validation_accuracy CHECK (translation_accuracy >= 0.00 AND translation_accuracy <= 100.00)
);

-- Create detection tags table with enhanced categorization
CREATE TABLE detection_tags (
    detection_id uuid NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
    tag varchar(100) NOT NULL,
    tag_type varchar(50) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (detection_id, tag)
);

-- Create indexes for optimized querying
CREATE INDEX idx_detections_owner ON detections(owner_id);
CREATE INDEX idx_detections_organization ON detections(organization_id);
CREATE INDEX idx_detections_platform ON detections(platform_type);
CREATE INDEX idx_detections_quality ON detections(quality_score DESC);
CREATE INDEX idx_detection_versions_detection ON detection_versions(detection_id);
CREATE INDEX idx_validation_results_detection ON validation_results(detection_id);
CREATE INDEX idx_detection_tags_tag ON detection_tags(tag);
CREATE INDEX idx_detections_search ON detections USING gin (to_tsvector('english', name || ' ' || description));

-- Add trigger for detections updated_at maintenance
CREATE TRIGGER update_detections_updated_at
    BEFORE UPDATE ON detections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE detections IS 'Core table for storing security detection content with enhanced quality metrics';
COMMENT ON TABLE detection_versions IS 'Version history tracking with quality impact assessment';
COMMENT ON TABLE validation_results IS 'Comprehensive validation results with quality metrics';
COMMENT ON TABLE detection_tags IS 'Enhanced detection categorization system';