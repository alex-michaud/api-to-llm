import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';
import { type AuthType, getUserFromContext } from '../lib/auth';
import { AuthError, AuthErrorType } from '../services/error/authError';
import { generate, listModels } from '../services/llm/ollama';

const llmRouter = new Hono<{ Variables: AuthType }>({
  strict: false,
});

llmRouter.use(async (c, next) => {
  const user = getUserFromContext(c);
  // check if the user has an api key to access LLM features
  const headerAPIKey = c.req.header('x-api-key');
  if (!headerAPIKey) {
    throw new AuthError(AuthErrorType.NO_API_KEY_PROVIDED);
  }
  if (!user.apiKey || headerAPIKey !== user.apiKey) {
    throw new AuthError(AuthErrorType.INVALID_API_KEY);
  }
  await next();
});

// Define the schema for LLM request
const llmRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  model: z.string().optional(),
});

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
 *     responses:
 *       '200':
 *         description: Successful response with a list of models
 */
llmRouter.get('/list', async (c) => {
  const listResponse = await listModels();
  return c.json(listResponse.models);
});

export default llmRouter;
