import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { compare } from 'bcryptjs';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { APP_CONFIG, type AppConfig } from '../../../common/config/app-config.module';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type {
  IssuedToken,
  OperatorAccount,
  OperatorRepository,
  PasswordHasher,
  TokenIssuer,
} from '../application/login-operator';

@Injectable()
export class PrismaOperatorRepository implements OperatorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<OperatorAccount | null> {
    return this.prisma.operator.findUnique({ where: { email } });
  }
}

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  compare(plain: string, hash: string): Promise<boolean> {
    return compare(plain, hash);
  }
}

@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async issue(operator: { id: string; email: string }): Promise<IssuedToken> {
    const accessToken = await this.jwt.signAsync({ sub: operator.id, email: operator.email });
    return { accessToken, expiresInS: this.config.JWT_EXPIRES_IN_S };
  }
}

export interface AuthenticatedOperator {
  id: string;
  email: string;
}

interface JwtPayload {
  sub: string;
  email: string;
}

/** Bearer header for REST; `?token=` for SSE, because EventSource cannot set headers. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.JWT_SECRET,
    });
  }

  validate(payload: JwtPayload): AuthenticatedOperator {
    return { id: payload.sub, email: payload.email };
  }
}
