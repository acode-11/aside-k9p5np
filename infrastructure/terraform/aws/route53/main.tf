# AWS Route53 Configuration for AI-Powered Detection Platform
# Version: terraform ~> 5.0
# Purpose: Implements global DNS management with security controls

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# KMS key for DNSSEC signing
resource "aws_kms_key" "dnssec" {
  count                    = var.enable_dnssec ? 1 : 0
  description             = "KMS key for DNSSEC signing - ${var.environment}"
  deletion_window_in_days = 7
  key_usage               = "SIGN_VERIFY"
  customer_master_key_spec = "ECC_NIST_P256"
  
  tags = merge(var.tags, {
    Name = "DNSSEC-KMS-${var.environment}"
  })
}

# Primary hosted zone for the domain
resource "aws_route53_zone" "main" {
  name    = var.domain_name
  comment = "Managed hosted zone for ${var.environment} environment"
  
  tags = merge(var.tags, {
    Environment = var.environment
  })
  
  lifecycle {
    prevent_destroy = true
  }
}

# CloudWatch log group for DNS query logging
resource "aws_cloudwatch_log_group" "dns_queries" {
  count             = var.enable_query_logging ? 1 : 0
  name              = "/aws/route53/${var.domain_name}/queries"
  retention_in_days = 30
  
  tags = merge(var.tags, {
    Name = "Route53-QueryLogs-${var.environment}"
  })
}

# DNSSEC configuration
resource "aws_route53_key_signing_key" "main" {
  count                = var.enable_dnssec ? 1 : 0
  hosted_zone_id      = aws_route53_zone.main.id
  key_management_service_arn = aws_kms_key.dnssec[0].arn
  name                = "${var.environment}-key"
}

resource "aws_route53_zone_dnssec" "main" {
  count           = var.enable_dnssec ? 1 : 0
  hosted_zone_id = aws_route53_zone.main.id
  signing_status = "SIGNING"
  
  depends_on = [aws_route53_key_signing_key.main]
}

# DNS query logging
resource "aws_route53_query_log" "main" {
  count                = var.enable_query_logging ? 1 : 0
  cloudwatch_log_group_arn = aws_cloudwatch_log_group.dns_queries[0].arn
  zone_id              = aws_route53_zone.main.id
}

# Primary domain A record for CloudFront distribution
resource "aws_route53_record" "cdn_alias" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  
  alias {
    name                   = data.aws_cloudfront_distribution.cdn.domain_name
    zone_id                = data.aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = true
  }
}

# WWW subdomain A record for CloudFront distribution
resource "aws_route53_record" "www_alias" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  
  alias {
    name                   = data.aws_cloudfront_distribution.cdn.domain_name
    zone_id                = data.aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = true
  }
}

# Health check for domain availability
resource "aws_route53_health_check" "main" {
  fqdn              = var.domain_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"
  
  tags = merge(var.tags, {
    Name = "HealthCheck-${var.environment}"
  })
}

# Outputs for DNS information
output "zone_id" {
  description = "The ID of the hosted zone"
  value       = aws_route53_zone.main.zone_id
}

output "name_servers" {
  description = "The name servers for the hosted zone"
  value       = aws_route53_zone.main.name_servers
}

output "dnssec_status" {
  description = "The DNSSEC signing status"
  value       = var.enable_dnssec ? aws_route53_zone_dnssec.main[0].signing_status : "DISABLED"
}