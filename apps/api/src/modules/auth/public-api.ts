/** The only file other modules may import from the auth module. */
export { AuthModule } from './auth.module';
export { CurrentOperator, OperatorAuthGuard } from './presentation/auth.presentation';
export type { AuthenticatedOperator } from './infrastructure/auth.adapters';
