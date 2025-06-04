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
    const filePath =
      './tests/assets/960px-Arc_de_Triomphe,_Paris_21_October_2010.jpeg';
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      throw new Error(`File not found: ${file.name}`);
    }
    const arrayBuffer = await file.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

    const response = await app.request('/api/llm/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie, // Use the session cookie for authentication
        'x-api-key': testUserApiKey, // Include the API key in the headers
      },
      body: JSON.stringify({
        image: imageBase64,
        prompt: 'Extract the name of the monument in the image',
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to extract text: ${errorText}`);
    }

    expect(response.status).toBe(200);
    const data = await response.json();
    // console.log(data);
    expect(data).toHaveProperty('response');
    expect(data.response).toBeString();
  });
});
