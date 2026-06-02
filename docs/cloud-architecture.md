# Cloud Architecture (Cloud Engineer / Solutions Architect view)

This document explains the AWS design. Everything described here is provisioned by the
Terraform under [`infra/terraform/`](../infra/terraform).

## Network (VPC)

A single VPC with a clear public/private split across two Availability Zones.

| Tier            | Subnets        | What lives here                          | Internet path |
|-----------------|----------------|------------------------------------------|---------------|
| Public          | 2 (one per AZ) | NAT Gateway, load balancers              | Internet Gateway |
| Private (app)   | 2 (one per AZ) | EKS worker nodes, ingestion pods         | NAT Gateway (egress only) |
| Private (data)  | 2 (one per AZ) | RDS, ElastiCache/Redis                   | No internet route |

Rationale:
- **Data subnets have no route to the internet** — RDS is unreachable from outside the VPC.
- **Workers run in private subnets**; only the load balancer is public-facing.
- **Two AZs** so a single AZ failure does not take the platform down (matches "uptime is
  non-negotiable" for safety-critical monitoring).

Security groups are referenced by ID (SG-to-SG rules), not CIDR, so the rules read as
"the ingestion SG may reach the database SG on 5432" rather than opaque IP ranges.

## Compute (EKS)

- Managed EKS control plane.
- One managed node group. In `dev` it uses **spot instances** and a small instance type
  to keep cost low; `prod` uses on-demand with a larger min size.
- Cluster autoscaler so node count tracks workload.

## Data

- **RDS PostgreSQL** with the **TimescaleDB** extension for time-series telemetry.
  Managed backups, multi-AZ in `prod`, single-AZ in `dev`.
- **S3** for cold telemetry. A lifecycle policy transitions objects to Infrequent Access
  after 30 days and Glacier after 90, then expires per retention policy. This is where the
  cost story for long-term sensor history lives.

## Identity (IAM) — least privilege + IRSA

- **IRSA (IAM Roles for Service Accounts):** each workload that needs AWS (e.g. the
  ingestion service writing aged data to S3) gets its own IAM role bound to its Kubernetes
  service account via the cluster OIDC provider. **No long-lived AWS keys live in the
  cluster.**
- Policies are scoped to specific resources (one S3 bucket ARN, not `s3:*` on `*`).
- A separate, tightly-scoped role for the Terraform CI runner.

See [`infra/terraform/modules/iam`](../infra/terraform/modules/iam).

## Multi-environment

`infra/terraform/envs/dev` and `infra/terraform/envs/prod` both consume the same modules
with different variables (instance sizes, AZ count, multi-AZ RDS, spot vs on-demand).
State is isolated per environment via separate backends. This demonstrates the difference
between "deployed once" and "designed to be deployed repeatedly across environments."

## Cost

See [cost.md](cost.md) — including the deliberate k3s-on-EC2 vs EKS trade-off that mirrors
a real early-stage-to-scale decision.
