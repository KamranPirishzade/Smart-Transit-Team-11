import {
  Body,
  Controller,
  createParamDecorator,
  type ExecutionContext,
  HttpCode,
  Injectable,
  Post,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { LoginOperator } from '../application/login-operator';
import type { AuthenticatedOperator } from '../infrastructure/auth.adapters';

export class LoginDto {
  @ApiProperty({ example: 'operator@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'secret-password' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class OperatorDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() name!: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Send as `Authorization: Bearer <token>` (SSE: `?token=`)' })
  accessToken!: string;
  @ApiProperty({ example: 28800 }) expiresInS!: number;
  @ApiProperty({ type: OperatorDto }) operator!: OperatorDto;
}

/** Protects operator endpoints. Accepts a Bearer header or `?token=`. */
@Injectable()
export class OperatorAuthGuard extends AuthGuard('jwt') {}

/** The authenticated operator (set by OperatorAuthGuard). */
export const CurrentOperator = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedOperator =>
    context.switchToHttp().getRequest<Request & { user: AuthenticatedOperator }>().user,
);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginOperator: LoginOperator) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Operator login (JWT)' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.loginOperator.execute(dto.email, dto.password);
  }
}
