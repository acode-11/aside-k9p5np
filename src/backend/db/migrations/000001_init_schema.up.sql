-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for role-based access control
CREATE TYPE user_role AS ENUM (
    'admin',
    'org_admin', 
    'team_lead',
    'contributor',
    'reader'
);

-- Create enum type for community visibility
CREATE TYPE community_visibility AS ENUM (
    'public',
    'private',
    'organization'
);

-- Create organizations table
CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(255) NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on organization name for faster lookups
CREATE UNIQUE INDEX idx_organizations_name ON organizations(name);

-- Create users table with OAuth/OIDC support and MFA tracking
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email varchar(255) NOT NULL UNIQUE,
    name varchar(255) NOT NULL,
    role user_role NOT NULL,
    organization_id uuid REFERENCES organizations(id),
    auth_provider varchar(50) NOT NULL,
    auth_id varchar(255) NOT NULL,
    mfa_enabled boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user lookups and relationships
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization ON users(organization_id);

-- Create communities table with visibility control
CREATE TABLE communities (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(255) NOT NULL,
    description text,
    visibility community_visibility NOT NULL,
    owner_id uuid NOT NULL REFERENCES users(id),
    organization_id uuid REFERENCES organizations(id),
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for community lookups and filtering
CREATE INDEX idx_communities_owner ON communities(owner_id);
CREATE INDEX idx_communities_organization ON communities(organization_id);
CREATE INDEX idx_communities_visibility ON communities(visibility);

-- Create community members join table with role assignments
CREATE TABLE community_members (
    community_id uuid NOT NULL REFERENCES communities(id),
    user_id uuid NOT NULL REFERENCES users(id),
    role user_role NOT NULL,
    joined_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (community_id, user_id)
);

-- Create index for user membership lookups
CREATE INDEX idx_community_members_user ON community_members(user_id);

-- Add triggers for updated_at timestamp maintenance
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communities_updated_at
    BEFORE UPDATE ON communities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();