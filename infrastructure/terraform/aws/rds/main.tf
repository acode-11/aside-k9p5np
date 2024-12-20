# AWS RDS Infrastructure Configuration for AI-Powered Detection Platform
# Version: ~> 5.0
# Purpose: Provisions and manages a highly available PostgreSQL RDS cluster

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Local variables for resource naming and tagging
locals {
  name_prefix = "${var.project}-${var.environment}"
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}

# DB Subnet Group for Multi-AZ deployment
resource "aws_db_subnet_group" "main" {
  name        = "${local.name_prefix}-db-subnet-group"
  description = "Database subnet group for ${local.name_prefix} RDS instance"
  subnet_ids  = var.vpc.private_subnet_ids

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-subnet-group"
  })
}

# Custom Parameter Group for PostgreSQL optimization
resource "aws_db_parameter_group" "main" {
  name        = "${local.name_prefix}-pg15-params"
  family      = "postgres15"
  description = "Custom parameter group for ${local.name_prefix} PostgreSQL 15"

  # Memory Management
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"  # 25% of instance memory
  }

  parameter {
    name  = "work_mem"
    value = "16384"  # 16MB for complex query optimization
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "2097152"  # 2GB for maintenance operations
  }

  # WAL Configuration
  parameter {
    name  = "wal_buffers"
    value = "16384"  # 16MB for write-ahead logging
  }

  parameter {
    name  = "checkpoint_timeout"
    value = "900"  # 15 minutes between checkpoints
  }

  # Query Optimization
  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"  # 75% of instance memory
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"  # Optimized for SSD storage
  }

  tags = local.common_tags
}

# Primary RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-postgresql"
  
  # Engine Configuration
  engine               = "postgres"
  engine_version       = var.db_engine_version
  instance_class       = var.db_instance_class
  
  # Storage Configuration
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  
  # Network Configuration
  db_subnet_group_name = aws_db_subnet_group.main.name
  multi_az             = var.multi_az
  publicly_accessible  = false
  
  # Performance Configuration
  parameter_group_name = aws_db_parameter_group.main.name
  
  # Backup Configuration
  backup_retention_period = var.db_backup_retention_period
  backup_window          = "03:00-04:00"  # UTC
  maintenance_window     = "Mon:04:00-Mon:05:00"  # UTC
  
  # Security Configuration
  deletion_protection = var.deletion_protection
  
  # Monitoring Configuration
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # Enhanced Monitoring IAM Role
  depends_on = [aws_iam_role_policy_attachment.rds_monitoring]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-postgresql"
  })
}

# Enhanced Monitoring IAM Role
resource "aws_iam_role" "rds_monitoring" {
  name = "${local.name_prefix}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# Attach Enhanced Monitoring Policy
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Outputs
output "db_instance_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_id" {
  description = "The identifier of the RDS instance"
  value       = aws_db_instance.main.id
}

output "db_subnet_group_name" {
  description = "The name of the database subnet group"
  value       = aws_db_subnet_group.main.name
}