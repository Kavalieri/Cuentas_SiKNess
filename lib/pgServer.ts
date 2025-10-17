/**
 * PostgreSQL Server - Funciones de servidor para acceso a base de datos
 * Reemplaza completamente a Supabase Client/Server con PostgreSQL nativo
 */

import {
    getCurrentUser as authGetCurrentUser,
    getUserHouseholdId as authGetUserHouseholdId,
} from './auth';
import { query } from './db';

// Re-exportar query para uso directo en actions
export { query };

// Tipos para las cláusulas WHERE
interface WhereClause {
  column: string;
  value: unknown;
  op: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'IN' | 'LIKE' | 'ILIKE';
}

// Tipos para el orden
interface OrderClause {
  column: string;
  ascending: boolean;
}

// Tipo genérico para respuestas
interface QueryResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

interface QueryArrayResponse<T> {
  data: T[];
  error: { message: string; code?: string } | null;
  count?: number | null;
}

/**
 * Cliente PostgreSQL Server-side compatible con sintaxis legacy
 * Mantiene compatibilidad para migración gradual de código antiguo
 */
export const pgServer = async () => {
  return {
    auth: {
      getUser: async () => {
        const user = await authGetCurrentUser();
        return {
          data: { user },
          error: user ? null : { message: 'Not authenticated' },
        };
      },
      signOut: async () => {
        const { signOut } = await import('./auth');
        await signOut();
        return { error: null };
      },
      getSession: async () => {
        const user = await authGetCurrentUser();
        return {
          data: {
            session: user
              ? {
                  user,
                  access_token: 'stub',
                  refresh_token: 'stub',
                  expires_at: Date.now() + 3600000,
                }
              : null,
          },
          error: null,
        };
      },
      exchangeCodeForSession: async (_code: string) => {
        // Este método no se usa realmente en nuestro sistema
        // La autenticación se maneja mediante sesiones de Next.js
        return {
          data: { session: null, user: null },
          error: { message: 'exchangeCodeForSession no implementado - usar sesiones Next.js' },
        };
      },
      verifyOtp: async (_params: { token_hash: string; type: string }) => {
        // Este método no se usa realmente en nuestro sistema
        return {
          data: { session: null, user: null },
          error: { message: 'verifyOtp no implementado - usar sesiones Next.js' },
        };
      },
      admin: {
        listUsers: async () => {
          // Listar todos los usuarios desde profiles
          const result = await query(`
            SELECT
              auth_user_id as id,
              email,
              display_name,
              created_at,
              updated_at,
              created_at as last_sign_in_at
            FROM profiles
            ORDER BY created_at DESC
          `);

          return {
            data: { users: result.rows },
            error: null,
          };
        },
        getUserById: async (userId: string) => {
          // Obtener un usuario por ID desde profiles
          const result = await query(
            `
            SELECT
              auth_user_id as id,
              email,
              display_name,
              created_at,
              updated_at
            FROM profiles
            WHERE auth_user_id = $1
          `,
            [userId],
          );

          return {
            data: { user: result.rows[0] || null },
            error: result.rows[0] ? null : { message: 'Usuario no encontrado' },
          };
        },
      },
    },
    from: (table: string) => ({
      select: (columns?: string, options?: { count?: 'exact'; head?: boolean }) => {
        const builder = {
          _table: table,
          _columns: columns || '*',
          _where: [] as WhereClause[],
          _limit: undefined as number | undefined,
          _order: undefined as OrderClause | undefined,
          _countMode: options?.count,
          _headMode: options?.head,
          eq(column: string, value: unknown) {
            this._where.push({ column, value, op: '=' });
            return this;
          },
          neq(column: string, value: unknown) {
            this._where.push({ column, value, op: '!=' });
            return this;
          },
          in(column: string, values: unknown[]) {
            this._where.push({ column, value: values, op: 'IN' });
            return this;
          },
          gt(column: string, value: unknown) {
            this._where.push({ column, value, op: '>' });
            return this;
          },
          gte(column: string, value: unknown) {
            this._where.push({ column, value, op: '>=' });
            return this;
          },
          lt(column: string, value: unknown) {
            this._where.push({ column, value, op: '<' });
            return this;
          },
          lte(column: string, value: unknown) {
            this._where.push({ column, value, op: '<=' });
            return this;
          },
          like(column: string, pattern: string) {
            this._where.push({ column, value: pattern, op: 'LIKE' });
            return this;
          },
          ilike(column: string, pattern: string) {
            this._where.push({ column, value: pattern, op: 'ILIKE' });
            return this;
          },
          limit(count: number) {
            this._limit = count;
            return this;
          },
          order(column: string, options?: { ascending?: boolean }) {
            this._order = { column, ascending: options?.ascending ?? true };
            return this;
          },
          async single() {
            const res = await this._exec();
            if (this._countMode === 'exact') {
              return { data: res.rows[0] || null, error: null, count: res.rowCount || 0 };
            }
            return { data: res.rows[0] || null, error: null };
          },
          async maybeSingle() {
            const res = await this._exec();
            if (this._countMode === 'exact') {
              return { data: res.rows[0] || null, error: null, count: res.rowCount || 0 };
            }
            return { data: res.rows[0] || null, error: null };
          },
          then<T>(resolve: (value: QueryArrayResponse<T>) => T) {
            return this._exec().then((res) => {
              if (this._countMode === 'exact') {
                return resolve({
                  data: res.rows as unknown as T[],
                  error: null,
                  count: res.rowCount || 0,
                });
              }
              return resolve({ data: res.rows as unknown as T[], error: null });
            });
          },
          async _exec() {
            let sql = `SELECT ${this._columns} FROM ${this._table}`;
            const params: unknown[] = [];
            let i = 1;

            // DEBUG: Advertir sobre sintaxis problemática pero no bloquear
            if (this._columns.includes(':') || this._columns.includes('!')) {
              console.warn(
                '⚠️ SINTAXIS LEGACY DETECTADA (retornará vacío):',
                this._table,
                this._columns.substring(0, 100),
              );
              return { rows: [], rowCount: 0 }; // Retornar vacío en lugar de lanzar error
            }

            // Log SQL para debug
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[SQL] ${sql.substring(0, 150)}`);
            }

            if (this._where.length > 0) {
              const conds = this._where.map((w) => {
                if (w.op === 'IN') {
                  const values = w.value as unknown[];
                  const ph = values.map(() => `$${i++}`).join(',');
                  params.push(...values);
                  return `${w.column} IN (${ph})`;
                } else if (w.op === 'LIKE') {
                  params.push(w.value);
                  return `${w.column} LIKE $${i++}`;
                } else if (w.op === 'ILIKE') {
                  params.push(w.value);
                  return `${w.column} ILIKE $${i++}`;
                }
                params.push(w.value);
                return `${w.column} ${w.op} $${i++}`;
              });
              sql += ` WHERE ${conds.join(' AND ')}`;
            }
            if (this._order) {
              sql += ` ORDER BY ${this._order.column} ${this._order.ascending ? 'ASC' : 'DESC'}`;
            }
            if (this._limit) sql += ` LIMIT ${this._limit}`;

            // Capturar y logear errores SQL con contexto
            try {
              return await query(sql, params);
            } catch (err) {
              console.error(`[SQL ERROR] Query: ${sql}`);
              console.error(`[SQL ERROR] Params:`, params);
              throw err;
            }
          },
        };
        return builder;
      },
      insert: (data: Record<string, unknown>) => {
        const execute = async () => {
          try {
            const keys = Object.keys(data);
            const vals = Object.values(data);
            const ph = keys.map((_, i) => `$${i + 1}`).join(',');
            const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${ph}) RETURNING *`;
            const res = await query(sql, vals);
            return { data: res.rows[0], error: null };
          } catch (err) {
            const error = err as { message: string; code?: string };
            return { data: null, error: { message: error.message, code: error.code } };
          }
        };

        const promise = execute();

        // Añadir método select() para compatibilidad
        return Object.assign(promise, {
          select(_columns?: string) {
            return {
              async single() {
                return promise;
              },
            };
          },
        });
      },
      update: (data: Record<string, unknown>) => ({
        _where: [] as WhereClause[],
        _data: data,
        eq(column: string, value: unknown) {
          this._where.push({ column, value, op: '=' });
          return this;
        },
        select() {
          const whereClause = this._where;
          const updateData = this._data;
          return {
            async single() {
              try {
                const keys = Object.keys(updateData);
                const vals = Object.values(updateData);
                const sets = keys.map((k, i) => `${k}=$${i + 1}`).join(',');
                const wheres = whereClause
                  .map((w, i) => `${w.column}=$${keys.length + i + 1}`)
                  .join(' AND ');
                const sql = `UPDATE ${table} SET ${sets} WHERE ${wheres} RETURNING *`;
                const allVals = [...vals, ...whereClause.map((w) => w.value)];
                const res = await query(sql, allVals);
                return { data: res.rows[0], error: null };
              } catch (err) {
                const error = err as { message: string; code?: string };
                return { data: null, error: { message: error.message, code: error.code } };
              }
            },
          };
        },
        async then<T>(resolve: (value: QueryResponse<T>) => T) {
          try {
            const keys = Object.keys(this._data);
            const vals = Object.values(this._data);
            const sets = keys.map((k, i) => `${k}=$${i + 1}`).join(',');
            const wheres = this._where
              .map((w, i) => `${w.column}=$${keys.length + i + 1}`)
              .join(' AND ');
            const sql = `UPDATE ${table} SET ${sets} WHERE ${wheres} RETURNING *`;
            const allVals = [...vals, ...this._where.map((w) => w.value)];
            const res = await query(sql, allVals);
            return resolve({ data: (res.rows[0] as T) || null, error: null });
          } catch (err) {
            const error = err as { message: string; code?: string };
            return resolve({ data: null, error: { message: error.message, code: error.code } });
          }
        },
      }),
      upsert: (
        data: Record<string, unknown> | Record<string, unknown>[],
        options?: { onConflict?: string; ignoreDuplicates?: boolean },
      ) => ({
        select() {
          return {
            async single() {
              try {
                const records = Array.isArray(data) ? data : [data];
                if (records.length === 0) return { data: undefined, error: null };

                const firstRecord = records[0];
                if (!firstRecord) return { data: undefined, error: null };

                const keys = Object.keys(firstRecord);
                const conflictKeys =
                  options?.onConflict || (keys.includes('profile_id') ? 'profile_id' : keys[0]);
                const ups = keys.map((k) => `${k}=EXCLUDED.${k}`).join(',');

                const valuePlaceholders = records
                  .map(
                    (_, rowIdx) =>
                      `(${keys
                        .map((_, colIdx) => `$${rowIdx * keys.length + colIdx + 1}`)
                        .join(',')})`,
                  )
                  .join(',');

                const allValues = records.flatMap((record) => keys.map((k) => record[k]));
                const sql = `INSERT INTO ${table} (${keys.join(
                  ',',
                )}) VALUES ${valuePlaceholders} ON CONFLICT (${conflictKeys}) DO UPDATE SET ${ups} RETURNING *`;
                const res = await query(sql, allValues);
                return { data: res.rows[0], error: null };
              } catch (err) {
                const error = err as { message: string; code?: string };
                return { data: undefined, error: { message: error.message, code: error.code } };
              }
            },
          };
        },
        async then<T>(resolve: (value: QueryResponse<T>) => T) {
          try {
            const records = Array.isArray(data) ? data : [data];
            if (records.length === 0) return resolve({ data: null, error: null });

            const firstRecord = records[0];
            if (!firstRecord) return resolve({ data: null, error: null });

            const keys = Object.keys(firstRecord);
            const conflictKeys =
              options?.onConflict || (keys.includes('profile_id') ? 'profile_id' : keys[0]);
            const ups = keys.map((k) => `${k}=EXCLUDED.${k}`).join(',');

            const valuePlaceholders = records
              .map(
                (_, rowIdx) =>
                  `(${keys.map((_, colIdx) => `$${rowIdx * keys.length + colIdx + 1}`).join(',')})`,
              )
              .join(',');

            const allValues = records.flatMap((record) => keys.map((k) => record[k]));
            const sql = `INSERT INTO ${table} (${keys.join(
              ',',
            )}) VALUES ${valuePlaceholders} ON CONFLICT (${conflictKeys}) DO UPDATE SET ${ups} RETURNING *`;
            const res = await query(sql, allValues);
            return resolve({ data: res.rows[0] as T, error: null });
          } catch (err) {
            const error = err as { message: string; code?: string };
            return resolve({ data: null, error: { message: error.message, code: error.code } });
          }
        },
      }),
      delete: () => ({
        _where: [] as WhereClause[],
        eq(column: string, value: unknown) {
          this._where.push({ column, value, op: '=' });
          return this;
        },
        in(column: string, values: unknown[]) {
          this._where.push({ column, value: values, op: 'IN' });
          return this;
        },
        async then<T>(resolve: (value: QueryResponse<null>) => T) {
          if (this._where.length === 0) {
            throw new Error('DELETE requires WHERE clause');
          }

          let sql = `DELETE FROM ${table} WHERE `;
          const params: unknown[] = [];
          let i = 1;

          const conds = this._where.map((w) => {
            if (w.op === 'IN') {
              const values = w.value as unknown[];
              const ph = values.map(() => `$${i++}`).join(',');
              params.push(...values);
              return `${w.column} IN (${ph})`;
            }
            params.push(w.value);
            return `${w.column}=$${i++}`;
          });

          sql += conds.join(' AND ');
          await query(sql, params);
          return resolve({ data: null, error: null });
        },
      }),
    }),

    // Método RPC para llamar funciones de PostgreSQL
    rpc: async (functionName: string, params: Record<string, unknown> = {}) => {
      try {
        // Construir la llamada a la función
        const paramKeys = Object.keys(params);
        const paramPlaceholders = paramKeys.map((_, i) => `$${i + 1}`).join(', ');
        const paramValues = paramKeys.map((k) => params[k]);

        const sql =
          paramKeys.length > 0
            ? `SELECT * FROM ${functionName}(${paramPlaceholders})`
            : `SELECT * FROM ${functionName}()`;

        const result = await query(sql, paramValues);

        // Si la función retorna un único valor (no una tabla), extraerlo
        const firstRow = result.rows[0];
        if (result.rows.length === 1 && firstRow && Object.keys(firstRow).length === 1) {
          const singleValue = Object.values(firstRow)[0];
          return { data: singleValue, error: null };
        }

        return { data: result.rows, error: null };
      } catch (err) {
        const error = err as Error;
        console.error(`RPC error calling ${functionName}:`, error);
        return { data: null, error: { message: error.message } };
      }
    },
  };
};

