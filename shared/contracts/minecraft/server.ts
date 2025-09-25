import z from 'zod';

export const minecraftServerContracts = z.object({
  serverIP: z.union([z.ipv4(), z.ipv6()]),
  serverPort: z.number().min(1).max(65535).default(25565),
});
export type MinecraftServerContracts = z.infer<typeof minecraftServerContracts>;
