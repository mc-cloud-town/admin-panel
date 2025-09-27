import KeyvRedis from '@keyv/redis';
import { is } from 'drizzle-orm';
import { Cache } from 'drizzle-orm/cache/core';
import type { CacheConfig } from 'drizzle-orm/cache/core/types';
import { getTableName, Table } from 'drizzle-orm/table';
import Keyv from 'keyv';

export class RedisCache extends Cache {
  private readonly globalTtl = 30_000; // 30s
  private readonly tablesPerKey: Map<string, Set<string>> = new Map();
  private readonly usedTablesPerKey: Map<string, Set<string>> = new Map();

  private kv: Keyv;

  constructor(
    url: string = 'redis://localhost:6379',
    options?: Omit<Keyv.Options<unknown>, 'store' | 'uri'>
  ) {
    super();
    this.kv = new Keyv({
      ttl: this.globalTtl,
      store: new KeyvRedis({ url }),
      ...options,
    });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.kv.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });
    this.kv.on('connect', () => console.log('RedisCache connected to Redis'));
    this.kv.on('end', () => console.log('RedisCache disconnected from Redis'));
  }

  override strategy(): 'explicit' | 'all' {
    return 'all';
  }

  override async get<T = unknown>(key: string): Promise<T[] | undefined> {
    return (await this.kv.get(key)) ?? undefined;
  }

  override async put<T = unknown>(
    key: string,
    response: T,
    tables: string[],
    _isTag = false,
    config?: CacheConfig
  ): Promise<void> {
    await this.kv.set(key, response, config?.ex ?? this.globalTtl);

    if (!this.tablesPerKey.has(key)) {
      this.tablesPerKey.set(key, new Set());
    }

    const keyTables = this.tablesPerKey.get(key)!;
    for (const table of tables) {
      if (!this.usedTablesPerKey.has(table)) {
        this.usedTablesPerKey.set(table, new Set());
      }
      this.usedTablesPerKey.get(table)!.add(key);
      keyTables.add(table);
    }
  }

  override async onMutate(params: {
    tags: string | string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tables: string | string[] | Table<any> | Table<any>[];
  }): Promise<void> {
    const tagsArray = ([] as string[]).concat(params.tags ?? []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tablesArray = ([] as (string | Table<any>)[]).concat(
      params.tables ?? []
    );

    const keysToDelete = new Set<string>();
    for (const table of tablesArray) {
      const tableName = is(table, Table)
        ? getTableName(table)
        : (table as string);

      const keys = this.usedTablesPerKey.get(tableName);
      if (!keys) continue;
      for (const key of keys) {
        keysToDelete.add(key);
      }
    }

    const deleteKeys = [...tagsArray, ...keysToDelete];
    if (deleteKeys.length > 0) {
      await this.kv.delete(deleteKeys);
    }

    for (const key of keysToDelete) {
      const tables = this.tablesPerKey.get(key) ?? new Set();
      for (const table of tables) {
        const tableKeys = this.usedTablesPerKey.get(table);
        tableKeys?.delete(key);
        if (tableKeys?.size === 0) {
          this.usedTablesPerKey.delete(table);
        }
      }
      this.tablesPerKey.delete(key);
    }
  }
}
