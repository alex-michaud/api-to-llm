import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
// import { createAuthMiddleware } from 'better-auth/api';
// import { bearer } from 'better-auth/plugins/bearer';
import type { Context } from 'hono';
import { config } from '../config';
import { prisma } from '../services/database';
import { AuthError, AuthErrorType } from '../services/error/authError';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  // Allow requests from the frontend development server
  trustedOrigins: config.TRUSTED_ORIGINS,
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: !config.IS_DEV, // Set to true in production for security
      secure: !config.IS_DEV, // Set to true in production for security
    },
    database: {
      useNumberId: false,
      generateId: false,
      casing: 'camel', // Use camelCase for database fields
    },
    useSecureCookies: !config.IS_DEV, // Use secure cookies in production
  },
  user: {
    modelName: 'user',
    additionalFields: {
      apiKey: { type: 'string' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
  account: {
    modelName: 'account',
    fields: {
      userId: 'userId',
    },
    accountLinking: {
      enabled: true,
      trustedProviders: [/*'google', 'github', */ 'email-password'],
      allowDifferentEmails: false,
    },
  },
  session: {
    modelName: 'session',
    fields: {
      userId: 'userId',
    },
    expiresIn: 604800, // 7 days
    updateAge: 86400, // 1 day
    disableSessionRefresh: true, // Disable session refresh so that the session is not updated regardless of the `updateAge` option. (default: `false`)
    // additionalFields: {
    //   // Additional fields for the session table
    //   customField: {
    //     type: 'string',
    //   },
    // },
    storeSessionInDatabase: true, // Store session in the database when secondary storage is provided (default: `false`)
    preserveSessionInDatabase: false, // Preserve session records in the database when deleted from secondary storage (default: `false`)
    cookieCache: {
      enabled: true, // Enable caching session in cookie (default: `false`)
      maxAge: 300, // 5 minutes
    },
  },
  // hooks: {
  //   after: createAuthMiddleware(async (ctx) => {
  //     if (ctx.path.startsWith('/sign-up')) {
  //       const newSession = ctx.context.newSession;
  //       console.log('newSession', newSession);
  //     }
  //   }),
  // },
  // plugins: [bearer({ requireSignature: false })],
  /*databaseHooks: {
    account: {
      create: {
        before: async (account) => {
          console.log('Account created:', account);
        },
      },
    },
  },*/
  /*socialProviders: {
    github: {
      clientId: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
    },
  },*/
});

export type AuthType = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

export const getUserFromContext = (c: Context<{ Variables: AuthType }>) => {
  const user = c.get('user');
  if (!user) {
    throw new AuthError(AuthErrorType.UNAUTHORIZED);
  }
  return user;
};

export const getSessionFromContext = (c: Context<{ Variables: AuthType }>) => {
  const session = c.get('session');
  if (!session) {
    throw new AuthError(AuthErrorType.UNAUTHORIZED);
  }
  return session;
};
