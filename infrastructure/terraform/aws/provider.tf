# AWS Provider Configuration for AI-Powered Detection Platform
# Version: ~> 5.0
# Purpose: Defines AWS provider settings for multi-region deployment with comprehensive tagging

# Primary region configuration variable
variable "aws_region" {
  description = "Primary AWS region for infrastructure deployment"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.aws_region))
    error_message = "AWS region must be in valid format (e.g., us-east-1)"
  }
}

# Secondary regions configuration variable
variable "secondary_regions" {
  description = "List of secondary AWS regions for multi-region deployment"
  type        = list(string)
  default     = ["us-west-2", "eu-west-1"]

  validation {
    condition     = alltrue([for r in var.secondary_regions : can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", r))])
    error_message = "All secondary regions must be in valid format"
  }
}

# Environment configuration variable
variable "environment" {
  description = "Deployment environment identifier"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development"
  }
}

# Primary AWS Provider configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ai-detection-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
      Team        = "platform-engineering"
      CostCenter  = "security-operations"
    }
  }

  assume_role {
    role_arn     = var.aws_role_arn
    session_name = "terraform-session"
  }

  retry_mode  = "standard"
  max_retries = 3
}

# Secondary regions provider configurations using for_each
provider "aws" {
  for_each = toset(var.secondary_regions)
  alias    = "secondary_${each.value}"
  region   = each.value

  default_tags {
    tags = {
      Project         = "ai-detection-platform"
      Environment     = var.environment
      ManagedBy      = "terraform"
      Team           = "platform-engineering"
      CostCenter     = "security-operations"
      ReplicationType = "secondary"
    }
  }

  assume_role {
    role_arn     = var.aws_role_arn
    session_name = "terraform-session-${each.value}"
  }

  retry_mode  = "standard"
  max_retries = 3
}

# Required variables for provider configuration
variable "aws_role_arn" {
  description = "ARN of the IAM role to assume for AWS operations"
  type        = string
  sensitive   = true
}

# Terraform block for AWS provider version constraints
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}