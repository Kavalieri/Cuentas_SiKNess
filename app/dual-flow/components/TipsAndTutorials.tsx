'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ExternalLink, HelpCircle, Lightbulb, Play, Star, Target } from 'lucide-react';
import Link from 'next/link';

interface TipsAndTutorialsProps {
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  completedActions: string[];
}

export default function TipsAndTutorials({ userLevel, completedActions }: TipsAndTutorialsProps) {
  // Tips contextuales basados en dónde está el usuario
  const getContextualTips = () => {
    const baseTips = [
      {
        id: 'monthly-goal',
        title: '🎯 Configura tu objetivo mensual',
        description: 'Un objetivo claro te ayuda a mantener el control de tus gastos.',
        action: 'Configurar objetivo',
        href: '/dual-flow/hogar',
        difficulty: 'beginner',
        estimatedTime: '2 min',
      },
      {
        id: 'automation-rules',
        title: '⚡ Automatiza transacciones recurrentes',
        description: 'Crea reglas para gastos fijos como supermercado, gasolina, etc.',
        action: 'Crear reglas',
        href: '/dual-flow/hogar',
        difficulty: 'intermediate',
        estimatedTime: '5 min',
      },
      {
        id: 'period-analysis',
        title: '📊 Analiza patrones por período',
        description: 'Revisa tus gastos mensuales para identificar tendencias.',
        action: 'Ver análisis',
        href: '/dual-flow/periodos',
        difficulty: 'intermediate',
        estimatedTime: '3 min',
      },
      {
        id: 'member-collaboration',
        title: '👥 Colabora con tu pareja',
        description: 'Invita a tu pareja para gestionar gastos juntos de forma transparente.',
        action: 'Gestionar miembros',
        href: '/dual-flow/hogar',
        difficulty: 'beginner',
        estimatedTime: '2 min',
      },
    ];

    return baseTips.filter((tip) => {
      // Filtrar por nivel de dificultad
      if (userLevel === 'beginner' && tip.difficulty === 'advanced') return false;

      // Filtrar acciones ya completadas
      if (completedActions.includes(tip.id)) return false;

      return true;
    });
  };

  const tutorials = [
    {
      title: '🚀 Primeros pasos en CuentasSiK',
      description: 'Aprende los conceptos básicos del sistema dual-flow en 5 minutos.',
      duration: '5 min',
      level: 'Principiante',
      topics: ['Configuración inicial', 'Crear primera transacción', 'Revisar balance'],
    },
    {
      title: '⚡ Automatización avanzada',
      description: 'Configura reglas inteligentes para acelerar tu workflow.',
      duration: '8 min',
      level: 'Intermedio',
      topics: ['Reglas de emparejamiento', 'Categorización automática', 'Notificaciones'],
    },
    {
      title: '📊 Análisis y reportes',
      description: 'Extrae insights valiosos de tus datos financieros.',
      duration: '6 min',
      level: 'Avanzado',
      topics: ['Tendencias de gasto', 'Comparativas mensuales', 'Exportar datos'],
    },
  ];

  const quickTips = [
    '💡 Usa categorías específicas para un mejor seguimiento',
    '⌨️ Atajo: Ctrl+N para nueva transacción rápida',
    '📱 La app funciona offline y sincroniza automáticamente',
    '🔍 Usa la búsqueda global con Ctrl+K',
    '📈 Revisa tu progreso semanalmente para mejores resultados',
    '🤖 Las transacciones similares se auto-categorizan',
  ];

  const contextualTips = getContextualTips();

  return (
    <div className="space-y-4">
      {/* Tips Contextuales */}
      {contextualTips.length > 0 && (
        <Card className="animate-in fade-in-0 duration-500 slide-in-from-left-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Sugerencias Personalizadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contextualTips.map((tip) => (
              <div
                key={tip.id}
                className="flex items-start justify-between p-3 bg-muted/50 rounded-lg border"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{tip.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-1 bg-background rounded text-xs">
                      {tip.difficulty === 'beginner'
                        ? 'Básico'
                        : tip.difficulty === 'intermediate'
                        ? 'Intermedio'
                        : 'Avanzado'}
                    </span>
                    <span>• {tip.estimatedTime}</span>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="ml-3">
                  <Link href={tip.href}>
                    {tip.action}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tutoriales Disponibles */}
      <Card className="animate-in fade-in-0 duration-500 slide-in-from-left-4 delay-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            Tutoriales Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tutorials.map((tutorial, index) => (
            <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm">{tutorial.title}</h4>
                <Button size="sm" variant="outline">
                  <Play className="h-3 w-3 mr-1" />
                  Ver
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{tutorial.description}</p>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-background rounded">{tutorial.level}</span>
                  <span className="text-muted-foreground">• {tutorial.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {tutorial.topics.map((topic, topicIndex) => (
                  <span key={topicIndex} className="px-2 py-1 bg-muted text-xs rounded">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Consejos Rápidos */}
      <Card className="animate-in fade-in-0 duration-500 slide-in-from-left-4 delay-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Consejos Rápidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {quickTips.slice(0, 3).map((tip, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-muted-foreground">{tip}</span>
              </div>
            ))}
          </div>

          <Button variant="ghost" size="sm" className="w-full mt-3">
            <HelpCircle className="h-4 w-4 mr-1" />
            Ver todos los consejos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
