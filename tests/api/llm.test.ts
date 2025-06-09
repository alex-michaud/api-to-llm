import { beforeAll, describe, expect, it } from 'bun:test';
import { Buffer } from 'node:buffer';
import { faker } from '@faker-js/faker';
import { app } from '../../src/server';
import { signUpTestUser } from '../common';

let testUserPassword: string;
let testUserApiKey: string;
let cookie: string;

describe('LLM API endpoints', () => {
  beforeAll(async () => {
    testUserPassword = 'password123'; // Use a fixed password for testing
    testUserApiKey = faker.string.uuid();
    const testUserObject = {
      email: faker.internet.email().toLocaleLowerCase(),
      password: testUserPassword,
      name: faker.person.fullName(),
      apiKey: testUserApiKey,
    };
    const { headers } = await signUpTestUser({
      password: testUserPassword,
      email: testUserObject.email,
      name: testUserObject.name,
      apiKey: testUserApiKey,
    });
    cookie = headers.get('set-cookie') || '';
  });

  it('should return the list of available models', async () => {
    const response = await app.request('/api/llm/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Cookie: cookie, // Use the session cookie for authentication
        'x-api-key': testUserApiKey, // Include the API key in the headers
      },
    });
    // console.log({ cookie, testUserApiKey });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch models: ${errorText}`);
    }
    expect(response.status).toBe(200);
    const modelList = await response.json();
    // console.log(modelList);
    // expect(data).toHaveProperty('models');
    expect(modelList).toBeArray();
    expect(modelList.length).toBeGreaterThan(0);
    const firstModel = modelList[0];
    expect(firstModel).toHaveProperty('name');
    expect(firstModel).toHaveProperty('model');
    expect(firstModel).toHaveProperty('size');
    expect(firstModel).toHaveProperty('details');
  });

  it('should generate a response from the LLM', async () => {
    const response = await app.request('/api/llm/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie, // Use the session cookie for authentication
        'x-api-key': testUserApiKey, // Include the API key in the headers
      },
      body: JSON.stringify({
        prompt: 'What is the capital of France?',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate response: ${errorText}`);
    }

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('response');
    expect(data.response).toBeString();
  });

  it('should extract text from an image', async () => {
    const filePath = './tests/assets/facile/12point.png';
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      throw new Error(`File not found: ${file.name}`);
    }
    const arrayBuffer = await file.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');
    // console.log(imageBase64);

    const response = await app.request('/api/llm/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie, // Use the session cookie for authentication
        'x-api-key': testUserApiKey, // Include the API key in the headers
      },
      body: JSON.stringify({
        images: imageBase64,
        model: 'qwen2.5vl:32b-q8_0',
        // model: 'llama3.2-vision:11b',
        // model: 'deepseek-r1:70b', // timeout
        // model: 'qwen3:30b-a3b', // timeout
        // model: 'gemma3:27b-it-q8_0',
        prompt: 'Extract the name of the monument in the image',
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to extract text: ${errorText}`);
    }

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('response');
    expect(data.response).toBeString();
  }, 10000);

  it('should extract text in a markdown format from an archive image', async () => {
    // const filePath = './tests/assets/intermediaire/apnql.jpg';
    // const filePath = './tests/assets/facile/12point.png';
    const filePath = './tests/assets/facile/centre-gouvernance-pn.png';
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      throw new Error(`File not found: ${file.name}`);
    }
    const arrayBuffer = await file.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');
    // console.log(imageBase64);

    const response = await app.request('/api/llm/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie, // Use the session cookie for authentication
        'x-api-key': testUserApiKey, // Include the API key in the headers
      },
      body: JSON.stringify({
        image: imageBase64,
        model: 'qwen2.5vl:32b-q8_0',
        // model: 'llama3.2-vision:11b',
        // model: 'deepseek-r1:70b', // timeout
        // model: 'qwen3:30b-a3b', // timeout
        // model: 'gemma3:27b-it-q8_0',
        // prompt: 'Extract all text from this and format it using markdown. Use headings, bullet points and other markdown syntax where appropriate. Dot not use triple backticks to wrap the markdown response.',
        prompt:
          'You are a Markdown formatter. Output only valid raw Markdown. Do not wrap your response in a code block or backticks.',
        // format: 'json',
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to extract text: ${errorText}`);
    }

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('response');
    expect(data.response).toBeString();
  }, 40000);
});
