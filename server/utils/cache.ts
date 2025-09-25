import { createStorage } from 'unstorage';
import lruCacheDriver from 'unstorage/drivers/lru-cache';
import redisDriver from 'unstorage/drivers/redis';

const config = useRuntimeConfig();

const USE_REDIS = config.REDIS_HOST && config.REDIS_PASSWORD;

export const CACHE_MINECRAFT_WHITELIST = 'minecraft-whitelist';
export type CACHE_MINECRAFT_WHITELIST = typeof CACHE_MINECRAFT_WHITELIST;

export const cache = createStorage<CustomStorageDefinition>({
  driver: USE_REDIS
    ? redisDriver({
        base: 'ctec-admin-panel',
        host: config.REDIS_HOST,
        tls: true as never,
        port: 6380,
        password: config.REDIS_PASSWORD,
      })
    : lruCacheDriver({}),
});

export const getOrSetCache = async <
  K extends keyof CustomStorageDefinition['items']
>(
  key: K,
  fetcher: () =>
    | CustomStorageDefinition['items'][K]
    | Promise<CustomStorageDefinition['items'][K]>,
  options: { ttl?: number } = {}
): Promise<CustomStorageDefinition['items'][K]> => {
  const cached = await cache.getItem<CustomStorageDefinition['items'][K]>(key);
  if (cached !== null) return cached;

  const fresh = await Promise.resolve(fetcher());
  await cache.setItem(key, fresh as never, options);
  return fresh;
};

export type WithKeyPrefix<
  T extends string,
  P extends Record<string, unknown>
> = {
  [key in keyof P as `${T}:${string & key}`]: P[key];
};

type MinecraftWhitelistCacheItems = WithKeyPrefix<
  CACHE_MINECRAFT_WHITELIST,
  {
    [key: `addr:${MinecraftServerAddr}`]: MinecraftServerID | false;
    [key: `player:uuid:${MinecraftUUID}`]: MinecraftPlayerID | false;
    [key: `player:name:${MinecraftPlayerName}`]: MinecraftPlayerID | false;
    [key: `id:${MinecraftServerID}:ip:${IP}`]: boolean;
    [key: `id:${MinecraftServerID}:player:${MinecraftPlayerID}`]: boolean;
    [key: `id:${MinecraftServerID}:player:${MinecraftPlayerID}:roles`]: boolean;
  }
>;

type CustomStorageDefinition = {
  items: MinecraftWhitelistCacheItems;
};
