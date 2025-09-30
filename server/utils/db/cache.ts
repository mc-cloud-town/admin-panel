/**
 * RedisCache for Drizzle ORM-inspired logic
 *
 * This file implements a Redis caching mechanism inspired by Drizzle ORM's cache logic
 * (https://github.com/drizzle-team/drizzle-orm), adapted for Keyv/Upstash Redis.
 *
 * License:
 * This file is part of a project licensed under GNU GPLv3.
 * Drizzle ORM is licensed under Apache License 2.0.
 *
 * Modifications:
 * - Full rewrite in TypeScript
 * - Custom Lua scripts for multi-tag invalidation
 * - Global TTL and Redis event handlers
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

export const CACHE_MINECRAFT_WHITELIST = 'minecraft_whitelist';

const getByTagScript = `
local tagsMapKey = KEYS[1] -- tags map key
local tag        = ARGV[1] -- tag

local compositeTableName = redis.call('HGET', tagsMapKey, tag)
if not compositeTableName then
  return nil
end

local value = redis.call('HGET', compositeTableName, tag)
return value
`;

const onMutateScript = `
local tagsMapKey = KEYS[1]                   -- tags map key
local tables     = { unpack(KEYS, 2) } -- initialize tables array
local tags       = ARGV                      -- tags array

-- process tags (invalidate all related cache entries)
if #tags > 0 then
  for _, rawTag in ipairs(tags) do
    for tag in string.gmatch(rawTag, '([^,]+)') do
      if tag ~= nil and tag ~= '' then
        -- find compositeTableName for this tag
        local compositeTableName = redis.call('HGET', tagsMapKey, tag)
        if compositeTableName then
          -- delete the compositeTableName entry
          redis.call('HDEL', compositeTableName, tag)
        end
        -- delete from tagsMap
        redis.call('HDEL', tagsMapKey, tag)
      end
    end
  end
  redis.call('HDEL', tagsMapKey, unpack(tags))
end

local keysToDelete = {}

-- process tables (invalidate all related cache entries)
if #tables > 0 then
  -- find all compositeTableNames from the sets in tables
  local compositeTableNames = redis.call('SUNION', unpack(tables))
  for _, compositeTableName in ipairs(compositeTableNames) do
    keysToDelete[#keysToDelete + 1] = compositeTableName
  end
  -- also delete the sets themselves
  for _, table in ipairs(tables) do
    keysToDelete[#keysToDelete + 1] = table
  end
  if #keysToDelete > 0 then
    redis.call('DEL', unpack(keysToDelete))
  end
end
`;

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
          return evalFn.bind(client)(script, {
            keys,
            arguments: arg,
          });
        }
        throw error;
      }) as Promise<T>;
  };
};

export const initializeRedisScripts = async (client: RedisClientType) => {
  return {
    getByTag: await createScript<string | null>(client, getByTagScript, true),
    onMutate: await createScript<string | null>(client, onMutateScript),
  };
};

export interface RedisCacheOptions {
  ttl?: number;
  namespace?: string;
  hexOptions?: 'NX' | 'XX' | 'GT' | 'LT' | undefined;
}

export class RedisCache extends Cache {
  private options: RedisCacheOptions;

  /**
   * Prefix for sets which denote the composite table names for each unique table
   *
   * Example: In the composite table set of "table1", you may find
   * `${compositeTablePrefix}table1,table2` and `${compositeTablePrefix}table1,table3`
   */
  private static compositeTableSetPrefix = '__CTS__';
  /**
   * Prefix for hashes which map hash or tags to cache values
   */
  private static compositeTablePrefix = '__CT__';
  /**
   * Key which holds the mapping of tags to composite table names
   *
   * Using this tagsMapKey, you can find the composite table name for a given tag
   * and get the cache value for that tag:
   *
   * ```ts
   * const compositeTable = redis.hget(tagsMapKey, 'tag1')
   * console.log(compositeTable) // `${compositeTablePrefix}table1,table2`
   *
   * const cachevalue = redis.hget(compositeTable, 'tag1')
   */
  private static tagsMapKey = '__tagsMap__';
  /**
   * Queries whose auto invalidation is false aren't stored in their respective
   * composite table hashes because those hashes are deleted when a mutation
   * occurs on related tables.
   *
   * Instead, they are stored in a separate hash with the prefix
   * `__nonAutoInvalidate__` to prevent them from being deleted when a mutation
   */
  private static nonAutoInvalidateTablePrefix = '__nonAutoInvalidate__';

  public redis: RedisClientType;
  private luaScripts?: Awaited<ReturnType<typeof initializeRedisScripts>>;

  constructor(
    url: string = 'redis://localhost:6379',
    options?: RedisCacheOptions,
    protected useGlobally?: boolean
  ) {
    super();

    this.options = {
      ttl: 2 * 60 * 1000,
      namespace: 'drizzle-orm:',
      hexOptions: 'NX',
      ...options,
    };
    this.redis = createClient({ url });
    this.setupEventHandlers();
  }

  public async connect(): Promise<void> {
    if (!this.redis.isOpen) {
      await this.redis.connect();
    }
    if (!this.luaScripts) {
      this.luaScripts = await initializeRedisScripts(this.redis);
    }
  }

  public async disconnect(): Promise<void> {
    await this.redis.quit();
    this.luaScripts = undefined;
  }

  private setupEventHandlers(): void {
    this.redis.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });
    this.redis.on('connect', () =>
      console.log('RedisCache connected to Redis')
    );
    this.redis.on('end', () =>
      console.log('RedisCache disconnected from Redis')
    );
  }

  override strategy(): 'explicit' | 'all' {
    return this.useGlobally ? 'all' : 'explicit';
  }

  override async get<T = unknown>(
    key: string,
    tables: string[],
    isTag: boolean = false,
    isAutoInvalidate?: boolean
  ): Promise<T[] | undefined> {
    if (!isAutoInvalidate) {
      const result = await this.redis.hGet(
        RedisCache.nonAutoInvalidateTablePrefix,
        key
      );
      return result === null ? undefined : (JSON.parse(result) as T[]);
    }

    if (isTag) {
      const result = await this.luaScripts?.getByTag(
        [RedisCache.tagsMapKey],
        [key]
      );
      return result ? (JSON.parse(result) as T[]) : undefined;
    }

    // Normal cache lookup for the composite key
    const compositeKey = this.getCompositeKey(tables);
    const result = (await this.redis.hGet(compositeKey, key)) ?? undefined; // Retrieve result for normal query
    return result ? (JSON.parse(result) as T[]) : undefined;
  }

  override async put<T extends HashTypes>(
    key: string,
    response: T,
    tables: string[],
    isTag = false,
    config?: CacheConfig
  ): Promise<void> {
    const isAutoInvalidate = tables.length !== 0;
    const multi = this.redis.multi();
    const ttlSeconds = config && config.ex ? config.ex : this.options.ttl;
    const hexOptions =
      (config && (config.hexOptions as 'NX' | 'XX' | 'GT' | 'LT')) ||
      'NX'; /* NX, XX, GT, LT */

    if (!isAutoInvalidate) {
      if (isTag) {
        multi.hSet(RedisCache.tagsMapKey, {
          [key]: RedisCache.nonAutoInvalidateTablePrefix,
        });
        if (ttlSeconds) {
          multi.hExpire(RedisCache.tagsMapKey, key, ttlSeconds, hexOptions);
        }
      }

      multi.hSet(
        RedisCache.nonAutoInvalidateTablePrefix,
        key,
        JSON.stringify(response)
      );
      if (ttlSeconds) {
        multi.hExpire(
          RedisCache.nonAutoInvalidateTablePrefix,
          key,
          ttlSeconds,
          hexOptions
        );
      }
      await multi.execAsPipeline();
      return;
    }

    const compositeKey = this.getCompositeKey(tables);

    multi.hSet(compositeKey, key, JSON.stringify(response)); // Store the result with the tag under the composite key
    if (ttlSeconds) {
      multi.hExpire(compositeKey, key, ttlSeconds, hexOptions); // Set expiration for the composite key
    }
    if (isTag) {
      multi.hSet(RedisCache.tagsMapKey, key, compositeKey); // Store the tag and its composite key in the map
      if (ttlSeconds) {
        multi.hExpire(RedisCache.tagsMapKey, key, ttlSeconds, hexOptions); // Set expiration for the tag
      }
    }

    for (const table of tables) {
      multi.sAdd(this.addTablePrefix(table), compositeKey);
    }

    await multi.execAsPipeline();
  }

  override async onMutate(params: MutationOption): Promise<void> {
    const tags = ([] as string[]).concat(params.tags ?? []);
    const tables = ([] as (string | Table)[]).concat(params.tables ?? []);
    const tableNames: string[] = tables.map((table) =>
      is(table, Table) ? table[OriginalName] : (table as string)
    );

    const compositeTableSets = tableNames.map((table) =>
      this.addTablePrefix(table)
    );
    await this.luaScripts?.onMutate(
      [RedisCache.tagsMapKey, ...compositeTableSets],
      tags
    );
  }

  private addTablePrefix = (table: string) =>
    `${RedisCache.compositeTableSetPrefix}${table}`;
  private getCompositeKey = (tables: string[]) =>
    `${RedisCache.compositeTablePrefix}${tables.sort().join(',')}`;
}

// Augment the Table interface to include the OriginalName property
// This is necessary because we are using the OriginalName symbol to store
// the original name of the table for caching purposes.
declare module 'drizzle-orm/table' {
  export const OriginalName: unique symbol;

  export interface Table {
    [OriginalName]: string;
  }
}
