# Runbook: SiteOffline

**Severity:** warning. A known site/gateway stopped reporting for >120s. Often a field-side
network or power issue rather than a platform fault — but must be distinguished quickly.

## Triage
1. Only one site affected? → likely field-side (network/power at that site).
2. Many sites at once? → likely platform/broker side; check `BrokerDown`.
3. Check last-seen per gateway to localize.

## Action
- Single site: notify field/ops contact for that location.
- Multiple sites: treat as platform incident, escalate.
