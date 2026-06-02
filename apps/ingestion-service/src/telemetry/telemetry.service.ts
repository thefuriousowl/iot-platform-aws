import { Inject, Injectable, Logger } from '@nestjs/common';
import { TelemetryPayload } from './telemetry.dto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AlertService } from '../alert/alert.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class TelemetryService {
    private readonly logger = new Logger(TelemetryService.name);

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private prisma: PrismaService,
        private alertService: AlertService,
        private metrics: MetricsService,
    ) { }

    /**
     * Generate a unique kry for deduplication
     * Based on: site + gateway + timestamp + metric
     */
    private generateMessageKey(payload: TelemetryPayload): string {
        const data = `${payload.site}:${payload.gateway}:${payload.ts}:${payload.metric}`;
        return `deduplicate:${createHash('md5').update(data).digest('hex')}`;
    }

    /**
     * Check if message was already processed (within TTL window)
     */
    private async isDuplicate(payload: TelemetryPayload): Promise<boolean> {
        const key = this.generateMessageKey(payload);
        const exists = await this.cacheManager.get(key);
        if (exists) {
            this.logger.debug(`Duplicate message detected for key: ${key}`);
            return true; // Duplicate message
        }
        // Mark as seen (TTL from CacheModule config)
        await this.cacheManager.set(key, '1');
        return false; // Unique message
    }


    async handleTelemetry(topic: string, payload: TelemetryPayload): Promise<void> {
        // Track received message
        this.metrics.messagesReceived.inc({
            site: payload.site,
            gateway: payload.gateway,
            metric: payload.metric,
        });

        // Deduplication check
        if (await this.isDuplicate(payload)) return; // Skip duplicate

        this.logger.log(`[${topic}] ${payload.metric} = ${payload.value ?? JSON.stringify(payload.values)}`);

        // Check for alarm condition
        if (payload.alarm) {
            this.logger.warn(`ALARM: ${payload.site}/${payload.gateway} - ${payload.metric} = ${payload.value}`);
        }
        // Save to database
        await this.prisma.telemetryReading.create({
            data: {
                ts: new Date(payload.ts),
                site: payload.site,
                gateway: payload.gateway,
                metric: payload.metric,
                value: payload.value,
                values: payload.values,
                unit: payload.unit,
                alarm: payload.alarm ?? false,
            },
        });

        // Track processed message
        this.metrics.messagesProcessed.inc({
            site: payload.site,
            gateway: payload.gateway,
            metric: payload.metric,
        });
        // Evaluate thresholds and create alerts
        await this.alertService.evaluateThresholds(payload);
        // TODO: Evaluate thresholds
        // TODO: Emit to WebSocket
    }
}
