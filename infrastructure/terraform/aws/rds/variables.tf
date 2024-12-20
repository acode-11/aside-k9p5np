# Core Terraform functionality for variable definitions
terraform {
  required_version = "~> 1.6"
}

# Environment name for resource tagging
variable "environment" {
  description = "Environment name for resource tagging (e.g., development, staging, production)"
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

# Project name for resource tagging
variable "project" {
  description = "Project name for resource tagging"
  type        = string
  default     = "ai-detection-platform"
}

# RDS instance type configuration
variable "db_instance_class" {
  description = "RDS instance type"
  type        = string
  default     = "db.r6g.xlarge"  # As per infrastructure requirements

  validation {
    condition     = can(regex("^db\\.[a-z0-9]+\\.[a-z0-9]+$", var.db_instance_class))
    error_message = "DB instance class must be a valid RDS instance type"
  }
}

# PostgreSQL engine version
variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"  # Latest stable PostgreSQL version

  validation {
    condition     = can(regex("^\\d+\\.\\d+$", var.db_engine_version))
    error_message = "DB engine version must be a valid PostgreSQL version"
  }
}

# Storage configuration
variable "db_allocated_storage" {
  description = "Allocated storage size in GB"
  type        = number
  default     = 100  # Initial storage size

  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 65536
    error_message = "Allocated storage must be between 20 GB and 65536 GB"
  }
}

variable "db_max_allocated_storage" {
  description = "Maximum storage size in GB for autoscaling"
  type        = number
  default     = 1000  # Maximum storage for autoscaling

  validation {
    condition     = var.db_max_allocated_storage >= var.db_allocated_storage
    error_message = "Maximum allocated storage must be greater than or equal to allocated storage"
  }
}

# Backup configuration
variable "db_backup_retention_period" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7  # One week retention period

  validation {
    condition     = var.db_backup_retention_period >= 0 && var.db_backup_retention_period <= 35
    error_message = "Backup retention period must be between 0 and 35 days"
  }
}

# High availability configuration
variable "multi_az" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = true  # Enable high availability by default
}

# Security configuration
variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true  # Enable deletion protection by default
}

# Additional resource tagging
variable "tags" {
  description = "Additional tags for RDS resources"
  type        = map(string)
  default     = {}
}