import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusTab } from './components/StatusTab';
import { ConfigurationTab } from './components/ConfigurationTab';
import { HistoryTab } from './components/HistoryTab';
import { getCurrentHouseholdId } from '@/lib/adminCheck';
import { redirect } from 'next/navigation';

export default async function ContributionsPage() {
  const householdId = await getCurrentHouseholdId();

  if (!householdId) {
    redirect('/app/settings?error=no-household');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">💰 Contribuciones</h1>
        <p className="text-muted-foreground mt-1">
          Sistema de contribuciones proporcionales basado en ingresos
        </p>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">Estado Actual</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6 mt-6">
          <StatusTab householdId={householdId} />
        </TabsContent>

        <TabsContent value="config" className="space-y-6 mt-6">
          <ConfigurationTab householdId={householdId} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-6">
          <HistoryTab householdId={householdId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
