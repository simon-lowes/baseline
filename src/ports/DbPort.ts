/**
 * Database Port
 * Defines the contract for database providers
 */

export interface SelectOptions {
  columns?: string[];
  where?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export interface DbResult<T> {
  data: T | null;
  error: Error | null;
}

export interface DbPort {
  select<T>(table: string, options?: SelectOptions): Promise<DbResult<T[]>>;
  insert<T>(table: string, values: Partial<T> | Partial<T>[]): Promise<DbResult<T>>;
  update<T>(table: string, where: Record<string, unknown>, values: Partial<T>): Promise<DbResult<T>>;
  delete(table: string, where: Record<string, unknown>): Promise<DbResult<null>>;
  
  /**
   * Execute raw SQL query (optional, only for SQL backends)
   * Throws if not supported by the adapter
   */
  sql?<T>(query: string, params?: unknown[]): Promise<DbResult<T>>;
}
