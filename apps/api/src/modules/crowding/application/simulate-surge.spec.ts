import { NotFoundError } from '../../../common/errors/domain-errors';
import { isHighCrowd } from '../../../common/domain/crowd-level';
import { demands, fixedClock, InMemoryReports, RecordingPublisher } from './crowding.fakes';
import { SimulateSurge, type RouteLocator } from './simulate-surge';
import { SubmitCrowdReport } from './submit-crowd-report';

const locator: RouteLocator = {
  findByNumber: async (number) =>
    number === '64' ? { id: 49, number: '64', lat: 40.4, lon: 49.9 } : null,
};

function setup() {
  const reports = new InMemoryReports();
  const events = new RecordingPublisher();
  const submit = new SubmitCrowdReport(reports, demands, events, fixedClock);
  return { reports, events, useCase: new SimulateSurge(locator, submit, () => 'run1') };
}

describe('SimulateSurge', () => {
  it('sends 10 high-crowd reports from distinct devices on the route', async () => {
    const { reports, events, useCase } = setup();

    const result = await useCase.execute(' 64 ');

    expect(result).toEqual({ routeId: 49, routeNumber: '64', reports: 10 });
    expect(reports.items).toHaveLength(10);
    expect(reports.items.every((r) => r.routeId === 49 && isHighCrowd(r.level))).toBe(true);
    expect(new Set(reports.items.map((r) => r.deviceId)).size).toBe(10);
    expect(reports.items[0]).toMatchObject({ lat: 40.4, lon: 49.9, direction: 1 });
    expect(events.events.every((e) => e.name === 'crowd.report.submitted')).toBe(true);
  });

  it('honours a custom report count', async () => {
    const { reports, useCase } = setup();
    await useCase.execute('64', 3);
    expect(reports.items).toHaveLength(3);
  });

  it('rejects an unknown bus number and sends nothing', async () => {
    const { reports, useCase } = setup();
    await expect(useCase.execute('999')).rejects.toBeInstanceOf(NotFoundError);
    expect(reports.items).toHaveLength(0);
  });
});
