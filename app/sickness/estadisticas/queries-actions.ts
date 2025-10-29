'use server';

import { getPool } from '@/lib/db';
import type { Pool } from 'pg';
import { formatCurrency, getHouseholdCurrency } from './currency-utils';

/**
 * MÓDULO DE CONSULTAS DINÁMICAS PARA ANÁLISIS PROFESIONAL
 *
 * Este módulo proporciona un conjunto completo de consultas predefinidas
 * para análisis financiero avanzado sin modificar código existente.
 *
 * FUENTES DE DATOS:
 * - transactions: Fuente de verdad principal para todos los movimientos
 * - monthly_periods: Solo para metadatos de períodos (fase, locked_at)
 * - profiles: Para nombres de usuarios (display_name, NO email)
 * - household_settings: Para configuración de moneda
 */

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  summary?: {
    total?: number | string;
    average?: number | string;
    count?: number;
    max?: number | string;
    min?: number | string;
    periodo?: string;
    [key: string]: number | string | undefined;
  };
}

// Types are imported from query-catalog in client components
export type { QueryOption } from './query-catalog';

/**
 * Ejecuta una consulta específica con los parámetros proporcionados
 */
export async function executeQuery(
  queryId: string,
  householdId: string,
  params: {
    periodId?: string;
    year?: number;
    month?: number;
    categoryId?: string;
    memberId?: string;
  }
): Promise<QueryResult> {
  const pool = getPool();

  try {
    switch (queryId) {
      case 'gastos_por_categoria':
        return await queryGastosPorCategoria(pool, householdId, params.year!, params.month!);

      case 'gastos_por_categoria_global':
        return await queryGastosPorCategoriaGlobal(pool, householdId);

      case 'top_gastos':
        return await queryTopGastos(pool, householdId, params.year!, params.month!);

      case 'gastos_diarios':
        return await queryGastosDiarios(pool, householdId, params.year!, params.month!);

      case 'gastos_por_categoria_detallado':
        return await queryGastosPorCategoriaDetallado(pool, householdId, params.categoryId!, params.year, params.month);

      case 'ingresos_por_mes':
        return await queryIngresosPorMes(pool, householdId);

      case 'ingresos_vs_objetivo':
        return await queryIngresosVsObjetivo(pool, householdId);

      case 'detalle_ingresos_periodo':
        return await queryDetalleIngresosPeriodo(pool, householdId, params.year!, params.month!);

      case 'evolucion_balance':
        return await queryEvolucionBalance(pool, householdId);

      case 'proyeccion_balance':
        return await queryProyeccionBalance(pool, householdId);

      case 'tasa_ahorro':
        return await queryTasaAhorro(pool, householdId);

      case 'comparativa_mensual':
        return await queryComparativaMensual(pool, householdId);

      case 'comparativa_categorias':
        return await queryComparativaCategorias(pool, householdId);

      case 'variacion_mensual':
        return await queryVariacionMensual(pool, householdId);

      case 'tendencia_gastos':
        return await queryTendenciaGastos(pool, householdId);

      case 'estacionalidad':
        return await queryEstacionalidad(pool, householdId);

      case 'media_movil':
        return await queryMediaMovil(pool, householdId);

      case 'gastos_por_miembro':
        return await queryGastosPorMiembro(pool, householdId, params.year!, params.month!);

      case 'contribuciones_por_miembro':
        return await queryContribucionesPorMiembro(pool, householdId, params.year!, params.month!);

      case 'detalle_miembro':
        return await queryDetalleMiembro(pool, householdId, params.memberId!, params.year, params.month);

      default:
        throw new Error(`Consulta no encontrada: ${queryId}`);
    }
  } catch (error) {
    console.error('Error ejecutando consulta:', error);
    throw error;
  }
}

// ============================================================================
// IMPLEMENTACIONES DE CONSULTAS
// ============================================================================

async function queryGastosPorCategoria(
  pool: Pool,
  householdId: string,
  year?: number,
  month?: number,
): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  // Si no hay año/mes, usar todos los períodos
  const periodFilter = year && month
    ? `AND EXTRACT(YEAR FROM occurred_at) = $2 AND EXTRACT(MONTH FROM occurred_at) = $3`
    : '';

  const params = year && month ? [householdId, year, month] : [householdId];

  const result = await pool.query(
    `
    SELECT
      COALESCE(c.name, 'Sin categoría') AS categoria,
      COALESCE(c.icon, '❓') AS icon,
      COUNT(t.id) AS transacciones,
      COALESCE(SUM(t.amount), 0) AS total,
      ROUND(
        COALESCE(SUM(t.amount), 0) * 100.0 /
        NULLIF((SELECT SUM(amount) FROM transactions
                WHERE household_id = $1
                AND type IN ('expense', 'expense_direct')
                ${periodFilter}), 0),
        2
      ) AS porcentaje
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.household_id = $1
      AND t.type IN ('expense', 'expense_direct')
      ${periodFilter}
    GROUP BY c.name, c.icon
    ORDER BY total DESC
  `,
    params,
  );

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.total as string), 0);

  const formattedRows = result.rows.map((row) => ({
    ...row,
    total: formatCurrency(parseFloat(row.total as string), currency),
  }));

  return {
    columns: ['Categoría', 'Icono', 'Transacciones', 'Total', '% del Total'],
    rows: formattedRows,
    summary: {
      total: formatCurrency(total, currency),
      count: result.rows.length,
      periodo: year && month ? `${year}-${month}` : 'Todos los períodos',
    },
  };
}

