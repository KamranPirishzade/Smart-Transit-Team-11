import { bboxAround, bboxContains, parseBbox } from './bbox';
import { haversineM } from './haversine';

describe('bbox', () => {
  it('parses a valid box', () => {
    expect(parseBbox('49.8, 40.3,49.9,40.45')).toEqual({
      minLon: 49.8,
      minLat: 40.3,
      maxLon: 49.9,
      maxLat: 40.45,
    });
  });

  it.each(['', '1,2,3', 'a,b,c,d', '49.9,40.3,49.8,40.45', '-200,0,10,10'])('rejects %p', (raw) =>
    expect(parseBbox(raw)).toBeNull(),
  );

  it('contains points inside and on the edge only', () => {
    const box = parseBbox('49,40,50,41')!;
    expect(bboxContains(box, [49.5, 40.5])).toBe(true);
    expect(bboxContains(box, [50, 41])).toBe(true);
    expect(bboxContains(box, [50.1, 40.5])).toBe(false);
  });

  it('builds a box that just covers the radius', () => {
    const box = bboxAround([49.85, 40.4], 500);
    expect(haversineM([49.85, 40.4], [box.maxLon, 40.4])).toBeCloseTo(500, -1);
    expect(haversineM([49.85, 40.4], [49.85, box.maxLat])).toBeCloseTo(500, -1);
  });
});
