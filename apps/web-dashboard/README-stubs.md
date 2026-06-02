# Web Dashboard (Angular)

An operator-facing real-time dashboard for the platform: site/gateway status, live readings,
an active-alert feed with acknowledge, and SLO summary tiles.

This is deliberately **complementary to Grafana** — Grafana is the deep technical/metrics
view; this is the at-a-glance operations surface an industrial/municipal client would watch
on a control-room screen.

## See it now (no build)

Open [`demo/index.html`](demo/index.html) in any browser. It runs the same simulator logic
as [`apps/sensor-simulator`](../sensor-simulator) in JavaScript, so you get live telemetry, a
gas-leak alarm firing, SLO tiles updating, and alert acknowledge — with no backend.

> The demo mirrors the real Angular UI in a single self-contained file so reviewers can see
> it instantly. The production app is the Angular code under [`src/`](src).

## Run the real Angular app

```bash
npm install
npm start            # ng serve -> http://localhost:4200
```

By default it talks to the Client API at `localhost:3000/api` and the live WebSocket stream
at `localhost:3001` (see `src/environments/`). Point those at port-forwarded cluster services
or run the ingestion service locally.

## Architecture role

```
Field sensors → EMQX → Ingestion service ─┬─ TimescaleDB ──→ Client API (REST) ─┐
                                          └─ live events (WebSocket) ───────────┤
                                                                                ▼
                                                                        Web Dashboard (this)
```

- **REST** (`/api`) for snapshots: sites, active alerts, SLO state.
- **WebSocket** (`/stream`) for the live push of readings and alert events.
- Reactive UI built with **Angular signals**.

## Build & deploy (GitOps)

- `Dockerfile` is multi-stage: build with Node, serve static files via nginx.
- `nginx.conf` serves the SPA and proxies `/api` and `/stream` to in-cluster services.
- Deployed by Helm chart [`platform/helm/web-dashboard`](../../platform/helm/web-dashboard)
  and synced by ArgoCD ([`platform/argocd/apps/web-dashboard.yaml`](../../platform/argocd/apps/web-dashboard.yaml))
  — the same GitOps flow as every other component, so the frontend is a first-class platform
  citizen, not a bolt-on.