async function queryGastosPorCategoriaGlobal(pool: Pool, householdId: string): Promise<QueryResult> {
  const result = await pool.query(`
    SELECT
      COALESCE(c.name, 'Sin categoría') AS categoria,
      COALESCE(c.icon, '❓') AS icon,
      COUNT(t.id) AS transacciones,
      COALESCE(SUM(t.amount), 0) AS total,
      ROUND(AVG(t.amount), 2) AS promedio,
      MAX(t.amount) AS maximo,
      MIN(t.amount) AS minimo
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.household_id = $1
      AND t.type IN ('expense', 'expense_direct')
    GROUP BY c.name, c.icon
    ORDER BY total DESC
  `, [householdId]);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.total as string), 0);
  const average = total / (result.rows.length || 1);

  return {
    columns: ['Categoría', 'Icono', 'Transacciones', 'Total', 'Promedio', 'Máximo', 'Mínimo'],
    rows: result.rows,
    summary: {
      total,
      average,
      count: result.rows.length,
    },
  };
}

async function queryTopGastos(
  pool: Pool,
  householdId: string,
  year?: number,
  month?: number,
): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  const periodFilter = year && month
    ? `AND EXTRACT(YEAR FROM t.occurred_at) = $2 AND EXTRACT(MONTH FROM t.occurred_at) = $3`
    : '';

  const params = year && month ? [householdId, year, month] : [householdId];

  const result = await pool.query(
    `
    SELECT
      t.description AS concepto,
      COALESCE(c.name, 'Sin categoría') AS categoria,
      COALESCE(c.icon, '❓') AS icon,
      t.amount AS importe,
      TO_CHAR(t.occurred_at, 'DD/MM/YYYY') AS fecha,
      COALESCE(p.display_name, t.performed_by_email, 'No especificado') AS realizado_por
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN profiles p ON p.email = t.performed_by_email
    WHERE t.household_id = $1
      AND t.type IN ('expense', 'expense_direct')
      ${periodFilter}
    ORDER BY t.amount DESC
    LIMIT 10
  `,
    params,
  );

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.importe as string), 0);
  const average = total / (result.rows.length || 1);

  // Format currency values
  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    importe: formatCurrency(parseFloat(row.importe as string), currency),
  }));

  return {
    columns: ['Concepto', 'Categoría', 'Icono', 'Importe', 'Fecha', 'Realizado Por'],
    rows: formattedRows,
    summary: {
      total: formatCurrency(total, currency),
      average: formatCurrency(average, currency),
      count: result.rows.length,
      max: result.rows[0]?.importe || formatCurrency(0, currency),
      min: result.rows[result.rows.length - 1]?.importe || formatCurrency(0, currency),
      periodo: year && month ? `${year}-${month}` : 'Todos los períodos',
    },
  };
}

async function queryGastosDiarios(
  pool: Pool,
  householdId: string,
  year?: number,
  month?: number,
): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  const periodFilter = year && month
    ? `AND EXTRACT(YEAR FROM t.occurred_at) = $2 AND EXTRACT(MONTH FROM t.occurred_at) = $3`
    : '';

  const params = year && month ? [householdId, year, month] : [householdId];

  const result = await pool.query(
    `
    SELECT
      TO_CHAR(t.occurred_at, 'DD/MM/YYYY') AS fecha,
      EXTRACT(DAY FROM t.occurred_at) AS dia,
      COUNT(t.id) AS transacciones,
      COALESCE(SUM(t.amount), 0) AS total
    FROM transactions t
    WHERE t.household_id = $1
      AND t.type IN ('expense', 'expense_direct')
      ${periodFilter}
    GROUP BY t.occurred_at::date, EXTRACT(DAY FROM t.occurred_at)
    ORDER BY t.occurred_at::date
  `,
    params,
  );

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.total as string), 0);
  const average = total / (result.rows.length || 1);

  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    total: formatCurrency(parseFloat(row.total as string), currency),
  }));

  return {
    columns: ['Fecha', 'Día', 'Transacciones', 'Total'],
    rows: formattedRows,
    summary: {
      total: formatCurrency(total, currency),
      average: formatCurrency(average, currency),
      count: result.rows.length,
      periodo: year && month ? `${year}-${month}` : 'Todos los períodos',
    },
  };
}

