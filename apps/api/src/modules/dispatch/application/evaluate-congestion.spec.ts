import { EvaluateCongestion } from './evaluate-congestion';
import {
  fixedClock,
  FakeSignals,
  highReports,
  InMemoryRecommendations,
  RecordingPublisher,
} from './dispatch.fakes';

function setup() {
  const signals = new FakeSignals();
  const recommendations = new InMemoryRecommendations();
  const events = new RecordingPublisher();
  const useCase = new EvaluateCongestion(signals, recommendations, events, fixedClock);
  return { signals, recommendations, events, useCase };
}

describe('EvaluateCongestion', () => {
  it('creates a PENDING recommendation and announces it when the rule fires', async () => {
    const { signals, recommendations, events, useCase } = setup();
    signals.reports = highReports(12, 2);

    const created = await useCase.execute(49);

    expect(created).toMatchObject({
      routeId: 49,
      status: 'PENDING',
      direction: 2,
      highReports: 12,
      totalReports: 12,
    });
    expect(recommendations.items).toHaveLength(1);
    expect(events.names()).toEqual(['dispatch.recommendation.created']);
  });

  it('does nothing below the threshold', async () => {
    const { signals, recommendations, events, useCase } = setup();
    signals.reports = highReports(7);
    expect(await useCase.execute(49)).toBeNull();
    expect(recommendations.items).toHaveLength(0);
    expect(events.events).toHaveLength(0);
  });

  it('creates no duplicate while one is PENDING', async () => {
    const { signals, recommendations, events, useCase } = setup();
    signals.reports = highReports(12);
    await useCase.execute(49);
    expect(await useCase.execute(49)).toBeNull();
    expect(recommendations.items).toHaveLength(1);
    expect(events.events).toHaveLength(1);
  });

  it('stays quiet when a concurrent evaluation wins the unique-index race', async () => {
    const { signals, recommendations, events, useCase } = setup();
    signals.reports = highReports(12);
    jest.spyOn(recommendations, 'hasPending').mockResolvedValue(false);
    await recommendations.createPending({
      routeId: 49,
      direction: 1,
      reason: 'x',
      highReports: 8,
      totalReports: 8,
      windowStart: new Date(),
      windowEnd: new Date(),
    });

    expect(await useCase.execute(49)).toBeNull();
    expect(recommendations.items).toHaveLength(1);
    expect(events.events).toHaveLength(0);
  });

  it('allows a new recommendation after the previous one was resolved', async () => {
    const { signals, recommendations, useCase } = setup();
    signals.reports = highReports(12);
    const first = await useCase.execute(49);
    await recommendations.dismiss(first!.id, 'op', new Date());
    expect(await useCase.execute(49)).not.toBeNull();
  });
});
