# Migración a Ubuntu 22 - Opciones de Deployment

**Servidor actual**: Ubuntu 22 + Apache + MySQL
**App actual**: Next.js 15 + Supabase (Postgres) + Vercel

---

## 🎯 OPCIÓN 1: Docker + Nginx (RECOMENDADA - Más Profesional)

**Ventajas**: Aislamiento, portabilidad, fácil CI/CD, escalable
**Stack**: Docker Compose + Nginx + PostgreSQL + Redis

### Stack Completo
```yaml
# docker-compose.yml
services:
  nextjs:
    build: .
    ports: ["3000:3000"]
  postgres:
    image: postgres:16-alpine
    volumes: [./data:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine  # Opcional para cache
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: [./nginx.conf, ./ssl:/etc/nginx/ssl]
```

### Pasos de Setup
1. **Instalar Docker**: `curl -fsSL https://get.docker.com | sh`
2. **Clonar repo**: `git clone https://github.com/Kavalieri/CuentasSiK.git`
3. **Crear .env.production**: Variables de entorno (DATABASE_URL, NEXTAUTH_SECRET, etc.)
4. **Build y deploy**: `docker-compose up -d --build`
5. **Nginx reverse proxy**: Apache → proxy_pass a Docker
6. **SSL**: Certbot para HTTPS

### Migración de Datos
- Export Supabase: `pg_dump -h <supabase-host> -U postgres <db> > backup.sql`
- Import local: `docker exec postgres psql -U postgres -d cuentassik < backup.sql`
- Regenerar tipos: `npm run supabase:gen-types`

### Costos
- **$0/mes** (self-hosted completo)
- Control total de datos y privacidad

---

## 🎯 OPCIÓN 2: PM2 + Nginx (Intermedia)

**Ventajas**: Simple, nativo, logs integrados
**Stack**: Node.js + PM2 + PostgreSQL local + Nginx

### Pasos de Setup
1. **Instalar Node 20**: `nvm install 20 && nvm use 20`
2. **Instalar PM2**: `npm install -g pm2`
3. **Instalar PostgreSQL**: `apt install postgresql-16`
4. **Clonar y build**: 
   ```bash
   git clone repo
   npm install
   npm run build
   ```
5. **Crear ecosystem.config.js**:
   ```js
   module.exports = {
     apps: [{
       name: 'cuentassik',
       script: 'npm',
       args: 'start',
       env: { NODE_ENV: 'production', PORT: 3000 }
     }]
   }
   ```
6. **Start**: `pm2 start ecosystem.config.js`
7. **Nginx proxy**: Apache → proxy_pass :3000

### Migración de Datos
- Mismo proceso que Opción 1 (pg_dump/restore)
- Configurar connection pool con `pg_bouncer`

### Costos
- **$0/mes** (self-hosted)

---

## 🎯 OPCIÓN 3: Apache + Node (No Recomendada)

**Ventajas**: Ya tienes Apache instalado
**Desventajas**: Apache no optimizado para Node, overhead

### Pasos de Setup
1. Habilitar `mod_proxy_http`: `a2enmod proxy_http`
2. VirtualHost con ProxyPass a :3000
3. Start app con PM2 o systemd
4. **Problema**: Apache consume más RAM que Nginx para proxy

**Recomendación**: Reemplazar Apache con Nginx o usar Apache solo para otros sites

---

## 🎯 OPCIÓN 4: Mantener Vercel + Migrar Solo DB (Híbrida)

**Ventajas**: Deployment automático, CDN global, Edge Functions
**Stack**: Vercel (frontend) + PostgreSQL self-hosted (DB)

### Pasos de Setup
1. **Instalar PostgreSQL** en Ubuntu 22
2. **Abrir puerto 5432** con firewall (UFW) solo para Vercel IPs
3. **Actualizar .env en Vercel**: `DATABASE_URL=postgresql://user:pass@tu-ip:5432/db`
4. **Migrar datos**: pg_dump desde Supabase → import local
5. **SSL/TLS**: Configurar PostgreSQL con certificados

### Migración Auth
- **Problema**: Supabase Auth es propietario
- **Solución**: Migrar a NextAuth.js (1-2 días trabajo)
  - Providers: Email (magic link con Resend/SendGrid)
  - Adapter: PostgreSQL
  - Session: JWT o Database

### Costos
- **Vercel**: $20/mes (Pro plan para producción)
- **Servidor DB**: $0 (self-hosted)
- **Total**: ~$20/mes vs $50/mes todo en cloud

