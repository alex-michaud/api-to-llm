import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';
import { type AuthType, auth } from '../lib/auth';
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
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 *       description: Use your API key in the `x-api-key` header
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       description: Use your Bearer token in the `Authorization` header
 *     SessionCookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: session_token
 *       description: Use your session token in the `session_token` cookie in your browser or API client
 *   schemas:
 *     GenerateRequest:
 *       type: object
 *       properties:
 *         prompt:
 *           type: string
 *           description: The prompt to send to the LLM
 *           example: "What is the capital of France?"
 *         model:
 *           type: string
 *           description: The model to use for the LLM query (optional)
 *           example: "smollm2:135m"
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             description: Base64 encoded image string (optional)
 *             example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..."
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
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *       - SessionCookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateRequest'
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
 *     security:
 *      - ApiKeyAuth: []
 *      - BearerAuth: []
 *      - SessionCookieAuth: []
 *     responses:
 *       '200':
 *         description: Successful response with a list of models
 */
llmRouter.get('/list', async (c) => {
  const listResponse = await listModels();
  return c.json(listResponse.models);
});

export default llmRouter;
