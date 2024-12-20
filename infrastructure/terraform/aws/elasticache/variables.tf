# Core Terraform configuration for variable validation
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Aligned with provider.tf version
    }
  }
}

# Redis node instance type configuration
variable "redis_node_type" {
  description = "Instance type for Redis nodes, optimized for memory-intensive workloads"
  type        = string
  default     = "cache.r6g.large"

  validation {
    condition     = can(regex("^cache\\.(r6g|r6gd|r7g)\\.(large|xlarge|2xlarge)$", var.redis_node_type))
    error_message = "Redis node type must be a memory-optimized r6g/r6gd/r7g instance type suitable for production use"
  }
}

# Redis port configuration
variable "redis_port" {
  description = "Port number for Redis cluster communication"
  type        = number
  default     = 6379

  validation {
    condition     = var.redis_port > 1024 && var.redis_port < 65535
    error_message = "Redis port must be a non-privileged port between 1025 and 65534"
  }
}

# Redis cluster sharding configuration
variable "redis_num_shards" {
  description = "Number of shards (node groups) in the Redis cluster for horizontal scaling"
  type        = number
  default     = 2

  validation {
    condition     = var.redis_num_shards >= 2 && var.redis_num_shards <= 250
    error_message = "Number of Redis shards must be between 2 and 250 for production deployments"
  }
}

# Redis high availability configuration
variable "redis_replicas_per_shard" {
  description = "Number of replica nodes in each shard for high availability"
  type        = number
  default     = 2

  validation {
    condition     = var.redis_replicas_per_shard >= 2 && var.redis_replicas_per_shard <= 5
    error_message = "Number of replicas per shard must be between 2 and 5 for multi-AZ deployment"
  }
}

# Redis version configuration
variable "redis_parameter_family" {
  description = "Redis parameter group family version"
  type        = string
  default     = "redis7.0"

  validation {
    condition     = can(regex("^redis[7-9]\\.[0-9]$", var.redis_parameter_family))
    error_message = "Redis parameter family must be version 7.0 or higher"
  }
}

# Maintenance window configuration
variable "redis_maintenance_window" {
  description = "Weekly time range for maintenance operations (minimum 2 hours, UTC)"
  type        = string
  default     = "sun:05:00-sun:07:00"

  validation {
    condition     = can(regex("^(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]-(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]$", var.redis_maintenance_window))
    error_message = "Maintenance window must be in the format day:HH:MM-day:HH:MM and span at least 2 hours"
  }
}

# Backup retention configuration
variable "redis_snapshot_retention_limit" {
  description = "Number of days to retain automatic Redis snapshots for disaster recovery"
  type        = number
  default     = 7

  validation {
    condition     = var.redis_snapshot_retention_limit >= 7 && var.redis_snapshot_retention_limit <= 35
    error_message = "Snapshot retention limit must be between 7 and 35 days for production environments"
  }
}

# Tags configuration for resource identification
variable "tags" {
  description = "Additional tags for Redis cluster resources"
  type        = map(string)
  default     = {}
}

# Security group configuration
variable "vpc_security_group_ids" {
  description = "List of VPC security group IDs to associate with the Redis cluster"
  type        = list(string)
}

# Subnet configuration
variable "subnet_ids" {
  description = "List of VPC subnet IDs for Redis cluster deployment"
  type        = list(string)
}

# KMS key configuration for encryption
variable "kms_key_id" {
  description = "KMS key ID for encryption at rest"
  type        = string
  default     = null
}

# Auto minor version upgrade configuration
variable "auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades during maintenance window"
  type        = bool
  default     = true
}

# Transit encryption configuration
variable "transit_encryption_enabled" {
  description = "Enable encryption in transit for Redis cluster"
  type        = bool
  default     = true
}

# At-rest encryption configuration
variable "at_rest_encryption_enabled" {
  description = "Enable encryption at rest for Redis cluster"
  type        = bool
  default     = true
}