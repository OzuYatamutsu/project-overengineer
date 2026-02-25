module "aws_project_overengineer" {
  source = "../../modules/aws-project-overengineer"

  environment_name = "production"
  region           = "us-east-2"
}
