import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { CROWD_LEVELS, type CrowdLevel } from '../../../common/domain/crowd-level';
import { parseBbox } from '../../../common/geo/bbox';
import { MAX_VEHICLES_PER_SNAPSHOT, type VehicleFilter } from '../application/get-vehicles';

const NUMBER = '-?\\d+(\\.\\d+)?';
const BBOX_PATTERN = new RegExp(`^${NUMBER},${NUMBER},${NUMBER},${NUMBER}$`);

export class VehiclesQueryDto {
  @ApiPropertyOptional({ example: 37, description: 'Route id (AYNA busId). Give this or `bbox`.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  routeId?: number;

  @ApiPropertyOptional({
    example: '49.80,40.35,49.90,40.42',
    description: 'minLon,minLat,maxLon,maxLat — visible map area. Give this or `routeId`.',
  })
  @IsOptional()
  @Matches(BBOX_PATTERN, { message: 'bbox must be "minLon,minLat,maxLon,maxLat"' })
  bbox?: string;

  @ApiPropertyOptional({ example: 800, minimum: 1, maximum: MAX_VEHICLES_PER_SNAPSHOT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_VEHICLES_PER_SNAPSHOT)
  limit?: number;
}

/** Exactly one of routeId / bbox — the whole city (~2 000 buses) is never sent at once. */
export function toVehicleFilter(query: VehiclesQueryDto): VehicleFilter {
  if ((query.routeId === undefined) === (query.bbox === undefined)) {
    throw new BadRequestException('Provide exactly one of "routeId" or "bbox"');
  }
  if (query.routeId !== undefined) return { routeId: query.routeId };
  const bbox = parseBbox(query.bbox!);
  if (!bbox) throw new BadRequestException('bbox must satisfy minLon < maxLon and minLat < maxLat');
  return { bbox };
}

export class ArrivalsQueryDto {
  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class VehicleDto {
  @ApiProperty({
    example: '37-1-4',
    description: '"{routeId}-{direction}-{index}" or "reserve-{id}"',
  })
  id!: string;
  @ApiProperty({ example: 37 }) routeId!: number;
  @ApiProperty({ example: '49' }) routeNumber!: string;
  @ApiProperty({ example: 1 }) direction!: number;
  @ApiProperty({ example: '68 nömrəli tam orta məktəb' }) towards!: string;
  @ApiProperty({ example: 40.3812 }) lat!: number;
  @ApiProperty({ example: 49.8531 }) lon!: number;
  @ApiProperty({ example: 75, description: 'degrees, 0 = north' }) bearing!: number;
  @ApiProperty({ example: 5320 }) distanceM!: number;
  @ApiProperty({ example: 0.23 }) progress!: number;
  @ApiProperty({ example: 19 }) speedKmh!: number;
  @ApiProperty({ example: 1866, nullable: true, type: Number }) nextStopId!: number | null;
  @ApiProperty({ example: false }) isReserve!: boolean;
  @ApiProperty({ enum: CROWD_LEVELS, nullable: true, example: 'CROWDED' })
  crowdLevel!: CrowdLevel | null;
}

export class VehiclesSnapshotDto {
  @ApiProperty({ example: '2026-10-31T08:15:00.000Z' }) generatedAt!: string;
  @ApiProperty({ example: '12:15', description: 'Simulation clock (Baku time)' }) simTime!: string;
  @ApiProperty({ example: 14 }) total!: number;
  @ApiProperty({ example: false, description: 'true when more than `limit` vehicles matched' })
  truncated!: boolean;
  @ApiProperty({ type: [VehicleDto] }) vehicles!: VehicleDto[];
}

export class ArrivalDto {
  @ApiProperty({ example: 37 }) routeId!: number;
  @ApiProperty({ example: '49' }) routeNumber!: string;
  @ApiProperty({ example: 1 }) direction!: number;
  @ApiProperty({ example: '68 nömrəli tam orta məktəb' }) towards!: string;
  @ApiProperty({ example: '37-1-4' }) vehicleId!: string;
  @ApiProperty({ example: 170 }) etaS!: number;
  @ApiProperty({ example: 3 }) etaMin!: number;
  @ApiProperty({ example: false }) isReserve!: boolean;
  @ApiProperty({ enum: CROWD_LEVELS, nullable: true, example: 'CROWDED' })
  crowdLevel!: CrowdLevel | null;
}

export class StopArrivalsDto {
  @ApiProperty({ example: 105 }) stopId!: number;
  @ApiProperty({ example: '2026-10-31T08:15:00.000Z' }) generatedAt!: string;
  @ApiProperty({ example: '12:15' }) simTime!: string;
  @ApiProperty({ type: [ArrivalDto] }) arrivals!: ArrivalDto[];
}
