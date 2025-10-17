// Redirige la raíz de /sickness al dashboard
import { redirect } from 'next/navigation';

export default function SicknessIndex() {
  redirect('/sickness/dashboard');
}
