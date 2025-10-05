/**
 * Script para ejecutar SQL directamente en Supabase
 * Ejecutar con: node scripts/execute-sql.js
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('Necesitas: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function executeSqlFile(filePath) {
  console.log(`📄 Leyendo archivo: ${filePath}`);
  const sql = readFileSync(filePath, 'utf-8');
  
  console.log('🔄 Ejecutando SQL en Supabase...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Error al ejecutar SQL:', error);
    process.exit(1);
  }
  
  console.log('✅ SQL ejecutado exitosamente');
  console.log('📊 Resultado:', data);
}

// Ejecutar el script de reset
executeSqlFile('db/RESET_AND_FIX_CONTRIBUTIONS.sql');
