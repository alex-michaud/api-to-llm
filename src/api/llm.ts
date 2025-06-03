import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';
import { type AuthType, auth, getUserFromContext } from '../lib/auth';
import { prisma } from '../services/database';
import { AuthError, AuthErrorType } from '../services/error/authError';
import { generate, listModels } from '../services/llm/ollama';

const llmRouter = new Hono<{ Variables: AuthType }>({
  strict: false,
});

// Middleware to check if the user has a valid API key OR a valid cookie session
llmRouter.use(async (c, next) => {
  // check if the request has an api key to access LLM features
  const headerAPIKey = c.req.header('x-api-key');
  // If no API key is provided, check for a session cookie
  if (!headerAPIKey) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    // If no API key and no session, throw an error
    if (!session) {
      throw new AuthError(
        AuthErrorType.UNAUTHORIZED,
        'No valid session or API key provided',
      );
    }
    c.set('user', session.user);
    c.set('session', session.session);
  }
  // If an API key is provided, validate it against the user's API key
  else {
    // const user = getUserFromContext(c);
    // @todo we should retrieve the user from valkey(redis) or something faster than a database query
    const user = await prisma.user.findUnique({
      where: { apiKey: headerAPIKey },
    });
    // If the user does not have an API key or the provided API key does not match, throw an error
    if (!user?.apiKey || headerAPIKey !== user.apiKey) {
      throw new AuthError(AuthErrorType.INVALID_API_KEY);
    }
  }
  await next();
});

// Define the schema for LLM request
const llmRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  model: z.string().optional(),
  images: z.array(z.string()).optional(),
});

/**
 * @openapi
 * components:
 *   parameters:
 *     ApiKeyHeader:
 *       in: header
 *       type: apiKey
 *       name: x-api-key
 *       required: true
 *       schema:
 *         type: string
 *       description: API key for authentication
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     LLMRequest:
 *       type: object
 *       properties:
 *         prompt:
 *           type: string
 *           description: The prompt to send to the LLM
 *         model:
 *           type: string
 *           description: The model to use for the LLM query (optional)
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             description: Base64 encoded image string (optional)
 *       required:
 *         - prompt
 */

/**
 * @openapi
 * /api/llm/generate:
 *   post:
 *     tags:
 *       - LLM
 *     summary: Query a Large Language Model (LLM)
 *     description: Send a prompt to a Large Language Model and receive a response
 *     parameters:
 *       - $ref: '#/components/parameters/SessionCookie'
 *       - $ref: '#/components/parameters/ApiKeyHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LLMRequest'
 *     responses:
 *       '200':
 *         description: Successful response with LLM output
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
llmRouter.post('/generate', async (c) => {
  const body = await c.req.json();
  const parsedBody = llmRequestSchema.parse(body);

  const { prompt, model } = parsedBody;

  try {
    const response = await generate({ prompt, model });
    return c.json(response);
  } catch (error: unknown) {
    throw new HTTPException(500, {
      message: 'Internal server error',
      cause: error,
    });
  }
});

/**
 * @openapi
 * /api/llm/list:
 *   get:
 *     tags:
 *      - LLM
 *     summary: List available LLM models
 *     description: Retrieve a list of available models for querying the LLM
 *     parameters:
 *       - $ref: '#/components/parameters/ApiKeyHeader'
 *     responses:
 *       '200':
 *         description: Successful response with a list of models
 */
llmRouter.get('/list', async (c) => {
  const listResponse = await listModels();
  return c.json(listResponse.models);
});

export default llmRouter;
