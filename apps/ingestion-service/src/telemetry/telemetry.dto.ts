import { IsNumber, IsString } from "class-validator";

export class TelemetryPayload {
    @IsString()
    ts!: string;
    
    @IsString()
    site!: string;

    @IsString()
    gateway!: string;

    @IsString()
    metric!: string;

    @IsNumber()
    value?: number;

    values?: Record<string, number>;
    @IsString()
    unit!: string;
    alarm?: boolean;
}