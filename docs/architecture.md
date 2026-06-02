# Architecture

## End-to-end data flow

```mermaid
flowchart TB
    subgraph Field["Field sites (factory / municipal)"]
        G1["Gateway @ Plant A"]
        G2["Gateway @ Water Plant B"]
    end

    subgraph Cloud["AWS VPC"]
        direction TB
        EMQX["EMQX broker<br/>MQTT/TLS"]
        ING["Ingestion service<br/>NestJS · TCP transport"]
        REDIS["Redis Sentinel<br/>HA cache + RPC"]
        TS[("RDS PostgreSQL<br/>+ TimescaleDB")]
        S3[("S3<br/>cold storage")]
        NOTIF["Alert notifier"]
    end

    OPS["Operators / dashboards"]

    G1 & G2 -->|publish telemetry| EMQX
    EMQX -->|subscribe| ING
    ING -->|dedup / coordinate| REDIS
    ING -->|hot writes| TS
    TS -->|lifecycle aging| S3
    ING -->|threshold breach| NOTIF
    NOTIF -->|page| OPS
    TS -->|queries| OPS
```

## Why these components

| Component        | Choice                | Alternative considered | Why this one |
|------------------|-----------------------|------------------------|--------------|
| Ingestion bus    | EMQX (MQTT)           | Kafka                  | MQTT is the native protocol for constrained field devices; lighter to operate at this scale |
| Inter-service    | NestJS TCP transport  | HTTP REST everywhere   | Lower overhead for internal RPC; REST kept for external/client APIs |
| HA cache / coord | Redis Sentinel        | Single Redis           | Removes single point of failure; automatic primary failover |
| Time-series DB   | TimescaleDB on RDS    | Self-hosted Influx     | Managed Postgres ops + SQL + time-series; no DB babysitting |
| Cold storage     | S3 + lifecycle        | Keep all in DB         | DB stays small/fast; old telemetry archived cheaply |
| Orchestration    | EKS (k3s early-stage) | ECS / plain VMs        | Kubernetes-native, portable, autoscaling |

## Failure domains

Every service runs as an independent deployment with its own probes and disruption budget.
A restart or crash of one (say the alert notifier) does not stop ingestion or the broker.
This is the "services fail independently" principle from the field: in a factory, a partial
outage that keeps gas monitoring alive is acceptable; a full outage is not.

## Layered repo → layered responsibility

```mermaid
flowchart LR
    A["infra/terraform<br/>(Cloud)"] --> B["platform/<br/>(Platform)"]
    B --> C["apps/ + observability/<br/>(Workload + SRE)"]
```

Terraform creates the ground (VPC/EKS/RDS/S3/IAM). ArgoCD + Helm install the platform onto
it. The apps and observability run on the platform. Each layer is independently reviewable.
