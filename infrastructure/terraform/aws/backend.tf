# Backend configuration for AI-Powered Detection Platform
# Version: ~> 1.6
# Purpose: Defines secure remote state storage and locking mechanism with multi-region support

terraform {
  # S3 backend configuration with enhanced security features
  backend "s3" {
    # Dynamic bucket name based on project and environment
    bucket = "${var.project}-${var.environment}-terraform-state"
    
    # State file path with workspace isolation
    key = "${var.project}/${var.environment}/terraform.tfstate"
    
    # Primary region for state storage
    region = "${var.region}"
    
    # Enable state file encryption using KMS
    encrypt = true
    
    # KMS key for state encryption
    kms_key_id = "alias/${var.project}-${var.environment}-terraform-key"
    
    # DynamoDB table for state locking
    dynamodb_table = "${var.project}-${var.environment}-terraform-locks"
    
    # Workspace prefix for multi-environment management
    workspace_key_prefix = "${var.project}"
    
    # Enhanced security settings
    acl                  = "private"
    force_path_style     = false
    skip_region_validation      = false
    skip_credentials_validation = false
    skip_metadata_api_check     = false

    # Additional security configurations
    # Note: These are applied through bucket policy and IAM roles
    # - Requires SSL/TLS for all requests
    # - Enforces encryption in transit
    # - Enables versioning
    # - Configures access logging
    # - Implements cross-region replication
    # - Enables point-in-time recovery for DynamoDB
  }
}

# Note: The following configurations are managed through separate resource files:
# - S3 bucket with versioning and replication
# - KMS key with automatic rotation
# - DynamoDB table with encryption
# - IAM roles and policies
# - Bucket policies and access controls
# - Logging and monitoring settings