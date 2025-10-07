'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { Trophy, TrendingUp } from 'lucide-react';

type CategoryRanking = {
  name: string;
  icon: string | null;
  total: number;
  count: number;
  average: number;
};

type Props = {
  data: CategoryRanking[];
};

export function TopCategoriesTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Categorías</CardTitle>
          <CardDescription>Ranking de categorías más utilizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No hay datos de categorías para el período seleccionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getMedalIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Top Categorías
            </CardTitle>
            <CardDescription>Ranking de categorías más utilizadas</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            Top {data.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Transacciones</TableHead>
                <TableHead className="text-right hidden md:table-cell">Promedio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((category, index) => {
                const medal = getMedalIcon(index);
                const percentage = data[0] ? (category.total / data[0].total) * 100 : 0;

                return (
                  <TableRow key={category.name}>
                    <TableCell className="font-medium">
                      {medal || `${index + 1}.`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          {index < 3 && (
                            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold">{formatCurrency(category.total)}</span>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <Badge variant="secondary">{category.count}</Badge>
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(category.average)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Resumen estadístico */}
        <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(data.reduce((sum, c) => sum + c.total, 0))}
            </p>
            <p className="text-xs text-muted-foreground">Total Acumulado</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {data.reduce((sum, c) => sum + c.count, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Transacciones</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{data.length}</p>
            <p className="text-xs text-muted-foreground">Categorías Activas</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
