terraform {
  backend "s3" {
    bucket         = "tf-state-project-overengineer"
    key            = "staging/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

module "aws_project_overengineer" {
  source = "../../modules/aws-project-overengineer"

  environment_name = "staging"
  region           = "us-east-2"
}
