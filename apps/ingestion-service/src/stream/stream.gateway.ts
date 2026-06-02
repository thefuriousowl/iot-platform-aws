import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';



@WebSocketGateway({
    cors: {
        origin: '*', // Restrict this in production to frontend domain
    },
})
export class StreamGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(StreamGateway.name);

    afterInit() {
        this.logger.log('WebSocket Gateway Initialized');
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    // Call this from TelemetryService to broadcast readings
    broadcastTelemetry(data: any) {
        this.server.emit('telemetry', data);
    }

    // Call this from AlertService to broadcast alerts
    broadcastAlert(data: any) {
        this.server.emit('alert', data);
    }

}