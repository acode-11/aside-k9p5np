# Terraform AWS VPC Variables Configuration
# Version: ~> 1.6
# Purpose: Define variables for VPC infrastructure provisioning for the AI-Powered Detection Platform

variable "vpc_cidr" {
  description = "CIDR block for VPC - must be a valid IPv4 CIDR range with sufficient address space for all subnets"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR block must be a valid IPv4 CIDR range"
  }
}

variable "environment" {
  description = "Deployment environment identifier for resource tagging and configuration"
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

variable "availability_zones" {
  description = "List of AWS availability zones for multi-AZ deployment and high availability"
  type        = list(string)

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones must be specified for high availability"
  }
}

variable "project" {
  description = "Project identifier for resource tagging and organization"
  type        = string
  default     = "ai-detection-platform"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project))
    error_message = "Project identifier must contain only lowercase letters, numbers, and hyphens"
  }
}

variable "enable_nat_gateway" {
  description = "Flag to enable NAT Gateway for private subnet internet access"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Option to use a single NAT Gateway instead of one per AZ for cost optimization"
  type        = bool
  default     = false
}

# Optional variable for VPC flow logs configuration
variable "enable_flow_logs" {
  description = "Enable VPC flow logs for network traffic monitoring and security analysis"
  type        = bool
  default     = true
}

# Optional variable for VPC endpoints
variable "enable_vpc_endpoints" {
  description = "Enable VPC endpoints for secure access to AWS services without internet gateway"
  type        = bool
  default     = true
}

# Optional variable for DNS support
variable "enable_dns_support" {
  description = "Enable DNS support in the VPC"
  type        = bool
  default     = true
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in the VPC"
  type        = bool
  default     = true
}

# Tags variable for consistent resource tagging
variable "tags" {
  description = "Additional tags for all VPC resources"
  type        = map(string)
  default     = {}
}