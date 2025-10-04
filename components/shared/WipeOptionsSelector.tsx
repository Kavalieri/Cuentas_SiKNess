'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Shield } from 'lucide-react';

export interface WipeOptions {
  transactions: boolean;
  contributions: boolean;
  adjustments: boolean;
  categories: boolean;
  memberIncomes: boolean;
  householdSettings: boolean;
  households?: boolean; // Solo para wipe global
}

interface WipeOptionsSelectorProps {
  options: WipeOptions;
  onChange: (options: WipeOptions) => void;
  showHouseholdsOption?: boolean; // Si true, muestra opción de eliminar hogares
  disabled?: boolean;
}

export function WipeOptionsSelector({ 
  options, 
  onChange, 
  showHouseholdsOption = false,
  disabled = false 
}: WipeOptionsSelectorProps) {
  
  const toggleOption = (key: keyof WipeOptions) => {
    onChange({ ...options, [key]: !options[key] });
  };

  const selectAll = () => {
    onChange({
      transactions: true,
      contributions: true,
      adjustments: true,
      categories: true,
      memberIncomes: true,
      householdSettings: true,
      ...(showHouseholdsOption ? { households: true } : {}),
    });
  };

  const selectNone = () => {
    onChange({
      transactions: false,
      contributions: false,
      adjustments: false,
      categories: false,
      memberIncomes: false,
      householdSettings: false,
      ...(showHouseholdsOption ? { households: false } : {}),
    });
  };

  const allSelected = Object.values(options).every(v => v === true);
  const noneSelected = Object.values(options).every(v => v === false);

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          Selecciona qué elementos eliminar
        </CardTitle>
        <CardDescription>
          Marca los elementos que deseas eliminar permanentemente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botones de selección rápida */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            disabled={disabled || allSelected}
            className="text-xs px-3 py-1 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-50"
          >
            Seleccionar todo
          </button>
          <button
            type="button"
            onClick={selectNone}
            disabled={disabled || noneSelected}
            className="text-xs px-3 py-1 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-50"
          >
            Deseleccionar todo
          </button>
        </div>

        {/* Lista de opciones */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="transactions"
              checked={options.transactions}
              onCheckedChange={() => toggleOption('transactions')}
              disabled={disabled}
            />
            <Label
              htmlFor="transactions"
              className="text-sm font-normal cursor-pointer"
            >
              Movimientos (transacciones de gastos e ingresos)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="contributions"
              checked={options.contributions}
              onCheckedChange={() => toggleOption('contributions')}
              disabled={disabled}
            />
            <Label
              htmlFor="contributions"
              className="text-sm font-normal cursor-pointer"
            >
              Contribuciones (historial de contribuciones mensuales)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="adjustments"
              checked={options.adjustments}
              onCheckedChange={() => toggleOption('adjustments')}
              disabled={disabled}
            />
            <Label
              htmlFor="adjustments"
              className="text-sm font-normal cursor-pointer"
            >
              Ajustes (pre-pagos y ajustes manuales a contribuciones)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="categories"
              checked={options.categories}
              onCheckedChange={() => toggleOption('categories')}
              disabled={disabled}
            />
            <Label
              htmlFor="categories"
              className="text-sm font-normal cursor-pointer"
            >
              Categorías personalizadas (se recrearán las por defecto)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="memberIncomes"
              checked={options.memberIncomes}
              onCheckedChange={() => toggleOption('memberIncomes')}
              disabled={disabled}
            />
            <Label
              htmlFor="memberIncomes"
              className="text-sm font-normal cursor-pointer"
            >
              Ingresos de miembros (configuración mensual de ingresos)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="householdSettings"
              checked={options.householdSettings}
              onCheckedChange={() => toggleOption('householdSettings')}
              disabled={disabled}
            />
            <Label
              htmlFor="householdSettings"
              className="text-sm font-normal cursor-pointer"
            >
              Configuración del hogar (meta mensual, tipo de cálculo)
            </Label>
          </div>

          {showHouseholdsOption && options.households !== undefined && (
            <div className="pt-2 border-t border-destructive/50">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="households"
                  checked={options.households}
                  onCheckedChange={() => toggleOption('households')}
                  disabled={disabled}
                />
                <Label
                  htmlFor="households"
                  className="text-sm font-semibold cursor-pointer text-destructive"
                >
                  ⚠️ Eliminar hogar(es) completamente (incluye miembros)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6 mt-1">
                Si seleccionas esto, se eliminarán los hogares y sus miembros. Los usuarios podrán crear nuevos hogares.
              </p>
            </div>
          )}
        </div>

        {/* Info sobre lo que se preserva */}
        <Card className="border-green-500 bg-green-50 dark:bg-green-950 mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
              Siempre se preservan (NO se eliminan)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-xs text-green-800 dark:text-green-200">
              <li><strong>Usuarios</strong> - Cuentas de Supabase Auth</li>
              <li><strong>Profiles</strong> - Perfiles de usuario</li>
              <li><strong>System Admins</strong> - Administradores permanentes</li>
              {!showHouseholdsOption && (
                <>
                  <li><strong>Hogares</strong> - Estructura de hogares</li>
                  <li><strong>Miembros</strong> - Membresías de hogares</li>
                </>
              )}
              {!options.households && showHouseholdsOption && (
                <>
                  <li><strong>Hogares</strong> - Estructura de hogares (si no se marca la opción)</li>
                  <li><strong>Miembros</strong> - Membresías de hogares (si no se marca la opción)</li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
