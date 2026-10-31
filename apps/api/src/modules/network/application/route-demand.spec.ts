import { GetRouteDemand, type RouteDemandSource } from './route-demand';

type Demands = ReadonlyMap<number, number | null>;

describe('GetRouteDemand', () => {
  it('loads once and keeps the result', async () => {
    const loadAll = jest.fn<Promise<Demands>, []>(async () => new Map([[49, 100]]));
    const useCase = new GetRouteDemand({ loadAll } satisfies RouteDemandSource);
    expect((await useCase.execute()).get(49)).toBe(100);
    await useCase.execute();
    expect(loadAll).toHaveBeenCalledTimes(1);
  });

  it('retries after a failed load', async () => {
    const loadAll = jest
      .fn<Promise<Demands>, []>()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValue(new Map());
    const useCase = new GetRouteDemand({ loadAll });
    await expect(useCase.execute()).rejects.toThrow('db down');
    await expect(useCase.execute()).resolves.toEqual(new Map());
  });
});
