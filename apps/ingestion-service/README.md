# Ingestion Service (NestJS)

Subscribes to EMQX, validates/deduplicates telemetry (using Redis), writes hot data to
TimescaleDB, ages cold data to S3 (via the IRSA role from Terraform), and emits the metrics
the SLOs are built on (`alert_latency_seconds`, `ingestion_messages_*`, `ingestion_queue_depth`).

Uses **NestJS microservices with TCP transport** for internal RPC (low overhead) and REST
for the external/client API — the same split described in
[docs/architecture.md](../../docs/architecture.md).

> This folder is a scaffold placeholder in the portfolio repo; the architectural role and
> the metrics it must export are documented so the platform/observability wiring is concrete.
