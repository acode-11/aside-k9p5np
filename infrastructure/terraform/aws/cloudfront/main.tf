# AWS CloudFront Configuration for AI-Powered Detection Platform
# Version: ~> 5.0
# Purpose: Implements secure, global content delivery with DDoS protection

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Origin Access Identities for S3 buckets
resource "aws_cloudfront_origin_access_identity" "detection_content" {
  comment = "OAI for detection content bucket - ${var.environment}"
}

resource "aws_cloudfront_origin_access_identity" "attachments" {
  comment = "OAI for attachments bucket - ${var.environment}"
}

# Logging bucket for CloudFront access logs
resource "aws_s3_bucket" "logs" {
  bucket = "${var.environment}-cloudfront-logs"
  
  tags = merge(var.tags, {
    Name = "CloudFront Access Logs"
  })
}

resource "aws_s3_bucket_versioning" "logs_versioning" {
  bucket = aws_s3_bucket.logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Security headers policy
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "${var.environment}-security-headers"
  
  security_headers_config {
    strict_transport_security {
      override                   = true
      include_subdomains        = true
      preload                   = true
      access_control_max_age_sec = 31536000
    }
    
    content_security_policy {
      override                = true
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    }
    
    content_type_options {
      override = true
    }
    
    frame_options {
      override      = true
      frame_option = "DENY"
    }
    
    xss_protection {
      override    = true
      protection  = true
      mode_block = true
    }
    
    referrer_policy {
      override        = true
      referrer_policy = "same-origin"
    }
  }
}

# Main CloudFront distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Detection Platform CDN - ${var.environment}"
  default_root_object = "index.html"
  price_class         = var.price_class
  aliases             = [var.domain_name]
  web_acl_id          = data.aws_waf_web_acl.main.id
  
  # Detection content origin
  origin {
    domain_name = data.aws_s3_bucket.detection_content.bucket_regional_domain_name
    origin_id   = "detection-content-origin"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.detection_content.cloudfront_access_identity_path
    }
    
    origin_shield {
      enabled              = true
      origin_shield_region = var.origin_shield_region
    }
  }
  
  # Attachments origin
  origin {
    domain_name = data.aws_s3_bucket.attachments.bucket_regional_domain_name
    origin_id   = "attachments-origin"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.attachments.cloudfront_access_identity_path
    }
    
    origin_shield {
      enabled              = true
      origin_shield_region = var.origin_shield_region
    }
  }
  
  # Default cache behavior for detection content
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "detection-content-origin"
    compress         = true
    
    forwarded_values {
      query_string = true
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy     = "redirect-to-https"
    min_ttl                   = var.min_ttl
    default_ttl               = var.default_ttl
    max_ttl                   = var.max_ttl
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
    
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.security_headers.arn
    }
  }
  
  # Cache behavior for attachments
  ordered_cache_behavior {
    path_pattern     = "/attachments/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "attachments-origin"
    compress         = true
    
    forwarded_values {
      query_string = true
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy     = "redirect-to-https"
    min_ttl                   = var.min_ttl
    default_ttl               = var.default_ttl
    max_ttl                   = var.max_ttl
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }
  
  # Custom error responses
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 300
  }
  
  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 300
  }
  
  # Logging configuration
  logging_config {
    include_cookies = true
    bucket         = aws_s3_bucket.logs.bucket_domain_name
    prefix         = "cdn/"
  }
  
  # SSL/TLS configuration
  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.domain.arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }
  
  # Geo restrictions
  restrictions {
    geo_restriction {
      restriction_type = lookup(var.geo_restrictions, "type", "none")
      locations        = lookup(var.geo_restrictions, "locations", [])
    }
  }
  
  tags = var.tags
}

# CloudFront security function
resource "aws_cloudfront_function" "security_headers" {
  name    = "${var.environment}-security-headers"
  runtime = "cloudfront-js-1.0"
  comment = "Add security headers to responses"
  publish = true
  code    = file("${path.module}/functions/security-headers.js")
}

# Outputs
output "distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "security_headers_policy_id" {
  description = "The ID of the security headers policy"
  value       = aws_cloudfront_response_headers_policy.security_headers.id
}