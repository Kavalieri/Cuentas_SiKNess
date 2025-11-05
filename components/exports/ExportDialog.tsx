/**
 * EXPORT DIALOG - Dialog para seleccionar formato y opciones de exportación
 * 
 * Permite al usuario:
 * - Seleccionar formato (PDF, CSV, Excel)
 * - Elegir período (mes/año)
 * - Configurar qué incluir (balance, transacciones, contribuciones, ahorro)
 * 
 * Al confirmar, obtiene datos del servidor y genera el archivo client-side
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { FileText, Table, FileSpreadsheet, Loader2, Download } from 'lucide-react';
import { getExportData } from '@/lib/export/actions';
import { generateMonthlyPDF } from '@/lib/export/pdf-generator';
import { generateFullCSV } from '@/lib/export/csv-generator';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultYear: number;
  defaultMonth: number;
}

export function ExportDialog({
  open,
  onOpenChange,
  defaultYear,
  defaultMonth
}: ExportDialogProps) {
  const [format, setFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf');
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [includeBalance, setIncludeBalance] = useState(true);
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [includeContributions, setIncludeContributions] = useState(true);
  const [includeSavings, setIncludeSavings] = useState(true);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      // 1. Obtener datos del servidor
      const result = await getExportData({
        householdId: '', // No necesario, se obtiene en el server action
        year,
        month,
        includeBalance,
        includeTransactions,
        includeContributions,
        includeSavings
      });
      
      if (!result.ok) {
        toast.error(result.message || 'Error al obtener datos');
        return;
      }
      
      if (!result.data) {
        toast.error('No se obtuvieron datos para exportar');
        return;
      }
      
      const data = result.data;
      
      // 2. Generar archivo según formato
      let blob: Blob;
      let filename: string;
      
      if (format === 'pdf') {
        blob = await generateMonthlyPDF(data);
        filename = `CuentasSiK_${sanitizeFilename(data.householdName)}_${year}-${month.toString().padStart(2, '0')}.pdf`;
      } else if (format === 'csv') {
        blob = generateFullCSV(data);
        filename = `CuentasSiK_${sanitizeFilename(data.householdName)}_${year}-${month.toString().padStart(2, '0')}.csv`;
      } else {
        // TODO: Implementar Excel generator (FASE 5)
        toast.error('Exportación Excel disponible próximamente');
        return;
      }
      
      // 3. Descargar archivo
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Archivo ${format.toUpperCase()} generado exitosamente`);
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error generando exportación:', error);
      toast.error('Error al generar archivo. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>📥 Exportar Datos</DialogTitle>
          <DialogDescription>
            Selecciona el formato y período para exportar
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Formato */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Formato</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'pdf' | 'csv' | 'excel')}>
              <div className="flex items-start space-x-3 p-3 border-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <RadioGroupItem value="pdf" id="pdf" className="mt-1" />
                <Label htmlFor="pdf" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="font-bold">PDF - Resumen Mensual</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Reporte ejecutivo de 1-2 páginas con gráficos y tablas
                  </p>
                </Label>
              </div>
              
              <div className="flex items-start space-x-3 p-3 border-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <RadioGroupItem value="csv" id="csv" className="mt-1" />
                <Label htmlFor="csv" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Table className="h-4 w-4" />
                    <span className="font-bold">CSV - Completo</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Disponible</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Archivo compatible con Excel y Sheets. Incluye resumen, transacciones, contribuciones y ahorro.
                  </p>
                </Label>
              </div>
              
              <div className="flex items-start space-x-3 p-3 border-2 rounded-lg hover:bg-accent cursor-pointer transition-colors opacity-50">
                <RadioGroupItem value="excel" id="excel" className="mt-1" disabled />
                <Label htmlFor="excel" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="font-bold">Excel - Completo</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Próximamente</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    5 hojas con todos los datos: Resumen, Transacciones, Contribuciones, Ahorro, Categorías
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Período */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Período</Label>
            <div className="flex gap-3">
              <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(12)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2000, i).toLocaleString('es-ES', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Opciones (solo para PDF) */}
          {format === 'pdf' && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Incluir en el export</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="balance" 
                    checked={includeBalance}
                    onCheckedChange={(c) => setIncludeBalance(c as boolean)}
                  />
                  <Label htmlFor="balance" className="cursor-pointer text-sm">
                    Balance desglosado
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="transactions" 
                    checked={includeTransactions}
                    onCheckedChange={(c) => setIncludeTransactions(c as boolean)}
                  />
                  <Label htmlFor="transactions" className="cursor-pointer text-sm">
                    Transacciones (top 10)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="contributions" 
                    checked={includeContributions}
                    onCheckedChange={(c) => setIncludeContributions(c as boolean)}
                  />
                  <Label htmlFor="contributions" className="cursor-pointer text-sm">
                    Contribuciones
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="savings" 
                    checked={includeSavings}
                    onCheckedChange={(c) => setIncludeSavings(c as boolean)}
                  />
                  <Label htmlFor="savings" className="cursor-pointer text-sm">
                    Ahorro
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generar {format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Sanitiza el nombre del household para usarlo en nombre de archivo
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}
