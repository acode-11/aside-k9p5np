# Terraform AWS S3 Variables Configuration
# Version: ~> 1.6
# Purpose: Defines variables for S3 buckets used in the AI-Powered Detection Platform

# Environment configuration with strict validation
variable "environment" {
  description = "Deployment environment for the S3 resources"
  type        = string
  validation {
    condition     = can(regex("^(development|staging|production)$", var.environment))
    error_message = "Environment must be development, staging, or production."
  }
}

# AWS region configuration
variable "region" {
  description = "AWS region for S3 bucket deployment"
  type        = string
  default     = "us-east-1"
}

# Bucket naming configuration with strict validation
variable "bucket_prefix" {
  description = "Prefix for S3 bucket names to ensure global uniqueness"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9-]{3,16}$", var.bucket_prefix))
    error_message = "Bucket prefix must be 3-16 characters and contain only lowercase letters, numbers, and hyphens."
  }
}

# CORS configuration for cross-origin access
variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS configuration"
  type        = list(string)
  default     = []
}

# Lifecycle management configuration
variable "lifecycle_rules" {
  description = "Lifecycle rules for S3 buckets including transition and expiration policies"
  type = map(object({
    transition_glacier_days = number
    expiration_days        = number
  }))
  default = {
    default = {
      transition_glacier_days = 90
      expiration_days        = 365
    }
  }
}

# Backup retention configuration with minimum enforcement
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
  validation {
    condition     = var.backup_retention_days >= 7
    error_message = "Backup retention must be at least 7 days for compliance."
  }
}

# Versioning configuration for data protection
variable "enable_versioning" {
  description = "Enable versioning for S3 buckets"
  type        = bool
  default     = true
}

# Encryption configuration with algorithm validation
variable "encryption_algorithm" {
  description = "Server-side encryption algorithm for S3 buckets"
  type        = string
  default     = "AES256"
  validation {
    condition     = can(regex("^(AES256|aws:kms)$", var.encryption_algorithm))
    error_message = "Encryption algorithm must be AES256 or aws:kms."
  }
}

# KMS configuration for enhanced encryption
variable "kms_key_id" {
  description = "Optional KMS key ID for server-side encryption when using aws:kms"
  type        = string
  default     = null
}

# Performance optimization configuration
variable "enable_transfer_acceleration" {
  description = "Enable S3 transfer acceleration for improved performance"
  type        = bool
  default     = false
}

# Tags configuration for resource management
variable "tags" {
  description = "Common tags to be applied to all S3 resources"
  type        = map(string)
  default = {
    Terraform   = "true"
    Environment = "development"
  }
}

# Public access block configuration
variable "block_public_access" {
  description = "Enable S3 block public access settings"
  type = object({
    block_public_acls       = bool
    block_public_policy     = bool
    ignore_public_acls      = bool
    restrict_public_buckets = bool
  })
  default = {
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
  }
}

# Replication configuration for disaster recovery
variable "enable_replication" {
  description = "Enable cross-region replication for disaster recovery"
  type        = bool
  default     = false
}

# Logging configuration for audit compliance
variable "enable_logging" {
  description = "Enable S3 access logging"
  type        = bool
  default     = true
}

# Intelligent tiering configuration
variable "enable_intelligent_tiering" {
  description = "Enable S3 intelligent tiering for cost optimization"
  type        = bool
  default     = false
}