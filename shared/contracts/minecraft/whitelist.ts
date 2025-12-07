import { type InferOutput, object, optional, union } from 'valibot';

import { IPContracts } from '../common/ip';
import { minecraftPlayerNameContracts, minecraftUUIDContracts } from './base';
import { minecraftServerContracts } from './server';

export const checkWhitelistByUUIDContracts = object({
  ...minecraftServerContracts.entries,
  uuid: minecraftUUIDContracts,
});
export type CheckWhitelistByUUIDContracts = InferOutput<
  typeof checkWhitelistByUUIDContracts
>;

export const checkWhitelistByPlayerNameContracts = object({
  ...minecraftServerContracts.entries,
  playerName: minecraftPlayerNameContracts,
});
export type CheckWhitelistByPlayerNameContracts = InferOutput<
  typeof checkWhitelistByPlayerNameContracts
>;

export const checkWhitelistContracts = union([
  object({
    ...checkWhitelistByUUIDContracts.entries,
    ip: optional(IPContracts),
  }),
  object({
    ...checkWhitelistByPlayerNameContracts.entries,
    ip: optional(IPContracts),
  }),
]);
export type CheckWhitelistContracts = InferOutput<
  typeof checkWhitelistContracts
>;