async function queryGastosPorCategoriaDetallado(pool: Pool, householdId: string, categoryId: string, year?: number, month?: number): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  // Conditional period filter
  const periodFilter = year && month
    ? `AND EXTRACT(YEAR FROM t.occurred_at) = $3 AND EXTRACT(MONTH FROM t.occurred_at) = $4`
    : '';

  // Dynamic params array
  const params = year && month
    ? [householdId, categoryId, year, month]
    : [householdId, categoryId];

  const result = await pool.query(`
    SELECT
      t.description AS concepto,
      t.amount AS importe,
      TO_CHAR(t.occurred_at, 'DD/MM/YYYY') AS fecha,
      t.flow_type AS tipo_flujo,
      COALESCE(p.display_name, t.performed_by_email, 'No especificado') AS realizado_por
    FROM transactions t
    LEFT JOIN profiles p ON p.email = t.performed_by_email
    WHERE t.household_id = $1
      AND t.category_id = $2
      AND t.type IN ('expense', 'expense_direct')
      ${periodFilter}
    ORDER BY t.occurred_at DESC
  `, params);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.importe as string), 0);
  const average = total / (result.rows.length || 1);

  // Format currency values
  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    importe: formatCurrency(parseFloat(row.importe as string), currency),
  }));

  return {
    columns: ['Concepto', 'Importe', 'Fecha', 'Tipo Flujo', 'Realizado Por'],
    rows: formattedRows,
    summary: {
      total: formatCurrency(total, currency),
      average: formatCurrency(average, currency),
      count: result.rows.length,
      periodo: year && month ? `${year}-${month}` : 'Todos los períodos',
    },
  };
}

async function queryIngresosPorMes(pool: Pool, householdId: string): Promise<QueryResult> {
  const result = await pool.query(`
    SELECT
      EXTRACT(YEAR FROM t.occurred_at) AS año,
      EXTRACT(MONTH FROM t.occurred_at) AS mes,
      TO_CHAR(t.occurred_at, 'Month YYYY') AS periodo,
      COUNT(t.id) AS transacciones,
      COALESCE(SUM(t.amount), 0) AS total
    FROM transactions t
    WHERE t.household_id = $1
      AND t.type IN ('income', 'income_direct')
    GROUP BY EXTRACT(YEAR FROM t.occurred_at), EXTRACT(MONTH FROM t.occurred_at), TO_CHAR(t.occurred_at, 'Month YYYY')
    ORDER BY año DESC, mes DESC
    LIMIT 12
  `, [householdId]);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.total as string), 0);
  const average = total / (result.rows.length || 1);

  return {
    columns: ['Año', 'Mes', 'Período', 'Transacciones', 'Total'],
    rows: result.rows,
    summary: {
      total,
      average,
      count: result.rows.length,
    },
  };
}

async function queryIngresosVsObjetivo(pool: Pool, householdId: string): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  const result = await pool.query(`
    WITH meses_con_datos AS (
      SELECT DISTINCT
        EXTRACT(YEAR FROM occurred_at)::INTEGER AS year,
        EXTRACT(MONTH FROM occurred_at)::INTEGER AS month
      FROM transactions
      WHERE household_id = $1
        AND type IN ('income', 'income_direct')
    ),
    ingresos_mensuales AS (
      SELECT
        m.year,
        m.month,
        TO_CHAR(DATE(m.year || '-' || m.month || '-01'), 'Month YYYY') AS periodo,
        COALESCE(SUM(t.amount), 0) AS ingresos_reales
      FROM meses_con_datos m
      LEFT JOIN transactions t ON
        EXTRACT(YEAR FROM t.occurred_at)::INTEGER = m.year
        AND EXTRACT(MONTH FROM t.occurred_at)::INTEGER = m.month
        AND t.household_id = $1
        AND t.type IN ('income', 'income_direct')
      GROUP BY m.year, m.month
    )
    SELECT
      im.year AS año,
      im.month AS mes,
      im.periodo,
      im.ingresos_reales,
      COALESCE(hs.monthly_contribution_goal, 0) AS objetivo,
      im.ingresos_reales - COALESCE(hs.monthly_contribution_goal, 0) AS diferencia,
      CASE
        WHEN hs.monthly_contribution_goal > 0 THEN
          ROUND((im.ingresos_reales * 100.0 / hs.monthly_contribution_goal), 2)
        ELSE 0
      END AS porcentaje_cumplimiento
    FROM ingresos_mensuales im
    CROSS JOIN household_settings hs
    WHERE hs.household_id = $1
    ORDER BY im.year DESC, im.month DESC
    LIMIT 12
  `, [householdId]);

  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    ingresos_reales: formatCurrency(parseFloat(row.ingresos_reales as string), currency),
    objetivo: formatCurrency(parseFloat(row.objetivo as string), currency),
    diferencia: formatCurrency(parseFloat(row.diferencia as string), currency),
  }));

  return {
    columns: ['Año', 'Mes', 'Período', 'Ingresos Reales', 'Objetivo', 'Diferencia', '% Cumplimiento'],
    rows: formattedRows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryDetalleIngresosPeriodo(pool: Pool, householdId: string, year?: number, month?: number): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  // Conditional period filter
  const periodFilter = year && month
    ? `AND EXTRACT(YEAR FROM t.occurred_at) = $2 AND EXTRACT(MONTH FROM t.occurred_at) = $3`
    : '';

  // Dynamic params array
  const params = year && month ? [householdId, year, month] : [householdId];

  const result = await pool.query(`
    SELECT
      t.description AS concepto,
      t.amount AS importe,
      TO_CHAR(t.occurred_at, 'DD/MM/YYYY') AS fecha,
      COALESCE(c.name, 'Sin categoría') AS categoria,
      COALESCE(c.icon, '❓') AS icon,
      COALESCE(p.display_name, t.performed_by_email, 'No especificado') AS realizado_por
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN profiles p ON p.email = t.performed_by_email
    WHERE t.household_id = $1
      AND t.type IN ('income', 'income_direct')
      ${periodFilter}
    ORDER BY t.occurred_at DESC
  `, params);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.importe as string), 0);

  // Format currency values
  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    importe: formatCurrency(parseFloat(row.importe as string), currency),
  }));

  return {
    columns: ['Concepto', 'Importe', 'Fecha', 'Categoría', 'Icono', 'Realizado Por'],
    rows: formattedRows,
    summary: {
      total: formatCurrency(total, currency),
      count: result.rows.length,
      periodo: year && month ? `${year}-${month}` : 'Todos los períodos',
    },
  };
}

