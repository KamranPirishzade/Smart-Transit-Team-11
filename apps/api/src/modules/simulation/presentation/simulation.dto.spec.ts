import { BadRequestException } from '@nestjs/common';
import { toVehicleFilter } from './simulation.dto';

describe('toVehicleFilter', () => {
  it('accepts a route id', () => {
    expect(toVehicleFilter({ routeId: 37 })).toEqual({ routeId: 37 });
  });

  it('accepts a valid bbox', () => {
    expect(toVehicleFilter({ bbox: '49.8,40.35,49.9,40.42' })).toEqual({
      bbox: { minLon: 49.8, minLat: 40.35, maxLon: 49.9, maxLat: 40.42 },
    });
  });

  it.each([{}, { routeId: 37, bbox: '49.8,40.35,49.9,40.42' }, { bbox: '49.9,40.35,49.8,40.42' }])(
    'rejects %p',
    (query) => expect(() => toVehicleFilter(query)).toThrow(BadRequestException),
  );
});
