import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { Pool as PgPool } from 'pg';

/**
 * Cliente PostgreSQL para acceso directo a la base de datos
 * Reemplaza a Supabase client para operaciones de base de datos
 */

let pool: Pool | null = null;

/**
 * Obtiene o crea el pool de conexiones PostgreSQL
 */
export const getPool = (): Pool => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    pool = new PgPool({
      connectionString,
      max: 20, // Máximo de conexiones
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      options: '-c search_path=public', // Asegurar que busque en el schema public
    });

    // Manejar errores del pool
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
};

/**
 * Ejecuta una query SQL con parámetros
 */
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const pool = getPool();
  return pool.query<T>(text, params);
};

/**
 * Obtiene un cliente para transacciones
 */
export const getClient = async (): Promise<PoolClient> => {
  const pool = getPool();
  return pool.connect();
};

/**
 * Ejecuta una función dentro de una transacción
 */
export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Cierra el pool de conexiones (útil para tests)
 */
export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

/**
 * Helper para construir queries con tipado
 */
export const sql = {
  /**
   * SELECT con tipado
   */
  select: async <T extends QueryResultRow = QueryResultRow>(
    table: string,
    where?: Record<string, unknown>,
    options?: {
      columns?: string[];
      orderBy?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]> => {
    const columns = options?.columns?.join(', ') || '*';
    let query = `SELECT ${columns} FROM ${table}`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (where) {
      const conditions = Object.entries(where).map(([key, value]) => {
        params.push(value);
        return `${key} = $${paramIndex++}`;
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (options?.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    if (options?.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await getPool().query<T>(query, params);
    return result.rows;
  },

  /**
   * INSERT con tipado
   */
  insert: async <T extends QueryResultRow = QueryResultRow>(
    table: string,
    data: Record<string, unknown>
  ): Promise<T | undefined> => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await getPool().query<T>(query, values);
    return result.rows[0];
  },

  /**
   * UPDATE con tipado
   */
  update: async <T extends QueryResultRow = QueryResultRow>(
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>
  ): Promise<T[]> => {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);

    const setClause = dataKeys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');

    const whereClause = whereKeys
      .map((key, i) => `${key} = $${dataKeys.length + i + 1}`)
      .join(' AND ');

    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;

    const result = await getPool().query<T>(query, [...dataValues, ...whereValues]);
    return result.rows;
  },

  /**
   * DELETE con tipado
   */
  delete: async (
    table: string,
    where: Record<string, unknown>
  ): Promise<number> => {
    const keys = Object.keys(where);
    const values = Object.values(where);

    const whereClause = keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(' AND ');

    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await getPool().query(query, values);
    return result.rowCount || 0;
  },
};
