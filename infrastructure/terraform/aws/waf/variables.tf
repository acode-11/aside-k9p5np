# AWS WAF Variables Configuration
# Version: v1.0.0
# Last Updated: 2023
# This file defines the variables used to configure AWS WAF security rules and protections
# for the AI-Powered Detection Platform

# Environment name variable with strict validation
variable "environment" {
  type        = string
  description = "Deployment environment name (e.g., dev, staging, prod) for WAF configuration"

  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod for security compliance"
  }
}

# Rate limiting configuration for DDoS protection
variable "rate_limit" {
  type        = number
  description = "Maximum number of requests allowed per IP address per 5-minute period for DDoS protection"
  default     = 1000

  validation {
    condition     = var.rate_limit >= 100 && var.rate_limit <= 10000
    error_message = "Rate limit must be between 100 and 10000 requests for effective DDoS protection"
  }
}

# Block period configuration for rate limit violations
variable "block_period" {
  type        = number
  description = "Duration in seconds to block IPs that exceed rate limit thresholds"
  default     = 300

  validation {
    condition     = var.block_period >= 300 && var.block_period <= 7200
    error_message = "Block period must be between 300 and 7200 seconds for security effectiveness"
  }
}

# IP rate-based rule name configuration
variable "ip_rate_based_rule_name" {
  type        = string
  description = "Name for the IP rate-based rule used in WAF configuration"
  default     = "ip-rate-limit"
}

# SQL injection protection configuration
variable "enable_sql_injection_protection" {
  type        = bool
  description = "Enable AWS managed SQL injection protection rule for API security"
  default     = true
}

# XSS protection configuration
variable "enable_xss_protection" {
  type        = bool
  description = "Enable AWS managed XSS protection rule for web security"
  default     = true
}

# Bad input protection configuration
variable "enable_bad_input_protection" {
  type        = bool
  description = "Enable custom bad input protection rule for request validation"
  default     = true
}

# IP whitelist configuration
variable "ip_whitelist" {
  type        = list(string)
  description = "List of IP addresses to whitelist from WAF rules (e.g., trusted services)"
  default     = []

  validation {
    condition     = alltrue([for ip in var.ip_whitelist : can(regex("^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}(/[0-9]{1,2})?$", ip))])
    error_message = "IP addresses must be valid IPv4 CIDR notation (e.g., 192.168.1.0/24)"
  }
}

# Resource tagging configuration
variable "tags" {
  type        = map(string)
  description = "Resource tags for WAF components following organizational standards"
  default     = {}

  validation {
    condition     = length(var.tags) <= 50
    error_message = "Maximum of 50 tags allowed per AWS resource"
  }
}

# Optional scope configuration for WAF rules
variable "scope" {
  type        = string
  description = "Scope of WAF rules (REGIONAL or CLOUDFRONT)"
  default     = "REGIONAL"

  validation {
    condition     = contains(["REGIONAL", "CLOUDFRONT"], var.scope)
    error_message = "Scope must be either REGIONAL or CLOUDFRONT"
  }
}

# Rule priority configuration
variable "rule_priority_start" {
  type        = number
  description = "Starting priority number for WAF rules"
  default     = 1

  validation {
    condition     = var.rule_priority_start >= 1 && var.rule_priority_start <= 100
    error_message = "Rule priority must be between 1 and 100"
  }
}

# Logging configuration
variable "enable_logging" {
  type        = bool
  description = "Enable WAF logging to CloudWatch Logs"
  default     = true
}

# Metric name prefix for CloudWatch metrics
variable "metric_name_prefix" {
  type        = string
  description = "Prefix for CloudWatch metrics names"
  default     = "waf"

  validation {
    condition     = can(regex("^[a-zA-Z0-9-_]{1,32}$", var.metric_name_prefix))
    error_message = "Metric name prefix must be 1-32 characters and contain only alphanumeric characters, hyphens, and underscores"
  }
}