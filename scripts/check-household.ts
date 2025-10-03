// Script para diagnosticar el household de la invitación
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHousehold() {
  const invitationId = 'd28fe38c-58f9-4834-a41c-9d46b66a174e';
  
  console.log('🏠 Diagnóstico de Household\n');
  
  // 1. Obtener datos completos de la invitación
  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (invError) {
    console.error('❌ Error obteniendo invitación:', invError);
    return;
  }

  console.log('📧 Invitación:');
  console.log('  - ID:', invitation.id);
  console.log('  - Email:', invitation.email);
  console.log('  - Household ID:', invitation.household_id);
  console.log('  - Type:', invitation.type);
  console.log('  - Status:', invitation.status);
  console.log('');

  // 2. Verificar si el household existe
  if (invitation.household_id) {
    const { data: household, error: houseError } = await supabase
      .from('households')
      .select('*')
      .eq('id', invitation.household_id)
      .single();

    if (houseError) {
      console.error('❌ Error obteniendo household:', houseError);
    } else if (household) {
      console.log('🏠 Household encontrado:');
      console.log('  - ID:', household.id);
      console.log('  - Name:', household.name);
      console.log('  - Created:', household.created_at);
    } else {
      console.log('⚠️  Household NO encontrado con ID:', invitation.household_id);
    }
  } else {
    console.log('⚠️  La invitación NO tiene household_id asignado');
    console.log('    Esto indica que es una invitación de tipo global/flexible');
  }

  // 3. Verificar el tipo de invitación
  console.log('\n📝 Análisis del tipo de invitación:');
  console.log('  - Type:', invitation.type);
  
  if (invitation.type === 'household' && !invitation.household_id) {
    console.log('  ❌ PROBLEMA: Invitación de tipo "household" sin household_id');
  } else if (invitation.type === 'email' && !invitation.household_id) {
    console.log('  ⚠️  Invitación de tipo "email" sin household específico');
    console.log('      El usuario puede elegir crear uno nuevo o esperar');
  }
}

checkHousehold().catch(console.error);
