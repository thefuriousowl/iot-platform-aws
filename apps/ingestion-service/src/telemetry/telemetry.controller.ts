import { Controller, Get, Logger, Query } from "@nestjs/common";
import { TelemetryService } from "./telemetry.service";
import { Ctx, MessagePattern, MqttContext, Payload } from "@nestjs/microservices";
import { TelemetryPayload } from "./telemetry.dto";
import { PrismaService } from "../prisma/prisma.service";


@Controller()
export class TelemetryController {
    private readonly logger = new Logger(TelemetryController.name);

    constructor(
        private readonly telemetryService: TelemetryService,
        private readonly prisma: PrismaService
    ) {}


    // === MQTT Handler ===
    @MessagePattern('telemetry/+/+/+') // wildcard: telemetry/{site}/{gateway}/{profile}
    async handleTelemetry(
        @Payload() data: TelemetryPayload,
        @Ctx() context: MqttContext,
    ): Promise<void> {
        const topic = context.getTopic();
        this.logger.debug(`Received telemetry on topic: ${topic} with payload: ${JSON.stringify(data)}`);
        await this.telemetryService.handleTelemetry(topic, data);
    }


    // === HTTP Endpoint ===
    /**
     * GET /api/telemetry
     */
    @Get('/api/telemetry')
    async getTelemetry(
        @Query('site') site?: string,
        @Query('gateway') gateway?: string,
        @Query('metric') metric?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('limit') limit?: string,
    ) {
        const where: Record<string, unknown> = {};
        if (site) where.site = site;
        if (gateway) where.gateway = gateway;
        if (metric) where.metric = metric;

                if (from || to) {
            where.ts = {};
            if (from) (where.ts as Record<string, Date>).gte = new Date(from);
            if (to) (where.ts as Record<string, Date>).lte = new Date(to);
        }
                const data = await this.prisma.telemetryReading.findMany({
            where,
            orderBy: { ts: 'desc' },
            take: Math.min(parseInt(limit || '100', 10), 1000),
        });

         return { count: data.length, data };

    }

    /**
     * GET /api/telemetry/latest
     */
    @Get('api/telemetry/latest')
    async getLatest(
        @Query('site') site?: string,
        @Query('gateway') gateway?: string,
    ) {
        const where: Record<string, unknown> = {};
        if (site) where.site = site;
        if (gateway) where.gateway = gateway;

        const metrics = await this.prisma.telemetryReading.findMany({
            where,
            distinct: ['metric'],
            orderBy: { ts: 'desc' },
            take: 50,
        });

        return { count: metrics.length, data: metrics };
    }
    
}