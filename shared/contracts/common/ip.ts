import z from 'zod';

export const IPContracts = z.union([z.ipv4(), z.ipv6()]);
