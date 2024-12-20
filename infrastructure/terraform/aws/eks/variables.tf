# EKS Cluster Name
variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster for the AI-Powered Detection Platform"
  validation {
    condition     = length(var.cluster_name) > 0 && length(var.cluster_name) <= 100 && can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name))
    error_message = "Cluster name must be 1-100 characters, start with a letter, and contain only letters, numbers, and hyphens"
  }
}

# Kubernetes Version
variable "cluster_version" {
  type        = string
  description = "Kubernetes version for the EKS cluster (must be 1.24 or higher)"
  default     = "1.28"
  validation {
    condition     = can(regex("^1\\.(2[4-8])$", var.cluster_version))
    error_message = "Cluster version must be between 1.24 and 1.28"
  }
}

# Worker Node Instance Types
variable "node_instance_types" {
  type        = list(string)
  description = "List of instance types for the EKS worker nodes (must be production-grade)"
  default     = ["t3.xlarge", "t3.2xlarge"]
}

# Worker Node Sizing
variable "node_desired_size" {
  type        = number
  description = "Desired number of worker nodes for the production environment"
  default     = 3
  validation {
    condition     = var.node_desired_size >= var.node_min_size && var.node_desired_size <= var.node_max_size
    error_message = "Desired size must be between minimum and maximum sizes"
  }
}

variable "node_min_size" {
  type        = number
  description = "Minimum number of worker nodes for high availability"
  default     = 1
  validation {
    condition     = var.node_min_size > 0
    error_message = "Minimum size must be greater than 0"
  }
}

variable "node_max_size" {
  type        = number
  description = "Maximum number of worker nodes for scalability"
  default     = 5
  validation {
    condition     = var.node_max_size >= var.node_min_size
    error_message = "Maximum size must be greater than or equal to minimum size"
  }
}

# Cluster Logging Configuration
variable "enabled_cluster_log_types" {
  type        = list(string)
  description = "List of EKS cluster log types to enable for comprehensive monitoring"
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  validation {
    condition     = alltrue([for log_type in var.enabled_cluster_log_types : contains(["api", "audit", "authenticator", "controllerManager", "scheduler"], log_type)])
    error_message = "Invalid log type specified. Allowed values: api, audit, authenticator, controllerManager, scheduler"
  }
}

# Resource Tagging
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all EKS cluster resources"
  default = {
    Environment = "production"
    ManagedBy   = "terraform"
    Project     = "ai-detection-platform"
    Service     = "eks"
    Owner       = "platform-team"
  }
}