import { Hono } from 'hono';
import { type AuthType, auth } from '../lib/auth';
import { AuthError, AuthErrorType } from '../services/error/authError';
import { logger } from '../services/logger';
import authRouter from './auth';
import { healthHandler, testDBHandler } from './handlers/indexHandlers';
import llmRouter from './llm';

const apiRouter = new Hono<{ Variables: AuthType }>({
  strict: false,
});

apiRouter.use(async (c, next) => {
  logger.debug(
    {
      method: c.req.method,
      path: c.req.path,
    },
    'API Router Middleware',
  );
  await next();
});

/**
 * @openapi
 * /api/health/db:
 *   get:
 *     summary: Test database connection
 *     description: Check if the database connection is working
 *     responses:
 *       200:
 *         description: Database connected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 */
apiRouter.get('/health/db', testDBHandler);

/**
 * @openapi
 * /api/health/api:
 *   get:
 *     summary: Health check
 *     description: Check if the API is running
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 */
apiRouter.get('/health/api', healthHandler);

apiRouter.route('/auth', authRouter);

// llm routes handle the authentication internally
apiRouter.route('/llm', llmRouter);

// Authentication middleware
apiRouter.use(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  logger.debug({ session }, 'Authentication Middleware');
  if (!session) {
    throw new AuthError(AuthErrorType.UNAUTHORIZED);
  }
  c.set('user', session.user);
  c.set('session', session.session);
  await next();
});
// from here all routes are protected

export default apiRouter;
