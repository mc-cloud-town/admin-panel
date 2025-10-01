/**
 * RedisCache for Drizzle ORM-inspired logic
 *
 * Overview:
 * 1. Provides a Redis-based cache layer inspired by Drizzle ORM.
 * 2. Supports multi-tag cache invalidation.
 * 3. Supports global TTL and Redis event monitoring.
 * 4. Supports namespaces and non-auto-invalidate cache.
 *
 * License:
 * - This file is licensed under GNU GPLv3
 * - Drizzle ORM is licensed under Apache License 2.0
 *
 * Modifications:
 * - Full rewrite in TypeScript
 * - Custom Lua scripts for multi-tag invalidation
 * - Global TTL and event handlers
 * - Namespace support
 */

import type { RedisArgument } from '@redis/client';
import type { HashTypes } from '@redis/client/dist/lib/commands/HSET';
import { createHash } from 'crypto';
import { is, OriginalName } from 'drizzle-orm';
import type { MutationOption } from 'drizzle-orm/cache/core';
import { Cache } from 'drizzle-orm/cache/core';
import type { CacheConfig } from 'drizzle-orm/cache/core/types';
import { Table } from 'drizzle-orm/table';
import type { RedisClientType } from 'redis';
import { createClient } from 'redis';

/** Redis key for Minecraft whitelist cache */
export const CACHE_MINECRAFT_WHITELIST = 'minecraft_whitelist';

/** Lua script: Get cached value by tag */
const getByTagScript = `
local tagsMapKey = KEYS[1]
local tag        = ARGV[1]
local compositeTableName = redis.call('HGET', tagsMapKey, tag)
if not compositeTableName then return nil end
local value = redis.call('HGET', compositeTableName, tag)
return value
`;

/** Lua script: Invalidate cache by tags and tables */
const onMutateScript = `
local tagsMapKey = KEYS[1]
local tables     = { unpack(KEYS, 2) }
local tags       = ARGV
for _, rawTag in ipairs(tags) do
  for tag in string.gmatch(rawTag, '([^,]+)') do
    if tag ~= nil and tag ~= '' then
      local compositeTableName = redis.call('HGET', tagsMapKey, tag)
      if compositeTableName then redis.call('HDEL', compositeTableName, tag) end
      redis.call('HDEL', tagsMapKey, tag)
    end
  end
end
local keysToDelete = {}
for _, table in ipairs(tables) do
  local compositeTableNames = redis.call('SUNION', table)
  for _, compositeTableName in ipairs(compositeTableNames) do
    keysToDelete[#keysToDelete + 1] = compositeTableName
  end
  keysToDelete[#keysToDelete + 1] = table
end
if #keysToDelete > 0 then redis.call('DEL', unpack(keysToDelete)) end
`;

/** Lua script: Delete all keys by namespace */
const deleteFromNamespaceScript = `
local prefix = ARGV[1]
local batch_size = tonumber(ARGV[2]) or 100
local cursor = "0"
repeat
  local result = redis.call("SCAN", cursor, "MATCH", prefix .. "*", "COUNT", batch_size)
  cursor = result[1]
  local keys = result[2]
  if #keys > 0 then
    for i = 1, #keys, batch_size do
      local chunk = {}
      for j = i, math.min(i + batch_size - 1, #keys) do
        table.insert(chunk, keys[j])
      end
      redis.call("DEL", unpack(chunk))
    end
  end
until cursor == "0"
return "OK"
`;

/** Create a reusable Lua script function */
export const createScript = async <T>(
  client: RedisClientType,
  script: string,
  readOnly = false
) => {
  let sha1 = createHash('sha1').update(script).digest('hex');
  await client
    .scriptLoad(script)
    .then((newSHA1) => typeof newSHA1 === 'string' && (sha1 = newSHA1))
    .catch(() => {});
  const evalFn = readOnly ? client.evalRo : client.eval;
  const evalShaFn = readOnly ? client.evalShaRo : client.evalSha;
  return (keys: RedisArgument[], arg: RedisArgument[]) => {
    return evalShaFn
      .bind(client)(sha1, { keys, arguments: arg })
      .catch((error) => {
        if (
          error instanceof Error &&
          error.message.toLowerCase().includes('noscript')
        ) {
          return evalFn.bind(client)(script, { keys, arguments: arg });
        }
        throw error;
      }) as Promise<T>;
  };
};

/** Initialize Redis Lua scripts */
export const initializeRedisScripts = async (client: RedisClientType) => ({
  getByTag: await createScript<string | null>(client, getByTagScript, true),
  onMutate: await createScript<string | null>(client, onMutateScript),
  deleteFromNamespace: await createScript<string | null>(
    client,
    deleteFromNamespaceScript
  ),
});

/** RedisCache configuration options */
export interface RedisCacheOptions {
  ttl?: number;
  globally?: boolean;
  namespace?: string;
  hexOptions?: 'NX' | 'XX' | 'GT' | 'LT' | undefined;
}

/** RedisCache class */
export class RedisCache extends Cache {
  private options: RedisCacheOptions;
  private luaScripts?: Awaited<ReturnType<typeof initializeRedisScripts>>;
  public redis: RedisClientType;

  private static compositeTableSetPrefix = '__CTS__';
  private static compositeTablePrefix = '__CT__';
  private static tagsMapKey = '__tagsMap__';
  private static nonAutoInvalidateTablePrefix = '__nonAutoInvalidate__';

  constructor(
    url: string = 'redis://localhost:6379',
    options?: RedisCacheOptions
  ) {
    super();
    this.options = {
      ttl: 2 * 60 * 1000,
      globally: false,
      namespace: 'drizzle-orm',
      hexOptions: 'NX',
      ...options,
    };
    this.redis = createClient({ url });
    this.setupEventHandlers();
  }

