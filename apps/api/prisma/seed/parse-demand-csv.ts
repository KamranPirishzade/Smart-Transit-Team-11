/** Splits one CSV line, honouring double-quoted fields (which may contain commas) and "" escapes. */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parses the opendata.az BakuBus daily ridership CSV
 * (`Tarix, Marşrutun adı, Gündəlik gediş sayı`) into route number → average daily trips.
 */
export function parseDemandCsv(csv: string): Map<string, number> {
  const totals = new Map<string, { sum: number; days: number }>();
  const lines = (csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv).split(/\r?\n/).slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const [, routeName, tripsRaw] = splitCsvLine(line);
    const route = routeName?.trim();
    const trips = Number(tripsRaw);
    if (!route || !Number.isFinite(trips)) continue;
    const acc = totals.get(route) ?? { sum: 0, days: 0 };
    acc.sum += trips;
    acc.days += 1;
    totals.set(route, acc);
  }
  return new Map([...totals].map(([route, { sum, days }]) => [route, Math.round(sum / days)]));
}
