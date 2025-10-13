'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Home, User } from 'lucide-react';
import { GeneralTab } from './GeneralTab';
import { HouseholdsManagement } from './HouseholdsManagement';
import { PeriodsTab } from './PeriodsTab';

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
      <TabsList className="grid w-full max-w-2xl grid-cols-3">
        <TabsTrigger value="general" className="gap-2">
          <User className="h-4 w-4" />
          General
        </TabsTrigger>
        <TabsTrigger value="households" className="gap-2">
          <Home className="h-4 w-4" />
          Gestión de Hogares
        </TabsTrigger>
        <TabsTrigger value="periods" className="gap-2">
          <Calendar className="h-4 w-4" />
          Períodos
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

      <TabsContent value="periods" className="space-y-4">
        <PeriodsTab userId={user.profile_id} />
      </TabsContent>
    </Tabs>
  );
}
