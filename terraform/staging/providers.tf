terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.28.0, < 7.0.0"
    }
  }

  backend "s3" {
    bucket         = "tf-state-project-overengineer"
    key            = "staging/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }

  required_version = ">= 1.0.0"
}

provider "aws" {
  region = "us-east-2"
}
