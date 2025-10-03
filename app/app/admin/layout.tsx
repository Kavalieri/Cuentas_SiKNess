import { redirect } from 'next/navigation';
import { isSystemAdmin } from '@/lib/adminCheck';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userIsSystemAdmin = await isSystemAdmin();

  if (!userIsSystemAdmin) {
    redirect('/app');
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">Administración del Sistema</h1>
        <p className="text-muted-foreground mt-1">
          Backend de gestión global - Solo administradores del sistema
        </p>
      </div>
      {children}
    </div>
  );
}
