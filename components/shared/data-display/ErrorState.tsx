import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
  variant?: 'error' | 'warning';
}

export function ErrorState({
  title,
  message,
  retry,
  variant = 'error',
}: ErrorStateProps) {
  const icon = variant === 'error' ? <AlertCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />;
  const defaultTitle = variant === 'error' ? 'Error' : 'Advertencia';

  return (
    <div className="py-8 px-4">
      <Alert variant={variant === 'error' ? 'destructive' : 'default'}>
        {icon}
        <AlertTitle>{title || defaultTitle}</AlertTitle>
        <AlertDescription className="mt-2">
          {message}
        </AlertDescription>
        {retry && (
          <Button
            onClick={retry}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            Reintentar
          </Button>
        )}
      </Alert>
    </div>
  );
}
