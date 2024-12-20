-- Migration: 000002_add_detection_tables.down.sql
-- Description: Removes all detection-related tables, enums, and triggers
-- with proper transaction safety and dependency ordering

BEGIN;

-- Drop trigger first to avoid conflicts during table drops
DROP TRIGGER IF EXISTS update_detection_timestamp ON detections;

-- Drop tables in reverse dependency order with cascading deletes
-- to ensure proper cleanup of foreign key relationships

-- Drop junction/child tables first
DROP TABLE IF EXISTS detection_tags CASCADE;
DROP TABLE IF EXISTS detection_validations CASCADE;
DROP TABLE IF EXISTS detection_versions CASCADE;

-- Drop main detections table after dependent tables
DROP TABLE IF EXISTS detections CASCADE;

-- Drop enum types last since they may be referenced by dropped tables
DROP TYPE IF EXISTS detection_visibility CASCADE;
DROP TYPE IF EXISTS platform_type CASCADE;

COMMIT;