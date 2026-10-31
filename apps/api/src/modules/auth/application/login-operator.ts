import { UnauthorizedError } from '../../../common/errors/domain-errors';

export const OPERATOR_REPOSITORY = Symbol('OPERATOR_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');

export interface OperatorAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

export interface OperatorRepository {
  findByEmail(email: string): Promise<OperatorAccount | null>;
}

export interface PasswordHasher {
  compare(plain: string, hash: string): Promise<boolean>;
}

export interface IssuedToken {
  accessToken: string;
  expiresInS: number;
}

export interface TokenIssuer {
  issue(operator: { id: string; email: string }): Promise<IssuedToken>;
}

export interface LoginResult extends IssuedToken {
  operator: { id: string; email: string; name: string };
}

export class LoginOperator {
  constructor(
    private readonly operators: OperatorRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenIssuer,
  ) {}

  async execute(email: string, password: string): Promise<LoginResult> {
    const operator = await this.operators.findByEmail(email.trim().toLowerCase());
    if (!operator || !(await this.hasher.compare(password, operator.passwordHash)))
      throw new UnauthorizedError('Invalid e-mail or password');
    const token = await this.tokens.issue({ id: operator.id, email: operator.email });
    return { ...token, operator: { id: operator.id, email: operator.email, name: operator.name } };
  }
}
