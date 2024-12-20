# Environment variable with validation for allowed deployment environments
variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, prod)"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# Domain name variable with format validation
variable "domain_name" {
  type        = string
  description = "Domain name for the CloudFront distribution (e.g., cdn.example.com)"
  
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*(\\.[a-z0-9][a-z0-9-]*)*$", var.domain_name))
    error_message = "Domain name must be a valid DNS hostname format."
  }
}

# Price class variable with validation for allowed CloudFront price classes
variable "price_class" {
  type        = string
  description = "CloudFront distribution price class (PriceClass_All, PriceClass_200, PriceClass_100)"
  default     = "PriceClass_100"
  
  validation {
    condition     = contains(["PriceClass_All", "PriceClass_200", "PriceClass_100"], var.price_class)
    error_message = "Price class must be one of: PriceClass_All, PriceClass_200, PriceClass_100."
  }
}

# Minimum TTL variable with range validation
variable "min_ttl" {
  type        = number
  description = "Minimum TTL for cached objects in seconds"
  default     = 0
  
  validation {
    condition     = var.min_ttl >= 0 && var.min_ttl <= 31536000
    error_message = "Minimum TTL must be between 0 and 31536000 seconds (1 year)."
  }
}

# Default TTL variable with validation against min and max TTL
variable "default_ttl" {
  type        = number
  description = "Default TTL for cached objects in seconds"
  default     = 3600
  
  validation {
    condition     = var.default_ttl >= 0 && var.default_ttl <= 31536000
    error_message = "Default TTL must be between 0 and 31536000 seconds (1 year)."
  }
}

# Maximum TTL variable with upper limit validation
variable "max_ttl" {
  type        = number
  description = "Maximum TTL for cached objects in seconds"
  default     = 86400
  
  validation {
    condition     = var.max_ttl >= 0 && var.max_ttl <= 31536000
    error_message = "Maximum TTL must be between 0 and 31536000 seconds (1 year)."
  }
}

# Resource tags variable with required tags validation
variable "tags" {
  type        = map(string)
  description = "Resource tags for CloudFront components"
  default = {
    "Terraform"   = "true"
    "Service"     = "cdn"
    "Component"   = "cloudfront"
  }
  
  validation {
    condition     = contains(keys(var.tags), "Service") && contains(keys(var.tags), "Component")
    error_message = "Tags must include required keys: Service, Component."
  }
}

# Additional validation to ensure TTL relationships are correct
locals {
  validate_ttl_order = (
    var.min_ttl <= var.default_ttl && 
    var.default_ttl <= var.max_ttl
  ) || abort(
    "TTL values must maintain order: min_ttl <= default_ttl <= max_ttl"
  )
}