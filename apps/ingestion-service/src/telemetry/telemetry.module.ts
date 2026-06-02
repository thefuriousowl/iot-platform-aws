import { Module } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { TelemetryController } from './telemetry.controller';
import { AlertModule } from '../alert/alert.module';

@Module({
    imports: [AlertModule],
    controllers: [TelemetryController],
    providers: [TelemetryService],
    exports: [TelemetryService],
})
export class TelemetryModule { }
