import {
  getDualFlowBalanceAction,
  getDualFlowTransactionsAction,
  getHouseholdSettingsAction,
} from '@/app/dual-flow/actions';
import AlertsAndGuidance from '@/app/dual-flow/components/AlertsAndGuidance';
import DualFlowSummary from '@/app/dual-flow/components/DualFlowSummary';
import LiveNotifications from '@/app/dual-flow/components/LiveNotifications';
import { MemberIncomeFormCard } from '@/app/dual-flow/components/MemberIncomeFormCard';
import { MemberIncomeReviewCard } from '@/app/dual-flow/components/MemberIncomeReviewCard';
import { PeriodContextDemo } from '@/app/dual-flow/components/PeriodContextDemo';
import SystemStatus from '@/app/dual-flow/components/SystemStatus';
import TipsAndTutorials from '@/app/dual-flow/components/TipsAndTutorials';
import { WorkflowManager } from '@/app/dual-flow/components/workflow';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { query } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import type { DualFlowBalance, DualFlowTransaction } from '@/types/dualFlow';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  HandHeart,
  Home,
  Scale,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

type DashboardUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
type MemberIncomeStatus = 'draft' | 'submitted' | 'validated' | 'needs_revision';
type PeriodPhase =
  | 'recoleccion'
  | 'revision'
  | 'liquidacion'
  | 'planificacion'
  | 'standby'
  | 'cerrado'
  | 'configuracion';
type BadgeVariant = NonNullable<BadgeProps['variant']>;

interface PhaseBadgeConfig {
  label: string;
  description: string;
  variant: BadgeVariant;
}

interface StepConfig {
  id: number;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  icon: LucideIcon;
}

const DEFAULT_ROLE = 'member' as const;
const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_MONTHLY_GOAL = 0;
const DEFAULT_WORKFLOW_LAST_SYNC = 'hace 2 minutos';

const INCOME_STATUS_LABELS: Record<MemberIncomeStatus, string> = {
  draft: 'Borrador',
  submitted: 'En revisión',
  validated: 'Validado',
  needs_revision: 'Revisión solicitada',
};

const REVIEW_STATUS_WEIGHT: Record<MemberIncomeStatus, number> = {
  submitted: 0,
  needs_revision: 1,
  draft: 2,
  validated: 3,
};

const DEFAULT_PHASE_BADGE: PhaseBadgeConfig = {
  label: 'En curso',
  description: 'Seguimiento activo del período',
  variant: 'secondary',
};

const PHASE_BADGES: Record<PeriodPhase, PhaseBadgeConfig> = {
  recoleccion: {
    label: 'Recolección',
    description: 'Capturando ingresos y gastos personales',
    variant: 'secondary',
  },
  revision: {
    label: 'Revisión',
    description: 'Aprobando transacciones pendientes',
    variant: 'default',
  },
  liquidacion: {
    label: 'Liquidación',
    description: 'Ajustando balances y reembolsos',
    variant: 'default',
  },
  planificacion: {
    label: 'Planificación',
    description: 'Preparando objetivos y reglas del siguiente mes',
    variant: 'secondary',
  },
  standby: {
    label: 'Stand-by',
    description: 'Esperando actividad del hogar',
    variant: 'outline',
  },
  cerrado: {
    label: 'Cerrado',
    description: 'Período finalizado con balances consolidados',
    variant: 'outline',
  },
  configuracion: {
    label: 'Configuración',
    description: 'Definiendo reglas iniciales del hogar',
    variant: 'secondary',
  },
};

const DEFAULT_BALANCE_STATE: DualFlowBalance = {
  household_id: 'unknown',
  fondo_comun: 0,
  gastos_personales_pendientes: 0,
  reembolsos_pendientes: 0,
  total_personal_to_common: 0,
  total_common_to_personal: 0,
  total_transacciones: 0,
  pendientes_revision: 0,
  auto_emparejadas: 0,
};

