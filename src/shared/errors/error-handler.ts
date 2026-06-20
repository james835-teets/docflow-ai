import type { FastifyBaseLogger, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from './app-error.js';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

function isZodError(err: unknown): err is ZodError {
  return err instanceof ZodError;
}

function isFastifyError(err: unknown): err is FastifyError {
  return err instanceof Error && 'statusCode' in err;
}

export function createErrorHandler(logger: FastifyBaseLogger) {
  return function errorHandler(
    error: unknown,
    request: { headers: Record<string, unknown>; id: string },
    reply: { status: (code: number) => { send: (body: unknown) => void } },
  ) {
    const correlationId = request.headers['x-correlation-id'] ?? request.id;

    if (isAppError(error)) {
      logger.warn({ err: error, correlationId, statusCode: error.statusCode }, error.message);
      const body: ErrorResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details != null && { details: error.details }),
        },
      };
      reply.status(error.statusCode).send(body);
      return;
    }

    if (isZodError(error)) {
      const body: ErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      };
      reply.status(400).send(body);
      return;
    }

    if (isFastifyError(error)) {
      const body: ErrorResponse = {
        success: false,
        error: {
          code: error.code ?? 'REQUEST_ERROR',
          message: error.message,
        },
      };
      reply.status(error.statusCode ?? 500).send(body);
      return;
    }

    logger.error({ err: error, correlationId }, 'Unhandled error');

    const body: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    };
    reply.status(500).send(body);
  };
}
