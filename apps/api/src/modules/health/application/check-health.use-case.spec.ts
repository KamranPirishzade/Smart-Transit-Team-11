import { CheckHealth } from './check-health.use-case';

describe('CheckHealth', () => {
  it('reports ok when the database answers', async () => {
    const useCase = new CheckHealth({ ping: () => Promise.resolve() }, () => 42);
    await expect(useCase.execute()).resolves.toEqual({ status: 'ok', db: 'up', uptimeS: 42 });
  });

  it('reports degraded instead of throwing when the database is down', async () => {
    const useCase = new CheckHealth(
      { ping: () => Promise.reject(new Error('ECONNREFUSED')) },
      () => 1,
    );
    await expect(useCase.execute()).resolves.toMatchObject({ status: 'degraded', db: 'down' });
  });
});
