import { describe, it, expect } from 'vitest';
import { AppError } from '../../../src/shared/errors/app-error.js';

describe('AppError', () => {
  it('creates error with all fields', () => {
    const err = new AppError('test', 400, 'TEST', { field: 'value' });

    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('TEST');
    expect(err.details).toEqual({ field: 'value' });
    expect(err).toBeInstanceOf(Error);
  });

  it.each([
    ['badRequest', 400, 'BAD_REQUEST'],
    ['unauthorized', 401, 'UNAUTHORIZED'],
    ['forbidden', 403, 'FORBIDDEN'],
    ['conflict', 409, 'CONFLICT'],
    ['tooManyRequests', 429, 'RATE_LIMITED'],
    ['internal', 500, 'INTERNAL_ERROR'],
  ] as const)('%s creates error with status %d', (method, expectedStatus, expectedCode) => {
    const err = AppError[method]('msg');
    expect(err.statusCode).toBe(expectedStatus);
    expect(err.code).toBe(expectedCode);
  });

  it('notFound includes resource name', () => {
    const err = AppError.notFound('Document');
    expect(err.message).toBe('Document not found');
    expect(err.statusCode).toBe(404);
  });
});