---

## 📊 Comparativa Rápida

| Opción | Complejidad | Performance | Costo | Escalabilidad | Recomendada |
|--------|------------|-------------|-------|---------------|-------------|
| Docker + Nginx | Media | ⭐⭐⭐⭐⭐ | $0 | ⭐⭐⭐⭐⭐ | ✅ SÍ |
| PM2 + Nginx | Baja | ⭐⭐⭐⭐ | $0 | ⭐⭐⭐⭐ | ✅ Alternativa |
| Apache + Node | Baja | ⭐⭐⭐ | $0 | ⭐⭐⭐ | ❌ NO |
| Vercel + DB local | Baja | ⭐⭐⭐⭐⭐ | $20 | ⭐⭐⭐⭐⭐ | ⚠️ Depende |

---

## 🔧 Cambios de Código Necesarios

### 1. Eliminar Dependencias de Supabase Cloud
```typescript
// ANTES: lib/supabaseServer.ts
import { createServerClient } from '@supabase/ssr'

// DESPUÉS: lib/supabaseServer.ts (solo Postgres)
import { createClient } from '@supabase/supabase-js'
// O migrar a NextAuth.js (más limpio)
```

### 2. Migrar Auth a NextAuth.js (Recomendado)
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import EmailProvider from 'next-auth/providers/email'

export const authOptions = {
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,  // SMTP o Resend
      from: 'noreply@cuentassik.com'
    })
  ],
  adapter: PostgresAdapter(pool),
  session: { strategy: 'jwt' }
}
```

### 3. Variables de Entorno para Producción
```bash
# .env.production
DATABASE_URL=postgresql://cuentassik:PASS@localhost:5432/cuentassik
NEXTAUTH_SECRET=<generate-random-32-chars>
NEXTAUTH_URL=https://cuentassik.tudominio.com
EMAIL_SERVER=smtp://user:pass@smtp.resend.com:587
```

### 4. Build Optimizado
```json
// package.json
{
  "scripts": {
    "build:prod": "NODE_ENV=production next build",
    "start:prod": "NODE_ENV=production next start -p 3000"
  }
}
```

---

## 🚀 Recomendación Final: OPCIÓN 1 (Docker + Nginx)

### Por qué Docker + Nginx es la mejor opción:
1. ✅ **Profesional**: Industry standard para self-hosting
2. ✅ **Portabilidad**: Misma imagen funciona en dev/prod/cualquier servidor
3. ✅ **Escalable**: Fácil agregar replicas con load balancer
4. ✅ **Mantenible**: Updates sin downtime (blue-green deployment)
5. ✅ **Seguro**: Aislamiento de containers, fácil aplicar updates de seguridad
6. ✅ **CI/CD friendly**: GitHub Actions → build image → deploy automático
7. ✅ **Monitoreo**: Integración con Prometheus + Grafana

### Checklist Mínimo para Producción:
- [ ] PostgreSQL con backups automáticos diarios (pg_dump + cron)
- [ ] Nginx con SSL/TLS (Let's Encrypt + auto-renewal)
- [ ] Firewall UFW configurado (solo 80, 443, 22 abiertos)
- [ ] Logs centralizados (Docker logs → file o Loki)
- [ ] Monitoring básico (Uptime Kuma o similar)
- [ ] Dominio configurado con DNS A record
- [ ] Email SMTP para magic links (Resend/SendGrid)

---

## 📝 Próximos Pasos (Cuando Decidas Migrar)

1. **Fase Preparación** (1-2 días):
   - Documentar configuración actual Supabase
   - Export completo de datos (pg_dump)
   - Test restore en local

2. **Fase Desarrollo** (3-5 días):
   - Migrar Auth a NextAuth.js
   - Eliminar dependencias Supabase Cloud
   - Crear Dockerfile + docker-compose.yml
   - Test completo en local

3. **Fase Deploy** (1 día):
   - Setup servidor Ubuntu 22
   - Instalar Docker + Nginx
   - Deploy inicial
   - Migrar datos
   - Test smoke tests

4. **Fase Post-Deploy** (ongoing):
   - Monitoreo 48h
   - Configurar backups automáticos
   - Documentar procedimiento rollback

---

**Documento creado**: 2025-10-06  
**Revisión recomendada**: Antes de iniciar migración  
**Tiempo estimado migración completa**: 1-2 semanas (part-time)
