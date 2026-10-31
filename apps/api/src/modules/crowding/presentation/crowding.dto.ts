import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CROWD_LEVELS, type CrowdLevel } from '../../../common/domain/crowd-level';

export class SubmitReportDto {
  @ApiProperty({ example: 49, description: 'AYNA route id' })
  @IsInt()
  @Min(1)
  routeId!: number;

  @ApiPropertyOptional({ example: 1, enum: [1, 2] })
  @IsOptional()
  @IsIn([1, 2])
  direction?: number;

  @ApiPropertyOptional({ example: 'bus-49-1-3' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  vehicleId?: string;

  @ApiPropertyOptional({ example: 1234 })
  @IsOptional()
  @IsInt()
  @Min(1)
  stopId?: number;

  @ApiProperty({ enum: CROWD_LEVELS, example: 'CROWDED' })
  @IsIn(CROWD_LEVELS)
  level!: CrowdLevel;

  @ApiProperty({ example: 40.3796 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 49.8486 })
  @IsLongitude()
  lon!: number;

  @ApiProperty({
    example: 'a1b2c3d4-device',
    description: 'Anonymous device id (rate limit: 3 reports per minute per device)',
  })
  @IsString()
  @Length(8, 64)
  deviceId!: string;
}

export class ReportAcceptedDto {
  @ApiProperty() id!: string;
  @ApiProperty() routeId!: number;
  @ApiProperty({ enum: CROWD_LEVELS }) level!: CrowdLevel;
  @ApiProperty() createdAt!: string;
}

export class HeatCellDto {
  @ApiProperty({ description: 'Cell centre' }) lat!: number;
  @ApiProperty() lon!: number;
  @ApiProperty({ enum: CROWD_LEVELS }) level!: CrowdLevel;
  @ApiProperty({ minimum: 0, maximum: 3 }) score!: number;
  @ApiProperty() reportCount!: number;
}

export class HeatmapDto {
  @ApiProperty({ example: 250 }) cellSizeM!: number;
  @ApiProperty({ type: [HeatCellDto] }) cells!: HeatCellDto[];
}

export class RouteCrowdDto {
  @ApiProperty() routeId!: number;
  @ApiProperty({ enum: CROWD_LEVELS }) level!: CrowdLevel;
  @ApiProperty({ minimum: 0, maximum: 3 }) score!: number;
  @ApiProperty({ enum: ['reports', 'baseline'] }) source!: 'reports' | 'baseline';
  @ApiProperty() reportCount!: number;
}

export class RouteCrowdQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
