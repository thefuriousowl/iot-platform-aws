# EKS module

This module provisions the EKS cluster and one managed node group. For brevity in this
portfolio scaffold it wraps the well-maintained community module
[`terraform-aws-modules/eks/aws`](https://github.com/terraform-aws-modules/terraform-aws-eks)
rather than reimplementing the control-plane plumbing by hand — which is also the realistic
production choice.

Key configuration this module sets:

- Cluster OIDC provider **enabled** (required for IRSA — see `../iam`).
- Managed node group:
  - `dev`: capacity type `SPOT`, small instance type, `min_size = 1`.
  - `prod`: capacity type `ON_DEMAND`, larger min size, multi-AZ.
- Cluster autoscaler tags.
- Private API endpoint with restricted public access CIDRs.

Outputs consumed elsewhere:

- `cluster_name`, `cluster_endpoint`
- `oidc_provider_arn`, `oidc_provider_url` → passed into the `iam` module for IRSA
- `node_security_group_id` → referenced by the `data` module so RDS only accepts the app tier

See [`main.tf`](main.tf) for the wiring.
