terraform {
  backend "s3" {
    bucket         = "tf-state-project-overengineer"
    key            = "prod/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

module "aws_project_overengineer" {
  source = "../../modules/aws-project-overengineer"

  environment_name = "prod"
  region           = "us-east-2"
}
