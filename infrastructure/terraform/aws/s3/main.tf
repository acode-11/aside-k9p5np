# AWS S3 Configuration for AI-Powered Detection Platform
# Version: ~> 5.0
# Purpose: Implements secure, scalable storage with comprehensive security controls

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Log bucket for centralized access logging
resource "aws_s3_bucket" "log_bucket" {
  bucket = "${var.bucket_prefix}-logs-${var.environment}"
  
  tags = merge(var.tags, {
    Name = "S3 Access Logs"
    Purpose = "Centralized logging"
  })
}

# Log bucket configuration
resource "aws_s3_bucket_versioning" "log_versioning" {
  bucket = aws_s3_bucket.log_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "log_encryption" {
  bucket = aws_s3_bucket.log_bucket.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_id
      sse_algorithm     = "aws:kms"
    }
  }
}

# Detection content bucket
resource "aws_s3_bucket" "detection_content" {
  bucket = "${var.bucket_prefix}-detection-content-${var.environment}"
  
  tags = merge(var.tags, {
    Name = "Detection Content Storage"
    Purpose = "Primary detection storage"
  })
}

# Detection content bucket configurations
resource "aws_s3_bucket_versioning" "detection_versioning" {
  bucket = aws_s3_bucket.detection_content.id
  versioning_configuration {
    status     = "Enabled"
    mfa_delete = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "detection_encryption" {
  bucket = aws_s3_bucket.detection_content.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_id
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_logging" "detection_logging" {
  bucket        = aws_s3_bucket.detection_content.id
  target_bucket = aws_s3_bucket.log_bucket.id
  target_prefix = "detection-content-logs/"
}

resource "aws_s3_bucket_lifecycle_configuration" "detection_lifecycle" {
  bucket = aws_s3_bucket.detection_content.id

  rule {
    id     = "intelligent-tiering"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "INTELLIGENT_TIERING"
    }
  }
}

# Attachments bucket
resource "aws_s3_bucket" "attachments" {
  bucket = "${var.bucket_prefix}-attachments-${var.environment}"
  
  tags = merge(var.tags, {
    Name = "Binary Attachments Storage"
    Purpose = "Attachment storage"
  })
}

# Attachments bucket configurations
resource "aws_s3_bucket_versioning" "attachments_versioning" {
  bucket = aws_s3_bucket.attachments.id
  versioning_configuration {
    status     = "Enabled"
    mfa_delete = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "attachments_encryption" {
  bucket = aws_s3_bucket.attachments.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_id
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "attachments_lifecycle" {
  bucket = aws_s3_bucket.attachments.id

  rule {
    id     = "lifecycle-rule"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

# Common bucket policies and security controls
resource "aws_s3_bucket_public_access_block" "public_access_block" {
  for_each = toset([
    aws_s3_bucket.detection_content.id,
    aws_s3_bucket.attachments.id,
    aws_s3_bucket.log_bucket.id
  ])

  bucket = each.value

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket policies
resource "aws_s3_bucket_policy" "detection_bucket_policy" {
  bucket = aws_s3_bucket.detection_content.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceSSLOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.detection_content.arn,
          "${aws_s3_bucket.detection_content.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "EnforceKMSEncryption"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.detection_content.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      }
    ]
  })
}

# Transfer acceleration configuration (if enabled)
resource "aws_s3_bucket_accelerate_configuration" "detection_acceleration" {
  count  = var.enable_transfer_acceleration ? 1 : 0
  bucket = aws_s3_bucket.detection_content.id
  status = "Enabled"
}

# CORS configuration for web access
resource "aws_s3_bucket_cors_configuration" "detection_cors" {
  bucket = aws_s3_bucket.detection_content.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Outputs for reference
output "detection_bucket_id" {
  description = "The ID of the detection content bucket"
  value       = aws_s3_bucket.detection_content.id
}

output "attachments_bucket_id" {
  description = "The ID of the attachments bucket"
  value       = aws_s3_bucket.attachments.id
}

output "log_bucket_id" {
  description = "The ID of the log bucket"
  value       = aws_s3_bucket.log_bucket.id
}