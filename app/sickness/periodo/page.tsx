"use client";

import { ContributionsOverview, type CombinedMemberContribution } from '@/components/periodo/ContributionsOverview';
import { PhaseCard } from '@/components/periodo/PhaseCard';
import { Progress } from '@/components/ui/progress';
import { CalendarCheck2, Lock, Rocket, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
// import { toast } from '@/components/ui/use-toast';
import { useSiKness } from '@/contexts/SiKnessContext';
import { toast } from 'sonner';

type Checklist = {
  householdId: string;
  periodId: string | null;
  year: number | null;
  month: number | null;
  phase: string | null; // Fase del workflow
  hasHouseholdGoal: boolean;
  monthlyContributionGoal: number | null;
  calculationType: string | null;
  membersWithIncome: number;
  totalMembers: number;
};

async function fetchChecklist(params?: { year?: number; month?: number; periodId?: string }): Promise<Checklist | null> {
  const qs = new URLSearchParams();
  if (params?.periodId) qs.set('periodId', params.periodId);
  if (params?.year) qs.set('year', String(params.year));
  if (params?.month) qs.set('month', String(params.month));
  const url = qs.toString() ? `/api/periods/checklist?${qs.toString()}` : '/api/periods/checklist';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  // Solo usamos 'phase' como fuente de verdad. Si el backend envía 'status', lo ignoramos.
  return json?.data ?? null;
}

function FinancialSummaryCardSection({ checklist, refreshChecklist: _refreshChecklist }: { checklist: Checklist | null, refreshChecklist: () => void }) {
  const [contributions, setContributions] = useState<CombinedMemberContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [_calculating, _setCalculating] = useState(false);
  const { selectedPeriod, privacyMode } = useSiKness();

  useEffect(() => {
    if (!checklist?.periodId) return;
    setLoading(true);
    const qs = new URLSearchParams();
    if (selectedPeriod?.year) qs.set('year', String(selectedPeriod.year));
    if (selectedPeriod?.month) qs.set('month', String(selectedPeriod.month));
    if (checklist?.periodId) qs.set('periodId', checklist.periodId);
    const url = `/api/periods/contributions?${qs.toString()}`;
    fetch(url, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        setContributions((json.contributions ?? []) as CombinedMemberContribution[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [checklist?.periodId, selectedPeriod?.year, selectedPeriod?.month]);

  if (!checklist || !checklist.hasHouseholdGoal) return null;
  if (loading) return <div className="mt-4 text-sm text-muted-foreground">Cargando resumen financiero…</div>;

  // Obtener meta mensual y tipo de cálculo
  const monthlyGoal = Number(checklist.monthlyContributionGoal ?? 0) || 0;
  const calculationType = checklist.calculationType ?? 'equal';


  return (
    <div className="mt-4">
      <ContributionsOverview
        contributions={contributions}
        calculationType={calculationType}
        monthlyGoal={monthlyGoal}
        phase={checklist?.phase}
        privacyMode={privacyMode}
      />
    </div>
  );
}

export default function PeriodosYContribucionPage() {
  // Usamos solo el selector global de periodo (contexto)
  const { householdId, selectedPeriod } = useSiKness();
  const [data, setData] = useState<Checklist | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  // Reconsultar checklist cuando cambie el hogar o el periodo seleccionado
  useEffect(() => {
    if (!householdId) return;
    const params = selectedPeriod ? { year: selectedPeriod.year, month: selectedPeriod.month } : undefined;
    fetchChecklist(params).then(setData).catch(() => setData(null));
  }, [householdId, selectedPeriod]);

  // Solo permitir bloquear si existen contribuciones generadas
  const [contributionsExist, setContributionsExist] = useState(false);
  useEffect(() => {
    if (!data?.periodId) {
      setContributionsExist(false);
      return;
    }
    const qs = new URLSearchParams();
    if (selectedPeriod?.year) qs.set('year', String(selectedPeriod.year));
    if (selectedPeriod?.month) qs.set('month', String(selectedPeriod.month));
    if (data?.periodId) qs.set('periodId', data.periodId);
    const url = `/api/periods/contributions?${qs.toString()}`;
    fetch(url, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        setContributionsExist(Array.isArray(json.contributions) && json.contributions.length > 0);
      });
  }, [data?.periodId, selectedPeriod?.year, selectedPeriod?.month]);

  const canLock = useMemo(() => {
    if (!data) return false;
    return data.hasHouseholdGoal && data.membersWithIncome > 0 && data.totalMembers > 0 && contributionsExist;
  }, [data, contributionsExist]);

  const progress = useMemo(() => {
    // 0-100 basado en fase del workflow y checklist
    if (!data) return 0;
    let pct = 0;
    // Checklist base
    if (data.hasHouseholdGoal) pct += 20;
    if (data.totalMembers > 0 && data.membersWithIncome === data.totalMembers) pct += 20;

    const phase = data.phase || 'preparing';
    switch (phase) {
      case 'preparing':
        pct += 10;
        break;
      case 'validation':
        pct += 40;
        break;
      case 'active':
        pct += 60;
        break;
      case 'closing':
        pct += 80;
        break;
      case 'closed':
        pct = 100;
        break;
      default:
        break;
    }
    return Math.min(100, pct);
  }, [data]);

  // Etiqueta de fase actual para mostrar en UI
  const phaseLabel = useMemo(() => {
    const phase = data?.phase ?? 'unknown';
    switch (phase) {
      case 'preparing':
        return 'Configuración Inicial';
      case 'validation':
        return 'Validación Pendiente';
      case 'active':
        return 'Abierto (en uso)';
      case 'closing':
        return 'Cierre iniciado';
      case 'closed':
        return 'Cerrado';
      default:
        return 'Desconocido';
    }
  }, [data?.phase]);

  function refresh() {
    const params = selectedPeriod ? { year: selectedPeriod.year, month: selectedPeriod.month } : undefined;
    fetchChecklist(params).then(setData).catch(() => setData(null));
  }

  const onLock = () => {
    if (!data?.periodId) return;
    startTransition(async () => {
      const res = await fetch('/api/periods/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: data.periodId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success('Período bloqueado para validación');
        refresh();
      } else {
        toast.error(json.message ?? 'Error al bloquear período');
      }
    });
  };

  const onOpen = () => {
    if (!data?.periodId) return;
    startTransition(async () => {
      const res = await fetch('/api/periods/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: data.periodId }),
      });
      const json = await res.json();
  // noop
      if (json.ok) {
        toast.success('Período abierto');
        refresh();
      } else {
        toast.error(json.message ?? 'Error al abrir período');
      }
    });
  };

  const onStartClosing = () => {
    if (!data?.periodId) return;
    startTransition(async () => {
      const res = await fetch('/api/periods/start-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: data.periodId, reason: reason || undefined }),
      });
      const json = await res.json();
  // noop
      if (json.ok) {
        toast.success('Cierre iniciado');
        refresh();
      } else {
        toast.error(json.message ?? 'Error al iniciar cierre');
      }
    });
  };

  const onClose = () => {
    if (!data?.periodId) return;
    startTransition(async () => {
      const res = await fetch('/api/periods/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: data.periodId, notes: notes || undefined }),
      });
      const json = await res.json();
  // noop
      if (json.ok) {
        toast.success('Período cerrado');
        refresh();
      } else {
        toast.error(json.message ?? 'Error al cerrar período');
      }
    });
  };

  return (

    <div className="p-4 lg:grid lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-8 space-y-6">
  <h1 className="text-2xl font-semibold">Contribución y periodos</h1>
        <p className="text-muted-foreground mt-2">Workflow guiado para el ciclo mensual.</p>
        {/* Progreso del periodo */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progreso del período</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
        {/* Estado actual y checklist */}
        <section className="rounded-lg border p-4 mt-6">
          <h2 className="text-lg font-medium">Estado actual</h2>
          <div className="mt-2 text-sm text-muted-foreground">
            {data ? (
              <>
                <div>
                  Periodo: {data.year}/{data.month} — Fase: <strong>{phaseLabel}</strong>
                </div>
                <div>Miembros: {data.membersWithIncome}/{data.totalMembers} con ingresos configurados</div>
                <div>Objetivo común: {data.hasHouseholdGoal ? 'Configurado' : 'No configurado'}</div>
              </>
            ) : (
              <span>Cargando…</span>
            )}
          </div>
          {/* Resumen financiero en tiempo real */}
          <FinancialSummaryCardSection checklist={data} refreshChecklist={refresh} />
        </section>
      </div>

      <section className="lg:col-span-8 mt-6">
        <PhaseCard
          phase="preparing"
          title="Configuración Inicial"
          icon={<CalendarCheck2 />}
          status={data?.phase === 'preparing' ? 'active' : ['validation','active','closing','closed'].includes(data?.phase ?? '') ? 'completed' : 'pending'}
          description="Configura el objetivo mensual y los ingresos de todos los miembros para poder avanzar. Calcula las contribuciones antes de bloquear."
          checklist={[
            { label: 'Objetivo mensual definido', done: !!data?.hasHouseholdGoal },
            { label: 'Ingresos de miembros informados', done: data ? data.membersWithIncome === data.totalMembers && data.totalMembers > 0 : false },
            { label: 'Contribuciones generadas', done: contributionsExist },
          ]}
          actions={[
            {
              label: 'Bloquear para validación',
              onClick: onLock,
              variant: 'primary',
              disabled: !data?.periodId || !canLock || isPending,
            },
          ]}
        />
      </section>

      <section className="lg:col-span-8 mt-6">
        <PhaseCard
          phase="validation"
          title="Validación Pendiente"
          icon={<ShieldCheck />}
          status={data?.phase === 'validation' ? 'active' : ['active','closing','closed'].includes(data?.phase ?? '') ? 'completed' : 'pending'}
          description="Revisa los cálculos y confirma para abrir el período."
          actions={[
            {
              label: 'Abrir período',
              onClick: onOpen,
              variant: 'primary',
              disabled: !data?.periodId || isPending,
            },
          ]}
        />
      </section>

      <section className="lg:col-span-8 mt-6">
        <PhaseCard
          phase="active"
          title="Abierto (en uso)"
          icon={<Rocket />}
          status={data?.phase === 'active' ? 'active' : ['closing','closed'].includes(data?.phase ?? '') ? 'completed' : 'pending'}
          description="El período está abierto. Puedes registrar movimientos y consultar el balance."
          actions={[
            {
              label: 'Ver Balance y Movimientos',
              onClick: () => window.location.href = '/sickness/balance',
              variant: 'primary',
              disabled: false,
            },
          ]}
          checklist={[
            { label: 'Registrar movimientos', done: data?.phase === 'active' || data?.phase === 'closing' || data?.phase === 'closed' },
          ]}
        />
        <div className="mt-3">
          <label className="text-sm text-muted-foreground" htmlFor="reason">
            Motivo/nota para iniciar cierre (opcional)
          </label>
          <input
            id="reason"
            className="w-full rounded-md border px-3 py-2"
            placeholder="Ej. Fin de mes"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="inline-flex w-fit items-center rounded-md bg-amber-600 px-3 py-2 text-white disabled:opacity-60 mt-2"
            disabled={!data?.periodId || isPending}
            onClick={onStartClosing}
          >
            Iniciar cierre
          </button>
        </div>
      </section>

      <section className="lg:col-span-8 mt-6">
        <PhaseCard
          phase="closing"
          title="Cierre iniciado"
          icon={<Lock />}
          status={data?.phase === 'closing' ? 'active' : data?.phase === 'closed' ? 'completed' : 'pending'}
          description="Inicia el cierre del período y deja notas si lo deseas."
          actions={[]}
        />
        <div className="mt-3">
          <label className="text-sm text-muted-foreground" htmlFor="notes">
            Notas de cierre (opcional)
          </label>
          <input
            id="notes"
            className="w-full rounded-md border px-3 py-2"
            placeholder="Resumen o notas de cierre"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            className="inline-flex w-fit items-center rounded-md bg-red-600 px-3 py-2 text-white disabled:opacity-60 mt-2"
            disabled={!data?.periodId || isPending}
            onClick={onClose}
          >
            Cerrar período definitivamente
          </button>
        </div>
      </section>
      {/* Checklist fija lateral en desktop */}
      <aside className="hidden lg:block lg:col-span-4">
        <div className="sticky top-20 space-y-4">
          <div className="rounded-lg border p-4">
            <h4 className="font-medium mb-2">Checklist rápida</h4>
            <ul className="text-sm space-y-1">
              <li>
                <span className={data?.hasHouseholdGoal ? 'text-green-600' : 'text-amber-600'}>• Configuración Inicial</span>
              </li>
              <li>
                <span className={data && data.membersWithIncome === data.totalMembers && data.totalMembers > 0 ? 'text-green-600' : 'text-amber-600'}>
                  • Validación Pendiente
                </span>
              </li>
              <li>
                <span className={['active','closing','closed'].includes(data?.phase ?? '') ? 'text-green-600' : 'text-muted-foreground'}>• Abierto (en uso)</span>
              </li>
              <li>
                <span className={data?.phase === 'closing' || data?.phase === 'closed' ? 'text-green-600' : 'text-muted-foreground'}>• Cierre iniciado</span>
              </li>
              <li>
                <span className={data?.phase === 'closed' ? 'text-green-600' : 'text-muted-foreground'}>• Cerrado</span>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
