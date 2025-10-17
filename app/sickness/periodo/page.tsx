"use client";

import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

type Checklist = {
  householdId: string;
  periodId: string | null;
  year: number | null;
  month: number | null;
  status: string | null;
  phase: string | null; // Fase del workflow
  hasHouseholdGoal: boolean;
  membersWithIncome: number;
  totalMembers: number;
};

async function fetchChecklist(): Promise<Checklist | null> {
  const res = await fetch('/api/periods/checklist', { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

export default function PeriodoPage() {
  const [data, setData] = useState<Checklist | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchChecklist().then(setData).catch(() => setData(null));
  }, []);

  const canLock = useMemo(() => {
    if (!data) return false;
    return data.hasHouseholdGoal && data.membersWithIncome > 0 && data.totalMembers > 0;
  }, [data]);

  const progress = useMemo(() => {
    // 0-100 basado en fase del workflow y checklist
    if (!data) return 0;
    let pct = 0;
    // Checklist base
    if (data.hasHouseholdGoal) pct += 20;
    if (data.totalMembers > 0 && data.membersWithIncome === data.totalMembers) pct += 20;

    const phase = data.phase || 'preparing';
    if (phase === 'preparing') pct += 10;
    if (phase === 'validation') pct += 40; // validación lista para abrir
    if (phase === 'active') pct += 60; // uso activo
    if (phase === 'closing') pct += 80; // en cierre
    if (phase === 'closed') pct = 100;
    return Math.min(100, pct);
  }, [data]);

  const statusLabel = useMemo(() => {
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
        return phase || 'Desconocido';
    }
  }, [data?.phase]);

  function refresh() {
    fetchChecklist().then(setData).catch(() => setData(null));
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
        <h1 className="text-2xl font-semibold">Gestión de Periodos</h1>
        <p className="text-muted-foreground mt-2">Workflow guiado para el ciclo mensual.</p>
        {/* Progreso del periodo */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progreso del período</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </div>

      <section className="lg:col-span-8 rounded-lg border p-4 mt-6 lg:mt-0">
        <h2 className="text-lg font-medium">Estado actual</h2>
        <div className="mt-2 text-sm text-muted-foreground">
          {data ? (
            <>
              <div>
                Periodo: {data.year}/{data.month} — Estado: <strong>{statusLabel}</strong>
              </div>
              <div>Miembros: {data.membersWithIncome}/{data.totalMembers} con ingresos configurados</div>
              <div>Objetivo común: {data.hasHouseholdGoal ? 'Configurado' : 'No configurado'}</div>
            </>
          ) : (
            <span>Cargando…</span>
          )}
        </div>
      </section>

      <section className="lg:col-span-8 rounded-lg border p-4 space-y-3 mt-6">
        <h3 className="font-medium">Fase 1 · Checklist</h3>
        <ul className="list-disc pl-5 text-sm">
          <li className={data?.hasHouseholdGoal ? 'text-green-600' : 'text-amber-600'}>
            Objetivo mensual del hogar {data?.hasHouseholdGoal ? 'listo' : 'pendiente'}
          </li>
          <li
            className={
              data && data.membersWithIncome === data.totalMembers && data.totalMembers > 0
                ? 'text-green-600'
                : 'text-amber-600'
            }
          >
            Ingresos de miembros {data && data.membersWithIncome === data.totalMembers ? 'listos' : 'pendientes'}
          </li>
        </ul>

        <div className="flex gap-2 mt-2">
          <button
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
            disabled={!data?.periodId || !canLock || isPending}
            onClick={onLock}
          >
            Bloquear para validación
          </button>
        </div>
      </section>

      <section className="lg:col-span-8 rounded-lg border p-4 space-y-3 mt-6">
        <h3 className="font-medium">Fase 2 · Validación</h3>
        <p className="text-sm text-muted-foreground">
          Revisa los cálculos y confirma para abrir el período.
        </p>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-white disabled:opacity-60"
            disabled={!data?.periodId || isPending}
            onClick={onOpen}
          >
            Abrir período
          </button>
        </div>
      </section>

      <section className="lg:col-span-8 rounded-lg border p-4 space-y-3 mt-6">
        <h3 className="font-medium">Fase 3 · Uso activo</h3>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/sickness/balance"
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90"
            >
              Ver Balance y Movimientos
            </Link>
          </div>
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
            className="inline-flex w-fit items-center rounded-md bg-amber-600 px-3 py-2 text-white disabled:opacity-60"
            disabled={!data?.periodId || isPending}
            onClick={onStartClosing}
          >
            Iniciar cierre
          </button>
        </div>
      </section>

      <section className="lg:col-span-8 rounded-lg border p-4 space-y-3 mt-6">
        <h3 className="font-medium">Cierre</h3>
        <div className="flex flex-col gap-2">
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
            className="inline-flex w-fit items-center rounded-md bg-red-600 px-3 py-2 text-white disabled:opacity-60"
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
                <span className={data?.hasHouseholdGoal ? 'text-green-600' : 'text-amber-600'}>• Objetivo mensual</span>
              </li>
              <li>
                <span className={data && data.membersWithIncome === data.totalMembers && data.totalMembers > 0 ? 'text-green-600' : 'text-amber-600'}>
                  • Ingresos de miembros
                </span>
              </li>
              <li>
                <span className="text-muted-foreground">• Validar y abrir</span>
              </li>
              <li>
                <span className="text-muted-foreground">• Uso y cierre</span>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