async function queryEvolucionBalance(pool: Pool, householdId: string): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  const result = await pool.query(`
    WITH meses_con_datos AS (
      SELECT DISTINCT
        EXTRACT(YEAR FROM occurred_at)::INTEGER AS year,
        EXTRACT(MONTH FROM occurred_at)::INTEGER AS month
      FROM transactions
      WHERE household_id = $1
    ),
    flujo_mensual AS (
      SELECT
        m.year,
        m.month,
        TO_CHAR(DATE(m.year || '-' || m.month || '-01'), 'Month YYYY') AS periodo,
        COALESCE(SUM(CASE WHEN t.type IN ('income', 'income_direct') THEN t.amount ELSE 0 END), 0) AS ingresos,
        COALESCE(SUM(CASE WHEN t.type IN ('expense', 'expense_direct') THEN t.amount ELSE 0 END), 0) AS gastos
      FROM meses_con_datos m
      LEFT JOIN transactions t ON
        EXTRACT(YEAR FROM t.occurred_at)::INTEGER = m.year
        AND EXTRACT(MONTH FROM t.occurred_at)::INTEGER = m.month
        AND t.household_id = $1
      GROUP BY m.year, m.month
      ORDER BY m.year ASC, m.month ASC
    ),
    con_balance_acumulado AS (
      SELECT
        year,
        month,
        periodo,
        ingresos,
        gastos,
        SUM(ingresos - gastos) OVER (ORDER BY year, month ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS balance_apertura,
        SUM(ingresos - gastos) OVER (ORDER BY year, month) AS balance_cierre
      FROM flujo_mensual
    )
    SELECT
      year AS año,
      month AS mes,
      periodo,
      COALESCE(balance_apertura, 0) AS balance_apertura,
      ingresos,
      gastos,
      balance_cierre,
      balance_cierre - COALESCE(balance_apertura, 0) AS variacion
    FROM con_balance_acumulado
    ORDER BY year DESC, month DESC
    LIMIT 12
  `, [householdId]);

  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    balance_apertura: formatCurrency(parseFloat(row.balance_apertura as string), currency),
    ingresos: formatCurrency(parseFloat(row.ingresos as string), currency),
    gastos: formatCurrency(parseFloat(row.gastos as string), currency),
    balance_cierre: formatCurrency(parseFloat(row.balance_cierre as string), currency),
    variacion: formatCurrency(parseFloat(row.variacion as string), currency),
  }));

  return {
    columns: ['Año', 'Mes', 'Período', 'Balance Apertura', 'Ingresos', 'Gastos', 'Balance Cierre', 'Variación'],
    rows: formattedRows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryProyeccionBalance(pool: Pool, householdId: string): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  const result = await pool.query(`
    WITH ultimos_meses AS (
      SELECT
        EXTRACT(YEAR FROM occurred_at)::INTEGER AS year,
        EXTRACT(MONTH FROM occurred_at)::INTEGER AS month,
        SUM(CASE WHEN type IN ('income', 'income_direct') THEN amount ELSE 0 END) AS ingresos,
        SUM(CASE WHEN type IN ('expense', 'expense_direct') THEN amount ELSE 0 END) AS gastos
      FROM transactions
      WHERE household_id = $1
      GROUP BY EXTRACT(YEAR FROM occurred_at), EXTRACT(MONTH FROM occurred_at)
      ORDER BY year DESC, month DESC
      LIMIT 3
    ),
    promedios AS (
      SELECT
        AVG(ingresos) AS ingreso_medio,
        AVG(gastos) AS gasto_medio
      FROM ultimos_meses
    ),
    balance_actual AS (
      SELECT COALESCE(SUM(
        CASE WHEN type IN ('income', 'income_direct') THEN amount ELSE -amount END
      ), 0) AS balance
      FROM transactions
      WHERE household_id = $1
    )
    SELECT
      'Próximos 3 meses' AS periodo,
      ba.balance AS balance_inicial,
      p.ingreso_medio * 3 AS ingresos_proyectados,
      p.gasto_medio * 3 AS gastos_proyectados,
      ba.balance + (p.ingreso_medio * 3) - (p.gasto_medio * 3) AS balance_proyectado,
      CASE
        WHEN p.gasto_medio > 0 THEN ROUND(ba.balance / p.gasto_medio, 1)
        ELSE 999
      END AS meses_autonomia
    FROM promedios p
    CROSS JOIN balance_actual ba
  `, [householdId]);

  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    balance_inicial: formatCurrency(parseFloat(row.balance_inicial as string), currency),
    ingresos_proyectados: formatCurrency(parseFloat(row.ingresos_proyectados as string), currency),
    gastos_proyectados: formatCurrency(parseFloat(row.gastos_proyectados as string), currency),
    balance_proyectado: formatCurrency(parseFloat(row.balance_proyectado as string), currency),
  }));

  return {
    columns: ['Período', 'Balance Inicial', 'Ingresos Proyectados', 'Gastos Proyectados', 'Balance Proyectado', 'Meses Autonomía'],
    rows: formattedRows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryTasaAhorro(pool: Pool, householdId: string): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  const result = await pool.query(`
    WITH meses_con_datos AS (
      SELECT DISTINCT
        EXTRACT(YEAR FROM occurred_at)::INTEGER AS year,
        EXTRACT(MONTH FROM occurred_at)::INTEGER AS month
      FROM transactions
      WHERE household_id = $1
    ),
    flujo_mensual AS (
      SELECT
        m.year,
        m.month,
        TO_CHAR(DATE(m.year || '-' || m.month || '-01'), 'Month YYYY') AS periodo,
        COALESCE(SUM(CASE WHEN t.type IN ('income', 'income_direct') THEN t.amount ELSE 0 END), 0) AS ingresos,
        COALESCE(SUM(CASE WHEN t.type IN ('expense', 'expense_direct') THEN t.amount ELSE 0 END), 0) AS gastos
      FROM meses_con_datos m
      LEFT JOIN transactions t ON
        EXTRACT(YEAR FROM t.occurred_at)::INTEGER = m.year
        AND EXTRACT(MONTH FROM t.occurred_at)::INTEGER = m.month
        AND t.household_id = $1
      GROUP BY m.year, m.month
    )
    SELECT
      year AS año,
      month AS mes,
      periodo,
      ingresos,
      gastos,
      ingresos - gastos AS ahorro,
      CASE
        WHEN ingresos > 0 THEN
          ROUND(((ingresos - gastos) * 100.0 / ingresos), 2)
        ELSE 0
      END AS tasa_ahorro_porcentaje
    FROM flujo_mensual
    ORDER BY year DESC, month DESC
    LIMIT 12
  `, [householdId]);

  const avgTasaAhorro = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat((row.tasa_ahorro_porcentaje as string) || '0'), 0) / (result.rows.length || 1);

  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    ingresos: formatCurrency(parseFloat(row.ingresos as string), currency),
    gastos: formatCurrency(parseFloat(row.gastos as string), currency),
    ahorro: formatCurrency(parseFloat(row.ahorro as string), currency),
  }));

  return {
    columns: ['Año', 'Mes', 'Período', 'Ingresos', 'Gastos', 'Ahorro', 'Tasa Ahorro %'],
    rows: formattedRows,
    summary: {
      average: avgTasaAhorro,
      count: result.rows.length,
    },
  };
}

