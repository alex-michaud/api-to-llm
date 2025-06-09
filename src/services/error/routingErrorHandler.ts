import { APIError as BetterAuthAPIError } from 'better-auth/api';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from '../database';
import { logger } from '../logger';
import { AuthError } from './authError';

export const routingErrorHandler = (err: unknown, c: Context) => {
  if (err instanceof ZodError) {
    let message = '';
    for (const issue of err.issues) {
      message += `${issue.path[0]} ${issue.message.toLowerCase()}. `;
    }
    logger.debug(
      {
        type: 'ZodError',
        stack: err.stack,
        issues: err.issues,
      },
      message,
    );
    return c.json(
      {
        message,
        fieldErrors: err.flatten().fieldErrors,
        formErrors: err.flatten().formErrors,
      },
      400,
    );
  }
  if (err instanceof BetterAuthAPIError) {
    logger.debug(
      {
        type: 'BetterAuthAPIError',
        stack: err.stack,
        cause: err.cause,
        name: err.name,
      },
      err.message,
    );
    // check if the error.statusCode is a valid ContentfulStatusCode
    if (err.statusCode && typeof err.statusCode === 'number') {
      return c.json(
        { message: err.message },
        err.statusCode as ContentfulStatusCode,
      );
    }
    return c.json({ message: err.message }, 500);
  }
  if (err instanceof PrismaClientInitializationError) {
    logger.debug(
      {
        type: 'PrismaClientInitializationError',
        stack: err.stack,
      },
      err.message,
    );
    return c.json({ message: err.message }, 500);
  }
  if (err instanceof PrismaClientKnownRequestError) {
    return c.json({ message: err.message }, 500);
  }
  if (err instanceof PrismaClientRustPanicError) {
    return c.json({ message: err.message }, 500);
  }
  if (err instanceof PrismaClientUnknownRequestError) {
    return c.json({ message: err.message }, 500);
  }
  if (err instanceof PrismaClientValidationError) {
    return c.json({ message: err.message }, 400);
  }
  if (err instanceof HTTPException) {
    logger.debug(
      {
        type: 'HTTPException',
        stack: err.stack,
        cause: err.cause,
        name: err.name,
      },
      err.message,
    );
    return c.json({ message: err.message }, err.status);
  }
  if (err instanceof AuthError) {
    logger.debug(
      {
        type: 'AuthError',
        stack: err.stack,
        cause: err.cause,
        name: err.name,
      },
      err.message,
    );
    return c.json({ message: err.message }, err.httpCode);
  }
  if (err instanceof Error) {
    logger.error(
      {
        extra: {
          type: 'Error',
          stack: err.stack,
        },
      },
      err.message,
    );
    return c.json({ message: err.message }, 500);
  }

  return c.json({ message: 'Unknown error occurred' }, 500);
};
