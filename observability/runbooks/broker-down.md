# Runbook: BrokerDown

**Severity:** critical. EMQX is the ingestion front door; while down, no field telemetry
is accepted.

## Immediate checks
1. `kubectl get pods -n iot -l app=emqx` — pod status / restarts.
2. Recent deploy? `argocd app history emqx` — consider `git revert`.
3. Node pressure? Was the pod evicted (spot reclaim in dev)?

## Remediation
- CrashLoopBackOff → inspect `kubectl logs`; check config/secret changes.
- Spot reclaim (dev) → node group should replace; confirm scheduling.
- Persisting → roll back the last EMQX chart change via Git.

## Note
Field gateways buffer and retry on reconnect, but buffers are finite — restore promptly.