async function queryComparativaMensual(pool: Pool, householdId: string): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  const result = await pool.query(`
    WITH meses_con_datos AS (
      SELECT DISTINCT
        EXTRACT(YEAR FROM occurred_at)::INTEGER AS year,
        EXTRACT(MONTH FROM occurred_at)::INTEGER AS month
      FROM transactions
      WHERE household_id = $1
    ),
    flujo_mensual AS (
      SELECT
        m.year,
        m.month,
        TO_CHAR(DATE(m.year || '-' || m.month || '-01'), 'Month YYYY') AS periodo,
        COALESCE(SUM(CASE WHEN t.type IN ('income', 'income_direct') THEN t.amount ELSE 0 END), 0) AS ingresos,
        COALESCE(SUM(CASE WHEN t.type IN ('expense', 'expense_direct') THEN t.amount ELSE 0 END), 0) AS gastos
      FROM meses_con_datos m
      LEFT JOIN transactions t ON
        EXTRACT(YEAR FROM t.occurred_at)::INTEGER = m.year
        AND EXTRACT(MONTH FROM t.occurred_at)::INTEGER = m.month
        AND t.household_id = $1
      GROUP BY m.year, m.month
      ORDER BY m.year ASC, m.month ASC
    ),
    con_comparativa AS (
      SELECT
        year,
        month,
        periodo,
        ingresos,
        gastos,
        ingresos - gastos AS saldo,
        LAG(gastos) OVER (ORDER BY year, month) AS gastos_mes_anterior,
        CASE
          WHEN LAG(gastos) OVER (ORDER BY year, month) > 0 THEN
            ROUND(((gastos - LAG(gastos) OVER (ORDER BY year, month)) * 100.0
                   / LAG(gastos) OVER (ORDER BY year, month)), 2)
          ELSE 0
        END AS variacion_gastos_porcentaje
      FROM flujo_mensual
    )
    SELECT
      year AS año,
      month AS mes,
      periodo,
      ingresos,
      gastos,
      saldo,
      gastos_mes_anterior,
      variacion_gastos_porcentaje
    FROM con_comparativa
    ORDER BY year DESC, month DESC
    LIMIT 12
  `, [householdId]);

  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    ingresos: formatCurrency(parseFloat(row.ingresos as string), currency),
    gastos: formatCurrency(parseFloat(row.gastos as string), currency),
    saldo: formatCurrency(parseFloat(row.saldo as string), currency),
    gastos_mes_anterior: row.gastos_mes_anterior ? formatCurrency(parseFloat(row.gastos_mes_anterior as string), currency) : 'N/A',
  }));

  return {
    columns: ['Año', 'Mes', 'Período', 'Ingresos', 'Gastos', 'Saldo', 'Gastos Mes Anterior', 'Variación %'],
    rows: formattedRows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryComparativaCategorias(pool: Pool, householdId: string): Promise<QueryResult> {
  const result = await pool.query(`
    WITH gastos_por_periodo AS (
      SELECT
        c.name AS categoria,
        EXTRACT(YEAR FROM t.occurred_at) AS año,
        EXTRACT(MONTH FROM t.occurred_at) AS mes,
        COALESCE(SUM(t.amount), 0) AS total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.household_id = $1
        AND t.type IN ('expense', 'expense_direct')
      GROUP BY c.name, EXTRACT(YEAR FROM t.occurred_at), EXTRACT(MONTH FROM t.occurred_at)
    )
    SELECT
      categoria,
      año,
      mes,
      total,
      LAG(total) OVER (PARTITION BY categoria ORDER BY año, mes) AS total_mes_anterior,
      CASE
        WHEN LAG(total) OVER (PARTITION BY categoria ORDER BY año, mes) > 0 THEN
          ROUND(((total - LAG(total) OVER (PARTITION BY categoria ORDER BY año, mes)) * 100.0
                 / LAG(total) OVER (PARTITION BY categoria ORDER BY año, mes)), 2)
        ELSE 0
      END AS variacion_porcentaje
    FROM gastos_por_periodo
    ORDER BY año DESC, mes DESC, total DESC
    LIMIT 50
  `, [householdId]);

  return {
    columns: ['Categoría', 'Año', 'Mes', 'Total', 'Total Mes Anterior', 'Variación %'],
    rows: result.rows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryVariacionMensual(pool: Pool, householdId: string): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  const result = await pool.query(`
    WITH meses_con_datos AS (
      SELECT DISTINCT
        EXTRACT(YEAR FROM occurred_at)::INTEGER AS year,
        EXTRACT(MONTH FROM occurred_at)::INTEGER AS month
      FROM transactions
      WHERE household_id = $1
    ),
    flujo_mensual AS (
      SELECT
        m.year,
        m.month,
        TO_CHAR(DATE(m.year || '-' || m.month || '-01'), 'Month YYYY') AS periodo,
        COALESCE(SUM(CASE WHEN t.type IN ('income', 'income_direct') THEN t.amount ELSE 0 END), 0) AS ingresos,
        COALESCE(SUM(CASE WHEN t.type IN ('expense', 'expense_direct') THEN t.amount ELSE 0 END), 0) AS gastos
      FROM meses_con_datos m
      LEFT JOIN transactions t ON
        EXTRACT(YEAR FROM t.occurred_at)::INTEGER = m.year
        AND EXTRACT(MONTH FROM t.occurred_at)::INTEGER = m.month
        AND t.household_id = $1
      GROUP BY m.year, m.month
      ORDER BY m.year ASC, m.month ASC
    ),
    variaciones AS (
      SELECT
        year,
        month,
        periodo,
        ingresos,
        gastos,
        LAG(ingresos) OVER (ORDER BY year, month) AS ingresos_anterior,
        LAG(gastos) OVER (ORDER BY year, month) AS gastos_anterior
      FROM flujo_mensual
    )
    SELECT
      year AS año,
      month AS mes,
      periodo,
      ingresos,
      gastos,
      CASE
        WHEN ingresos_anterior > 0 THEN
          ROUND(((ingresos - ingresos_anterior) * 100.0 / ingresos_anterior), 2)
        ELSE 0
      END AS variacion_ingresos_porcentaje,
      CASE
        WHEN gastos_anterior > 0 THEN
          ROUND(((gastos - gastos_anterior) * 100.0 / gastos_anterior), 2)
        ELSE 0
      END AS variacion_gastos_porcentaje
    FROM variaciones
    ORDER BY year DESC, month DESC
    LIMIT 12
  `, [householdId]);

  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    ingresos: formatCurrency(parseFloat(row.ingresos as string), currency),
    gastos: formatCurrency(parseFloat(row.gastos as string), currency),
  }));

  return {
    columns: ['Año', 'Mes', 'Período', 'Ingresos', 'Gastos', 'Variación Ingresos %', 'Variación Gastos %'],
    rows: formattedRows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryTendenciaGastos(pool: Pool, householdId: string): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  const result = await pool.query(`
    WITH meses_con_datos AS (
      SELECT DISTINCT
        EXTRACT(YEAR FROM occurred_at)::INTEGER AS year,
        EXTRACT(MONTH FROM occurred_at)::INTEGER AS month
      FROM transactions
      WHERE household_id = $1
        AND type IN ('expense', 'expense_direct')
    ),
    gastos_mensuales AS (
      SELECT
        m.year AS año,
        m.month AS mes,
        TO_CHAR(DATE(m.year || '-' || m.month || '-01'), 'TMMonth YYYY') AS periodo,
        COALESCE(SUM(t.amount), 0) AS gastos,
        m.year * 12 + m.month AS periodo_num
      FROM meses_con_datos m
      LEFT JOIN transactions t ON
        t.household_id = $1
        AND t.type IN ('expense', 'expense_direct')
        AND EXTRACT(YEAR FROM t.occurred_at) = m.year
        AND EXTRACT(MONTH FROM t.occurred_at) = m.month
      GROUP BY m.year, m.month
    ),
    con_media_movil AS (
      SELECT
        año,
        mes,
        periodo,
        gastos,
        AVG(gastos) OVER (
          ORDER BY año, mes
          ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ) AS media_movil_3m,
        periodo_num
      FROM gastos_mensuales
    )
    SELECT
      año,
      mes,
      periodo,
      gastos,
      ROUND(media_movil_3m, 2) AS media_movil_3_meses,
      CASE
        WHEN media_movil_3m > 0 THEN
          ROUND(((gastos - media_movil_3m) * 100.0 / media_movil_3m), 2)
        ELSE 0
      END AS desviacion_media_porcentaje
    FROM con_media_movil
    ORDER BY año ASC, mes ASC
  `, [householdId]);

  // Format currency values
  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    gastos: formatCurrency(parseFloat(row.gastos as string), currency),
    media_movil_3_meses: formatCurrency(parseFloat(row.media_movil_3_meses as string), currency),
  }));

  return {
    columns: ['Año', 'Mes', 'Período', 'Gastos', 'Media Móvil 3 Meses', 'Desviación %'],
    rows: formattedRows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryEstacionalidad(pool: Pool, householdId: string): Promise<QueryResult> {
  const result = await pool.query(`
    SELECT
      EXTRACT(MONTH FROM t.occurred_at) AS mes,
      TO_CHAR(DATE '2000-' || EXTRACT(MONTH FROM t.occurred_at) || '-01', 'Month') AS nombre_mes,
      c.name AS categoria,
      COUNT(t.id) AS transacciones,
      ROUND(AVG(t.amount), 2) AS promedio,
      COALESCE(SUM(t.amount), 0) AS total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.household_id = $1
      AND t.type IN ('expense', 'expense_direct')
    GROUP BY EXTRACT(MONTH FROM t.occurred_at), TO_CHAR(DATE '2000-' || EXTRACT(MONTH FROM t.occurred_at) || '-01', 'Month'), c.name
    ORDER BY mes, total DESC
  `, [householdId]);

  return {
    columns: ['Mes', 'Nombre Mes', 'Categoría', 'Transacciones', 'Promedio', 'Total'],
    rows: result.rows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryMediaMovil(pool: Pool, householdId: string): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  const result = await pool.query(
    `
    WITH meses_con_datos AS (
      SELECT DISTINCT
        EXTRACT(YEAR FROM occurred_at)::INTEGER AS year,
        EXTRACT(MONTH FROM occurred_at)::INTEGER AS month
      FROM transactions
      WHERE household_id = $1
    ),
    flujo_mensual AS (
      SELECT
        m.year,
        m.month,
        COALESCE(SUM(CASE WHEN t.type IN ('income', 'income_direct') THEN t.amount ELSE 0 END), 0) AS ingresos,
        COALESCE(SUM(CASE WHEN t.type IN ('expense', 'expense_direct') THEN t.amount ELSE 0 END), 0) AS gastos
      FROM meses_con_datos m
      LEFT JOIN transactions t ON
        EXTRACT(YEAR FROM t.occurred_at)::INTEGER = m.year
        AND EXTRACT(MONTH FROM t.occurred_at)::INTEGER = m.month
        AND t.household_id = $1
      GROUP BY m.year, m.month
    ),
    con_medias_moviles AS (
      SELECT
        year AS año,
        month AS mes,
        TO_CHAR(DATE(year || '-' || month || '-01'), 'Month YYYY') AS periodo,
        ingresos,
        gastos,
        ROUND(AVG(ingresos) OVER (ORDER BY year, month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS media_ingresos_3m,
        ROUND(AVG(gastos) OVER (ORDER BY year, month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS media_gastos_3m
      FROM flujo_mensual
    )
    SELECT *
    FROM con_medias_moviles
    ORDER BY año DESC, mes DESC
    LIMIT 12
  `,
    [householdId],
  );

  const formattedRows = result.rows.map((row) => ({
    ...row,
    ingresos: formatCurrency(parseFloat(row.ingresos), currency),
    gastos: formatCurrency(parseFloat(row.gastos), currency),
    media_ingresos_3m: formatCurrency(parseFloat(row.media_ingresos_3m), currency),
    media_gastos_3m: formatCurrency(parseFloat(row.media_gastos_3m), currency),
  }));

  return {
    columns: ['Año', 'Mes', 'Período', 'Ingresos', 'Gastos', 'Media Ingresos 3M', 'Media Gastos 3M'],
    rows: formattedRows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryGastosPorMiembro(pool: Pool, householdId: string, year?: number, month?: number): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  // Conditional period filter
  const periodFilter = year && month
    ? `AND EXTRACT(YEAR FROM t.occurred_at) = $2 AND EXTRACT(MONTH FROM t.occurred_at) = $3`
    : '';

  // Dynamic params array
  const params = year && month ? [householdId, year, month] : [householdId];

  const result = await pool.query(`
    SELECT
      p.email AS miembro,
      p.display_name AS nombre,
      COUNT(t.id) AS transacciones,
      COALESCE(SUM(CASE WHEN t.type = 'expense_direct' THEN t.amount ELSE 0 END), 0) AS gastos_directos,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS gastos_comunes,
      COALESCE(SUM(t.amount), 0) AS total_gastado
    FROM transactions t
    INNER JOIN profiles p ON t.real_payer_id = p.id OR t.profile_id = p.id
    WHERE t.household_id = $1
      AND t.type IN ('expense', 'expense_direct')
      ${periodFilter}
    GROUP BY p.email, p.display_name
    ORDER BY total_gastado DESC
  `, params);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.total_gastado as string), 0);

  // Format currency values
  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    gastos_directos: formatCurrency(parseFloat(row.gastos_directos as string), currency),
    gastos_comunes: formatCurrency(parseFloat(row.gastos_comunes as string), currency),
    total_gastado: formatCurrency(parseFloat(row.total_gastado as string), currency),
  }));

  return {
    columns: ['Miembro', 'Nombre', 'Transacciones', 'Gastos Directos', 'Gastos Comunes', 'Total Gastado'],
    rows: formattedRows,
    summary: {
      total: formatCurrency(total, currency),
      count: result.rows.length,
      periodo: year && month ? `${year}-${month}` : 'Todos los períodos',
    },
  };
}

