-- Create enum types for discussion and contribution tracking
CREATE TYPE discussion_status AS ENUM (
    'open',
    'closed',
    'archived'
);

CREATE TYPE contribution_type AS ENUM (
    'detection',
    'comment',
    'review'
);

-- Create discussions table for community threads
CREATE TABLE discussions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id uuid NOT NULL REFERENCES communities(id),
    title varchar(255) NOT NULL,
    content text NOT NULL,
    author_id uuid NOT NULL REFERENCES users(id),
    status discussion_status NOT NULL DEFAULT 'open',
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for discussions
CREATE INDEX idx_discussions_community ON discussions(community_id);
CREATE INDEX idx_discussions_author ON discussions(author_id);
CREATE INDEX idx_discussions_status ON discussions(status);
CREATE INDEX idx_discussions_search ON discussions USING gin (to_tsvector('english', title || ' ' || content));

-- Create hierarchical comments table
CREATE TABLE discussion_comments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id uuid NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    content text NOT NULL,
    author_id uuid NOT NULL REFERENCES users(id),
    parent_id uuid REFERENCES discussion_comments(id),
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for comments
CREATE INDEX idx_comments_discussion ON discussion_comments(discussion_id);
CREATE INDEX idx_comments_author ON discussion_comments(author_id);
CREATE INDEX idx_comments_parent ON discussion_comments(parent_id);
CREATE INDEX idx_comments_search ON discussion_comments USING gin (to_tsvector('english', content));

-- Create discussion references for linking discussions to detections
CREATE TABLE discussion_references (
    discussion_id uuid NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    detection_id uuid NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
    PRIMARY KEY (discussion_id, detection_id)
);

-- Create index for detection references
CREATE INDEX idx_discussion_refs_detection ON discussion_references(detection_id);

-- Create community contributions tracking table
CREATE TABLE community_contributions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id uuid NOT NULL REFERENCES communities(id),
    user_id uuid NOT NULL REFERENCES users(id),
    type contribution_type NOT NULL,
    reference_id uuid NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for contributions
CREATE INDEX idx_contributions_community ON community_contributions(community_id);
CREATE INDEX idx_contributions_user ON community_contributions(user_id);
CREATE INDEX idx_contributions_type ON community_contributions(type);
CREATE INDEX idx_contributions_reference ON community_contributions(reference_id);
CREATE INDEX idx_contributions_metadata ON community_contributions USING gin (metadata);

-- Add triggers for updated_at timestamp maintenance
CREATE TRIGGER update_discussions_updated_at
    BEFORE UPDATE ON discussions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON discussion_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE discussions IS 'Community discussion threads with lifecycle management';
COMMENT ON TABLE discussion_comments IS 'Hierarchical discussion comments system with threading support';
COMMENT ON TABLE discussion_references IS 'Links between discussions and related detections';
COMMENT ON TABLE community_contributions IS 'Comprehensive tracking of all community member contributions';

COMMENT ON COLUMN community_contributions.metadata IS 'Flexible JSON metadata for contribution-specific details';
COMMENT ON COLUMN community_contributions.reference_id IS 'UUID reference to the contributed content (detection, comment, etc.)';