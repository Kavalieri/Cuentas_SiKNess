'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Users } from 'lucide-react';

interface Household {
  id: string;
  name: string;
  role: 'owner' | 'member';
  created_at: string | null;
}

interface HouseholdsListProps {
  households: Household[];
  activeHouseholdId: string | null;
}

export function HouseholdsList({ households, activeHouseholdId }: HouseholdsListProps) {
  if (households.length === 0) {
    return (
      <Card className="bg-muted">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            No perteneces a ningún hogar todavía. Crea uno o acepta una invitación.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {households.map((household) => (
        <Card
          key={household.id}
          className={
            household.id === activeHouseholdId
              ? 'border-primary bg-primary/5'
              : ''
          }
        >
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {/* Icono según rol */}
                <div
                  className={`p-2 rounded-lg ${
                    household.role === 'owner'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {household.role === 'owner' ? (
                    <Crown className="h-5 w-5" />
                  ) : (
                    <Users className="h-5 w-5" />
                  )}
                </div>

                {/* Info del hogar */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{household.name}</h3>
                    {household.id === activeHouseholdId && (
                      <Badge variant="outline" className="text-xs">
                        Activo
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {household.role === 'owner' ? 'Propietario' : 'Miembro'}
                    </span>
                    {household.created_at && (
                      <>
                        <span>•</span>
                        <span>
                          Desde{' '}
                          {new Date(household.created_at).toLocaleDateString(
                            'es-ES',
                            {
                              year: 'numeric',
                              month: 'short',
                            }
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
