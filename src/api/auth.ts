import { type Context, Hono } from 'hono';
import { auth } from '../lib/auth';
import type { AuthType } from '../lib/auth';
import { logger } from '../services/logger';

const authRouter = new Hono<{ Bindings: AuthType }>({
  strict: false,
});

authRouter.on(['POST', 'GET'], '/**', (c: Context) => {
  logger.debug(
    {
      method: c.req.method,
      path: c.req.path,
    },
    'Auth request',
  );
  return auth.handler(c.req.raw);
});

export default authRouter;
