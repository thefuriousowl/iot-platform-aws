import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelemetryModule } from './telemetry/telemetry.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AlertModule } from './alert/alert.module';
@Module({
  imports: [
    ConfigModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
          ttl: 60 * 1000, // 60s default TTL
        }),
      }),
    }),
    PrismaModule,
    AlertModule,
    TelemetryModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
