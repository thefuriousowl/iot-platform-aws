import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { Inject, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TelemetryPayload } from "../telemetry/telemetry.dto";
import { MetricsService } from "../metrics/metrics.service";

// Threshold configuration per metric
const THRESHOLDS: Record<string, { warning: number; critical: number }> = {
    combustible_gas_ppm: { warning: 25, critical: 50 },
    co2_ppm: { warning: 1000, critical: 2000 },
    co_ppm: { warning: 9, critical: 35 },
    h2s_ppm: { warning: 10, critical: 15 },
    o2_percent: { warning: 19.5, critical: 23.5 },
}

export class AlertService {
    private readonly logger = new Logger(AlertService.name);

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private prisma: PrismaService,
        private metrics: MetricsService,
    ) { }

    /**
     * Generate a unique key for alert deduplication
     * Prevents creating multiple alerts for the same ongoing condition
     */
    private getAlertKey(payload: TelemetryPayload): string {
        return `alert:${payload.site}:${payload.gateway}:${payload.metric}`;
    }

    /**
     * Evaluate thresholds and create alerts if needed
     */
    async evaluateThresholds(payload: TelemetryPayload): Promise<void> {
        if (payload.value === undefined) return; // Skip multi-value metrics for now

        const threshold = THRESHOLDS[payload.metric];

        if (!threshold) return; // No threshold defined for this metric

        const { warning, critical } = threshold;
        let severity: 'warning' | 'critical' | null = null;
        let thresholdValue = 0;

        if (payload.value >= critical) {
            severity = 'critical';
            thresholdValue = critical;
        } else if (payload.value >= warning) {
            severity = 'warning';
            thresholdValue = warning;
        }

        if (!severity) return; // Value is within normal range

        // Check if we already have an active alert for this condition (cooldown)
        const alertKey = this.getAlertKey(payload);
        const existingAlert = await this.cacheManager.get(alertKey);

        if (existingAlert) {
            this.logger.debug(`Existing alert already active for key: ${alertKey}, skipping new alert creation.`);
            return; // Alert already active, skip creating a new one
        }

        // Start timing for latency metrics
        const startTime = Date.now();

        // Create new alert
        const alert = await this.prisma.alert.create({
            data: {
                site: payload.site,
                gateway: payload.gateway,
                metric: payload.metric,
                value: payload.value,
                severity,
                threshold: thresholdValue,
            }
        })

        // Track alert latency
        const latencySeconds = (Date.now() - startTime) / 1000;
        this.metrics.alertLatency.observe(
            { site: payload.site, gateway: payload.gateway, severity },
            latencySeconds,
        );

        // Track alert created
        this.metrics.alertsCreated.inc({
            site: payload.site,
            gateway: payload.gateway,
            severity,
        });


        // Set cooldown (5 min) to prevent alert spam
        await this.cacheManager.set(alertKey, alert.id, 5 * 60 * 1000);

        this.logger.warn(
            `ALERT: [${severity.toUpperCase()}] ${payload.site}/${payload.gateway} - ${payload.metric} = ${payload.value} (threshold: ${thresholdValue})`
        )
    }
}