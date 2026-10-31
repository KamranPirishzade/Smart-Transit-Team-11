import { ApiProperty } from '@nestjs/swagger';
import type { ErrorBody } from '../filters/all-exceptions.filter';

/** Swagger schema of the uniform error body. */
export class ErrorResponseDto implements ErrorBody {
  @ApiProperty({ example: 404 }) statusCode!: number;
  @ApiProperty({ example: 'Not Found' }) error!: string;
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Stop 999 not found',
  })
  message!: string | string[];
  @ApiProperty({ example: '/api/stops/999' }) path!: string;
  @ApiProperty({ example: '2026-10-31T08:00:00.000Z' }) timestamp!: string;
}
