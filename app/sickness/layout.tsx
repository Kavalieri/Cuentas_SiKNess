import { SiKnessProvider } from '@/contexts/SiKnessContext';
import { getPendingLoansCount } from '@/lib/loans/counts';
import { SiKnessTopbar } from './_components/SiKnessTopbar';

export const dynamic = 'force-dynamic';

export default async function SiKnessLayout({ children }: { children: React.ReactNode }) {
  const pendingLoansCount = await getPendingLoansCount();

  return (
    <SiKnessProvider>
      <div className="flex min-h-screen flex-col">
        <SiKnessTopbar pendingLoansCount={pendingLoansCount} />
        <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
      </div>
    </SiKnessProvider>
  );
}
