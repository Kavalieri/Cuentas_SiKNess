'use client';

/**
 * Formulario para crear transacciones dual-flow
 * Con validación en tiempo real y auto-completado inteligente
 */

import { createDualFlowTransactionAction } from '@/app/dual-flow/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/format';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  DollarSign,
  Receipt,
  Settings,
  Tag,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface CreateTransactionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultType?: 'gasto' | 'gasto_directo' | 'ingreso' | 'ingreso_directo';
}

const CATEGORIAS = [
  'Alimentación',
  'Transporte',
  'Servicios',
  'Salud',
  'Entretenimiento',
  'Ropa',
  'Casa',
  'Educación',
  'Otros',
];

const TIPO_LABELS = {
  gasto: 'Gasto Común',
  gasto_directo: 'Gasto Personal (out-of-pocket)',
  ingreso: 'Ingreso al Fondo Común',
  ingreso_directo: 'Reembolso Personal',
};

const TIPO_DESCRIPTIONS = {
  gasto: 'Se paga directamente del fondo común compartido',
  gasto_directo: 'Lo pagaste tú y necesitas reembolso del fondo común',
  ingreso: 'Dinero que entra al fondo común (salario, etc.)',
  ingreso_directo: 'Reembolso que recibes del fondo común',
};

export function CreateTransactionForm({
  onSuccess,
  onCancel,
  defaultType = 'gasto_directo',
}: CreateTransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    message?: string;
    fieldErrors?: Record<string, string[]>;
  } | null>(null);

  // Estado del formulario
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [importe, setImporte] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState(defaultType);
  const [requiereAprobacion, setRequiereAprobacion] = useState(false);
  const [umbralEmparejamiento, setUmbralEmparejamiento] = useState([5]);

  // Validación en tiempo real
  const isValid =
    concepto.length >= 3 &&
    categoria.length >= 2 &&
    parseFloat(importe) > 0 &&
    fecha &&
    fecha.match(/^\d{4}-\d{2}-\d{2}$/);

  // Determinar si puede ser auto-paired
  const canAutoPair = tipo === 'gasto_directo' || tipo === 'ingreso_directo';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const formData = new FormData();
    formData.append('concepto', concepto);
    formData.append('categoria', categoria);
    formData.append('importe', importe);
    formData.append('fecha', fecha || '');
    formData.append('tipo', tipo);
    formData.append('requiere_aprobacion', requiereAprobacion.toString());
    formData.append('umbral_emparejamiento', (umbralEmparejamiento[0] || 5).toString());

    startTransition(async () => {
      const result = await createDualFlowTransactionAction(formData);
      setResult(result);

      if (result.ok) {
        // Limpiar formulario
        setConcepto('');
        setCategoria('');
        setImporte('');
        setFecha(new Date().toISOString().split('T')[0]);
        setRequiereAprobacion(false);
        setUmbralEmparejamiento([5]);

        // Callbacks
        onSuccess?.();

        // Actualizar la página
        router.refresh();
      }
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Crear Transacción Dual-Flow
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Sistema integrado: gastos comunes + gastos personales con auto-pairing
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Transacción */}
          <div className="space-y-2">
            <Label htmlFor="tipo" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tipo de Transacción
            </Label>
            <Select value={tipo} onValueChange={(value) => setTipo(value as typeof tipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex flex-col items-start">
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {TIPO_DESCRIPTIONS[value as keyof typeof TIPO_DESCRIPTIONS]}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Indicador de auto-pairing */}
            {canAutoPair && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <div className="text-sm text-blue-800">
                  Esta transacción puede emparejarse automáticamente
                </div>
              </div>
            )}
          </div>

          {/* Concepto */}
          <div className="space-y-2">
            <Label htmlFor="concepto" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Concepto
            </Label>
            <Input
              id="concepto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Supermercado Carrefour, Luz - Diciembre..."
              className={concepto.length > 0 && concepto.length < 3 ? 'border-red-500' : ''}
            />
            {concepto.length > 0 && concepto.length < 3 && (
              <div className="text-xs text-red-600">Mínimo 3 caracteres</div>
            )}
          </div>

          {/* Categoría e Importe en Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categoría
              </Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="importe" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Importe
              </Label>
              <div className="relative">
                <Input
                  id="importe"
                  type="number"
                  step="0.01"
                  min="0"
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  placeholder="0.00"
                  className="pr-8"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                  €
                </div>
              </div>
              {importe && parseFloat(importe) > 0 && (
                <div className="text-xs text-green-600">{formatCurrency(parseFloat(importe))}</div>
              )}
            </div>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="fecha" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fecha
            </Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          {/* Configuración Avanzada - Solo para tipos que pueden auto-pair */}
          {canAutoPair && (
            <Card className="bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuración de Auto-Pairing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Umbral de Emparejamiento */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Umbral de diferencia</Label>
                    <Badge variant="outline">±{formatCurrency(umbralEmparejamiento[0] || 5)}</Badge>
                  </div>
                  <Slider
                    value={umbralEmparejamiento}
                    onValueChange={setUmbralEmparejamiento}
                    max={50}
                    min={0}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground">
                    Las transacciones con diferencia menor a este importe se emparejarán
                    automáticamente
                  </div>
                </div>

                {/* Requiere Aprobación */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm">Requiere aprobación manual</Label>
                    <div className="text-xs text-muted-foreground">
                      Si está activado, no se emparejará automáticamente
                    </div>
                  </div>
                  <Switch checked={requiereAprobacion} onCheckedChange={setRequiereAprobacion} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultado y Errores */}
          {result && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 ${
                result.ok
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              } border`}
            >
              {result.ok ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <div>
                {result.ok
                  ? 'Transacción creada correctamente'
                  : result.message || 'Error al crear la transacción'}
              </div>
            </div>
          )}

          {/* Errores de campos específicos */}
          {result && !result.ok && result.fieldErrors && (
            <div className="space-y-1">
              {Object.entries(result.fieldErrors).map(([field, errors]) => (
                <div key={field} className="text-xs text-red-600">
                  <strong>{field}:</strong>{' '}
                  {Array.isArray(errors) ? errors.join(', ') : String(errors)}
                </div>
              ))}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={!isValid || isPending} className="flex-1 gap-2">
              {isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creando...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Crear Transacción
                </>
              )}
            </Button>

            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
