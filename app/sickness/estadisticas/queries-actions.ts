'use server';

import { getPool } from '@/lib/db';
import type { Pool } from 'pg';

/**
 * MÓDULO DE CONSULTAS DINÁMICAS PARA ANÁLISIS PROFESIONAL
 *
 * Este módulo proporciona un conjunto completo de consultas predefinidas
 * para análisis financiero avanzado sin modificar código existente.
 */

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  summary?: {
    total?: number;
    average?: number;
    count?: number;
    max?: number;
    min?: number;
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
        return await queryGastosPorCategoriaDetallado(pool, householdId, params.year!, params.month!, params.categoryId!);

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
        return await queryDetalleMiembro(pool, householdId, params.year!, params.month!, params.memberId!);

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

async function queryGastosPorCategoria(pool: Pool, householdId: string, year: number, month: number): Promise<QueryResult> {
  const result = await pool.query(`
    SELECT
      c.name AS categoria,
      c.icon,
      COUNT(t.id) AS transacciones,
      COALESCE(SUM(t.amount), 0) AS total,
      ROUND(
        COALESCE(SUM(t.amount), 0) * 100.0 /
        NULLIF((SELECT SUM(amount) FROM transactions
                WHERE household_id = $1
                AND type IN ('expense', 'expense_direct')
                AND EXTRACT(YEAR FROM occurred_at) = $2
                AND EXTRACT(MONTH FROM occurred_at) = $3), 0),
        2
      ) AS porcentaje
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.household_id = $1
      AND t.type IN ('expense', 'expense_direct')
      AND EXTRACT(YEAR FROM t.occurred_at) = $2
      AND EXTRACT(MONTH FROM t.occurred_at) = $3
    GROUP BY c.name, c.icon
    ORDER BY total DESC
  `, [householdId, year, month]);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.total as string), 0);

  return {
    columns: ['Categoría', 'Icono', 'Transacciones', 'Total', '% del Total'],
    rows: result.rows,
    summary: {
      total,
      count: result.rows.length,
    },
  };
}

