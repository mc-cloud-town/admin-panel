import {
  boolean,
  email,
  type InferOutput,
  maxLength,
  minLength,
  object,
  optional,
  pipe,
  string,
} from 'valibot';

export const authLoginContracts = object({
  email: pipe(string(), email()),
  password: pipe(string(), minLength(8), maxLength(56)),
  rememberMe: optional(boolean()),
});
export type AuthLoginContracts = InferOutput<typeof authLoginContracts>;
