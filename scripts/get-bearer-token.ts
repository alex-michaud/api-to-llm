import { auth } from '../src/lib/auth';

async function getBearerToken(email: string, password: string) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const result = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
    asResponse: true,
  });

  // console.log({ result });

  const token = result.headers.get('set-auth-token');

  if (!token) {
    throw new Error('Failed to obtain token');
  }

  console.log(`Bearer Token: ${token}`);
}

(async () => {
  const email = process.argv[2];
  const password = process.argv[3] || 'password123'; // Default password if not provided
  if (!email || !password) {
    console.error(
      'Usage: Bun run scripts/get-bearer-token.ts <email> [<password>]',
    );
    process.exit(1);
  }
  await getBearerToken(email, password);
})();
