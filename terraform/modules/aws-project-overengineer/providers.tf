terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.28.0, < 7.0.0"
    }
  }

  required_version = ">= 1.0.0"
}

provider "aws" {
  region = var.region
}
