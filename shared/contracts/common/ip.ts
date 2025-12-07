import { ip, pipe, string } from 'valibot';

export const IPContracts = pipe(string(), ip());
