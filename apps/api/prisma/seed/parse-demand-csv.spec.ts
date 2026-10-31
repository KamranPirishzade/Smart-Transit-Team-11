import { parseDemandCsv, splitCsvLine } from './parse-demand-csv';

describe('splitCsvLine', () => {
  it('keeps commas inside quoted fields and unescapes doubled quotes', () => {
    expect(splitCsvLine('"2026-01-01 00:00:00,000",5,12030')).toEqual([
      '2026-01-01 00:00:00,000',
      '5',
      '12030',
    ]);
    expect(splitCsvLine('"a ""b""",c')).toEqual(['a "b"', 'c']);
  });
});

describe('parseDemandCsv', () => {
  const csv = [
    String.fromCharCode(0xfeff) + 'Tarix (gün-ay-il),Marşrutun adı,Gündəlik gediş sayı',
    '"2026-01-01 00:00:00,000",5,12000',
    '"2026-01-02 00:00:00,000",5,13000',
    '"2026-01-01 00:00:00,000",E1,800',
    '"2026-01-01 00:00:00,000",7A,not-a-number',
    '',
  ].join('\r\n');

  it('averages daily trips per route name (string keys, BOM and CRLF tolerated)', () => {
    const demand = parseDemandCsv(csv);
    expect(demand.get('5')).toBe(12500);
    expect(demand.get('E1')).toBe(800);
  });

  it('skips malformed rows', () => {
    expect(parseDemandCsv(csv).has('7A')).toBe(false);
  });
});
