import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  it('hides internals of unknown errors', () => {
    expect(filter.toBody(new Error('db password leaked'), '/x')).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
  });
});
