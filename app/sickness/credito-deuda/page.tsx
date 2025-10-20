import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import {
  approveCreditRefund,
  approvePersonalLoan,
  getActiveLoans,
  getHouseholdBalancesOverview,
  getMemberBalanceStatus,
  getPendingLoans,
  getPendingRefunds,
  rejectCreditRefund,
  rejectPersonalLoan,
  repayLoan,
  requestCreditRefund,
  requestPersonalLoan,
} from './actions';

export default async function CreditDebtPage() {
  const user = await getCurrentUser();
  const householdId = await getUserHouseholdId();

  if (!user || !householdId) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Crédito y Deuda</h1>
        <p className="text-sm text-muted-foreground mt-2">Necesitas iniciar sesión y pertenecer a un hogar.</p>
      </div>
    );
  }

  const roleResult = await query(
    `SELECT role FROM household_members WHERE household_id = $1 AND profile_id = $2`,
    [householdId, user.profile_id],
  );
  const isOwner = roleResult.rows[0]?.role === 'owner';

  // Periodo seleccionado (SSR): leer cookie establecida al seleccionar periodo.
  // Formato de cookie: `csik-selected-period-${householdId}` => "YYYY-M"
  const periodCookieName = `csik-selected-period-${householdId}`;
  const cookieStore = await cookies();
  const periodCookie = cookieStore.get(periodCookieName)?.value;
  let selectedYear: number;
  let selectedMonth: number;
  if (periodCookie) {
    const [yStr, mStr] = periodCookie.split('-');
    selectedYear = Number(yStr);
    selectedMonth = Number(mStr);
  } else {
    // Si no hay cookie aún (primera visita), usamos el mes/año actuales como selección inicial.
    const now = new Date();
    selectedYear = now.getFullYear();
    selectedMonth = now.getMonth() + 1;
  }

  const [memberStatusRes, activeLoansRes, pendingLoansRes, pendingRefundsRes, householdOverviewRes] = await Promise.all([
    getMemberBalanceStatus(selectedYear, selectedMonth),
    getActiveLoans(),
    isOwner ? getPendingLoans() : Promise.resolve({ ok: true, data: [] }),
    isOwner ? getPendingRefunds() : Promise.resolve({ ok: true, data: [] }),
    isOwner ? getHouseholdBalancesOverview(selectedYear, selectedMonth) : Promise.resolve({ ok: false, data: null }),
  ]);

  const memberData = memberStatusRes.ok ? memberStatusRes.data : null;
  const activeLoans = (activeLoansRes.ok && activeLoansRes.data ? activeLoansRes.data : []) as Array<{
    id: string;
    profile_id: string;
    email: string;
    display_name: string | null;
    amount: number;
    approved_at: string;
    notes: string | null;
  }>;
  const pendingLoans = (pendingLoansRes.ok && pendingLoansRes.data ? pendingLoansRes.data : []) as Array<{
    id: string;
    display_name: string | null;
    email: string;
    amount: number;
    notes: string;
    requested_at: string;
  }>;
  const pendingRefunds = (pendingRefundsRes.ok && pendingRefundsRes.data ? pendingRefundsRes.data : []) as Array<{
    id: string;
    display_name: string | null;
    email: string;
    amount: number;
    notes: string | null;
    requested_at: string;
  }>;

    const householdOverview = isOwner && householdOverviewRes.ok && householdOverviewRes.data ? householdOverviewRes.data : null;

  // Normalización a céntimos para evitar artefactos de coma flotante (-0.00, 0.001, etc.)
  const toCents = (n: number | null | undefined) => Math.round((Number(n ?? 0)) * 100);
  const fromCents = (c: number) => c / 100;

  const balanceCents = toCents(memberData?.balance as number);
  const balance = fromCents(balanceCents);
  const credit = Math.max(balance, 0);
  const debt = Math.abs(Math.min(balance, 0));
  const totalDebtCents = toCents(memberData?.total_debt as number);
  const totalDebt = fromCents(totalDebtCents);
  const isSaldado = balanceCents === 0 && totalDebtCents === 0;

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">Crédito y Deuda</h1>

       {/* ========== OWNER: ESTADO GLOBAL DEL HOGAR ========== */}
       {isOwner && householdOverview && (
         <section className="rounded-lg border bg-card p-5 space-y-4">
           <h2 className="text-lg font-semibold">Estado global del hogar</h2>
           <div className="overflow-x-auto">
             <table className="w-full text-sm">
               <thead className="border-b">
                 <tr className="text-left text-muted-foreground">
                   <th className="py-2 pr-4">Miembro</th>
                   <th className="py-2 pr-4">Saldo</th>
                   <th className="py-2">Estado</th>
                 </tr>
               </thead>
               <tbody>
                 {householdOverview.members.map((m: { profile_id: string; display_name: string | null; email: string; balance: number }) => {
                   const memberBalanceCents = toCents(m.balance);
                   const memberBalance = fromCents(memberBalanceCents);
                   const memberCredit = Math.max(memberBalance, 0);
                   const memberIsSaldado = memberBalanceCents === 0;

                   return (
                     <tr key={m.profile_id} className="border-b last:border-0">
                       <td className="py-3 pr-4">
                         <div className="font-medium">{m.display_name || 'Sin nombre'}</div>
                         <div className="text-xs text-muted-foreground">{m.email}</div>
                       </td>
                       <td className="py-3 pr-4 font-semibold">
                         {memberBalance > 0 ? '+' : ''}{memberBalance.toFixed(2)} €
                       </td>
                       <td className="py-3">
                         {memberIsSaldado ? (
                           <span className="text-green-600 font-medium">✓ Saldado</span>
                         ) : memberCredit > 0 ? (
                           <span className="text-blue-600 font-medium">A favor</span>
                         ) : (
                           <span className="text-red-600 font-medium">Deuda</span>
                         )}
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
         </section>
       )}

      {/* ========== ESTADO DEL MIEMBRO ========== */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Tu situación</h2>

        {isSaldado ? (
          <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4">
            <p className="text-green-800 dark:text-green-200 font-medium">✓ Saldado</p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">No tienes crédito ni deuda pendiente.</p>
          </div>
        ) : credit > 0 ? (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
            <p className="text-blue-800 dark:text-blue-200 font-medium">✓ Saldo a tu favor</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-2">+{credit.toFixed(2)} €</p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              El hogar te debe este importe. Puedes solicitar un reembolso.
            </p>
          </div>
        ) : debt > 0 ? (
          <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-red-800 dark:text-red-200 font-medium">⚠ Deuda pendiente</p>
            <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-2">-{debt.toFixed(2)} €</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              Debes abonar este importe al hogar.
            </p>
          </div>
        ) : null}

        {totalDebt > 0 && (
          <div className="mt-3 text-sm text-muted-foreground">
            <p>Deuda total (incluyendo préstamos): <span className="font-medium">{totalDebt.toFixed(2)} €</span></p>
          </div>
        )}
      </section>

      {/* ========== REEMBOLSOS ========== */}
      {credit > 0 && (
        <section className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Solicitar reembolso</h2>
          <p className="text-sm text-muted-foreground">
            Tienes {credit.toFixed(2)} € a tu favor. Solicita recuperar todo o parte de ese importe.
          </p>
          <RefundRequestForm credit={credit} />
        </section>
      )}

      {/* ========== PRÉSTAMOS ACTIVOS ========== */}
      {activeLoans.length > 0 && (
        <section className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Préstamos activos</h2>
          <p className="text-sm text-muted-foreground">
            {isOwner ? 'Préstamos aprobados en el hogar.' : 'Tus préstamos activos.'}
          </p>
          <ActiveLoansTable loans={activeLoans} isOwner={isOwner} currentUserId={user.profile_id} />
        </section>
      )}

      {/* ========== SOLICITAR PRÉSTAMO ========== */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Solicitar préstamo</h2>
        <p className="text-sm text-muted-foreground">
          Pide un préstamo al hogar. Se convertirá en deuda una vez aprobado.
        </p>
        <LoanRequestForm />
      </section>

      {/* ========== OWNER: PRÉSTAMOS PENDIENTES ========== */}
      {isOwner && pendingLoans.length > 0 && (
        <section className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Préstamos pendientes de aprobar</h2>
          <PendingLoansTable loans={pendingLoans} />
        </section>
      )}

      {/* ========== OWNER: REEMBOLSOS PENDIENTES ========== */}
      {isOwner && pendingRefunds.length > 0 && (
        <section className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Reembolsos pendientes de aprobar</h2>
          <PendingRefundsTable refunds={pendingRefunds} />
        </section>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTES DE FORMULARIO
// ============================================================

function RefundRequestForm({ credit }: { credit: number }) {
  async function action(formData: FormData) {
    'use server';
    const amount = Number(formData.get('amount'));
    const notes = String(formData.get('notes') || '');
    await requestCreditRefund(amount, notes);
    revalidatePath('/sickness/credito-deuda');
  }

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Importe (€)</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min={0.01}
            max={credit}
            defaultValue={credit}
            className="w-full rounded-md border px-3 py-2 bg-background"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-1">Notas (opcional)</label>
          <input
            name="notes"
            type="text"
            className="w-full rounded-md border px-3 py-2 bg-background"
            placeholder="Motivo del reembolso"
          />
        </div>
      </div>
      <button type="submit" className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-medium hover:bg-primary/90">
        Solicitar reembolso
      </button>
    </form>
  );
}

function LoanRequestForm() {
  async function action(formData: FormData) {
    'use server';
    const amount = Number(formData.get('amount'));
    const notes = String(formData.get('notes') || '');
    await requestPersonalLoan(amount, notes);
    revalidatePath('/sickness/credito-deuda');
  }

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Importe (€)</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            className="w-full rounded-md border px-3 py-2 bg-background"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-1">Motivo</label>
          <input
            name="notes"
            type="text"
            className="w-full rounded-md border px-3 py-2 bg-background"
            placeholder="¿Para qué necesitas el préstamo?"
            required
          />
        </div>
      </div>
      <button type="submit" className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-medium hover:bg-primary/90">
        Solicitar préstamo
      </button>
    </form>
  );
}

// ============================================================
// TABLAS
// ============================================================

function ActiveLoansTable({
  loans,
  isOwner,
  currentUserId,
}: {
  loans: Array<{
    id: string;
    profile_id: string;
    email: string;
    display_name: string | null;
    amount: number;
    approved_at: string;
    notes: string | null;
  }>;
  isOwner: boolean;
  currentUserId: string;
}) {
  async function repay(loanId: string, formData: FormData) {
    'use server';
    const amount = Number(formData.get('amount'));
    const notes = String(formData.get('notes') || '');
    await repayLoan(loanId, amount, notes);
    revalidatePath('/sickness/credito-deuda');
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr className="text-left text-muted-foreground">
            {isOwner && <th className="py-2 pr-4">Miembro</th>}
            <th className="py-2 pr-4">Importe</th>
            <th className="py-2 pr-4">Fecha aprobación</th>
            <th className="py-2 pr-4">Notas</th>
            <th className="py-2">Saldar</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => {
            const canRepay = isOwner || loan.profile_id === currentUserId;
            return (
              <tr key={loan.id} className="border-b last:border-0">
                {isOwner && (
                  <td className="py-3 pr-4">
                    <div className="font-medium">{loan.display_name || 'Sin nombre'}</div>
                    <div className="text-xs text-muted-foreground">{loan.email}</div>
                  </td>
                )}
                <td className="py-3 pr-4 font-semibold">{loan.amount.toFixed(2)} €</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {new Date(loan.approved_at).toLocaleDateString('es-ES')}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{loan.notes || '—'}</td>
                <td className="py-3">
                  {canRepay ? (
                    <form action={(fd) => repay(loan.id, fd)} className="flex gap-2 items-center">
                      <input
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={loan.amount}
                        defaultValue={loan.amount}
                        className="w-24 rounded border px-2 py-1 text-xs bg-background"
                        required
                      />
                      <input name="notes" type="hidden" value="Pago de préstamo" />
                      <button
                        type="submit"
                        className="rounded bg-green-600 text-white px-3 py-1 text-xs font-medium hover:bg-green-700"
                      >
                        Pagar
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PendingLoansTable({
  loans,
}: {
  loans: Array<{
    id: string;
    display_name: string | null;
    email: string;
    amount: number;
    notes: string;
    requested_at: string;
  }>;
}) {
  async function approve(id: string) {
    'use server';
    await approvePersonalLoan(id);
    revalidatePath('/sickness/credito-deuda');
  }

  async function reject(id: string) {
    'use server';
    await rejectPersonalLoan(id);
    revalidatePath('/sickness/credito-deuda');
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr className="text-left text-muted-foreground">
            <th className="py-2 pr-4">Miembro</th>
            <th className="py-2 pr-4">Importe</th>
            <th className="py-2 pr-4">Motivo</th>
            <th className="py-2 pr-4">Solicitado</th>
            <th className="py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.id} className="border-b last:border-0">
              <td className="py-3 pr-4">
                <div className="font-medium">{loan.display_name || 'Sin nombre'}</div>
                <div className="text-xs text-muted-foreground">{loan.email}</div>
              </td>
              <td className="py-3 pr-4 font-semibold">{loan.amount.toFixed(2)} €</td>
              <td className="py-3 pr-4 text-muted-foreground">{loan.notes}</td>
              <td className="py-3 pr-4 text-muted-foreground">
                {new Date(loan.requested_at).toLocaleString('es-ES')}
              </td>
              <td className="py-3">
                <div className="flex gap-2">
                  <form action={async () => approve(loan.id)}>
                    <button className="rounded bg-green-600 text-white px-3 py-1 text-xs font-medium hover:bg-green-700">
                      Aprobar
                    </button>
                  </form>
                  <form action={async () => reject(loan.id)}>
                    <button className="rounded bg-red-600 text-white px-3 py-1 text-xs font-medium hover:bg-red-700">
                      Rechazar
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PendingRefundsTable({
  refunds,
}: {
  refunds: Array<{
    id: string;
    display_name: string | null;
    email: string;
    amount: number;
    notes: string | null;
    requested_at: string;
  }>;
}) {
  async function approve(id: string) {
    'use server';
    await approveCreditRefund(id);
    revalidatePath('/sickness/credito-deuda');
  }

  async function reject(id: string) {
    'use server';
    await rejectCreditRefund(id);
    revalidatePath('/sickness/credito-deuda');
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr className="text-left text-muted-foreground">
            <th className="py-2 pr-4">Miembro</th>
            <th className="py-2 pr-4">Importe</th>
            <th className="py-2 pr-4">Notas</th>
            <th className="py-2 pr-4">Solicitado</th>
            <th className="py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {refunds.map((refund) => (
            <tr key={refund.id} className="border-b last:border-0">
              <td className="py-3 pr-4">
                <div className="font-medium">{refund.display_name || 'Sin nombre'}</div>
                <div className="text-xs text-muted-foreground">{refund.email}</div>
              </td>
              <td className="py-3 pr-4 font-semibold">{refund.amount.toFixed(2)} €</td>
              <td className="py-3 pr-4 text-muted-foreground">{refund.notes || '—'}</td>
              <td className="py-3 pr-4 text-muted-foreground">
                {new Date(refund.requested_at).toLocaleString('es-ES')}
              </td>
              <td className="py-3">
                <div className="flex gap-2">
                  <form action={async () => approve(refund.id)}>
                    <button className="rounded bg-green-600 text-white px-3 py-1 text-xs font-medium hover:bg-green-700">
                      Aprobar
                    </button>
                  </form>
                  <form action={async () => reject(refund.id)}>
                    <button className="rounded bg-red-600 text-white px-3 py-1 text-xs font-medium hover:bg-red-700">
                      Rechazar
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
