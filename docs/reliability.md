# Reliability & SLOs (SRE view)

In safety-critical industrial monitoring, an alert that arrives late is worse than no alert.
This layer makes reliability explicit and testable. Everything lives under
[`observability/`](../observability).

## SLOs as code

| SLO                              | Target            | Why |
|----------------------------------|-------------------|-----|
| Gas-leak alert latency           | < 1s p99          | A gas detection event must page operators near-instantly |
| Telemetry ingestion availability | 99.9% monthly     | Lost telemetry = blind spots in monitoring |
| Broker (EMQX) availability       | 99.95% monthly    | The ingestion front door cannot be the weak link |
| Dashboard read latency           | < 500ms p95       | Operators trust dashboards only if they feel live |

SLOs are defined in [`observability/alerts/slo.rules.yaml`](../observability/alerts/slo.rules.yaml)
as Prometheus recording + alerting rules, so error budget burn is queryable, not aspirational.

## Alerting

Alert rules in [`observability/alerts/`](../observability/alerts) cover the scenarios that
actually hurt in this domain:

- **AlertLatencyHigh** — end-to-end sensor-event-to-page latency exceeds SLO.
- **BrokerDown / BrokerConnectionsDropping** — EMQX unavailable or shedding clients.
- **RedisFailover** — Sentinel promoted a new primary (informational, but you want to know).
- **IngestionLagGrowing** — telemetry arriving faster than it's written to TimescaleDB.
- **SiteOffline** — a known gateway stopped reporting (often a field/network problem).

## Runbooks

Each alert links to a runbook in [`observability/runbooks/`](../observability/runbooks)
with: what it means, immediate checks, likely causes, and remediation. Example:
[gas-alert-latency.md](../observability/runbooks/gas-alert-latency.md).

## Dashboards as code

Grafana dashboards are committed as JSON in
[`observability/dashboards/`](../observability/dashboards) and provisioned automatically —
no click-ops, dashboards are reviewed and versioned like everything else.

## Roadmap: chaos + tracing

- **Distributed tracing** (OpenTelemetry → Tempo) so a slow alert can be traced across
  broker → ingestion → DB → notifier.
- **Chaos test:** kill the Redis primary in `dev` and assert Sentinel failover completes and
  alert latency stays within SLO — turning "HA design" into "HA proven."
