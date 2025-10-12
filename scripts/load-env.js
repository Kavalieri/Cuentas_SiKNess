#!/usr/bin/env node

const dotenv = require('dotenv');

// Cargar variables de entorno
const envFile = process.argv[2];
if (!envFile) {
  console.error('❌ Uso: node load-env.js <archivo.env>');
  process.exit(1);
}

// Redirigir stderr temporalmente para silenciar debug de dotenv
const originalStderr = process.stderr.write;
process.stderr.write = () => {};

const result = dotenv.config({ path: envFile, debug: false });

// Restaurar stderr
process.stderr.write = originalStderr;

if (result.error) {
  console.error('❌ Error cargando .env:', result.error.message);
  process.exit(1);
}

// Verificar variables críticas
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET no está definida');
  process.exit(1);
}

// Imprimir variables para export
const keys = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL',
  'PORT',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
];

keys.forEach((key) => {
  if (process.env[key]) {
    // Usar formato compatible con bash export
    // Escribir directamente la asignación sin comillas externas
    const value = process.env[key]
      .replace(/\\/g, '\\\\') // Escapar backslashes
      .replace(/'/g, "\\'") // Escapar comillas simples
      .replace(/`/g, '\\`') // Escapar backticks
      .replace(/\$/g, '\\$') // Escapar signos de dólar
      .replace(/"/g, '\\"'); // Escapar comillas dobles

    console.log(`${key}='${value}'`);
  }
});
