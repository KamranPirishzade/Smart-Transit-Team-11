import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConflictError, InvalidInputError, NotFoundError } from '../errors/domain-errors';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('keeps validation messages as an array', () => {
    const body = filter.toBody(new BadRequestException(['level must be one of …']), '/api/reports');
    expect(body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: ['level must be one of …'],
      path: '/api/reports',
    });
    expect(Date.parse(body.timestamp)).not.toBeNaN();
  });

  it('formats HTTP errors with a reason phrase', () => {
    expect(filter.toBody(new NotFoundException('Stop 1 not found'), '/x')).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Stop 1 not found',
    });
  });

  it.each([
    [new NotFoundError('Stop', 7), 404, 'Not Found', 'Stop 7 not found'],
    [new ConflictError('already resolved'), 409, 'Conflict', 'already resolved'],
    [new InvalidInputError('bad window'), 400, 'Bad Request', 'bad window'],
  ])('maps domain error %p to HTTP', (error, statusCode, reason, message) => {
    expect(filter.toBody(error, '/x')).toMatchObject({ statusCode, error: reason, message });
  });

  it('hides internals of unknown errors', () => {
    expect(filter.toBody(new Error('db password leaked'), '/x')).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
  });
});
