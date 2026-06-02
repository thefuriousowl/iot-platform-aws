# Cost Design & the k3s-vs-EKS Decision

Cloud engineers are judged not only on "does it work" but on "what does it cost and why."
This document is intentionally explicit about both.

## The early-stage vs scale trade-off

A real greenfield Industrial IoT platform often starts with a handful of factory/municipal
sites. Paying for a fully managed control plane plus always-on managed data services from
day one can be hard to justify before there is revenue.

| Stage        | Compute choice          | Reasoning |
|--------------|-------------------------|-----------|
| Early-stage  | **k3s on EC2 (spot)**   | Lowest operational cost; no control-plane fee; still Kubernetes-native so manifests/Helm carry over unchanged |
| Scale        | **EKS managed**         | Offload control-plane ops, get autoscaling/upgrades/HA, worth the fee once uptime SLAs and team size grow |

Because both run standard Kubernetes, **the platform layer (Helm charts, ArgoCD apps,
operator) is identical in both** — migration is an infrastructure concern, not an
application rewrite. That portability is the whole point of choosing k3s first instead of a
proprietary early-stage shortcut.

This repo's Terraform provisions EKS (so the cloud-engineering surface is visible), but the
k3s path is documented as the cost-aware alternative.

## Keeping `dev` cheap

The `dev` environment is built to be torn up and down:

- Spot instances for the EKS node group.
- Smallest reasonable node type, min size 1.
- `db.t4g.micro` single-AZ RDS.
- S3 lifecycle so test data doesn't accumulate at Standard pricing.
- `terraform destroy` removes everything.

## Cost in CI (roadmap)

The CI pipeline is set up to run **Infracost** on every Terraform PR so the cost delta of a
change is visible in review before merge — making cost a first-class part of the workflow
rather than a monthly surprise.

> Note: figures depend on region and current AWS pricing. The point of this doc is the
> *method* — explicit trade-offs, cheap-by-default dev, cost visibility in CI — not a fixed
> dollar amount.
