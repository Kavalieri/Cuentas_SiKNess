import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const activeHousehold = await getUserHouseholdId();
  if (activeHousehold) {
    redirect('/sickness');
  }

  return <>{children}</>;
}
