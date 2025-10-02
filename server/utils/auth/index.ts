import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { H3Event } from 'h3';
import { z } from 'zod';

import * as authSchema from '~~/server/database/auth-schema';
// this is needed to generate schema
import { useDrizzle } from '~~/server/utils/db';

export const auth = betterAuth({
  database: drizzleAdapter(useDrizzle(), {
    provider: 'pg',
    schema: authSchema,
  }),
  appName: 'CTEC-Admin-Panel',
  trustedOrigins: (process.env.TRUSTED_ORIGINS || '')
    .split(',')
    .filter(Boolean),
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      disableImplicitSignUp: true,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
  user: {
    modelName: 'members',
    additionalFields: {
      description: { type: 'string', required: false },
      status: {
        type: 'string',
        required: true,
        input: false,
        validator: {
          input: z.enum([
            'NON_APPLICANT', // 尚未申請
            'FORM_SUBMITTED', // 表單已提交
            'FORM_APPROVED', // 一審通過
            'SECOND_REVIEW_SCHEDULED', // 二審安排中（語音審核）
            'SECOND_REVIEW_PASSED', // 二審通過（語音 + 導覽）
            'GAME_REVIEWING', // 遊戲內審核中
            'OFFICIAL_MEMBER', // 正式成員
            'VISITOR', // 參訪身份
          ]),
        },
        defaultValue: 'NON_APPLICANT',
      },
      permissions: {
        type: 'number',
        input: false,
        required: true,
        defaultValue: 0,
      },
      rootAdmin: {
        type: 'boolean',
        input: false,
        required: true,
        defaultValue: false,
      },
    },
  },
  // databaseHooks: {
  //   user: {
  //     create: {
  //       before: async (newUser) => {
  //         const db = useDrizzle();
  //         const [{ count: userCount }] = await db
  //           .select({ count: count() })
  //           .from(user);
  //         if (userCount === 0) {
  //           return {
  //             data: {
  //               ...newUser,
  //               role: 'admin',
  //               emailVerified: true,
  //             },
  //           };
  //         }
  //         return true;
  //       },
  //     },
  //   },
  // },
});

export const getAuthSession = async (event: H3Event) => {
  const headers = event.headers;
  const session = await auth.api.getSession({ headers });

  return session;
};

export const requireAuth = async (
  event: H3Event,
  type: 'session' | 'api' | 'both' = 'both'
) => {
  const headers = event.headers;
  const authorizationHeader = headers.get('authorization') || '';
  const withHeader = authorizationHeader?.startsWith('Bearer ');

  if (type === 'api' && !withHeader) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized' });
  }

  if (withHeader) {
    if (type === 'session') {
      throw createError({ statusCode: 403, statusMessage: 'Unauthorized' });
    }

    const apiKey = authorizationHeader?.slice(7) || '';
    if (!apiKey) {
      throw createError({ statusCode: 403, statusMessage: 'Unauthorized' });
    }
    //   await auth.api.verifyApiKey({
    //     body: { key: apiKey },
    //   });
    // }
    // const session = await getAuthSession(event);
    // if (!session || !session.user) {
    //   throw createError({ statusCode: 403, statusMessage: 'Unauthorized' });
    // }
    // event.context.user = session.user;
    // return session.user;
  }
};
