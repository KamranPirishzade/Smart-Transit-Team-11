import { UnauthorizedError } from '../../../common/errors/domain-errors';
import {
  LoginOperator,
  type OperatorAccount,
  type PasswordHasher,
  type TokenIssuer,
} from './login-operator';

const account: OperatorAccount = {
  id: 'op-1',
  email: 'operator@example.com',
  name: 'Operator',
  passwordHash: 'hash:secret-pass',
};

const hasher: PasswordHasher = { compare: async (plain, hash) => hash === `hash:${plain}` };
const tokens: TokenIssuer = {
  issue: async (operator) => ({ accessToken: `token-for-${operator.id}`, expiresInS: 3600 }),
};

function useCase(found: OperatorAccount | null = account) {
  const findByEmail = jest.fn(async () => found);
  return { findByEmail, login: new LoginOperator({ findByEmail }, hasher, tokens) };
}

describe('LoginOperator', () => {
  it('returns a token and the operator for valid credentials', async () => {
    const { login } = useCase();
    expect(await login.execute('operator@example.com', 'secret-pass')).toEqual({
      accessToken: 'token-for-op-1',
      expiresInS: 3600,
      operator: { id: 'op-1', email: 'operator@example.com', name: 'Operator' },
    });
  });

  it('looks the e-mail up trimmed and lower case', async () => {
    const { findByEmail, login } = useCase();
    await login.execute('  Operator@Example.COM ', 'secret-pass');
    expect(findByEmail).toHaveBeenCalledWith('operator@example.com');
  });

  it('rejects a wrong password', async () => {
    await expect(useCase().login.execute('operator@example.com', 'nope')).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('rejects an unknown e-mail with the same error', async () => {
    await expect(useCase(null).login.execute('x@example.com', 'secret-pass')).rejects.toThrow(
      'Invalid e-mail or password',
    );
  });
});
