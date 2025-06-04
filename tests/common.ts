import bun from 'bun';
import { auth } from '../src/lib/auth';
import { prisma } from '../src/services/database';

export const signUpTestUser = async ({
  password = 'password123',
  email,
  name = 'Test User',
  apiKey,
}: {
  password: string;
  email: string;
  name?: string;
  apiKey?: string;
}) => {
  const response = await auth.api.signUpEmail({
    body: {
      password,
      email,
      name,
      apiKey,
    },
    asResponse: true,
  });

  return response;
};

export const signInTestUser = async ({
  email,
  password = 'password123',
}: { email: string; password: string }) => {
  const data = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
    asResponse: false,
  });

  return data.token;
};

export const createTestUser = async ({
  email,
  password,
  name,
  apiKey,
}: {
  email: string;
  password: string;
  name: string;
  apiKey?: string;
}) => {
  return prisma.user.create({
    data: {
      email,
      password: await bun.password.hash(password),
      name,
      apiKey,
    },
  });
};
