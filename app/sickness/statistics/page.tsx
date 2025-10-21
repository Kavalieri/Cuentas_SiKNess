import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, PieChart, TrendingUp, Users } from "lucide-react";

export default function StatisticsPage() {
  // Aquí se cargarán los datos avanzados y visualizaciones
  // TODO: Integrar hooks y lógica real de estadísticas
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" />
          Estadísticas avanzadas
        </h1>
        <p className="text-sm text-muted-foreground">Visualiza gráficos, tendencias y análisis detallados del hogar y sus miembros.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="h-5 w-5 text-blue-500" />
              Distribución de gastos
            </CardTitle>
            <CardDescription>Por categoría y miembro</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Aquí irá un gráfico de pastel o barras */}
            <div className="h-40 flex items-center justify-center text-muted-foreground">[Gráfico de distribución]</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Evolución mensual
            </CardTitle>
            <CardDescription>Ingresos y gastos por mes</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Aquí irá un gráfico de líneas o barras */}
            <div className="h-40 flex items-center justify-center text-muted-foreground">[Gráfico de evolución]</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-purple-500" />
              Comparativa miembros
            </CardTitle>
            <CardDescription>Aportaciones y gastos individuales</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Aquí irá un gráfico comparativo */}
            <div className="h-40 flex items-center justify-center text-muted-foreground">[Gráfico comparativo]</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
