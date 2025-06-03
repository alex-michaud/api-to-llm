import { faker } from '@faker-js/faker';
import { type User, prisma } from '../src/services/database';

export async function getApiKey(userId: string | undefined): Promise<void> {
  let user: User;
  if (!userId) {
    // Create a new test user if no user ID is provided
    const email = faker.internet.email();
    const name = faker.person.fullName();
    const apiKey = faker.string.uuid();

    user = await prisma.user.create({
      data: {
        email,
        name,
        apiKey,
      },
    });
  } else {
    // Fetch the user by ID if provided
    user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
  }

  if (!user.apiKey) {
    throw new Error('User does not have an API key');
  }
  console.log(`API Key: ${user.apiKey}`);
}

(async () => {
  try {
    // You can pass a user ID to get the API key for an existing user
    await getApiKey(process.argv[2] ?? undefined);
  } catch (error) {
    console.error('Error generating session:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
