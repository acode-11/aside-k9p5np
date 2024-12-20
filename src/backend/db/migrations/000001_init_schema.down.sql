-- Begin transaction for atomic schema cleanup
BEGIN;

-- Verify we're not in production before proceeding
DO $$
BEGIN
    IF current_database() = 'production' THEN
        RAISE EXCEPTION 'Cannot run down migration in production environment';
    END IF;
END
$$;

-- Drop tables in correct dependency order with cascade
-- 1. First drop junction/child tables
DROP TABLE IF EXISTS community_members CASCADE;

-- 2. Drop main entity tables in dependency order
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 3. Drop custom enum types after dependent tables are removed
DROP TYPE IF EXISTS community_visibility;
DROP TYPE IF EXISTS user_role;

-- 4. Finally drop extensions after all dependent objects
DROP EXTENSION IF EXISTS "uuid-ossp";

-- Commit transaction if all steps successful
COMMIT;