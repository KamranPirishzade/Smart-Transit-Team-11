import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { LonLat } from '../../../common/geo/geo.types';

// ---------- queries ----------

export class SearchRoutesQueryDto {
  @ApiPropertyOptional({ example: '49', description: 'Route number prefix or terminus name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  query?: string;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 250, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(250)
  limit?: number;
}

export class NearbyStopsQueryDto {
  @ApiProperty({ example: 40.3796 })
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 49.8486 })
  @Type(() => Number)
  @IsLongitude()
  lon!: number;

  @ApiPropertyOptional({
    example: 500,
    minimum: 50,
    maximum: 3000,
    default: 500,
    description: 'metres',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(3000)
  radius?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ---------- responses ----------

export class RouteSummaryDto {
  @ApiProperty({ example: 37, description: 'AYNA busId' }) id!: number;
  @ApiProperty({ example: '49' }) number!: string;
  @ApiProperty({ example: 'Azlənd Plaza MMC', nullable: true, type: String }) carrier!:
    string | null;
  @ApiProperty({ example: 0.5, nullable: true, type: Number }) tariffAzn!: number | null;
  @ApiProperty({ example: '28 May m/st', nullable: true, type: String }) firstPoint!: string | null;
  @ApiProperty({ example: '68 № məktəb', nullable: true, type: String }) lastPoint!: string | null;
  @ApiProperty({
    example: true,
    description: 'false → no stops in source data, no ETA; hide from passengers',
  })
  hasStops!: boolean;
}

export class RouteStopDto {
  @ApiProperty({ example: 1 }) order!: number;
  @ApiProperty({ example: 105 }) stopId!: number;
  @ApiProperty({ example: '28 May m/st' }) name!: string;
  @ApiProperty({ example: 40.3796 }) lat!: number;
  @ApiProperty({ example: 49.8486 }) lon!: number;
  @ApiProperty({ example: 0 }) distanceFromStartM!: number;
}

export class RouteDirectionDto {
  @ApiProperty({ example: 1, enum: [1, 2] }) direction!: number;
  @ApiProperty({ example: '68 nömrəli tam orta məktəb' }) towards!: string;
  @ApiProperty({ example: 22700 }) lengthM!: number;
  @ApiProperty({
    description: '[lon, lat][] polyline from the first to the last stop',
    type: 'array',
    items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
    example: [
      [49.8486, 40.3796],
      [49.8512, 40.3811],
    ],
  })
  geometry!: LonLat[];
  @ApiProperty({ example: false, description: 'true → line reconstructed from stop coordinates' })
  geometryFromStops!: boolean;
  @ApiProperty({ type: [RouteStopDto] }) stops!: RouteStopDto[];
}

export class RouteDetailsDto extends RouteSummaryDto {
  @ApiProperty({ example: 43.7 }) lengthKm!: number;
  @ApiProperty({ example: 72 }) durationMin!: number;
  @ApiProperty({
    example: 16038,
    nullable: true,
    type: Number,
    description: 'BakuBus average daily trips',
  })
  avgDailyPassengers!: number | null;
  @ApiProperty({ type: [RouteDirectionDto] }) directions!: RouteDirectionDto[];
}

export class StopDto {
  @ApiProperty({ example: 105 }) id!: number;
  @ApiProperty({ example: '1000105' }) code!: string;
  @ApiProperty({ example: '28 May m/st' }) name!: string;
  @ApiProperty({ example: 40.3796 }) lat!: number;
  @ApiProperty({ example: 49.8486 }) lon!: number;
  @ApiProperty({ example: true }) isHub!: boolean;
}

export class NearbyStopDto extends StopDto {
  @ApiProperty({ example: 120 }) distanceM!: number;
}

export class StopRouteDto {
  @ApiProperty({ example: 37 }) routeId!: number;
  @ApiProperty({ example: '49' }) routeNumber!: string;
  @ApiProperty({ example: 1 }) direction!: number;
  @ApiProperty({ example: '68 nömrəli tam orta məktəb' }) towards!: string;
  @ApiProperty({ example: 1, description: 'Position of the stop on that direction' })
  order!: number;
}

export class StopDetailsDto extends StopDto {
  @ApiProperty({ type: [StopRouteDto] }) routes!: StopRouteDto[];
}
