import z from 'zod';

export const minecraftPlayerNameContracts = z
  .string()
  .min(2)
  .max(16)
  .regex(/^[a-zA-Z0-9_]{2,16}$/);
export type MinecraftPlayerNameContracts = z.infer<
  typeof minecraftPlayerNameContracts
>;

export const minecraftUUIDContracts = z.uuid();
export type MinecraftUUIDContracts = z.infer<typeof minecraftUUIDContracts>;
