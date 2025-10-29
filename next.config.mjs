import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    dirs: ['app', 'components', 'lib'],
  },
  typescript: {
    // Mantener en false para producción - queremos ver los errores
    ignoreBuildErrors: false,
  },
  env: {
    npm_package_version: packageJson.version,
  },
  // Confiar en el proxy de Apache para headers
  experimental: {
    serverActions: {
      allowedOrigins: [
        // Configurar según tu dominio de producción
        process.env.NEXT_PUBLIC_PROD_DOMAIN || 'localhost',
        process.env.NEXT_PUBLIC_DEV_DOMAIN || 'localhost',
        'localhost:3001',
        'localhost:3000',
      ].filter(Boolean),
    },
  },
  // Permitir cross-origin requests de dominios de producción hacia dev server
  allowedDevOrigins: [
    process.env.NEXT_PUBLIC_PROD_DOMAIN,
    process.env.NEXT_PUBLIC_DEV_DOMAIN,
  ].filter(Boolean),
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // Suprimir warnings específicos de Node.js APIs en Edge Runtime
    config.ignoreWarnings = [
      { module: /node_modules\/@supabase\/realtime-js/ },
      { module: /node_modules\/@supabase\/supabase-js/ },
      /A Node\.js API is used \(process/,
    ];
    return config;
  },
  // Ignorar warnings específicos de webpack
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
