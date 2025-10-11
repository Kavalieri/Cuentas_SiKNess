'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Home } from 'lucide-react';
import { GeneralTab } from './GeneralTab';
import { HouseholdsManagement } from './HouseholdsManagement';

interface SettingsTabsProps {
  user: {
    email: string;
    profile_id: string;
  };
  households: Array<{
    id: string;
    name: string;
    role: 'owner' | 'member';
    is_active?: boolean;
    member_count?: number;
    owner_count?: number;
  }>;
  activeHouseholdId: string | null;
}

export function SettingsTabs({ user, households, activeHouseholdId }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="general" className="gap-2">
          <User className="h-4 w-4" />
          General
        </TabsTrigger>
        <TabsTrigger value="households" className="gap-2">
          <Home className="h-4 w-4" />
          Gestión de Hogares
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <GeneralTab user={user} />
      </TabsContent>

      <TabsContent value="households" className="space-y-4">
        <HouseholdsManagement
          households={households}
          activeHouseholdId={activeHouseholdId || ''}
          userId={user.profile_id}
        />
      </TabsContent>
    </Tabs>
  );
}
