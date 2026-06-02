# Prod environment — same modules as dev, hardened settings.
# Demonstrates "designed to deploy repeatedly", not "deployed once".

terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # backend "s3" { ... }  # SEPARATE state from dev
}

provider "aws" {
  region = var.region
}

variable "region" {
  type    = string
  default = "eu-west-1"
}

locals {
  name = "iot-prod"
}

module "network" {
  source = "../../modules/network"
  name   = local.name
  cidr   = "10.30.0.0/16"
}

module "eks" {
  source             = "../../modules/eks"
  name               = local.name
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_app_subnet_ids
  capacity_type      = "ON_DEMAND" # stability over cost in prod
  instance_types     = ["m5.large"]
  min_size           = 2           # spread across AZs
  max_size           = 6
}

module "data" {
  source                = "../../modules/data"
  name                  = local.name
  vpc_id                = module.network.vpc_id
  data_subnet_ids       = module.network.private_data_subnet_ids
  app_security_group_id = module.eks.node_security_group_id
  multi_az              = true            # HA database in prod
  instance_class        = "db.r6g.large"
}

module "iam" {
  source            = "../../modules/iam"
  name              = local.name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  cold_bucket_arn   = module.data.cold_bucket_arn
}
