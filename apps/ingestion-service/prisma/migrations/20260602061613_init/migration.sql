-- CreateTable
CREATE TABLE "telemetry_readings" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "site" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "values" JSONB,
    "unit" TEXT NOT NULL,
    "alarm" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "telemetry_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "site" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telemetry_readings_ts_idx" ON "telemetry_readings"("ts");

-- CreateIndex
CREATE INDEX "telemetry_readings_site_gateway_idx" ON "telemetry_readings"("site", "gateway");

-- CreateIndex
CREATE INDEX "telemetry_readings_metric_idx" ON "telemetry_readings"("metric");

-- CreateIndex
CREATE INDEX "alerts_createdAt_idx" ON "alerts"("createdAt");

-- CreateIndex
CREATE INDEX "alerts_site_gateway_idx" ON "alerts"("site", "gateway");
