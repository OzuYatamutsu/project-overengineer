module "aws_project_overengineer" {
  source = "./modules/aws-project-overengineer"

  environment_name = "staging"
  region           = "us-east-2"
}
