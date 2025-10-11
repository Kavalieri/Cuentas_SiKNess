module.exports = {
  apps: [
    {
      name: 'cuentassik-prod',
      script: 'npm',
      args: 'start',
      cwd: '/home/kava/workspace/proyectos/CuentasSiK/repo',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // ⚠️ IMPORTANTE: Copiar este archivo a ecosystem.config.js
        // y completar con los valores reales de .env.production.local
        DATABASE_URL: 'postgresql://user:password@localhost:5432/database_name',
        JWT_SECRET: 'your-jwt-secret-here',
        SMTP_HOST: 'your-smtp-host',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        SMTP_USER: 'your-email@domain.com',
        SMTP_PASS: 'your-smtp-password',
        SMTP_FROM: 'App Name <your-email@domain.com>',
        NEXT_PUBLIC_SITE_URL: 'https://your-domain.com',
        NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL: 'admin@domain.com',
      },
      error_file: '/var/www/.pm2/logs/cuentassik-prod-error.log',
      out_file: '/var/www/.pm2/logs/cuentassik-prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
