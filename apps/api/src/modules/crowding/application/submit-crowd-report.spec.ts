import { NotFoundError } from '../../../common/errors/domain-errors';
import { demands, fixedClock, InMemoryReports, NOW, RecordingPublisher } from './crowding.fakes';
import { SubmitCrowdReport } from './submit-crowd-report';

const input = { routeId: 49, level: 'FULL', lat: 40.38, lon: 49.85, deviceId: 'device-1' } as const;

function setup() {
  const reports = new InMemoryReports();
  const events = new RecordingPublisher();
  return { reports, events, useCase: new SubmitCrowdReport(reports, demands, events, fixedClock) };
}

describe('SubmitCrowdReport', () => {
  it('stores the report with the simulation time and publishes crowd.report.submitted', async () => {
    const { reports, events, useCase } = setup();
    const report = await useCase.execute({ ...input, direction: 2 });

    expect(reports.items).toEqual([report]);
    expect(report).toMatchObject({ routeId: 49, level: 'FULL', direction: 2, createdAt: NOW });
    expect(events.events).toEqual([
      {
        name: 'crowd.report.submitted',
        payload: {
          reportId: report.id,
          routeId: 49,
          direction: 2,
          level: 'FULL',
          at: NOW.toISOString(),
        },
      },
    ]);
  });

  it('rejects an unknown route and publishes nothing', async () => {
    const { reports, events, useCase } = setup();
    await expect(useCase.execute({ ...input, routeId: 99999 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(reports.items).toHaveLength(0);
    expect(events.events).toHaveLength(0);
  });
});