async function queryContribucionesPorMiembro(pool: Pool, householdId: string, year?: number, month?: number): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  // Conditional period filter
  const periodFilter = year && month
    ? `AND c.year = $2 AND c.month = $3`
    : '';

  // Dynamic params array
  const params = year && month ? [householdId, year, month] : [householdId];

  const result = await pool.query(`
    SELECT
      p.email AS miembro,
      p.display_name AS nombre,
      COALESCE(c.expected_amount, 0) AS contribucion_esperada,
      COALESCE(c.paid_amount, 0) AS contribucion_pagada,
      COALESCE(c.expected_amount, 0) - COALESCE(c.paid_amount, 0) AS pendiente,
      CASE
        WHEN c.expected_amount > 0 THEN
          ROUND((c.paid_amount * 100.0 / c.expected_amount), 2)
        ELSE 0
      END AS porcentaje_cumplimiento
    FROM contributions c
    INNER JOIN profiles p ON c.profile_id = p.id
    WHERE c.household_id = $1
      ${periodFilter}
    ORDER BY porcentaje_cumplimiento DESC
  `, params);

  // Format currency values
  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    contribucion_esperada: formatCurrency(parseFloat(row.contribucion_esperada as string), currency),
    contribucion_pagada: formatCurrency(parseFloat(row.contribucion_pagada as string), currency),
    pendiente: formatCurrency(parseFloat(row.pendiente as string), currency),
  }));

  return {
    columns: ['Miembro', 'Nombre', 'Contribución Esperada', 'Contribución Pagada', 'Pendiente', '% Cumplimiento'],
    rows: formattedRows,
    summary: {
      count: result.rows.length,
      periodo: year && month ? `${year}-${month}` : 'Todos los períodos',
    },
  };
}

