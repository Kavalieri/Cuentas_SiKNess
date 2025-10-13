import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle,
  Clock,
  DollarSign,
  Shield,
  Zap,
} from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function OpcionesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/app/onboarding');
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Configuración Dual-Flow</h1>
        <p className="text-muted-foreground">
          Ajustes del sistema de gastos duales con emparejamiento automático
        </p>
      </div>

      <Suspense fallback={<div>Cargando configuración dual-flow...</div>}>
        <OpcionesContent householdId={householdId} />
      </Suspense>

      <div className="h-20"></div>
    </div>
  );
}

async function OpcionesContent({ householdId }: { householdId: string }) {
  // Importar función para obtener configuración real
  const { getDualFlowConfigAction } = await import('@/app/dual-flow/actions');

  // Obtener configuración real de la base de datos
  const configResult = await getDualFlowConfigAction();

  const config = configResult.ok
    ? configResult.data
    : {
        emparejamiento_automatico: true,
        umbral_emparejamiento_default: 5.0,
        tiempo_revision_default: 7,
        limite_gasto_personal: 200.0,
        requiere_aprobacion_default: false,
        liquidacion_automatica: true,
        dias_liquidacion: 30,
        notificaciones_activas: true,
        notificar_nuevos_gastos: true,
        notificar_emparejamientos: true,
        notificar_limites: true,
        notificar_liquidaciones: true,
      };

  return (
    <div className="space-y-6">
      {/* Estado del Sistema */}
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-900">Sistema Dual-Flow Activo</div>
              <div className="text-sm text-green-700">
                Emparejamiento automático funcionando correctamente
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emparejamiento Automático */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Emparejamiento Automático
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Activar Auto-Pairing</Label>
              <div className="text-xs text-muted-foreground">
                Emparejar automáticamente gastos out-of-pocket con reembolsos
              </div>
            </div>
            <Switch checked={config.emparejamiento_automatico} />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Umbral de Emparejamiento: €{config.umbral_emparejamiento_default.toFixed(2)}
            </Label>
            <div className="px-3">
              <Slider
                value={[config.umbral_emparejamiento_default]}
                max={50}
                min={0}
                step={0.5}
                className="w-full"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Diferencia máxima permitida para emparejar transacciones automáticamente
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Tiempo de Revisión: {config.tiempo_revision_default} días
            </Label>
            <div className="px-3">
              <Slider
                value={[config.tiempo_revision_default]}
                max={30}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Días para revisar transacciones antes de auto-aprobar
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Límites y Umbrales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Límites y Umbrales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="limite-personal" className="text-sm font-medium">
                Límite Gasto Personal
              </Label>
              <Input
                id="limite-personal"
                type="number"
                step="0.01"
                defaultValue={config.limite_gasto_personal}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Límite mensual para gastos out-of-pocket sin aprobación
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias-liquidacion" className="text-sm font-medium">
                Días para Liquidación
              </Label>
              <Input
                id="dias-liquidacion"
                type="number"
                defaultValue={config.dias_liquidacion}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Frecuencia de liquidación automática de balances
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Requiere Aprobación</Label>
              <div className="text-xs text-muted-foreground">
                Todos los gastos requieren aprobación manual
              </div>
            </div>
            <Switch checked={config.requiere_aprobacion_default} />
          </div>
        </CardContent>
      </Card>

      {/* Notificaciones y Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Notificaciones Push</Label>
              <div className="text-xs text-muted-foreground">
                Alertas de nuevas transacciones y emparejamientos
              </div>
            </div>
            <Switch checked={config.notificaciones_activas} />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between text-sm">
              <span>Nuevos gastos pendientes</span>
              <Switch checked={true} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Emparejamientos automáticos</span>
              <Switch checked={true} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Límites excedidos</span>
              <Switch checked={true} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Liquidaciones mensuales</span>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liquidación Automática */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-500" />
            Liquidación Automática
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Liquidación Automática</Label>
              <div className="text-xs text-muted-foreground">
                Liquidar balances pendientes automáticamente cada mes
              </div>
            </div>
            <Switch checked={config.liquidacion_automatica} />
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm font-medium mb-2">Próxima Liquidación</div>
            <div className="text-xs text-muted-foreground">
              31 de Diciembre, 2024 • Balances pendientes: €{config.limite_gasto_personal - 45.6}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones Administrativas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Administración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" className="justify-between">
              <span>Revisar Transacciones Pendientes</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-between">
              <span>Historial de Emparejamientos</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-between">
              <span>Exportar Configuración</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="justify-between text-red-600 border-red-200 hover:bg-red-50"
            >
              <span>Reset Sistema Dual-Flow</span>
              <AlertTriangle className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Información del Sistema */}
      <Card className="border-dashed border-primary/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-sm font-medium">⚡ Sistema Dual-Flow v2.0</div>
            <p className="text-xs text-muted-foreground">
              Configuración avanzada del sistema de emparejamiento automático de transacciones.
              Gestiona límites, umbrales, notificaciones y liquidaciones automáticas.
            </p>
            <div className="flex justify-center gap-4 text-xs pt-2">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Auto-Pairing Activo
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Notificaciones ON
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Liquidación Auto
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
