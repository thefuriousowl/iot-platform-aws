# IAM module: IRSA (IAM Roles for Service Accounts).
# Gives the ingestion pod a scoped IAM role via the cluster OIDC provider —
# NO long-lived AWS access keys inside the cluster.

variable "name" { type = string }
variable "oidc_provider_arn" { type = string }
variable "oidc_provider_url" { type = string } # without https://
variable "cold_bucket_arn" { type = string }
variable "service_account_namespace" {
  type    = string
  default = "iot"
}
variable "service_account_name" {
  type    = string
  default = "ingestion"
}

data "aws_iam_policy_document" "assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }
    # Restrict to exactly this namespace/service-account.
    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:sub"
      values   = ["system:serviceaccount:${var.service_account_namespace}:${var.service_account_name}"]
    }
    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ingestion" {
  name               = "${var.name}-ingestion-irsa"
  assume_role_policy = data.aws_iam_policy_document.assume.json
  tags               = { Name = "${var.name}-ingestion-irsa" }
}

# Least privilege: only put/get on the one cold bucket, nothing else.
data "aws_iam_policy_document" "ingestion" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
    ]
    resources = ["${var.cold_bucket_arn}/*"]
  }
  statement {
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [var.cold_bucket_arn]
  }
}

resource "aws_iam_role_policy" "ingestion" {
  name   = "${var.name}-ingestion-s3"
  role   = aws_iam_role.ingestion.id
  policy = data.aws_iam_policy_document.ingestion.json
}

output "ingestion_role_arn" { value = aws_iam_role.ingestion.arn }
