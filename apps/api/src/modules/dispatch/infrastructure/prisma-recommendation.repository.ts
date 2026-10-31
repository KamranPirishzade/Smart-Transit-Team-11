import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { NewRecommendation, RecommendationRepository } from '../application/dispatch.ports';
import type {
  Recommendation,
  RecommendationStatus,
  ReserveDispatch,
  ActiveReserve,
} from '../domain/recommendation';

const withRoute = { route: { select: { number: true } } } satisfies Prisma.RecommendationInclude;
type Row = Prisma.RecommendationGetPayload<{ include: typeof withRoute }>;

function toDomain({ route, ...row }: Row): Recommendation {
  return { ...row, routeNumber: route.number };
}

@Injectable()
export class PrismaRecommendationRepository implements RecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPending(input: NewRecommendation): Promise<Recommendation | null> {
    try {
      const row = await this.prisma.recommendation.create({
        data: { ...input, status: 'PENDING' },
        include: withRoute,
      });
      return toDomain(row);
    } catch (error) {
      // recommendations_one_pending_per_route: another PENDING one exists for this route
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }
      throw error;
    }
  }

  async hasPending(routeId: number): Promise<boolean> {
    return (await this.prisma.recommendation.count({ where: { routeId, status: 'PENDING' } })) > 0;
  }

  async findById(id: string): Promise<Recommendation | null> {
    const row = await this.prisma.recommendation.findUnique({ where: { id }, include: withRoute });
    return row ? toDomain(row) : null;
  }

  async list(status: RecommendationStatus | undefined, limit: number): Promise<Recommendation[]> {
    const rows = await this.prisma.recommendation.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: withRoute,
    });
    return rows.map(toDomain);
  }

  accept(
    id: string,
    operatorId: string,
    direction: number,
    at: Date,
  ): Promise<ReserveDispatch | null> {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.recommendation.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'ACCEPTED', resolvedAt: at, resolvedBy: operatorId },
      });
      if (claimed.count === 0) return null;
      const recommendation = await tx.recommendation.findUniqueOrThrow({ where: { id } });
      return tx.reserveDispatch.create({
        data: {
          routeId: recommendation.routeId,
          direction,
          recommendationId: id,
          createdAt: at,
        },
      });
    });
  }

  async dismiss(id: string, operatorId: string, at: Date): Promise<boolean> {
    const result = await this.prisma.recommendation.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'DISMISSED', resolvedAt: at, resolvedBy: operatorId },
    });
    return result.count > 0;
  }

  countPending(): Promise<number> {
    return this.prisma.recommendation.count({ where: { status: 'PENDING' } });
  }

  countActiveReserves(): Promise<number> {
    return this.prisma.reserveDispatch.count({ where: { active: true } });
  }

  async listActiveReserves(): Promise<ActiveReserve[]> {
    const rows = await this.prisma.reserveDispatch.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      include: withRoute,
    });
    return rows.map(({ route, ...row }) => ({ ...row, routeNumber: route.number }));
  }
}
