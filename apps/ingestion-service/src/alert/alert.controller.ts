import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/alerts')
export class AlertController {
  constructor(private prisma: PrismaService) {}

  /**
   * GET /api/alerts
   * Query params: site, gateway, severity, from, to, limit
   */
  @Get()
  async getAlerts(
    @Query('site') site?: string,
    @Query('gateway') gateway?: string,
    @Query('severity') severity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const where: Record<string, unknown> = {};

    if (site) where.site = site;
    if (gateway) where.gateway = gateway;
    if (severity) where.severity = severity;

    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
    }

    const data = await this.prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit || '100', 10), 1000),
    });

    return { count: data.length, data };
  }

  /**
   * GET /api/alerts/stats
   * Get alert counts by severity
   */
  @Get('stats')
  async getStats(
    @Query('site') site?: string,
    @Query('from') from?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (site) where.site = site;
    if (from) {
      where.createdAt = { gte: new Date(from) };
    }

    const [warning, critical, total] = await Promise.all([
      this.prisma.alert.count({ where: { ...where, severity: 'warning' } }),
      this.prisma.alert.count({ where: { ...where, severity: 'critical' } }),
      this.prisma.alert.count({ where }),
    ]);

    return { warning, critical, total };
  }
}
