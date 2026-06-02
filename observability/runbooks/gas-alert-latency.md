# Runbook: GasAlertLatencyHigh

**Severity:** critical — safety domain. A gas-detection alert is taking >1s (p99) to reach
operators. In a real plant this is the difference between a contained leak and an incident.

## Immediate checks
1. Is EMQX healthy? `BrokerDown` firing too? → start there.
2. Ingestion queue depth (`ingestion_queue_depth`) — is the consumer keeping up?
3. Redis Sentinel — did a failover just happen (`RedisFailover`)? Reconnect storms add latency.
4. DB write latency to TimescaleDB — slow inserts back-pressure the pipeline.

## Likely causes & remediation
| Cause | Remediation |
|-------|-------------|
| Ingestion under-scaled | Scale the ingestion Deployment / check HPA |
| Redis failover in progress | Confirm new primary elected; latency should self-resolve |
| TimescaleDB slow | Check RDS CPU / IOPS; verify hypertable chunk sizing |
| Broker overloaded | Check EMQX connection count and message rate |

## Verify recovery
`job:alert_latency_seconds:p99` back under 1s for 5+ minutes.
