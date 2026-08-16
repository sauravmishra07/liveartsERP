import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';

/**
 * Central error handler (Requirements §29).
 * Returns a safe, uniform error envelope. Never leaks stack traces,
 * connection strings, or secrets to the client. Full detail is logged server-side.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, any>;
        message = b.message ?? message;
        // class-validator returns message as an array of strings
        if (Array.isArray(b.message)) {
          message = 'Validation failed';
          errors = b.message;
        }
        if (Array.isArray(b.errors)) errors = b.errors;
      }
    } else if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      errors = Object.values(exception.errors).map((e) => e.message);
    } else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid value for "${exception.path}"`;
    } else if ((exception as any)?.code === 11000) {
      status = HttpStatus.CONFLICT;
      const fields = Object.keys((exception as any).keyValue ?? {});
      message = `Duplicate value for: ${fields.join(', ')}`;
    }

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${status}`,
        (exception as any)?.stack,
      );
    } else {
      this.logger.warn(`${req.method} ${req.originalUrl} -> ${status}: ${message}`);
    }

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
