import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Lock, Loader2 } from "lucide-react";

export type PhaseCardStatus = "completed" | "active" | "pending" | "locked";

export interface PhaseCardProps {
  phase: "preparing" | "validation" | "active" | "closing" | "closed";
  title: string;
  icon: React.ReactNode;
  status: PhaseCardStatus;
  description: string;
  checklist?: { label: string; done: boolean }[];
  actions?: { label: string; onClick: () => void; variant?: string; disabled?: boolean }[];
  className?: string;
}

export function PhaseCard({
  phase,
  title,
  icon,
  status,
  description,
  checklist,
  actions,
  className,
}: PhaseCardProps) {
  // Color y estado visual según status
  let borderColor = "border-muted";
  let bg = "bg-background";
  let pulse = false;
  let statusIcon: React.ReactNode = null;
  let statusLabel = "";

  switch (status) {
    case "completed":
      borderColor = "border-green-600";
      bg = "bg-green-50 dark:bg-green-900/20";
      statusIcon = <CheckCircle className="text-green-600" size={20} />;
      statusLabel = "Completado";
      break;
    case "active":
      borderColor = "border-blue-600";
      bg = "bg-blue-50 dark:bg-blue-900/20";
      pulse = true;
      statusIcon = <Loader2 className="animate-spin text-blue-600" size={20} />;
      statusLabel = "En curso";
      break;
    case "locked":
      borderColor = "border-amber-500";
      bg = "bg-amber-50 dark:bg-amber-900/20";
      statusIcon = <Lock className="text-amber-500" size={20} />;
      statusLabel = "Bloqueado";
      break;
    default:
      borderColor = "border-muted";
      bg = "bg-background";
      statusIcon = null;
      statusLabel = "Pendiente";
  }

  return (
    <Card
      className={cn(
        "relative border-2 transition-shadow flex flex-col min-h-[260px]",
        borderColor,
        bg,
        pulse && "animate-pulse",
        className
      )}
      aria-label={`Fase: ${title}`}
    >
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="flex-shrink-0 text-2xl">{icon}</div>
        <div className="flex-1">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {title}
            {statusIcon && <span>{statusIcon}</span>}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {description}
          </CardDescription>
        </div>
        <Badge
          variant={
            status === "completed"
              ? "outline"
              : status === "active"
              ? "default"
              : status === "locked"
              ? "destructive"
              : "secondary"
          }
          className="ml-2"
        >
          {statusLabel}
        </Badge>
      </CardHeader>
      {checklist && checklist.length > 0 && (
        <CardContent className="py-2">
          <ul className="space-y-1">
            {checklist.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <CheckCircle className="text-green-500" size={16} />
                ) : (
                  <span className="inline-block w-4 h-4 rounded-full border border-muted-foreground" />
                )}
                <span className={item.done ? "line-through text-muted-foreground" : ""}>{item.label}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
      {actions && actions.length > 0 && (
        <CardFooter className="mt-auto flex flex-row gap-2 pt-2">
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              className={cn(
                "px-3 py-1 rounded font-medium text-sm transition",
                action.variant === "primary"
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : action.variant === "danger"
                  ? "bg-destructive text-white hover:bg-destructive/80"
                  : "bg-muted text-foreground hover:bg-muted/80",
                action.disabled && "opacity-60 cursor-not-allowed"
              )}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          ))}
        </CardFooter>
      )}
    </Card>
  );
}
