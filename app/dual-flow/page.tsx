import { redirect } from 'next/navigation';

/**
 * Página principal del sistema dual-flow
 * Redirige automáticamente al dashboard INICIO
 */
export default function DualFlowPage() {
  redirect('/dual-flow/inicio');
}
