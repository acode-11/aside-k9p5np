# Core Terraform variable definitions for AI-Powered Detection Platform
# Version: 1.6+
# Purpose: Define global variables used across all AWS infrastructure modules

# Project name variable for consistent resource tagging
variable "project" {
  type        = string
  description = "Project name for resource tagging"
  default     = "ai-detection-platform"

  validation {
    condition     = length(var.project) > 0
    error_message = "Project name cannot be empty"
  }
}

# Environment variable to distinguish between deployment stages
variable "environment" {
  type        = string
  description = "Environment name (development, staging, production)"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

# Primary AWS region for resource deployment
variable "aws_region" {
  type        = string
  description = "AWS region for resource deployment"
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d$", var.aws_region))
    error_message = "AWS region must be a valid region identifier"
  }
}

# Multi-region deployment configuration for high availability
variable "enable_multi_region" {
  type        = bool
  description = "Enable multi-region deployment for high availability"
  default     = false
}

# Secondary regions for multi-region deployment
variable "secondary_regions" {
  type        = list(string)
  description = "List of secondary regions for multi-region deployment"
  default     = []

  validation {
    condition     = alltrue([for r in var.secondary_regions : can(regex("^[a-z]{2}-[a-z]+-\\d$", r))])
    error_message = "All secondary regions must be valid AWS region identifiers"
  }
}

# Global resource tags
variable "tags" {
  type        = map(string)
  description = "Global tags to be applied to all resources"
  default = {
    ManagedBy = "terraform"
    Project   = "ai-detection-platform"
  }
}

# Infrastructure sizing variables based on environment
variable "instance_sizes" {
  type = map(object({
    api_server = string
    ai_worker  = string
    db_instance = string
    cache_node = string
    search_node = string
  }))
  description = "Instance sizes for different components per environment"
  default = {
    development = {
      api_server  = "t3.large"
      ai_worker   = "g4dn.xlarge"
      db_instance = "db.t3.large"
      cache_node  = "cache.t3.medium"
      search_node = "t3.large"
    }
    staging = {
      api_server  = "t3.xlarge"
      ai_worker   = "g4dn.xlarge"
      db_instance = "db.r6g.large"
      cache_node  = "cache.r6g.large"
      search_node = "c6g.xlarge"
    }
    production = {
      api_server  = "t3.2xlarge"
      ai_worker   = "g4dn.2xlarge"
      db_instance = "db.r6g.xlarge"
      cache_node  = "cache.r6g.large"
      search_node = "c6g.2xlarge"
    }
  }
}

# High availability configuration
variable "high_availability" {
  type = object({
    multi_az = bool
    replica_count = number
    backup_retention_days = number
  })
  description = "High availability settings for production environment"
  default = {
    multi_az = true
    replica_count = 2
    backup_retention_days = 30
  }
}

# Networking configuration
variable "network_config" {
  type = object({
    vpc_cidr = string
    subnet_count = number
    enable_nat = bool
  })
  description = "Network configuration settings"
  default = {
    vpc_cidr = "10.0.0.0/16"
    subnet_count = 3
    enable_nat = true
  }

  validation {
    condition     = can(cidrhost(var.network_config.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }
}

# Monitoring and logging configuration
variable "monitoring_config" {
  type = object({
    enable_detailed_monitoring = bool
    log_retention_days = number
    enable_flow_logs = bool
  })
  description = "Monitoring and logging configuration settings"
  default = {
    enable_detailed_monitoring = true
    log_retention_days = 90
    enable_flow_logs = true
  }
}