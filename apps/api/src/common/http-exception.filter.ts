import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Every error leaves the API in one shape: { code, message, details }.
 * Unexpected errors are logged and returned as a generic 500 without internals.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const raw =
        typeof body === 'string'
          ? { message: body }
          : (body as Record<string, unknown>);
      const messages = Array.isArray(raw.message)
        ? (raw.message as string[])
        : undefined;
      res.status(status).json({
        code: (raw.code as string) ?? HttpStatus[status] ?? 'ERROR',
        message: messages
          ? 'Validation failed'
          : ((raw.message as string) ?? exception.message),
        details: messages ?? raw.details ?? null,
      });
      return;
    }
    this.logger.error(exception);
    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
      details: null,
    });
  }
}
