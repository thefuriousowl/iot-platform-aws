# Runbook: Redis Failover Recovery

## Overview

| Field | Value |
|-------|-------|
| **SLO** | Recovery < 10 seconds |
| **Impact** | Duplicate messages may occur during failover |
| **Automated Test** | `scripts/chaos-redis-failover.sh` |

## Symptoms

- Alert: `NoMessagesReceived` firing
- Ingestion service logs showing Redis connection errors
- Prometheus metric `redis_up` = 0

## Investigation

1. Check Redis status:
   ```bash
   docker ps | grep redis
   kubectl get pods -l app=redis  # if on K8s
   ```

2. Check Redis logs:
   ```bash
   docker logs iot-platform-aws-redis-1 --tail 50
   ```

3. Check ingestion service logs:
   ```bash
   docker logs ingestion-service --tail 50 | grep -i redis
   ```

## Remediation

### Local (Docker Compose)

```bash
# Restart Redis
docker compose up -d redis

# Verify recovery
curl http://localhost:3000/health
```

### Production (Kubernetes)

```bash
# Check Redis Sentinel status
kubectl exec -it redis-0 -- redis-cli -p 26379 SENTINEL masters

# Force failover if needed
kubectl exec -it redis-0 -- redis-cli -p 26379 SENTINEL failover mymaster

# Verify new primary
kubectl exec -it redis-0 -- redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

## Chaos Test

Run the automated chaos test to verify recovery SLO:

```bash
./scripts/chaos-redis-failover.sh
```

Expected output:
```
✅ PASS: Recovery time 3.2s (SLO: < 10s)
```

## Prevention

- Use Redis Sentinel (3+ nodes) in production
- Configure connection retry in ingestion service
- Set appropriate connection timeouts

## Related

- [Platform Architecture](../../docs/platform.md)
- [SLO Definitions](../../docs/reliability.md)
