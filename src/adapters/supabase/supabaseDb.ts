/**
 * Supabase Database Adapter
 * Implements DbPort using Supabase
 */

import type { DbPort, DbResult, SelectOptions } from '@/ports/DbPort';
import { supabaseClient } from './supabaseClient';

export const supabaseDb: DbPort = {
  async select<T>(table: string, options?: SelectOptions): Promise<DbResult<T[]>> {
    try {
      let query = supabaseClient.from(table).select(
        options?.columns?.join(',') ?? '*'
      );

      // Apply where conditions
      if (options?.where) {
        for (const [key, value] of Object.entries(options.where)) {
          query = query.eq(key, value);
        }
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      // Apply limit
      if (options?.limit !== undefined) {
        query = query.limit(options.limit);
      }

      // Apply offset
      if (options?.offset !== undefined) {
        query = query.range(
          options.offset,
          options.offset + (options.limit ?? 1000) - 1
        );
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as T[], error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },

  async insert<T>(table: string, values: Partial<T> | Partial<T>[]): Promise<DbResult<T>> {
    try {
      const insertData = Array.isArray(values) ? values : [values];
      const { data, error } = await supabaseClient
        .from(table)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as T, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },

  async update<T>(
    table: string,
    where: Record<string, unknown>,
    values: Partial<T>
  ): Promise<DbResult<T>> {
    try {
      let query = supabaseClient.from(table).update(values);

      // Apply where conditions
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value);
      }

      const { data, error } = await query.select().single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as T, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },

  async delete(table: string, where: Record<string, unknown>): Promise<DbResult<null>> {
    try {
      let query = supabaseClient.from(table).delete();

      // Apply where conditions
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value);
      }

      const { error } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: null, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },

  // Optional raw SQL support via Supabase RPC
  async sql<T>(query: string, params?: unknown[]): Promise<DbResult<T>> {
    try {
      const { data, error } = await supabaseClient.rpc('execute_sql', {
        query,
        params: params ?? [],
      });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as T, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },
};
