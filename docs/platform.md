# Platform Engineering (Platform / DevOps view)

The platform layer turns the raw cloud infrastructure into something a development team can
deploy onto safely and repeatedly. Everything here lives under [`platform/`](../platform).

## GitOps with ArgoCD

The cluster's desired state lives in Git. After a one-time bootstrap
(`kubectl apply -k platform/argocd/bootstrap`), ArgoCD continuously reconciles the cluster
to match the repo:

- **App-of-apps pattern:** a single root Application points at `platform/argocd/apps/`,
  which declares every component (EMQX, TimescaleDB client config, Redis Sentinel,
  observability stack, ingestion service, operator).
- A change is a Git commit + merge — no `kubectl apply` by hand, full audit trail, trivial
  rollback (`git revert`).

This replaces "push from Jenkins" with "Git is the source of truth, the cluster pulls."
Jenkins/GitHub Actions still build and test images; ArgoCD owns *deployment*.

## Helm packaging

Each stateful component is a Helm chart so it's versioned and configurable per environment:

- **EMQX** — MQTT ingestion broker, with TLS listeners and per-site auth.
- **TimescaleDB** — connection/config layer pointing at managed RDS (DB itself is managed).
- **Redis Sentinel** — HA caching + RPC coordination. Sentinel is what removes the single
  point of failure: on primary loss, sentinels elect a replica and clients re-discover the
  new primary automatically.

## Zero-downtime deploys

Services are configured with rolling updates, readiness/liveness probes, and
`PodDisruptionBudgets`, so deployments and node drains don't drop telemetry — independent
failure domains mean one service restarting doesn't cascade.

## Kubernetes Operator: `SensorGateway`

A small operator (scaffolded with kubebuilder) introduces a custom resource:

```yaml
apiVersion: iot.unnop.dev/v1alpha1
kind: SensorGateway
metadata:
  name: plant-a-stack-3
spec:
  site: plant-a
  protocol: modbus-tcp
  sampleIntervalSeconds: 5
  alertProfile: gas-detection
```

Applying this CR makes the operator reconcile the supporting Kubernetes objects (a
per-gateway ingestion config, an EMQX auth entry, the matching Prometheus alert rules).
This shows control-plane-level Kubernetes knowledge — extending the API rather than just
consuming it — which is the line between "uses Kubernetes" and "builds on Kubernetes."

See [`platform/operator/sensorgateway`](../platform/operator/sensorgateway).

## CI/CD

[`.github/workflows`](../.github/workflows) runs, on every PR:

1. `terraform fmt -check` + `terraform validate` + `terraform plan`
2. Helm lint
3. Container image build + scan
4. (roadmap) Infracost diff comment

Merging to `main` updates image tags in the GitOps repo; ArgoCD does the rest.
