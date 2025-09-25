import * as z from 'zod';

export const authLoginContracts = z.object({
  email: z.email(),
  password: z.string().min(8).max(56),
  rememberMe: z.optional(z.boolean()),
});
export type AuthLoginContracts = z.infer<typeof authLoginContracts>;
