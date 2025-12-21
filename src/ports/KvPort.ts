/**
 * Key-Value Storage Port
 * Defines the contract for key-value storage providers
 */

export interface KvPort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}
