import { redirect } from 'next/navigation';

/**
 * Página Más - Settings y perfil
 * Redirige a opciones por ahora
 */
export default function MasPage() {
  // Por ahora redirigimos a opciones, pero esto debería ser una página unificada
  redirect('/dual-flow/opciones');
}