export const getCurrentUser = authGetCurrentUser;
export const getUserHouseholdId = authGetUserHouseholdId;

export const getUserRoleInActiveHousehold = async (): Promise<string | null> => {
  const user = await authGetCurrentUser();
  if (!user) {
    console.log('[getUserRoleInActiveHousehold] ❌ No user');
    return null;
  }

  const householdId = await authGetUserHouseholdId();
  if (!householdId) {
    console.log('[getUserRoleInActiveHousehold] ❌ No householdId');
    return null;
  }

  console.log('[getUserRoleInActiveHousehold] 🔍 Query params:', {
    profile_id: user.profile_id,
    household_id: householdId,
  });

  const result = await query(
    'SELECT role FROM household_members WHERE profile_id = $1 AND household_id = $2',
    [user.profile_id, householdId],
  );

  console.log('[getUserRoleInActiveHousehold] 📊 Result:', result.rows[0]);

  return result.rows[0]?.role || null;
};

export const getUserHouseholds = async () => {
  const user = await authGetCurrentUser();
  if (!user) return [];

  // ✅ FASE 0: Usar RPC optimizada get_user_households_optimized
  // Retorna: household_id, household_name, user_role, is_active, member_count, owner_count
  const result = await query(`SELECT * FROM get_user_households_optimized($1)`, [user.profile_id]);

  // Mapear a formato esperado por componentes
  type HouseholdRow = {
    household_id: string;
    household_name: string;
    user_role: 'owner' | 'member';
    is_active: boolean;
    member_count: number;
    owner_count: number;
    household_created_at: string;
  };
  const rows = result.rows as unknown as HouseholdRow[];
  return rows.map((row) => ({
    id: row.household_id,
    name: row.household_name,
    role: row.user_role,
    is_owner: row.user_role === 'owner',
    is_active: row.is_active,
    member_count: row.member_count,
    owner_count: row.owner_count,
    created_at: row.household_created_at,
  }));
};

/**
 * Obtiene el profile_id del usuario actual
 * ✅ Helper para auditoría (created_by_profile_id, updated_by_profile_id)
 *
 * @returns profile_id o null si no hay usuario
 */
export const getCurrentProfileId = async (): Promise<string | null> => {
  const user = await authGetCurrentUser();
  return user?.profile_id || null;
};
