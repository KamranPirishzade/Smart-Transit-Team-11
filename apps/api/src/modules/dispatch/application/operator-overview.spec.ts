import { InvalidInputError } from '../../../common/errors/domain-errors';
import { AdjustableSimClock } from '../../../common/sim-clock/sim-clock';
import { FakeSignals, InMemoryRecommendations, NOW } from './dispatch.fakes';
import { GetOperatorOverview, SetSimClock } from './operator-overview';

describe('GetOperatorOverview', () => {
  it('summarises pending recommendations, reserves, reports and the top crowded routes', async () => {
    const recommendations = new InMemoryRecommendations();
    await recommendations.createPending({
      routeId: 49,
      direction: 1,
      reason: 'x',
      highReports: 8,
      totalReports: 8,
      windowStart: NOW,
      windowEnd: NOW,
    });
    const signals = new FakeSignals();
    signals.reported = Array.from({ length: 7 }, (_, i) => ({
      routeId: i + 1,
      level: 'FULL',
      score: 3 - i * 0.1,
      reportCount: 2,
    }));
    const clock = new AdjustableSimClock(() => NOW);

    const overview = await new GetOperatorOverview(recommendations, signals, clock).execute();

    expect(overview).toMatchObject({
      pendingRecommendations: 1,
      activeReserves: 0,
      recentReports: 14,
    });
    expect(overview.crowdedRoutes).toHaveLength(5);
    expect(overview.clock.overridden).toBe(false);
  });
});

describe('SetSimClock', () => {
  it('sets a demo time and resets to real time', () => {
    const clock = new AdjustableSimClock(() => NOW);
    const useCase = new SetSimClock(clock);
    expect(useCase.execute('08:15')).toMatchObject({ bakuTime: '08:15', overridden: true });
    expect(useCase.execute(null).overridden).toBe(false);
  });

  it('rejects a malformed time as invalid input', () => {
    expect(() => new SetSimClock(new AdjustableSimClock()).execute('25:00')).toThrow(
      InvalidInputError,
    );
  });
});
