variable "name" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "capacity_type" {
  type    = string
  default = "SPOT"
}
variable "instance_types" {
  type    = list(string)
  default = ["t3.medium"]
}
variable "min_size" {
  type    = number
  default = 1
}
variable "max_size" {
  type    = number
  default = 3
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.name
  cluster_version = "1.30"

  vpc_id                         = var.vpc_id
  subnet_ids                     = var.private_subnet_ids
  enable_irsa                    = true # OIDC provider for IRSA
  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    default = {
      capacity_type  = var.capacity_type
      instance_types = var.instance_types
      min_size       = var.min_size
      max_size       = var.max_size
      desired_size   = var.min_size
      labels         = { workload = "iot-platform" }
    }
  }

  tags = { Project = var.name }
}

output "cluster_name" { value = module.eks.cluster_name }
output "cluster_endpoint" { value = module.eks.cluster_endpoint }
output "oidc_provider_arn" { value = module.eks.oidc_provider_arn }
output "oidc_provider_url" { value = replace(module.eks.cluster_oidc_issuer_url, "https://", "") }
output "node_security_group_id" { value = module.eks.node_security_group_id }
output "lbc_role_arn" { value = aws_iam_role.lbc.arn }
output "cluster_certificate_authority_data" { 
  value = module.eks.cluster_certificate_authority_data 
}
