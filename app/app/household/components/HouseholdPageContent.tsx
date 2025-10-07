'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HouseholdPageContentProps {
  userIsOwner: boolean;
  overviewTab: React.ReactNode;
  contributionsTab: React.ReactNode;
  categoriesTab: React.ReactNode;
  membersTab: React.ReactNode;
  settingsTab: React.ReactNode;
  dangerTab?: React.ReactNode;
}

export function HouseholdPageContent({
  userIsOwner,
  overviewTab,
  contributionsTab,
  categoriesTab,
  membersTab,
  settingsTab,
  dangerTab,
}: HouseholdPageContentProps) {
  // ⭐ Estado de pestaña activa con persistencia
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Restaurar desde sessionStorage al montar
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('household-active-tab') || 'overview';
    }
    return 'overview';
  });

  // ⭐ Guardar estado de pestaña cuando cambia
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('household-active-tab', activeTab);
    }
  }, [activeTab]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="overview">Resumen</TabsTrigger>
        <TabsTrigger value="contributions">Contribuciones</TabsTrigger>
        <TabsTrigger value="categories">Categorías</TabsTrigger>
        <TabsTrigger value="members">Miembros</TabsTrigger>
        <TabsTrigger value="settings">Configuración</TabsTrigger>
        {userIsOwner && <TabsTrigger value="danger">⚠️ Peligroso</TabsTrigger>}
      </TabsList>

      <TabsContent value="overview" className="space-y-6 mt-6">
        {overviewTab}
      </TabsContent>

      <TabsContent value="contributions" className="space-y-6 mt-6">
        {contributionsTab}
      </TabsContent>

      <TabsContent value="categories" className="space-y-6 mt-6">
        {categoriesTab}
      </TabsContent>

      <TabsContent value="members" className="space-y-6 mt-6">
        {membersTab}
      </TabsContent>

      <TabsContent value="settings" className="space-y-6 mt-6">
        {settingsTab}
      </TabsContent>

      {userIsOwner && dangerTab && (
        <TabsContent value="danger" className="space-y-6 mt-6">
          {dangerTab}
        </TabsContent>
      )}
    </Tabs>
  );
}