  /** Add namespace prefix to a key */
  private withNamespace(key: string) {
    return this.options.namespace ? `${this.options.namespace}${key}` : key;
  }

  /** Prefix table set key with namespace */
  private addTablePrefix(table: string) {
    return this.withNamespace(`${RedisCache.compositeTableSetPrefix}${table}`);
  }

  /** Generate composite key with namespace */
  private getCompositeKey(tables: string[]) {
    return this.withNamespace(
      `${RedisCache.compositeTablePrefix}${tables.sort().join(',')}`
    );
  }

  /** Connect to Redis and initialize Lua scripts */
  public async connect(): Promise<void> {
    if (!this.redis.isOpen) await this.redis.connect();
    if (!this.luaScripts) {
      this.luaScripts = await initializeRedisScripts(this.redis);
    }
  }

  /** Disconnect from Redis */
  public async disconnect(): Promise<void> {
    await this.redis.quit();
    this.luaScripts = undefined;
  }

  /** Redis event handlers */
  private setupEventHandlers(): void {
    this.redis.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });
    this.redis.on('connect', () => {
      console.log('RedisCache connected to Redis');
    });
    this.redis.on('end', () => {
      console.log('RedisCache disconnected from Redis');
    });
  }

  /** Cache strategy */
  override strategy(): 'explicit' | 'all' {
    return this.options.globally ? 'all' : 'explicit';
  }

  /** Get cache */
  override async get<T = unknown>(
    key: string,
    tables: string[],
    isTag: boolean = false,
    isAutoInvalidate?: boolean
  ): Promise<T[] | undefined> {
    const namespacedKey = this.withNamespace(key);
    if (!isAutoInvalidate) {
      const result = await this.redis.hGet(
        this.withNamespace(RedisCache.nonAutoInvalidateTablePrefix),
        namespacedKey
      );
      return result === null ? undefined : (JSON.parse(result) as T[]);
    }
    if (isTag) {
      const result = await this.luaScripts?.getByTag(
        [this.withNamespace(RedisCache.tagsMapKey)],
        [namespacedKey]
      );
      return result ? (JSON.parse(result) as T[]) : undefined;
    }
    const compositeKey = this.getCompositeKey(tables);
    const result =
      (await this.redis.hGet(compositeKey, namespacedKey)) ?? undefined;
    return result ? (JSON.parse(result) as T[]) : undefined;
  }

  /** Put cache */
  override async put<T extends HashTypes>(
    key: string,
    response: T,
    tables: string[],
    isTag = false,
    config?: CacheConfig
  ): Promise<void> {
    const isAutoInvalidate = tables.length !== 0;
    const multi = this.redis.multi();
    const ttlSeconds = config?.ex ?? this.options.ttl;
    const hexOptions =
      (config?.hexOptions as 'NX' | 'XX' | 'GT' | 'LT') ?? 'NX';
    const namespacedKey = this.withNamespace(key);

    if (!isAutoInvalidate) {
      if (isTag) {
        multi.hSet(this.withNamespace(RedisCache.tagsMapKey), {
          [namespacedKey]: RedisCache.nonAutoInvalidateTablePrefix,
        });
        if (ttlSeconds) {
          multi.hExpire(
            this.withNamespace(RedisCache.tagsMapKey),
            namespacedKey,
            ttlSeconds,
            hexOptions
          );
        }
      }
      multi.hSet(
        this.withNamespace(RedisCache.nonAutoInvalidateTablePrefix),
        namespacedKey,
        JSON.stringify(response)
      );
      if (ttlSeconds) {
        multi.hExpire(
          this.withNamespace(RedisCache.nonAutoInvalidateTablePrefix),
          namespacedKey,
          ttlSeconds,
          hexOptions
        );
      }
      await multi.execAsPipeline();
      return;
    }

    const compositeKey = this.getCompositeKey(tables);
    multi.hSet(compositeKey, namespacedKey, JSON.stringify(response));
    if (ttlSeconds)
      multi.hExpire(compositeKey, namespacedKey, ttlSeconds, hexOptions);

    if (isTag) {
      multi.hSet(
        this.withNamespace(RedisCache.tagsMapKey),
        namespacedKey,
        compositeKey
      );
      if (ttlSeconds) {
        multi.hExpire(
          this.withNamespace(RedisCache.tagsMapKey),
          namespacedKey,
          ttlSeconds,
          hexOptions
        );
      }
    }

    for (const table of tables) {
      multi.sAdd(this.addTablePrefix(table), compositeKey);
    }

    await multi.execAsPipeline();
  }

  /** Invalidate cache on mutation */
  override async onMutate(params: MutationOption): Promise<void> {
    const tags = ([] as string[])
      .concat(params.tags ?? [])
      .map((tag) => this.withNamespace(tag));
    const tables = ([] as (string | Table)[]).concat(params.tables ?? []);
    const tableNames: string[] = tables.map((table) =>
      is(table, Table) ? table[OriginalName] : (table as string)
    );
    const compositeTableSets = tableNames.map((table) =>
      this.addTablePrefix(table)
    );
    await this.luaScripts?.onMutate(
      [this.withNamespace(RedisCache.tagsMapKey), ...compositeTableSets],
      tags
    );
  }

  /** Clear all keys under namespace */
  async clearAll(): Promise<void> {
    if (this.options.namespace)
      await this.luaScripts?.deleteFromNamespace([], [this.options.namespace]);
  }
}

/** Extend Table interface to include OriginalName */
declare module 'drizzle-orm/table' {
  export const OriginalName: unique symbol;
  export interface Table {
    [OriginalName]: string;
  }
}
