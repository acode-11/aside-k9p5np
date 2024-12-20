# AWS Infrastructure Outputs Configuration
# Version: ~> 1.6
# Purpose: Exports critical infrastructure values from AWS resources for use in other modules and external systems

# EKS Cluster Outputs
output "kubernetes_cluster_endpoint" {
  description = "The endpoint for the EKS Kubernetes API server"
  value       = module.eks.cluster_endpoint
  sensitive   = false

  # Validate endpoint is a valid HTTPS URL
  validation {
    condition     = can(regex("^https://", module.eks.cluster_endpoint))
    error_message = "Cluster endpoint must be a valid HTTPS URL"
  }
}

output "kubernetes_cluster_name" {
  description = "The name of the EKS cluster"
  value       = module.eks.cluster_name
  sensitive   = false

  # Validate cluster name is not empty
  validation {
    condition     = length(module.eks.cluster_name) > 0
    error_message = "Cluster name cannot be empty"
  }
}

# RDS Database Outputs
output "database_endpoint" {
  description = "The connection endpoint for the RDS database"
  value       = module.rds.db_instance_endpoint
  sensitive   = true # Marked sensitive as it contains connection information

  # Validate endpoint format
  validation {
    condition     = can(regex("^[\\w-]+\\.\\w+\\.\\w+\\.rds\\.amazonaws\\.com$", module.rds.db_instance_endpoint))
    error_message = "Database endpoint must be a valid RDS endpoint format"
  }
}

output "database_instance_id" {
  description = "The instance identifier of the RDS database"
  value       = module.rds.db_instance_id
  sensitive   = false

  # Validate instance ID is not empty
  validation {
    condition     = length(module.rds.db_instance_id) > 0
    error_message = "Database instance ID cannot be empty"
  }
}

# VPC Network Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
  sensitive   = false

  # Validate VPC ID format
  validation {
    condition     = can(regex("^vpc-", module.vpc.vpc_id))
    error_message = "VPC ID must start with 'vpc-'"
  }
}

output "private_subnet_ids" {
  description = "The IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
  sensitive   = false

  # Validate at least one private subnet exists
  validation {
    condition     = length(module.vpc.private_subnet_ids) > 0
    error_message = "At least one private subnet must exist"
  }
}

output "public_subnet_ids" {
  description = "The IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
  sensitive   = false

  # Validate at least one public subnet exists
  validation {
    condition     = length(module.vpc.public_subnet_ids) > 0
    error_message = "At least one public subnet must exist"
  }
}