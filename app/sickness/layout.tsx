import { SiKnessProvider } from '@/contexts/SiKnessContext';
import { SiKnessTopbar } from './_components/SiKnessTopbar';

export default function SiKnessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiKnessProvider>
      <div className="flex min-h-screen flex-col">
        <SiKnessTopbar />
        <main className="flex-1 container mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </SiKnessProvider>
  );
}
