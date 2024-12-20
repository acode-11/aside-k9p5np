-- Begin transaction for atomic execution of all cleanup operations
BEGIN;

-- Drop triggers first to prevent any updates during cleanup
DROP TRIGGER IF EXISTS update_discussion_timestamp ON discussions;
DROP TRIGGER IF EXISTS update_discussion_timestamp ON discussion_replies;

-- Drop tables in reverse order of their dependencies
-- Start with community_contributions which depends on other tables
DROP TABLE IF EXISTS community_contributions CASCADE;

-- Drop discussion_replies which depends on discussions
DROP TABLE IF EXISTS discussion_replies CASCADE;

-- Drop discussions table
DROP TABLE IF EXISTS discussions CASCADE;

-- Finally drop the enum type used by community_contributions
DROP TYPE IF EXISTS contribution_type CASCADE;

-- Commit the transaction if all operations succeed
COMMIT;