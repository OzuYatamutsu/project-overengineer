variable "environment_name" {
  description = "The name of the environment (e.g., dev, staging, prod)"
  type        = string
}
variable "region" {
  description = "The AWS region to deploy resources in"
  type        = string
}