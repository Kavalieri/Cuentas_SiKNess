/**
 * WRAPPER DE COMPATIBILIDAD - Cliente Browser (deprecated)
 * Este archivo mantiene compatibilidad con código legacy que usaba cliente browser
 * En realidad, todo se maneja server-side ahora con cookies httpOnly y PostgreSQL directo
 *
 * ⚠️ DEPRECATED: Usar Server Actions en su lugar
 */

// Tipo para el builder que encadena métodos
type QueryBuilder = {
  eq: (column?: string, value?: unknown) => QueryBuilder;
  neq: (column?: string, value?: unknown) => QueryBuilder;
  gt: (column?: string, value?: unknown) => QueryBuilder;
  gte: (column?: string, value?: unknown) => QueryBuilder;
  lt: (column?: string, value?: unknown) => QueryBuilder;
  lte: (column?: string, value?: unknown) => QueryBuilder;
  like: (column?: string, pattern?: string) => QueryBuilder;
  ilike: (column?: string, pattern?: string) => QueryBuilder;
  in: (column?: string, values?: unknown[]) => QueryBuilder;
  order: (column?: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count?: number) => QueryBuilder;
  single: () => Promise<{ data: null; error: { message: string; hint: string } }>;
  maybeSingle: () => Promise<{ data: null; error: { message: string; hint: string } }>;
  then: <T>(
    resolve: (value: { data: null; error: { message: string; hint: string } }) => T,
  ) => Promise<T>;
  catch: <T>(reject: (error: unknown) => T) => Promise<T>;
};

export const pgBrowser = () => {
  console.warn('pgBrowser() llamado - toda la auth es server-side ahora con PostgreSQL directo');

  return {
    auth: {
      signOut: async () => {
        // Redirigir al endpoint de logout
        window.location.href = '/api/auth/signout';
        return { error: null };
      },
      getUser: async () => {
        console.warn('getUser() desde browser no soportado - usar server components');
        return {
          data: { user: null },
          error: { message: 'Use server components for auth' },
        };
      },
    },
    from: (table: string) => {
      console.error(
        `❌ pgBrowser().from("${table}") NO SOPORTADO - usar Server Actions con PostgreSQL`,
      );

      // Devolver objeto con métodos que fallan explícitamente
      const errorResponse = {
        data: null,
        error: {
          message: 'Client-side queries no soportadas. Usar Server Actions o Server Components.',
          hint: `Mueve la query de "${table}" a una Server Action`,
        },
      };

      // Builder que encadena métodos y siempre devuelve una Promise con error
      const createBuilder = (): QueryBuilder => {
        const builder: QueryBuilder = {
          // Métodos de filtro
          eq: (_column?: string, _value?: unknown) => createBuilder(),
          neq: (_column?: string, _value?: unknown) => createBuilder(),
          gt: (_column?: string, _value?: unknown) => createBuilder(),
          gte: (_column?: string, _value?: unknown) => createBuilder(),
          lt: (_column?: string, _value?: unknown) => createBuilder(),
          lte: (_column?: string, _value?: unknown) => createBuilder(),
          like: (_column?: string, _pattern?: string) => createBuilder(),
          ilike: (_column?: string, _pattern?: string) => createBuilder(),
          in: (_column?: string, _values?: unknown[]) => createBuilder(),

          // Métodos de orden y límite
          order: (_column?: string, _options?: { ascending?: boolean }) => createBuilder(),
          limit: (_count?: number) => createBuilder(),

          // Métodos finales
          single: () => Promise.resolve(errorResponse),
          maybeSingle: () => Promise.resolve(errorResponse),

          // Hacer el builder thenable para que pueda usarse como Promise
          then: <T>(resolve: (value: typeof errorResponse) => T) =>
            Promise.resolve(resolve(errorResponse)),
          catch: <T>(reject: (error: unknown) => T) => Promise.resolve(reject(errorResponse.error)),
        };
        return builder;
      };

      return {
        select: (_columns?: string) => createBuilder(),
        insert: (_data?: unknown) => Promise.resolve(errorResponse),
        update: (_data?: unknown) => createBuilder(),
        delete: () => createBuilder(),
      };
    },
  };
};
