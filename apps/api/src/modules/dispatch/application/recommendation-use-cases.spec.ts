import { ConflictError, NotFoundError } from '../../../common/errors/domain-errors';
import { fixedClock, InMemoryRecommendations, NOW, RecordingPublisher } from './dispatch.fakes';
import {
  AcceptRecommendation,
  DismissRecommendation,
  ListRecommendations,
} from './recommendation-use-cases';

async function setup(direction: number | null = 2) {
  const recommendations = new InMemoryRecommendations();
  const events = new RecordingPublisher();
  const pending = await recommendations.createPending({
    routeId: 49,
    direction,
    reason: 'test',
    highReports: 9,
    totalReports: 10,
    windowStart: NOW,
    windowEnd: NOW,
  });
  return {
    recommendations,
    events,
    id: pending!.id,
    accept: new AcceptRecommendation(recommendations, events, fixedClock),
    dismiss: new DismissRecommendation(recommendations, events, fixedClock),
  };
}

describe('AcceptRecommendation', () => {
  it('creates a reserve dispatch in the recommended direction and announces it', async () => {
    const { recommendations, events, id, accept } = await setup(2);

    const reserve = await accept.execute(id, 'op-1');

    expect(reserve).toMatchObject({
      routeId: 49,
      direction: 2,
      recommendationId: id,
      active: true,
    });
    expect(recommendations.items[0]).toMatchObject({
      status: 'ACCEPTED',
      resolvedBy: 'op-1',
      resolvedAt: NOW,
    });
    expect(events.names()).toEqual(['dispatch.recommendation.resolved', 'dispatch.reserve.added']);
    expect(events.events[1]!.payload).toEqual({
      reserveId: reserve.id,
      routeId: 49,
      direction: 2,
      recommendationId: id,
    });
  });

  it('uses direction 1 when the recommendation names none', async () => {
    const { id, accept } = await setup(null);
    expect((await accept.execute(id, 'op-1')).direction).toBe(1);
  });

  it('cannot be accepted twice', async () => {
    const { recommendations, id, accept } = await setup();
    await accept.execute(id, 'op-1');
    await expect(accept.execute(id, 'op-2')).rejects.toBeInstanceOf(ConflictError);
    expect(recommendations.reserves).toHaveLength(1);
  });

  it('cannot accept a dismissed recommendation', async () => {
    const { recommendations, id, accept, dismiss } = await setup();
    await dismiss.execute(id, 'op-1');
    await expect(accept.execute(id, 'op-1')).rejects.toBeInstanceOf(ConflictError);
    expect(recommendations.reserves).toHaveLength(0);
  });

  it('reports an unknown id as not found', async () => {
    const { accept } = await setup();
    await expect(accept.execute('missing', 'op-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('turns a lost race into a conflict without events', async () => {
    const { recommendations, events, id, accept } = await setup();
    jest.spyOn(recommendations, 'accept').mockResolvedValue(null);
    await expect(accept.execute(id, 'op-1')).rejects.toBeInstanceOf(ConflictError);
    expect(events.events).toHaveLength(0);
  });
});

describe('DismissRecommendation', () => {
  it('marks it DISMISSED and announces it, without a reserve', async () => {
    const { recommendations, events, id, dismiss } = await setup();
    await dismiss.execute(id, 'op-1');
    expect(recommendations.items[0]).toMatchObject({ status: 'DISMISSED', resolvedBy: 'op-1' });
    expect(recommendations.reserves).toHaveLength(0);
    expect(events.events[0]).toMatchObject({
      name: 'dispatch.recommendation.resolved',
      payload: { status: 'DISMISSED', routeId: 49 },
    });
  });

  it('cannot dismiss twice or an unknown id', async () => {
    const { id, dismiss } = await setup();
    await dismiss.execute(id, 'op-1');
    await expect(dismiss.execute(id, 'op-1')).rejects.toBeInstanceOf(ConflictError);
    await expect(dismiss.execute('missing', 'op-1')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ListRecommendations', () => {
  it('filters by status', async () => {
    const { recommendations, id, dismiss } = await setup();
    await dismiss.execute(id, 'op-1');
    const list = new ListRecommendations(recommendations);
    expect(await list.execute('PENDING')).toHaveLength(0);
    expect(await list.execute('DISMISSED')).toHaveLength(1);
    expect(await list.execute()).toHaveLength(1);
  });
});