async function queryGastosPorCategoriaGlobal(pool: Pool, householdId: string): Promise<QueryResult> {
  const result = await pool.query(`
    SELECT
      c.name AS categoria,
      c.icon,
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

async function queryTopGastos(pool: Pool, householdId: string, year: number, month: number): Promise<QueryResult> {
  const result = await pool.query(`
    SELECT
      t.description AS concepto,
      c.name AS categoria,
      c.icon,
      t.amount AS importe,
      TO_CHAR(t.occurred_at, 'DD/MM/YYYY') AS fecha,
      p.email AS realizado_por
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN profiles p ON t.profile_id = p.id
    WHERE t.household_id = $1
      AND t.type IN ('expense', 'expense_direct')
      AND EXTRACT(YEAR FROM t.occurred_at) = $2
      AND EXTRACT(MONTH FROM t.occurred_at) = $3
    ORDER BY t.amount DESC
    LIMIT 10
  `, [householdId, year, month]);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.importe as string), 0);
  const average = total / (result.rows.length || 1);

  return {
    columns: ['Concepto', 'Categoría', 'Icono', 'Importe', 'Fecha', 'Realizado Por'],
    rows: result.rows,
    summary: {
      total,
      average,
      count: result.rows.length,
      max: result.rows[0]?.importe || 0,
      min: result.rows[result.rows.length - 1]?.importe || 0,
    },
  };
}

async function queryGastosDiarios(pool: Pool, householdId: string, year: number, month: number): Promise<QueryResult> {
  const result = await pool.query(`
    SELECT
      TO_CHAR(t.occurred_at, 'DD/MM/YYYY') AS fecha,
      EXTRACT(DAY FROM t.occurred_at) AS dia,
      COUNT(t.id) AS transacciones,
      COALESCE(SUM(t.amount), 0) AS total
    FROM transactions t
    WHERE t.household_id = $1
      AND t.type IN ('expense', 'expense_direct')
      AND EXTRACT(YEAR FROM t.occurred_at) = $2
      AND EXTRACT(MONTH FROM t.occurred_at) = $3
    GROUP BY t.occurred_at::date, EXTRACT(DAY FROM t.occurred_at)
    ORDER BY t.occurred_at::date
  `, [householdId, year, month]);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.total as string), 0);
  const average = total / (result.rows.length || 1);

  return {
    columns: ['Fecha', 'Día', 'Transacciones', 'Total'],
    rows: result.rows,
    summary: {
      total,
      average,
      count: result.rows.length,
    },
  };
}

async function queryGastosPorCategoriaDetallado(pool: Pool, householdId: string, year: number, month: number, categoryId: string): Promise<QueryResult> {
  const result = await pool.query(`
    SELECT
      t.description AS concepto,
      t.amount AS importe,
      TO_CHAR(t.occurred_at, 'DD/MM/YYYY') AS fecha,
      t.flow_type AS tipo_flujo,
      p.email AS realizado_por
    FROM transactions t
    LEFT JOIN profiles p ON t.profile_id = p.id
    WHERE t.household_id = $1
      AND t.category_id = $2
      AND t.type IN ('expense', 'expense_direct')
      AND EXTRACT(YEAR FROM t.occurred_at) = $3
      AND EXTRACT(MONTH FROM t.occurred_at) = $4
    ORDER BY t.occurred_at DESC
  `, [householdId, categoryId, year, month]);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.importe as string), 0);
  const average = total / (result.rows.length || 1);

  return {
    columns: ['Concepto', 'Importe', 'Fecha', 'Tipo Flujo', 'Realizado Por'],
    rows: result.rows,
    summary: {
      total,
      average,
      count: result.rows.length,
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
  const result = await pool.query(`
    SELECT
      mp.year AS año,
      mp.month AS mes,
      TO_CHAR(DATE(mp.year || '-' || mp.month || '-01'), 'Month YYYY') AS periodo,
      COALESCE(mp.total_income, 0) AS ingresos_reales,
      COALESCE(hs.monthly_contribution_goal, 0) AS objetivo,
      COALESCE(mp.total_income, 0) - COALESCE(hs.monthly_contribution_goal, 0) AS diferencia,
      CASE
        WHEN hs.monthly_contribution_goal > 0 THEN
          ROUND((COALESCE(mp.total_income, 0) * 100.0 / hs.monthly_contribution_goal), 2)
        ELSE 0
      END AS porcentaje_cumplimiento
    FROM monthly_periods mp
    LEFT JOIN household_settings hs ON mp.household_id = hs.household_id
    WHERE mp.household_id = $1
    ORDER BY mp.year DESC, mp.month DESC
    LIMIT 12
  `, [householdId]);

  return {
    columns: ['Año', 'Mes', 'Período', 'Ingresos Reales', 'Objetivo', 'Diferencia', '% Cumplimiento'],
    rows: result.rows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryDetalleIngresosPeriodo(pool: Pool, householdId: string, year: number, month: number): Promise<QueryResult> {
  const result = await pool.query(`
    SELECT
      t.description AS concepto,
      t.amount AS importe,
      TO_CHAR(t.occurred_at, 'DD/MM/YYYY') AS fecha,
      c.name AS categoria,
      c.icon,
      p.email AS realizado_por
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN profiles p ON t.profile_id = p.id
    WHERE t.household_id = $1
      AND t.type IN ('income', 'income_direct')
      AND EXTRACT(YEAR FROM t.occurred_at) = $2
      AND EXTRACT(MONTH FROM t.occurred_at) = $3
    ORDER BY t.occurred_at DESC
  `, [householdId, year, month]);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.importe as string), 0);

  return {
    columns: ['Concepto', 'Importe', 'Fecha', 'Categoría', 'Icono', 'Realizado Por'],
    rows: result.rows,
    summary: {
      total,
      count: result.rows.length,
    },
  };
}

async function queryEvolucionBalance(pool: Pool, householdId: string): Promise<QueryResult> {
  const result = await pool.query(`
    SELECT
      mp.year AS año,
      mp.month AS mes,
      TO_CHAR(DATE(mp.year || '-' || mp.month || '-01'), 'Month YYYY') AS periodo,
      COALESCE(mp.opening_balance, 0) AS balance_apertura,
      COALESCE(mp.total_income, 0) AS ingresos,
      COALESCE(mp.total_expenses, 0) AS gastos,
      COALESCE(mp.closing_balance, 0) AS balance_cierre,
      COALESCE(mp.closing_balance, 0) - COALESCE(mp.opening_balance, 0) AS variacion
    FROM monthly_periods mp
    WHERE mp.household_id = $1
    ORDER BY mp.year DESC, mp.month DESC
    LIMIT 12
  `, [householdId]);

  return {
    columns: ['Año', 'Mes', 'Período', 'Balance Apertura', 'Ingresos', 'Gastos', 'Balance Cierre', 'Variación'],
    rows: result.rows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryProyeccionBalance(pool: Pool, householdId: string): Promise<QueryResult> {
  const result = await pool.query(`
    WITH ultimos_meses AS (
      SELECT
        AVG(total_income) AS ingreso_medio,
        AVG(total_expenses) AS gasto_medio,
        MAX(closing_balance) AS balance_actual
      FROM monthly_periods
      WHERE household_id = $1
      ORDER BY year DESC, month DESC
      LIMIT 3
    )
    SELECT
      'Próximos 3 meses' AS periodo,
      balance_actual AS balance_inicial,
      ingreso_medio * 3 AS ingresos_proyectados,
      gasto_medio * 3 AS gastos_proyectados,
      balance_actual + (ingreso_medio * 3) - (gasto_medio * 3) AS balance_proyectado,
      CASE
        WHEN gasto_medio > 0 THEN ROUND(balance_actual / gasto_medio, 1)
        ELSE 999
      END AS meses_autonomia
    FROM ultimos_meses
  `, [householdId]);

  return {
    columns: ['Período', 'Balance Inicial', 'Ingresos Proyectados', 'Gastos Proyectados', 'Balance Proyectado', 'Meses Autonomía'],
    rows: result.rows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryTasaAhorro(pool: Pool, householdId: string): Promise<QueryResult> {
  const result = await pool.query(`
    SELECT
      mp.year AS año,
      mp.month AS mes,
      TO_CHAR(DATE(mp.year || '-' || mp.month || '-01'), 'Month YYYY') AS periodo,
      COALESCE(mp.total_income, 0) AS ingresos,
      COALESCE(mp.total_expenses, 0) AS gastos,
      COALESCE(mp.closing_balance, 0) - COALESCE(mp.opening_balance, 0) AS ahorro,
      CASE
        WHEN mp.total_income > 0 THEN
          ROUND(((COALESCE(mp.closing_balance, 0) - COALESCE(mp.opening_balance, 0)) * 100.0 / mp.total_income), 2)
        ELSE 0
      END AS tasa_ahorro_porcentaje
    FROM monthly_periods mp
    WHERE mp.household_id = $1
    ORDER BY mp.year DESC, mp.month DESC
    LIMIT 12
  `, [householdId]);

  const avgTasaAhorro = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat((row.tasa_ahorro_porcentaje as string) || '0'), 0) / (result.rows.length || 1);

  return {
    columns: ['Año', 'Mes', 'Período', 'Ingresos', 'Gastos', 'Ahorro', 'Tasa Ahorro %'],
    rows: result.rows,
    summary: {
      average: avgTasaAhorro,
      count: result.rows.length,
    },
  };
}

async function queryComparativaMensual(pool: Pool, householdId: string): Promise<QueryResult> {
  const result = await pool.query(`
    SELECT
      mp.year AS año,
      mp.month AS mes,
      TO_CHAR(DATE(mp.year || '-' || mp.month || '-01'), 'Month YYYY') AS periodo,
      COALESCE(mp.total_income, 0) AS ingresos,
      COALESCE(mp.total_expenses, 0) AS gastos,
      COALESCE(mp.total_income, 0) - COALESCE(mp.total_expenses, 0) AS saldo,
      LAG(mp.total_expenses) OVER (ORDER BY mp.year, mp.month) AS gastos_mes_anterior,
      CASE
        WHEN LAG(mp.total_expenses) OVER (ORDER BY mp.year, mp.month) > 0 THEN
          ROUND(((COALESCE(mp.total_expenses, 0) - LAG(mp.total_expenses) OVER (ORDER BY mp.year, mp.month)) * 100.0
                 / LAG(mp.total_expenses) OVER (ORDER BY mp.year, mp.month)), 2)
        ELSE 0
      END AS variacion_gastos_porcentaje
    FROM monthly_periods mp
    WHERE mp.household_id = $1
    ORDER BY mp.year DESC, mp.month DESC
    LIMIT 12
  `, [householdId]);

  return {
    columns: ['Año', 'Mes', 'Período', 'Ingresos', 'Gastos', 'Saldo', 'Gastos Mes Anterior', 'Variación %'],
    rows: result.rows,
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
  const result = await pool.query(`
    WITH variaciones AS (
      SELECT
        mp.year AS año,
        mp.month AS mes,
        TO_CHAR(DATE(mp.year || '-' || mp.month || '-01'), 'Month YYYY') AS periodo,
        COALESCE(mp.total_income, 0) AS ingresos,
        COALESCE(mp.total_expenses, 0) AS gastos,
        LAG(mp.total_income) OVER (ORDER BY mp.year, mp.month) AS ingresos_anterior,
        LAG(mp.total_expenses) OVER (ORDER BY mp.year, mp.month) AS gastos_anterior
      FROM monthly_periods mp
      WHERE mp.household_id = $1
      ORDER BY mp.year DESC, mp.month DESC
      LIMIT 12
    )
    SELECT
      año,
      mes,
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
  `, [householdId]);

  return {
    columns: ['Año', 'Mes', 'Período', 'Ingresos', 'Gastos', 'Variación Ingresos %', 'Variación Gastos %'],
    rows: result.rows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryTendenciaGastos(pool: Pool, householdId: string): Promise<QueryResult> {
  const result = await pool.query(`
    WITH tendencia AS (
      SELECT
        mp.year AS año,
        mp.month AS mes,
        TO_CHAR(DATE(mp.year || '-' || mp.month || '-01'), 'Month YYYY') AS periodo,
        COALESCE(mp.total_expenses, 0) AS gastos,
        AVG(mp.total_expenses) OVER (ORDER BY mp.year, mp.month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS media_movil_3m,
        mp.year * 12 + mp.month AS periodo_num
      FROM monthly_periods mp
      WHERE mp.household_id = $1
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
    FROM tendencia
    ORDER BY año DESC, mes DESC
    LIMIT 6
  `, [householdId]);

  return {
    columns: ['Año', 'Mes', 'Período', 'Gastos', 'Media Móvil 3 Meses', 'Desviación %'],
    rows: result.rows,
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
  const result = await pool.query(`
    SELECT
      mp.year AS año,
      mp.month AS mes,
      TO_CHAR(DATE(mp.year || '-' || mp.month || '-01'), 'Month YYYY') AS periodo,
      COALESCE(mp.total_income, 0) AS ingresos,
      COALESCE(mp.total_expenses, 0) AS gastos,
      ROUND(AVG(mp.total_income) OVER (ORDER BY mp.year, mp.month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS media_ingresos_3m,
      ROUND(AVG(mp.total_expenses) OVER (ORDER BY mp.year, mp.month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS media_gastos_3m
    FROM monthly_periods mp
    WHERE mp.household_id = $1
    ORDER BY mp.year DESC, mp.month DESC
    LIMIT 12
  `, [householdId]);

  return {
    columns: ['Año', 'Mes', 'Período', 'Ingresos', 'Gastos', 'Media Ingresos 3M', 'Media Gastos 3M'],
    rows: result.rows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryGastosPorMiembro(pool: Pool, householdId: string, year: number, month: number): Promise<QueryResult> {
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
      AND EXTRACT(YEAR FROM t.occurred_at) = $2
      AND EXTRACT(MONTH FROM t.occurred_at) = $3
    GROUP BY p.email, p.display_name
    ORDER BY total_gastado DESC
  `, [householdId, year, month]);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.total_gastado as string), 0);

  return {
    columns: ['Miembro', 'Nombre', 'Transacciones', 'Gastos Directos', 'Gastos Comunes', 'Total Gastado'],
    rows: result.rows,
    summary: {
      total,
      count: result.rows.length,
    },
  };
}

async function queryContribucionesPorMiembro(pool: Pool, householdId: string, year: number, month: number): Promise<QueryResult> {
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
      AND c.year = $2
      AND c.month = $3
    ORDER BY porcentaje_cumplimiento DESC
  `, [householdId, year, month]);

  return {
    columns: ['Miembro', 'Nombre', 'Contribución Esperada', 'Contribución Pagada', 'Pendiente', '% Cumplimiento'],
    rows: result.rows,
    summary: {
      count: result.rows.length,
    },
  };
}

async function queryDetalleMiembro(pool: Pool, householdId: string, year: number, month: number, memberId: string): Promise<QueryResult> {
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
      AND EXTRACT(YEAR FROM t.occurred_at) = $3
      AND EXTRACT(MONTH FROM t.occurred_at) = $4
    ORDER BY t.occurred_at DESC
  `, [householdId, memberId, year, month]);

  const total = result.rows.reduce((sum: number, row: Record<string, unknown>) => sum + parseFloat(row.impacto_balance as string), 0);

  return {
    columns: ['Fecha/Hora', 'Tipo', 'Flujo', 'Concepto', 'Categoría', 'Icono', 'Importe', 'Impacto Balance'],
    rows: result.rows,
    summary: {
      total,
      count: result.rows.length,
    },
  };
}
