import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AlertService } from './alert.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { StreamGateway } from '../stream/stream.gateway';
import { TelemetryPayload } from '../telemetry/telemetry.dto';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { jest } from '@jest/globals';

describe('AlertService', () => {
  let service: AlertService;
  let mockCache: { get: jest.Mock; set: jest.Mock };
  let mockPrisma: { alert: { create: jest.Mock } };
  let mockMetrics: { alertLatency: { observe: jest.Mock }; alertsCreated: { inc: jest.Mock } };
  let mockStream: { broadcastAlert: jest.Mock };

  beforeEach(async () => {
    // Create mocks
    mockCache = { get: jest.fn(), set: jest.fn() };
    mockPrisma = { alert: { create: jest.fn() } };
    mockMetrics = {
      alertLatency: { observe: jest.fn() },
      alertsCreated: { inc: jest.fn() },
    };
    mockStream = { broadcastAlert: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MetricsService, useValue: mockMetrics },
        { provide: StreamGateway, useValue: mockStream },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
  });

  const createPayload = (metric: string, value: number): TelemetryPayload => ({
    ts: new Date().toISOString(),
    site: 'plant-a',
    gateway: 'gw-1',
    metric,
    value,
    unit: 'ppm',
  });

  describe('evaluateThresholds', () => {
    it('should not alert when value is below warning threshold', async () => {
      const payload = createPayload('combustible_gas_ppm', 10); // warning: 25

      await service.evaluateThresholds(payload);

      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
      expect(mockStream.broadcastAlert).not.toHaveBeenCalled();
    });

    it('should create WARNING alert when value exceeds warning threshold', async () => {
      const payload = createPayload('combustible_gas_ppm', 30); // warning: 25, critical: 50
      mockCache.get.mockResolvedValue(null);
      mockPrisma.alert.create.mockResolvedValue({
        id: 1,
        createdAt: new Date(),
      });

      await service.evaluateThresholds(payload);

      expect(mockPrisma.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'warning',
          threshold: 25,
          value: 30,
        }),
      });
      expect(mockStream.broadcastAlert).toHaveBeenCalled();
    });

    it('should create CRITICAL alert when value exceeds critical threshold', async () => {
      const payload = createPayload('combustible_gas_ppm', 60); // critical: 50
      mockCache.get.mockResolvedValue(null);
      mockPrisma.alert.create.mockResolvedValue({
        id: 1,
        createdAt: new Date(),
      });

      await service.evaluateThresholds(payload);

      expect(mockPrisma.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'critical',
          threshold: 50,
          value: 60,
        }),
      });
    });

    it('should NOT create alert during cooldown period', async () => {
      const payload = createPayload('combustible_gas_ppm', 60);
      mockCache.get.mockResolvedValue('existing-alert-id'); // Cooldown active

      await service.evaluateThresholds(payload);

      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });

    it('should set 5-minute cooldown after creating alert', async () => {
      const payload = createPayload('combustible_gas_ppm', 60);
      mockCache.get.mockResolvedValue(null);
      mockPrisma.alert.create.mockResolvedValue({
        id: 42,
        createdAt: new Date(),
      });

      await service.evaluateThresholds(payload);

      expect(mockCache.set).toHaveBeenCalledWith(
        'alert:plant-a:gw-1:combustible_gas_ppm',
        42,
        5 * 60 * 1000, // 5 minutes in ms
      );
    });

    it('should skip metrics without defined thresholds', async () => {
      const payload = createPayload('unknown_metric', 999);

      await service.evaluateThresholds(payload);

      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });

    it('should skip multi-value payloads (value undefined)', async () => {
      const payload = {
        ts: new Date().toISOString(),
        site: 'plant-a',
        gateway: 'gw-1',
        metric: 'stack_emissions',
        values: { nox: 100, so2: 50 },
        unit: 'mixed',
      } as unknown as TelemetryPayload;

      await service.evaluateThresholds(payload);

      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });

    it('should track metrics when alert is created', async () => {
      const payload = createPayload('co_ppm', 40); // critical: 35
      mockCache.get.mockResolvedValue(null);
      mockPrisma.alert.create.mockResolvedValue({
        id: 1,
        createdAt: new Date(),
      });

      await service.evaluateThresholds(payload);

      expect(mockMetrics.alertsCreated.inc).toHaveBeenCalledWith({
        site: 'plant-a',
        gateway: 'gw-1',
        severity: 'critical',
      });
      expect(mockMetrics.alertLatency.observe).toHaveBeenCalled();
    });
  });
});