async function queryDetalleMiembro(pool: Pool, householdId: string, memberId: string, year?: number, month?: number): Promise<QueryResult> {
  const currency = await getHouseholdCurrency(householdId);

  // Conditional period filter
  const periodFilter = year && month
    ? `AND EXTRACT(YEAR FROM t.occurred_at) = $3 AND EXTRACT(MONTH FROM t.occurred_at) = $4`
    : '';

  // Dynamic params array
  const params = year && month
    ? [householdId, memberId, year, month]
    : [householdId, memberId];

  const result = await pool.query(`
    SELECT
      TO_CHAR(t.occurred_at, 'DD/MM/YYYY HH24:MI') AS fecha_hora,
      t.type AS tipo,
      t.flow_type AS flujo,
      t.description AS concepto,
      c.name AS categoria,
      c.icon,
      t.amount AS importe,
      CASE
        WHEN t.type IN ('expense', 'expense_direct') THEN -t.amount
        ELSE t.amount
      END AS impacto_balance
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.household_id = $1
      AND (t.profile_id = $2 OR t.real_payer_id = $2)
      ${periodFilter}
    ORDER BY t.occurred_at DESC
  `, params);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.impacto_balance as string), 0);

  // Format currency values
  const formattedRows = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    importe: formatCurrency(parseFloat(row.importe as string), currency),
    impacto_balance: formatCurrency(parseFloat(row.impacto_balance as string), currency),
  }));

  return {
    columns: ['Fecha/Hora', 'Tipo', 'Flujo', 'Concepto', 'Categoría', 'Icono', 'Importe', 'Impacto Balance'],
    rows: formattedRows,
    summary: {
      total: formatCurrency(total, currency),
      count: result.rows.length,
      periodo: year && month ? `${year}-${month}` : 'Todos los períodos',
    },
  };
}
