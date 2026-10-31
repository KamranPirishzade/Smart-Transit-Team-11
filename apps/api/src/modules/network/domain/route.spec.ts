import { compareRouteNumbers, matchesRouteQuery, rankRoutes, type RouteSummary } from './route';

const route = (number: string, extra: Partial<RouteSummary> = {}): RouteSummary => ({
  id: Number.parseInt(number, 10) || 900,
  number,
  carrier: null,
  tariffAzn: 0.6,
  firstPoint: '28 May m/st',
  lastPoint: 'Bakıxanov qəs.',
  hasStops: true,
  ...extra,
});

describe('route numbers', () => {
  it('sorts naturally with letter-prefixed routes last', () => {
    const sorted = ['125', 'E1', '7A', '49', '5', '1'].sort(compareRouteNumbers);
    expect(sorted).toEqual(['1', '5', '7A', '49', '125', 'E1']);
  });
});

describe('matchesRouteQuery', () => {
  it('matches number prefixes and terminus names, case-insensitively', () => {
    expect(matchesRouteQuery(route('49'), '4')).toBe(true);
    expect(matchesRouteQuery(route('149'), '49')).toBe(false);
    expect(matchesRouteQuery(route('49'), '28 may')).toBe(true);
    expect(matchesRouteQuery(route('49'), 'BAKIXANOV')).toBe(true);
    expect(matchesRouteQuery(route('49'), '  ')).toBe(true);
  });
});

describe('rankRoutes', () => {
  it('puts the exact match first and routes without stops after routes with stops', () => {
    const ranked = rankRoutes(
      [route('45'), route('4', { hasStops: false }), route('49'), route('410')],
      '4',
    );
    expect(ranked.map((r) => r.number)).toEqual(['4', '45', '49', '410']);

    const noExact = rankRoutes([route('41', { hasStops: false }), route('45')], '4');
    expect(noExact.map((r) => r.number)).toEqual(['45', '41']);
  });
});
