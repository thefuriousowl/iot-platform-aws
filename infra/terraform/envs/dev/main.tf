# Dev environment — cheap, single-AZ-tolerant, spot nodes.
# Composes the reusable modules. `prod/` uses the same modules with different vars.

terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # backend "s3" { ... }  # isolated state per env; configure per your account
}

provider "aws" {
  region = var.region
}

variable "region" {
  type    = string
  default = "eu-west-1" # EU region — relocation target
}

locals {
  name = "iot-dev"
}

module "network" {
  source = "../../modules/network"
  name   = local.name
  cidr   = "10.20.0.0/16"
}

module "eks" {
  source             = "../../modules/eks"
  name               = local.name
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_app_subnet_ids
  capacity_type      = "SPOT"
  instance_types     = ["t3.medium"]
  min_size           = 1
  max_size           = 3
}

module "data" {
  source                = "../../modules/data"
  name                  = local.name
  vpc_id                = module.network.vpc_id
  data_subnet_ids       = module.network.private_data_subnet_ids
  app_security_group_id = module.eks.node_security_group_id
  multi_az              = false
  instance_class        = "db.t4g.micro"
}

module "iam" {
  source            = "../../modules/iam"
  name              = local.name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  cold_bucket_arn   = module.data.cold_bucket_arn
}

output "cluster_name" { value = module.eks.cluster_name }
output "db_endpoint" { value = module.data.db_endpoint }
output "ingestion_role_arn" { value = module.iam.ingestion_role_arn }
output "cold_bucket" { value = module.data.cold_bucket_name }
