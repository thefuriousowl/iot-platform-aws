import { Controller, Logger } from "@nestjs/common";
import { TelemetryService } from "./telemetry.service";
import { Ctx, MessagePattern, MqttContext, Payload } from "@nestjs/microservices";
import { TelemetryPayload } from "./telemetry.dto";


@Controller()
export class TelemetryController {
    private readonly logger = new Logger(TelemetryController.name);

    constructor(private readonly telemetryService: TelemetryService) {}

    @MessagePattern('telemetry/+/+/+') // wildcard: telemetry/{site}/{gateway}/{profile}
    async handleTelemetry(
        @Payload() data: TelemetryPayload,
        @Ctx() context: MqttContext,
    ): Promise<void> {
        const topic = context.getTopic();
        this.logger.debug(`Received telemetry on topic: ${topic} with payload: ${JSON.stringify(data)}`);
        await this.telemetryService.handleTelemetry(topic, data);
    }
}