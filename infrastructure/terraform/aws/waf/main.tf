# AWS WAF Configuration for AI-Powered Detection Platform
# Version: v1.0.0
# Provider version: hashicorp/aws ~> 5.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# WAF Web ACL with comprehensive security rules
resource "aws_wafv2_web_acl" "platform_protection" {
  name        = "platform-protection-${var.environment}"
  description = "WAF protection for AI-Powered Detection Platform"
  scope       = var.scope

  default_action {
    allow {}
  }

  # Rule #1: IP Rate-based protection
  rule {
    name     = var.ip_rate_based_rule_name
    priority = var.rule_priority_start

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = var.enable_logging
      metric_name               = "${var.metric_name_prefix}-rate-based"
      sampled_requests_enabled  = true
    }
  }

  # Rule #2: AWS Managed SQL Injection Protection
  dynamic "rule" {
    for_each = var.enable_sql_injection_protection ? [1] : []
    content {
      name     = "sql-injection-protection"
      priority = var.rule_priority_start + 1

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesSQLiRuleSet"
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = var.enable_logging
        metric_name               = "${var.metric_name_prefix}-sql-injection"
        sampled_requests_enabled  = true
      }
    }
  }

  # Rule #3: AWS Managed XSS Protection
  dynamic "rule" {
    for_each = var.enable_xss_protection ? [1] : []
    content {
      name     = "xss-protection"
      priority = var.rule_priority_start + 2

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesKnownBadInputsRuleSet"
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = var.enable_logging
        metric_name               = "${var.metric_name_prefix}-xss"
        sampled_requests_enabled  = true
      }
    }
  }

  # Rule #4: Custom Bad Input Protection
  dynamic "rule" {
    for_each = var.enable_bad_input_protection ? [1] : []
    content {
      name     = "bad-input-protection"
      priority = var.rule_priority_start + 3

      action {
        block {}
      }

      statement {
        and_statement {
          statement {
            size_constraint_statement {
              comparison_operator = "GT"
              size               = 8192 # 8KB max request size
              field_to_match {
                body {}
              }
              text_transformation {
                priority = 1
                type     = "NONE"
              }
            }
          }

          statement {
            regex_pattern_set_reference_statement {
              arn = aws_wafv2_regex_pattern_set.bad_patterns.arn
              field_to_match {
                uri_path {}
              }
              text_transformation {
                priority = 1
                type     = "NONE"
              }
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = var.enable_logging
        metric_name               = "${var.metric_name_prefix}-bad-input"
        sampled_requests_enabled  = true
      }
    }
  }

  # IP Whitelist Rule
  dynamic "rule" {
    for_each = length(var.ip_whitelist) > 0 ? [1] : []
    content {
      name     = "ip-whitelist"
      priority = var.rule_priority_start + 4

      action {
        allow {}
      }

      statement {
        ip_set_reference_statement {
          arn = aws_wafv2_ip_set.whitelist[0].arn
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = var.enable_logging
        metric_name               = "${var.metric_name_prefix}-ip-whitelist"
        sampled_requests_enabled  = true
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = var.enable_logging
    metric_name               = "${var.metric_name_prefix}-platform-protection"
    sampled_requests_enabled  = true
  }

  tags = var.tags
}

# IP Set for whitelisted addresses
resource "aws_wafv2_ip_set" "whitelist" {
  count              = length(var.ip_whitelist) > 0 ? 1 : 0
  name               = "ip-whitelist-${var.environment}"
  description        = "Whitelisted IP addresses for platform access"
  scope              = var.scope
  ip_address_version = "IPV4"
  addresses          = var.ip_whitelist
  tags               = var.tags
}

# Regex Pattern Set for bad input detection
resource "aws_wafv2_regex_pattern_set" "bad_patterns" {
  name        = "bad-patterns-${var.environment}"
  description = "Regex patterns for detecting malicious input"
  scope       = var.scope

  regular_expression {
    regex_string = ".*\\.\\./.*/.*" # Path traversal attempts
  }
  regular_expression {
    regex_string = ".*<script.*>.*" # Basic XSS patterns
  }
  regular_expression {
    regex_string = ".*%00.*" # Null byte injection
  }

  tags = var.tags
}

# CloudWatch Log Group for WAF logs
resource "aws_cloudwatch_log_group" "waf_logs" {
  count             = var.enable_logging ? 1 : 0
  name              = "/aws/waf/${var.environment}"
  retention_in_days = 30
  tags              = var.tags
}

# WAF Logging Configuration
resource "aws_wafv2_web_acl_logging_configuration" "platform_protection" {
  count                   = var.enable_logging ? 1 : 0
  log_destination_configs = [aws_cloudwatch_log_group.waf_logs[0].arn]
  resource_arn           = aws_wafv2_web_acl.platform_protection.arn

  logging_filter {
    default_behavior = "KEEP"

    filter {
      behavior = "KEEP"
      condition {
        action_condition {
          action = "BLOCK"
        }
      }
      requirement = "MEETS_ANY"
    }
  }
}

# Output the WAF Web ACL ID for use in other modules
output "waf_web_acl_id" {
  description = "The ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.platform_protection.id
}

output "waf_web_acl_arn" {
  description = "The ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.platform_protection.arn
}