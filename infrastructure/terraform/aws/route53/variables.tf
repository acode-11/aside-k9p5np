# Terraform AWS Route53 Variables Configuration
# Version: terraform ~> 1.0

# Environment variable to control deployment environment
variable "environment" {
  type        = string
  description = "Environment name (e.g., dev, staging, prod)"
  
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod."
  }
}

# Primary domain name for the platform
variable "domain_name" {
  type        = string
  description = "Primary domain name for the platform"
  
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid DNS name."
  }
}

# DNSSEC configuration flag
variable "enable_dnssec" {
  type        = bool
  description = "Flag to enable DNSSEC signing for the hosted zone"
  default     = true
}

# DNS TTL configuration
variable "dns_ttl" {
  type        = number
  description = "Default TTL in seconds for DNS records"
  default     = 300

  validation {
    condition     = var.dns_ttl >= 60 && var.dns_ttl <= 86400
    error_message = "DNS TTL must be between 60 and 86400 seconds."
  }
}

# Route53 query logging configuration
variable "enable_query_logging" {
  type        = bool
  description = "Flag to enable Route53 query logging to CloudWatch"
  default     = false
}

# Resource tagging configuration
variable "tags" {
  type        = map(string)
  description = "Resource tags for Route53 hosted zone"
  default = {
    managed_by = "terraform"
    service    = "dns"
  }
}