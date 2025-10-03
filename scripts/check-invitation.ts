// Script de diagnóstico para verificar invitaciones en la base de datos
// Uso: npx tsx scripts/check-invitation.ts

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no encontradas');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '[SET]' : '[NOT SET]');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInvitation() {
  const email = 'fumetas.sik@gmail.com';
  
  console.log('🔍 Buscando invitaciones para:', email);
  console.log('----------------------------------------');

  // 1. Buscar invitaciones por email (sin filtros)
  const { data: allInvitations, error: allError } = await supabase
    .from('invitations')
    .select(`
      *,
      households (
        name
      )
    `)
    .eq('email', email.toLowerCase());

  console.log('\n📧 Todas las invitaciones para este email:');
  if (allError) {
    console.error('❌ Error:', allError);
  } else if (!allInvitations || allInvitations.length === 0) {
    console.log('⚠️  No se encontraron invitaciones');
  } else {
    console.log(`✅ Encontradas ${allInvitations.length} invitaciones:\n`);
    allInvitations.forEach((inv, i) => {
      console.log(`Invitación ${i + 1}:`);
      console.log(`  - ID: ${inv.id}`);
      console.log(`  - Status: ${inv.status}`);
      console.log(`  - Household: ${(inv as any).households?.name || 'N/A'}`);
      console.log(`  - Expira: ${inv.expires_at}`);
      console.log(`  - Creada: ${inv.created_at}`);
      console.log(`  - Token: ${inv.token.substring(0, 10)}...`);
      
      const now = new Date();
      const expiresAt = new Date(inv.expires_at);
      const isExpired = expiresAt < now;
      console.log(`  - ¿Expirada?: ${isExpired ? '❌ SÍ' : '✅ NO'}`);
      console.log('');
    });
  }

  // 2. Buscar invitaciones pendientes y no expiradas (como lo hace el código)
  const now = new Date().toISOString();
  const { data: pendingInvitations, error: pendingError } = await supabase
    .from('invitations')
    .select(`
      *,
      households (
        name
      )
    `)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .gt('expires_at', now);

  console.log('\n📬 Invitaciones PENDIENTES y NO EXPIRADAS:');
  if (pendingError) {
    console.error('❌ Error:', pendingError);
  } else if (!pendingInvitations || pendingInvitations.length === 0) {
    console.log('⚠️  No se encontraron invitaciones pendientes válidas');
  } else {
    console.log(`✅ Encontradas ${pendingInvitations.length} invitaciones pendientes:\n`);
    pendingInvitations.forEach((inv, i) => {
      console.log(`Invitación ${i + 1}:`);
      console.log(`  - ID: ${inv.id}`);
      console.log(`  - Household: ${(inv as any).households?.name || 'N/A'}`);
      console.log(`  - Token: ${inv.token}`);
      console.log('');
    });
  }

  console.log('----------------------------------------');
}

checkInvitation().catch(console.error);
