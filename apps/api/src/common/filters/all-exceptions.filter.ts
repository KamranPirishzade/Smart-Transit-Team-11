import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

const reasonPhrase = (status: number): string =>
  (HttpStatus[status] ?? 'Error')
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/** Uniform error format for every failure: { statusCode, error, message, path, timestamp }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const body = this.toBody(exception, request.originalUrl ?? request.url);
    if (body.statusCode >= 500)
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    if (!response.headersSent) response.status(body.statusCode).json(body);
  }

  toBody(exception: unknown, path: string): ErrorBody {
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] }).message ?? exception.message);
    }
    return {
      statusCode,
      error: reasonPhrase(statusCode),
      message,
      path,
      timestamp: new Date().toISOString(),
    };
  }
}
