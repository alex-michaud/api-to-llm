import { type Context, Hono } from 'hono';
import { auth } from '../lib/auth';
import type { AuthType } from '../lib/auth';

const authRouter = new Hono<{ Bindings: AuthType }>({
  strict: false,
});

authRouter.on(['POST', 'GET'], '/**', (c: Context) => {
  console.log('Auth request:', c.req.method, c.req.path);
  return auth.handler(c.req.raw);
});

export default authRouter;
