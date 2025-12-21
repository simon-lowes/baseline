/**
 * Local Storage KV Adapter
 * Implements KvPort using browser localStorage
 */

import type { KvPort } from '@/ports/KvPort';

const STORAGE_PREFIX = 'app_kv:';

export const localKv: KvPort = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      if (item === null) return null;
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  },

  async delete(key: string): Promise<void> {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  async list(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    const searchPrefix = STORAGE_PREFIX + (prefix ?? '');
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(searchPrefix)) {
        // Remove the storage prefix to return the user-facing key
        keys.push(key.slice(STORAGE_PREFIX.length));
      }
    }
    
    return keys;
  },
};
