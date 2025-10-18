// Redirige la raíz de /sickness al balance

import { redirect } from 'next/navigation';

export default function SicknessIndex() {
  // Redirigir a balance y transacciones como página principal
  redirect('/sickness/balance');
}
