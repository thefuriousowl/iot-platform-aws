import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { IoAdapter } from '@nestjs/platform-socket.io';
async function bootstrap() {
  // HTTP Server (REST API)
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Angular dev server
  app.enableCors({
    origin: ['http://localhost:4200','http://localhost:3000'], // Allow Angular dev server and API server
    credential: true,
  });

  // Use Socket.IO adapter for WebSocket support
  app.useWebSocketAdapter(new IoAdapter(app));

  // MQTT microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: {
      url: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);

  console.log('HTTP server running on http://localhost:3000');
  console.log('MQTT client connected to', process.env.MQTT_URL || 'mqtt://localhost:1883');
}
bootstrap();
