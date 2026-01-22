terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.13.0, < 6.0.0"
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

# Allow EKS nodes to work with EBS CSI Driver
resource "aws_iam_role_policy_attachment" "node_ec2" {
  role       = module.eks.eks_managed_node_groups["ng1"].iam_role_name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEBSCSIDriverPolicy"
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
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.8.5"

  cluster_name    = "project-overengineer-staging"
  cluster_version = "1.34"

  cluster_endpoint_public_access           = true
  enable_cluster_creator_admin_permissions = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_group_defaults = {
    ami_type = "AL2023_x86_64_STANDARD"
  }

  eks_managed_node_groups = {
    ng1 = {
      name = "node-group-1"

      instance_types = ["m7i-flex.large"]

      min_size     = 1
      max_size     = 3
      desired_size = 2
    }
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
