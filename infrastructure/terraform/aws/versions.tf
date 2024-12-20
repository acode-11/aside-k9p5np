# Terraform version constraints and required provider configurations for the AI-Powered Detection Platform
# Version: 1.0.0
# Provider versions:
# - hashicorp/terraform ~> 1.6
# - hashicorp/aws ~> 5.0

terraform {
  # Enforce minimum Terraform version to ensure compatibility with AWS provider features
  # and maintain infrastructure deployment stability
  required_version = ">= 1.6.0"

  # Define required providers with specific version constraints
  # AWS provider is used for deploying and managing all cloud infrastructure components
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}