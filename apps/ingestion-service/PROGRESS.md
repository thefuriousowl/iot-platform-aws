# Ingestion Service - Development Progress

## Session: 2026-06-02

### What We Built

A fully functional **NestJS ingestion service** that:

1. **Subscribes to MQTT** - Receives telemetry from IoT sensors via EMQX broker
2. **Deduplicates messages** - Uses Redis to prevent processing duplicate messages
3. **Persists to TimescaleDB** - Stores time-series telemetry data using Prisma ORM
4. **Evaluates thresholds** - Creates alerts when sensor values exceed defined limits
5. **Alert cooldown** - Prevents alert spam with 5-minute cooldown per metric

---

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Sensor Simulator│────▶│   MQTT Broker   │────▶│ Ingestion Svc   │
│    (Python)     │     │  (Mosquitto)    │     │    (NestJS)     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌────────────────────────────────┼────────────────────────────────┐
                        │                                │                                │
                        ▼                                ▼                                ▼
                ┌───────────────┐              ┌─────────────────┐              ┌─────────────────┐
                │     Redis     │              │   TimescaleDB   │              │  AlertService   │
                │  (Dedup TTL)  │              │   (Telemetry)   │              │  (Thresholds)   │
                └───────────────┘              └─────────────────┘              └─────────────────┘
```

---

### Files Created

```
apps/ingestion-service/
├── src/
│   ├── main.ts                      # Hybrid HTTP + MQTT server
│   ├── app.module.ts                # Root module with all imports
│   ├── prisma/
│   │   ├── prisma.module.ts         # Global Prisma module
│   │   └── prisma.service.ts        # Prisma client service
│   ├── telemetry/
│   │   ├── telemetry.module.ts      # Telemetry feature module
│   │   ├── telemetry.controller.ts  # MQTT message handler
│   │   ├── telemetry.service.ts     # Business logic + dedup
│   │   └── telemetry.dto.ts         # Data transfer object
│   └── alert/
│       ├── alert.module.ts          # Alert feature module
│       └── alert.service.ts         # Threshold evaluation
├── prisma/
│   ├── schema.prisma                # Database schema
│   └── migrations/                  # Migration files
├── package.json
├── tsconfig.json
└── .env                             # Environment variables
```

---

### Database Schema (Prisma)

```prisma
model TelemetryReading {
  id        String   @id @default(cuid())
  ts        DateTime
  site      String
  gateway   String
  metric    String
  value     Float?
  values    Json?
  unit      String
  alarm     Boolean
}

model Alert {
  id           String   @id @default(cuid())
  createdAt    DateTime
  site         String
  gateway      String
  metric       String
  value        Float
  threshold    Float
  severity     String   // "warning" | "critical"
  acknowledged Boolean
}
```

---

### Threshold Configuration

| Metric | Warning | Critical |
|--------|---------|----------|
| combustible_gas_ppm | 25 ppm | 50 ppm |

---

### Dependencies Installed

```json
{
  "@nestjs/microservices": "^11.x",
  "@nestjs/cache-manager": "^3.x",
  "@nestjs/config": "^3.x",
  "@prisma/client": "^6.x",
  "mqtt": "^5.x",
  "cache-manager": "^7.x",
  "cache-manager-redis-yet": "^5.x",
  "redis": "^6.x"
}
```

---

### How to Run Locally

```bash
# 1. Start dependencies (Docker)
docker run -d -p 1883:1883 eclipse-mosquitto:2 mosquitto -c /mosquitto-no-auth.conf
docker run -d -p 6379:6379 redis:7-alpine
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=iot_telemetry timescale/timescaledb:latest-pg16

# 2. Setup database
cd apps/ingestion-service
pnpm install
pnpm prisma migrate dev

# 3. Start ingestion service
pnpm start:dev

# 4. Start simulator (another terminal)
cd apps/sensor-simulator
source venv/bin/activate
python sim.py --profile gas-detection --rate 1
```

---

### What's Next (TODO)

- [ ] Add Prometheus metrics (`/metrics` endpoint)
- [ ] Create Dockerfile for containerization
- [ ] Add WebSocket endpoint for live streaming
- [ ] Add REST API endpoints for querying telemetry/alerts
- [ ] Unit tests for threshold evaluation logic

---

### Lessons Learned

1. **Prisma v6** uses `prisma.config.ts` for database URL (not in schema.prisma)
2. **NestJS Hybrid App** can run HTTP + MQTT simultaneously
3. **Redis TTL** is great for deduplication and alert cooldown
4. **MQTT wildcards** (`+`) work with NestJS `@MessagePattern`

---

*Last updated: 2026-06-02 15:00*
