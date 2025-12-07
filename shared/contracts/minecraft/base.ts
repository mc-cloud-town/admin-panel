import {
  type InferOutput,
  maxLength,
  minLength,
  pipe,
  regex,
  string,
  uuid,
} from 'valibot';

export const minecraftPlayerNameContracts = pipe(
  string(),
  minLength(2),
  maxLength(16),
  regex(/^[a-zA-Z0-9_]{2,16}$/)
);
export type MinecraftPlayerNameContracts = InferOutput<
  typeof minecraftPlayerNameContracts
>;

export const minecraftUUIDContracts = pipe(string(), uuid());
export type MinecraftUUIDContracts = InferOutput<typeof minecraftUUIDContracts>;
