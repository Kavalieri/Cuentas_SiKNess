#!/usr/bin/env node

/**
 * Script para generar types TypeScript desde PostgreSQL
 * Usa @databases/pg-schema-print-types
 */

const printTypes = require('@databases/pg-schema-print-types').default;
const { promises: fs } = require('fs');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

console.log('🔄 Generando types desde PostgreSQL...');
console.log(`📦 Base de datos: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

async function generateTypes() {
  try {
    const types = await printTypes(DATABASE_URL, {
      schemaName: 'public',
    });

    // Añadir header con metadata
    const header = `/**
 * Auto-generated TypeScript types from PostgreSQL schema
 * Generated: ${new Date().toISOString()}
 * Database: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'unknown'}
 *
 * ⚠️ DO NOT EDIT MANUALLY
 * Run 'npm run types:generate' to regenerate
 */

`;

    const output = header + types;

    // Escribir a archivo
    await fs.writeFile('types/database.generated.ts', output, 'utf8');

    console.log('✅ Types generados exitosamente en types/database.generated.ts');
    console.log(`📝 Total de caracteres: ${output.length}`);
  } catch (error) {
    console.error('❌ Error generando types:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

generateTypes();
