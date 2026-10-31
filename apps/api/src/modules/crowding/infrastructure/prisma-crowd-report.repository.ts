import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { CrowdReportRepository } from '../application/crowding.ports';
import type { CrowdReport } from '../domain/crowd-report';

@Injectable()
export class PrismaCrowdReportRepository implements CrowdReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(report: CrowdReport): Promise<void> {
    await this.prisma.crowdReport.create({
      data: {
        id: report.id,
        routeId: report.routeId,
        direction: report.direction,
        vehicleId: report.vehicleId,
        stopId: report.stopId,
        level: report.level,
        lat: report.lat,
        lon: report.lon,
        deviceId: report.deviceId,
        createdAt: report.createdAt,
      },
    });
  }

  async findSince(since: Date, routeId?: number): Promise<CrowdReport[]> {
    const rows = await this.prisma.crowdReport.findMany({
      where: { createdAt: { gte: since }, ...(routeId === undefined ? {} : { routeId }) },
      orderBy: { createdAt: 'asc' },
    });
    return rows;
  }
}
