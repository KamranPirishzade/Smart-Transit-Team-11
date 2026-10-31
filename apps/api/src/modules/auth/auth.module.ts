import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.module';
import {
  LoginOperator,
  OPERATOR_REPOSITORY,
  PASSWORD_HASHER,
  TOKEN_ISSUER,
  type OperatorRepository,
  type PasswordHasher,
  type TokenIssuer,
} from './application/login-operator';
import {
  BcryptPasswordHasher,
  JwtStrategy,
  JwtTokenIssuer,
  PrismaOperatorRepository,
} from './infrastructure/auth.adapters';
import { AuthController, OperatorAuthGuard } from './presentation/auth.presentation';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.JWT_SECRET,
        signOptions: { expiresIn: config.JWT_EXPIRES_IN_S },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    OperatorAuthGuard,
    { provide: OPERATOR_REPOSITORY, useClass: PrismaOperatorRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    {
      provide: LoginOperator,
      useFactory: (o: OperatorRepository, h: PasswordHasher, t: TokenIssuer) =>
        new LoginOperator(o, h, t),
      inject: [OPERATOR_REPOSITORY, PASSWORD_HASHER, TOKEN_ISSUER],
    },
  ],
  exports: [OperatorAuthGuard],
})
export class AuthModule {}
