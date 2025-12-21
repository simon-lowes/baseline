/**
 * No-op Database Adapter
 * Throws errors for all operations - use when DB is not configured
 */

import type { DbPort, DbResult, SelectOptions } from '@/ports/DbPort';

const notConfiguredError = new Error('Database not configured');

export const noopDb: DbPort = {
  async select<T>(_table: string, _options?: SelectOptions): Promise<DbResult<T[]>> {
    return { data: null, error: notConfiguredError };
  },

  async insert<T>(_table: string, _values: Partial<T> | Partial<T>[]): Promise<DbResult<T>> {
    return { data: null, error: notConfiguredError };
  },

  async update<T>(_table: string, _where: Record<string, unknown>, _values: Partial<T>): Promise<DbResult<T>> {
    return { data: null, error: notConfiguredError };
  },

  async delete(_table: string, _where: Record<string, unknown>): Promise<DbResult<null>> {
    return { data: null, error: notConfiguredError };
  },
};
