import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { OperatorAuthGuard } from '../../auth/public-api';
import { SimulateSurge } from '../application/simulate-surge';

export class SurgeRequestDto {
  @ApiProperty({ example: '49', description: 'Public bus number' })
  @IsString()
  @Length(1, 10)
  routeNumber!: string;
}

export class SurgeResultDto {
  @ApiProperty({ example: 37 }) routeId!: number;
  @ApiProperty({ example: '49' }) routeNumber!: string;
  @ApiProperty({ example: 10 }) reports!: number;
}

@ApiTags('operator')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@UseGuards(OperatorAuthGuard)
@Controller('operator/demo')
export class DemoController {
  constructor(private readonly simulateSurge: SimulateSurge) {}

  @Post('surge')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Demo: send 10 crowded reports on a route',
    description: 'Reports go through the normal flow, so a recommendation appears within seconds.',
  })
  @ApiOkResponse({ type: SurgeResultDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Unknown bus number' })
  surge(@Body() dto: SurgeRequestDto): Promise<SurgeResultDto> {
    return this.simulateSurge.execute(dto.routeNumber);
  }
}
