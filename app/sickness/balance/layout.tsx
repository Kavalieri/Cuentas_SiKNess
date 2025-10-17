import { getUserHouseholdId } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function BalanceSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/sickness/onboarding');
  }
  return <>{children}</>;
}
