import {
  type InferOutput,
  ip,
  maxValue,
  minValue,
  number,
  object,
  pipe,
  string,
} from 'valibot';

export const minecraftServerContracts = object({
  serverIP: pipe(string(), ip()),
  serverPort: pipe(number(), minValue(1), maxValue(65535)),
});
export type MinecraftServerContracts = InferOutput<
  typeof minecraftServerContracts
>;
