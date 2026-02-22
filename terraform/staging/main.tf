data "aws_availability_zones" "available" {
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# GitHub OIDC Provider
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

# Region name
data "aws_region" "current" {}

# IAM Role for GitHub Actions to access EKS
resource "aws_iam_role" "github_actions_eks" {
  name = "github-actions-eks-staging"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = data.aws_iam_openid_connect_provider.github.arn
      }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:OzuYatamutsu/project-overengineer:ref:refs/heads/feature/staging-deploy"
        }
      }
    }]
  })
}

# IAM role for GitHub Actions to access state (i.e., to run terraform destroy)
resource "aws_iam_role_policy" "github_actions_eks_backend" {
  name = "github-actions-eks-backend"

  role = aws_iam_role.github_actions_eks.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/terraform-locks"
      },
      {
        Effect   = "Allow"
        Action   = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::tf-state-project-overengineer",
          "arn:aws:s3:::tf-state-project-overengineer/*"
        ]
      }
    ]
  })
}

# Allow GitHub Actions to auth against EKS
resource "aws_iam_role_policy_attachment" "eks_access" {
  role       = aws_iam_role.github_actions_eks.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# Allow GitHub Actions to generate kubeconfig and access EKS resources
resource "aws_iam_role_policy_attachment" "eks_describe" {
  role       = aws_iam_role.github_actions_eks.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

# Allow GitHub Actions to run terraform destroy
resource "aws_iam_role_policy_attachment" "eks_backend_access" {
  role       = aws_iam_role.github_actions_eks.name
  policy_arn = aws_iam_role_policy.github_actions_eks_backend.arn
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"

  name = "internal-staging"

  cidr = "10.0.0.0/16"
  azs  = slice(data.aws_availability_zones.available.names, 0, 2)

  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.4.0/24", "10.0.5.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
    "kubernetes.io/cluster/project-overengineer-staging" = "shared"
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "21.15.1"

  name               = "project-overengineer-staging"
  kubernetes_version = "1.35"

  endpoint_public_access                   = true
  enable_cluster_creator_admin_permissions = true
  create_auto_mode_iam_resources           = true
  compute_config = {
    enabled    = true
    node_pools = ["general-purpose"]
  }

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  tags = {
    Environment = "dev"
    Terraform   = "true"
  }

  access_entries = {
    github_ci = {
      principal_arn = aws_iam_role.github_actions_eks.arn
      type          = "STANDARD"

      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }

    root_dashboard = {
      principal_arn = "arn:aws:iam::024071421233:root"
      type          = "STANDARD"

      policy_associations = {
        admin = {
          policy_arn   = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }
  }
}
