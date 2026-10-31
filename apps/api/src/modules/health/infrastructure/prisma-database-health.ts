import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { DatabaseHealth } from '../application/database-health.port';

@Injectable()
export class PrismaDatabaseHealth implements DatabaseHealth {
  constructor(private readonly prisma: PrismaService) {}

  async ping(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
