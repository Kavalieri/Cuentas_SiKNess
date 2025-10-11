import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf-8')
);

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
      allowedOrigins: ['cuentasdev.sikwow.com', 'cuentas.sikwow.com', 'localhost:3001', 'localhost:3000'],
    },
  },
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
