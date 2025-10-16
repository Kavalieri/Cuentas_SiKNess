/**
 * WRAPPER DE COMPATIBILIDAD - Cliente Admin (deprecated)
 * Operaciones administrativas usan ahora PostgreSQL directo
 *
 * ⚠️ DEPRECATED: Usar funciones de /lib/db.ts y /lib/auth.ts directamente
 */

import { query } from './db';

export const pgAdmin = () => {
  return {
    auth: {
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

        deleteUser: async (userId: string) => {
          // Eliminar usuario y sus datos relacionados
          await query('DELETE FROM profiles WHERE auth_user_id = $1', [userId]);
          return { data: null, error: null };
        },
      },
    },

    from: (table: string) => ({
      select: (columns: string = '*') => ({
        eq: (column: string, value: unknown) => ({
          single: async () => {
            const result = await query(`SELECT ${columns} FROM ${table} WHERE ${column} = $1`, [
              value,
            ]);
            return {
              data: result.rows[0] || null,
              error: null,
            };
          },
        }),
      }),
    }),
  };
};