const STEP_CONFIG: StepConfig[] = [
  {
    id: 1,
    title: 'Registrar ingresos mensuales',
    description: 'Define el ingreso neto y el objetivo del período.',
    actionLabel: 'Registrar ingresos',
    href: '/dual-flow/contribucion',
    icon: HandHeart,
  },
  {
    id: 2,
    title: 'Registrar gastos personales',
    description: 'Añade gastos directos que necesitan reembolso.',
    actionLabel: 'Agregar gasto',
    href: '/dual-flow/balance',
    icon: Scale,
  },
  {
    id: 3,
    title: 'Revisar transacciones pendientes',
    description: 'Aprueba o rechaza movimientos en revisión.',
    actionLabel: 'Revisar transacciones',
    href: '/dual-flow/balance',
    icon: TrendingUp,
  },
  {
    id: 4,
    title: 'Preparar cierre del período',
    description: 'Valida balances y liquida diferencias.',
    actionLabel: 'Ver períodos',
    href: '/dual-flow/periodos',
    icon: Calendar,
  },
];

function formatPhaseBadge(phase: string | null | undefined): PhaseBadgeConfig {
  if (!phase) {
    return DEFAULT_PHASE_BADGE;
  }

  const normalized = phase.toLowerCase() as PeriodPhase;
  return PHASE_BADGES[normalized] ?? DEFAULT_PHASE_BADGE;
}

function formatPeriodLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseNumeric(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeIncomeStatus(value: unknown): MemberIncomeStatus {
  if (typeof value === 'string') {
    switch (value) {
      case 'submitted':
      case 'validated':
      case 'needs_revision':
      case 'draft':
        return value;
      default:
        return 'draft';
    }
  }

  return 'draft';
}

/**
 * Dashboard principal del sistema dual-flow
 * Diseño mobile-first con animaciones fluidas para sensación de paz
 */
export default async function DualFlowInicioPage() {
  // Verificar autenticación
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // Obtener household ID
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/app/onboarding');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Suspense
        fallback={
          <div className="animate-pulse p-4 space-y-4">
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="h-48 bg-muted rounded-lg"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        }
      >
        <DashboardContent householdId={householdId} currentUser={currentUser} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({
  householdId,
  currentUser,
}: {
  householdId: string;
  currentUser: DashboardUser;
}) {
  const [balanceResult, transactionsResult, settingsResult] = await Promise.all([
    getDualFlowBalanceAction(),
    getDualFlowTransactionsAction({ limit: 8 }),
    getHouseholdSettingsAction(),
  ]);

  const balanceData: DualFlowBalance =
    balanceResult.ok && balanceResult.data
      ? balanceResult.data
      : { ...DEFAULT_BALANCE_STATE, household_id: householdId };

  const transactionsData: DualFlowTransaction[] =
    transactionsResult.ok && Array.isArray(transactionsResult.data) ? transactionsResult.data : [];

  const householdSettings = settingsResult.ok ? settingsResult.data : null;

  const currency = householdSettings?.currency ?? DEFAULT_CURRENCY;
  const monthlyGoal = Number(householdSettings?.monthlyGoal ?? DEFAULT_MONTHLY_GOAL);
  const now = new Date();

  const metadataResult = await query<{
    has_phase: boolean;
    has_member_monthly_income_table: boolean;
    has_member_incomes_table: boolean;
  }>(
    `
      SELECT
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'monthly_periods'
            AND column_name = 'phase'
        ) AS has_phase,
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'member_monthly_income'
        ) AS has_member_monthly_income_table,
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'member_incomes'
        ) AS has_member_incomes_table
    `,
  );

  const hasPhaseColumn = Boolean(metadataResult.rows?.[0]?.has_phase);
  const hasMemberMonthlyIncomeTable = Boolean(
    metadataResult.rows?.[0]?.has_member_monthly_income_table,
  );
  const hasLegacyMemberIncomesTable = Boolean(metadataResult.rows?.[0]?.has_member_incomes_table);

  const periodQuery = hasPhaseColumn
    ? `
        SELECT id, year, month, phase::text AS phase
        FROM monthly_periods
        WHERE household_id = $1
        ORDER BY year DESC, month DESC
        LIMIT 1
      `
    : `
        SELECT id, year, month, status AS phase
        FROM monthly_periods
        WHERE household_id = $1
        ORDER BY year DESC, month DESC
        LIMIT 1
      `;

  const periodResult = await query(periodQuery, [householdId]);

  const periodRow = periodResult.rows?.[0] as
    | { id: string; year: number; month: number; phase: string | null }
    | undefined;

  const periodYear = periodRow?.year ?? now.getFullYear();
  const periodMonth = periodRow?.month ?? now.getMonth() + 1;
  const periodPhaseRaw = (periodRow?.phase as string | null) ?? 'recoleccion';
  const phaseBadge = formatPhaseBadge(periodPhaseRaw);
  const currentPeriodLabel = formatPeriodLabel(periodYear, periodMonth);

  const [membershipResult, memberCountResult, periodStatsResult] = await Promise.all([
    query(
      `
        SELECT role
        FROM household_members
        WHERE household_id = $1
          AND profile_id = $2
        LIMIT 1
      `,
      [householdId, currentUser.profile_id],
    ),
    query(
      `
        SELECT COUNT(*)::int AS total_members
        FROM household_members
        WHERE household_id = $1
      `,
      [householdId],
    ),
    query(
      `
        SELECT
          COUNT(*)::int AS total_periods,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END)::int AS closed_periods
        FROM monthly_periods
        WHERE household_id = $1
      `,
      [householdId],
    ),
  ]);

  type MemberMonthlyIncomeRow = {
    gross_income: number | string | null;
    other_income: number | string | null;
    notes: string | null;
    status: string | null;
  };

  let memberIncomeRecord: MemberMonthlyIncomeRow | null = null;

  if (hasMemberMonthlyIncomeTable) {
    const memberIncomeResult = await query<MemberMonthlyIncomeRow>(
      `
        SELECT gross_income, other_income, notes, status
        FROM member_monthly_income
        WHERE household_id = $1
          AND profile_id = $2
          AND period_year = $3
          AND period_month = $4
        LIMIT 1
      `,
      [householdId, currentUser.profile_id, periodYear, periodMonth],
    );

    memberIncomeRecord = memberIncomeResult.rows?.[0] ?? null;
  } else if (hasLegacyMemberIncomesTable) {
    const legacyIncomeResult = await query<{ monthly_income: number | string | null }>(
      `
        SELECT monthly_income
        FROM member_incomes
        WHERE household_id = $1
          AND profile_id = $2
        ORDER BY effective_from DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      `,
      [householdId, currentUser.profile_id],
    );

    const legacyIncomeRow = legacyIncomeResult.rows?.[0];
    if (legacyIncomeRow) {
      memberIncomeRecord = {
        gross_income: legacyIncomeRow.monthly_income,
        other_income: 0,
        notes: null,
        status: 'validated',
      };
    }
  }

  const householdMembers = Number(memberCountResult.rows?.[0]?.total_members ?? 1);
  const membershipRole = (membershipResult.rows?.[0]?.role as string | null) ?? DEFAULT_ROLE;
  const isOwner = membershipRole === 'owner' || membershipRole === 'admin';

  const periodStatsRow = periodStatsResult.rows?.[0] as
    | { total_periods: number; closed_periods: number }
    | undefined;
  const periodsManaged = Number(periodStatsRow?.total_periods ?? 1);
  const closedPeriods = Number(periodStatsRow?.closed_periods ?? 0);

  const memberIncomeStatus = normalizeIncomeStatus(memberIncomeRecord?.status);
  const memberIncome = {
    grossIncome: parseNumeric(memberIncomeRecord?.gross_income),
    otherIncome: parseNumeric(memberIncomeRecord?.other_income),
    notes: memberIncomeRecord?.notes ?? null,
    status: memberIncomeStatus,
  };
  const hasRegisteredIncome = memberIncome.grossIncome > 0 || memberIncome.otherIncome > 0;

  let reviewIncomes: Array<{
    id: string;
    profileId: string;
    displayName: string;
    email: string;
    grossIncome: number;
    otherIncome: number;
    notes: string | null;
    status: MemberIncomeStatus;
  }> = [];

  if (isOwner) {
    if (hasMemberMonthlyIncomeTable) {
      const reviewResult = await query(
        `
          SELECT
            mmi.id,
            mmi.profile_id,
            COALESCE(p.display_name, p.email) AS display_name,
            p.email,
            mmi.gross_income,
            mmi.other_income,
            mmi.notes,
            mmi.status
          FROM member_monthly_income mmi
          LEFT JOIN profiles p ON p.id = mmi.profile_id
          WHERE mmi.household_id = $1
            AND mmi.period_year = $2
            AND mmi.period_month = $3
          ORDER BY mmi.updated_at DESC
        `,
        [householdId, periodYear, periodMonth],
      );

      reviewIncomes =
        reviewResult.rows?.map((row) => ({
          id: String(row.id),
          profileId: String(row.profile_id),
          displayName: (row.display_name as string | null) ?? 'Miembro del hogar',
          email: (row.email as string | null) ?? '—',
          grossIncome: parseNumeric(row.gross_income),
          otherIncome: parseNumeric(row.other_income),
          notes: (row.notes as string | null) ?? null,
          status: normalizeIncomeStatus(row.status),
        })) ?? [];
    } else if (hasLegacyMemberIncomesTable) {
      const legacyReviewResult = await query(
        `
          SELECT DISTINCT ON (mi.profile_id)
            mi.id,
            mi.profile_id,
            COALESCE(p.display_name, p.email) AS display_name,
            p.email,
            mi.monthly_income AS gross_income
          FROM member_incomes mi
          LEFT JOIN profiles p ON p.id = mi.profile_id
          WHERE mi.household_id = $1
          ORDER BY mi.profile_id, mi.effective_from DESC NULLS LAST, mi.created_at DESC NULLS LAST
        `,
        [householdId],
      );

      reviewIncomes =
        legacyReviewResult.rows?.map((row) => ({
          id: String(row.id),
          profileId: String(row.profile_id),
          displayName: (row.display_name as string | null) ?? 'Miembro del hogar',
          email: (row.email as string | null) ?? '—',
          grossIncome: parseNumeric(row.gross_income),
          otherIncome: 0,
          notes: null,
          status: 'validated' as MemberIncomeStatus,
        })) ?? [];
    }

    reviewIncomes.sort((a, b) => REVIEW_STATUS_WEIGHT[a.status] - REVIEW_STATUS_WEIGHT[b.status]);
  }

  const totalTransactions = transactionsData.length;
  const pendingTransactions = balanceData.pendientes_revision ?? 0;
  const autoMatched = balanceData.auto_emparejadas ?? 0;
  const reimbursementsPending = Math.abs(balanceData.reembolsos_pendientes ?? 0);
  const spent = Math.abs(balanceData.fondo_comun ?? 0);

  const directTransactions = transactionsData.filter(
    (transaction) => transaction.tipo === 'gasto_directo',
  );
  const directTransactionsCount = directTransactions.length;

  const stepOneComplete = hasRegisteredIncome || memberIncomeStatus === 'validated';
  const stepTwoAvailable = stepOneComplete;
  const stepTwoComplete = directTransactionsCount > 0;
  const stepThreeAvailable = stepTwoComplete;
  const stepThreeComplete = pendingTransactions === 0 && totalTransactions > 0;
  const isPeriodClosed = periodPhaseRaw === 'cerrado';

  let currentStep = 1;
  if (stepOneComplete) currentStep = 2;
  if (stepTwoComplete) currentStep = 3;
  if (stepThreeComplete) currentStep = 4;
  if (isPeriodClosed) currentStep = STEP_CONFIG.length;

  const totalSteps = STEP_CONFIG.length;
  const workflowProgress = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  const hasMembers = householdMembers > 1;
  const daysInMonth = getDaysInMonth(periodYear, periodMonth);
  const currentDay = Math.min(now.getDate(), daysInMonth);
  const daysRemaining = Math.max(daysInMonth - currentDay, 0);

  const processingRate =
    totalTransactions > 0
      ? ((totalTransactions - pendingTransactions) / totalTransactions) * 100
      : 100;

  const completedActions: string[] = [];
  if (stepOneComplete) completedActions.push('monthly-goal');
  if (stepTwoComplete) completedActions.push('register-expenses');
  if (stepThreeComplete) completedActions.push('review-transactions');

  const userLevel: 'beginner' | 'intermediate' | 'advanced' =
    totalTransactions > 20 ? 'advanced' : totalTransactions > 8 ? 'intermediate' : 'beginner';

  const nextActionConfig = ((!stepOneComplete && STEP_CONFIG[0]) ||
    (!stepTwoComplete && STEP_CONFIG[1]) ||
    (!stepThreeComplete && STEP_CONFIG[2]) ||
    STEP_CONFIG[3]) as StepConfig;

  type WorkflowTransactionDashboard = {
    id: string;
    concepto: string;
    categoria: string;
    importe: number;
    fecha: string;
    tipo: DualFlowTransaction['tipo'];
    estado: DualFlowTransaction['estado'];
    pagadoPor: string;
    requiereAprobacion: boolean;
    pareja?: string;
    tipoFlujo: DualFlowTransaction['tipo_flujo'];
  };

  const workflowTransactions: WorkflowTransactionDashboard[] = transactionsData.map(
    (transaction) => ({
      id: transaction.id,
      concepto: transaction.concepto,
      categoria: transaction.categoria,
      importe: transaction.importe,
      fecha: new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
      }).format(new Date(transaction.fecha)),
      tipo: transaction.tipo,
      estado: transaction.estado,
      pagadoPor:
        transaction.pagado_por && transaction.pagado_por === currentUser.profile_id
          ? 'Tú'
          : transaction.pagado_por
          ? 'Miembro'
          : 'Sistema',
      requiereAprobacion: transaction.requiere_aprobacion,
      pareja: transaction.transaccion_pareja ?? undefined,
      tipoFlujo: transaction.tipo_flujo,
    }),
  );

  const steps = STEP_CONFIG.map((step, index) => {
    const stepNumber = index + 1;
    const completed =
      stepNumber === 1
        ? stepOneComplete
        : stepNumber === 2
        ? stepTwoComplete
        : stepNumber === 3
        ? stepThreeComplete
        : isPeriodClosed;
    const available =
      stepNumber === 1
        ? true
        : stepNumber === 2
        ? stepTwoAvailable
        : stepNumber === 3
        ? stepThreeAvailable
        : stepThreeComplete;
    const status = completed ? 'completed' : available ? 'current' : 'upcoming';
    return { ...step, number: stepNumber, completed, available, status };
  });

  const displayName = currentUser.display_name ?? currentUser.email ?? 'Bienvenido';
  const incomesPendingReview = reviewIncomes.filter(
    (income) => income.status !== 'validated',
  ).length;

  return (
    <>
      <div className="px-4 pt-6 pb-8 space-y-4">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Sistema Dual-Flow</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Hola {displayName.split(' ')[0] ?? displayName}, este es tu panel financiero
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Seguimos tu flujo mensual en tiempo real. {phaseBadge.description}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full border">
              <Calendar className="h-3 w-3" />
              {currentPeriodLabel}
            </div>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full border">
              <Users className="h-3 w-3" />
              {householdMembers} {householdMembers === 1 ? 'miembro' : 'miembros'}
            </div>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full border">
              <TrendingUp className="h-3 w-3" />
              {workflowProgress}% completado
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6 pb-16">
        <PeriodContextDemo />

        <Card className="overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{currentPeriodLabel}</CardTitle>
                <p className="text-sm text-muted-foreground">{phaseBadge.description}</p>
              </div>
              <Badge variant={phaseBadge.variant} className="gap-1">
                <Clock className="h-3 w-3" />
                {phaseBadge.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Transacciones</p>
                <p className="text-lg font-semibold">{totalTransactions}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pendientes</p>
                <p className="text-lg font-semibold text-orange-600">{pendingTransactions}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
                <p className="text-lg font-semibold text-primary">
                  {INCOME_STATUS_LABELS[memberIncomeStatus]}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Objetivo</p>
                <p className="text-lg font-semibold">{formatCurrency(monthlyGoal, currency)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/40 text-xs">
              <span>
                Faltan <strong>{daysRemaining}</strong> días para cerrar el período.
              </span>
              <span>
                {autoMatched} auto-procesadas • {formatCurrency(reimbursementsPending, currency)}{' '}
                pendientes de reembolso
              </span>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Workflow guiado</h2>

          <div className="space-y-3">
            {steps.map((step) => {
              const Icon = step.icon;
              const iconStyles = step.completed
                ? 'bg-green-500 text-white'
                : step.status === 'current'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground';
              const cardStyles = step.completed
                ? 'border-l-4 border-l-green-500'
                : step.status === 'current'
                ? 'border-l-4 border-l-primary'
                : 'border border-dashed border-muted';

              return (
                <Card
                  key={step.id}
                  className={`transition-all duration-300 ${cardStyles} ${
                    step.status === 'upcoming' ? 'opacity-70' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${iconStyles}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{step.title}</h3>
                          {step.completed && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <CheckCircle className="h-3 w-3" />
                              Completado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      {step.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : step.available ? (
                        <Button size="sm" className="gap-2" asChild>
                          <Link href={step.href}>
                            {step.actionLabel}
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      ) : (
                        <div className="w-8 h-8 rounded-full border-2 border-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {step.number}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Acciones rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="lg" className="h-auto p-4 flex-col gap-2" asChild>
              <Link href="/dual-flow/contribucion">
                <HandHeart className="h-5 w-5" />
                <span className="text-sm">Contribución</span>
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-auto p-4 flex-col gap-2" asChild>
              <Link href="/dual-flow/balance">
                <Scale className="h-5 w-5" />
                <span className="text-sm">Balance</span>
              </Link>
            </Button>
          </div>
        </section>

        <section className="space-y-4" id="member-income">
          <MemberIncomeFormCard
            periodLabel={currentPeriodLabel}
            periodYear={periodYear}
            periodMonth={periodMonth}
            currency={currency}
            existingIncome={{
              grossIncome: memberIncome.grossIncome,
              otherIncome: memberIncome.otherIncome,
              notes: memberIncome.notes,
              status: memberIncome.status,
            }}
          />

          {isOwner && (
            <MemberIncomeReviewCard
              incomes={reviewIncomes.map((income) => ({
                id: income.id,
                profileId: income.profileId,
                displayName: income.displayName,
                email: income.email,
                grossIncome: income.grossIncome,
                otherIncome: income.otherIncome,
                notes: income.notes,
                status: income.status,
              }))}
              periodLabel={currentPeriodLabel}
              periodYear={periodYear}
              periodMonth={periodMonth}
              currency={currency}
            />
          )}
        </section>

        <DualFlowSummary monthlyGoal={monthlyGoal} spent={spent} />

        <AlertsAndGuidance
          monthlyGoal={monthlyGoal}
          spent={spent}
          pendingTransactions={pendingTransactions}
          autoMatched={autoMatched}
          totalTransactions={totalTransactions}
          reimbursementsPending={reimbursementsPending}
          hasMembers={hasMembers}
          currentMonth={currentPeriodLabel}
          daysInMonth={daysInMonth}
          currentDay={currentDay}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <SystemStatus
            totalTransactions={totalTransactions}
            pendingTransactions={pendingTransactions}
            autoMatched={autoMatched}
            processingRate={processingRate}
            lastSyncTime={DEFAULT_WORKFLOW_LAST_SYNC}
            householdMembers={householdMembers}
            periodsManaged={periodsManaged}
          />
          <TipsAndTutorials userLevel={userLevel} completedActions={completedActions} />
        </div>

        <LiveNotifications
          currentPeriod={currentPeriodLabel}
          workflowProgress={workflowProgress}
          currentStep={Math.min(currentStep, totalSteps)}
          totalSteps={totalSteps}
          nextActionTitle={nextActionConfig.title}
          nextActionHref={nextActionConfig.href}
        />

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" />
              Resumen del hogar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Períodos gestionados</p>
                <p className="text-lg font-semibold">{periodsManaged}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Períodos cerrados</p>
                <p className="text-lg font-semibold text-green-600">{closedPeriods}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Ingresos pendientes</p>
                <p className="text-lg font-semibold text-orange-600">{incomesPendingReview}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Miembros activos</p>
                <p className="text-lg font-semibold">{householdMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              Últimas transacciones
            </h2>
            <p className="text-sm text-muted-foreground">
              Revisa y acompaña el flujo dual con datos actualizados.
            </p>
          </div>

          <WorkflowManager transactions={workflowTransactions} showActions={false} />
        </section>

        <div className="h-10" />
      </div>
    </>
  );
}
