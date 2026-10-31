import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateIf } from 'class-validator';
import { CROWD_LEVELS } from '../../../common/domain/crowd-level';

const STATUSES = ['PENDING', 'ACCEPTED', 'DISMISSED'] as const;

export class RecommendationsQueryDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class RecommendationDto {
  @ApiProperty() id!: string;
  @ApiProperty() routeId!: number;
  @ApiProperty({ example: '49' }) routeNumber!: string;
  @ApiProperty({ nullable: true, type: Number }) direction!: number | null;
  @ApiProperty({ description: 'Why the rule fired (Azerbaijani)' }) reason!: string;
  @ApiProperty() highReports!: number;
  @ApiProperty() totalReports!: number;
  @ApiProperty() windowStart!: string;
  @ApiProperty() windowEnd!: string;
  @ApiProperty({ enum: STATUSES }) status!: (typeof STATUSES)[number];
  @ApiProperty() createdAt!: string;
  @ApiProperty({ nullable: true, type: String }) resolvedAt!: string | null;
}

export class ReserveDispatchDto {
  @ApiProperty() id!: string;
  @ApiProperty() routeId!: number;
  @ApiProperty() direction!: number;
  @ApiProperty({ nullable: true, type: String }) recommendationId!: string | null;
  @ApiProperty({ description: 'Simulated vehicle id is `reserve-<id>`' }) vehicleId!: string;
}

export class SimClockStateDto {
  @ApiProperty() now!: string;
  @ApiProperty({ example: '08:15' }) bakuTime!: string;
  @ApiProperty() overridden!: boolean;
}

export class SetSimClockDto {
  @ApiPropertyOptional({
    example: '08:15',
    nullable: true,
    description: 'Demo time in Baku (HH:MM); null returns to real time',
  })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time must be HH:MM' })
  time!: string | null;
}

class CrowdedRouteDto {
  @ApiProperty() routeId!: number;
  @ApiProperty({ enum: CROWD_LEVELS }) level!: string;
  @ApiProperty() score!: number;
  @ApiProperty() reportCount!: number;
}

export class OperatorOverviewDto {
  @ApiProperty({ type: SimClockStateDto }) clock!: SimClockStateDto;
  @ApiProperty() pendingRecommendations!: number;
  @ApiProperty() activeReserves!: number;
  @ApiProperty({ description: 'Reports in the last 10 minutes' }) recentReports!: number;
  @ApiProperty({ type: [CrowdedRouteDto] }) crowdedRoutes!: CrowdedRouteDto[];
}

export class ActiveReserveDto {
  @ApiProperty() id!: string;
  @ApiProperty() routeId!: number;
  @ApiProperty({ example: '49' }) routeNumber!: string;
  @ApiProperty() direction!: number;
  @ApiProperty({ description: 'Dispatch time' }) createdAt!: string;
  @ApiProperty({ example: 'reserve-6a73...' }) vehicleId!: string;
}
