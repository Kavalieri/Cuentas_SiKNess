export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabaseServer } from '@/lib/supabaseServer';
import { formatDate } from '@/lib/format';
import { Home, Users, Calendar, TrendingDown } from 'lucide-react';

// Tipos para las queries
interface HouseholdMember {
  profile_id: string;
  role: string;
}

interface Household {
  id: string;
  name: string;
  created_at: string;
  household_members?: HouseholdMember[];
}

export default async function HouseholdsPage() {
  const supabase = await supabaseServer();

  // Obtener todos los hogares con contadores
  const { data: households, error } = await supabase.from('households').select(`
      id,
      name,
      created_at,
      household_members (
        profile_id,
        role
      )
    `).order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="text-destructive">
        Error al cargar hogares: {error.message}
      </div>
    );
  }

  // Para cada hogar, obtener estadísticas adicionales
  const householdsWithStats = await Promise.all(
    ((households as unknown as Household[]) ?? []).map(async (household) => {
      const [movementsResult, categoriesResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('household_id', household.id),
        supabase
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .eq('household_id', household.id),
      ]);

      return {
        ...household,
        stats: {
          members: household.household_members?.length ?? 0,
          transactions: movementsResult.count ?? 0,
          categories: categoriesResult.count ?? 0,
          owners: household.household_members?.filter((m) => m.role === 'owner').length ?? 0,
        },
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Home className="h-8 w-8" />
            Hogares del Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Listado completo de todos los hogares registrados
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {householdsWithStats.length} hogares
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {householdsWithStats.map((household) => (
          <Card key={household.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{household.name}</span>
                {household.stats.owners > 0 && (
                  <Badge variant="secondary">{household.stats.owners} owner(s)</Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs">
                <Calendar className="h-3 w-3" />
                {household.created_at ? formatDate(new Date(household.created_at)) : 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    Miembros
                  </div>
                  <div className="text-xl font-bold">{household.stats.members}</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <TrendingDown className="h-3 w-3" />
                    Transacciones
                  </div>
                  <div className="text-xl font-bold">{household.stats.transactions}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Categorías</div>
                  <div className="text-xl font-bold">{household.stats.categories}</div>
                </div>
              </div>

              {/* ID del hogar */}
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono truncate">
                {household.id}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {householdsWithStats.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Home className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No hay hogares registrados en el sistema</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
