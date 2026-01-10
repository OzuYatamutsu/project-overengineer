terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region              = "us-east-2"
}

resource "aws_vpc" "internal" {
  cidr_block     = "10.0.0.0/16"
}
