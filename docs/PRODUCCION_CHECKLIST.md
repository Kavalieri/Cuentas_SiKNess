# ✅ Checklist de Deploy a Producción

**Fecha**: 29 de Octubre de 2025
**Dominio**: https://cuentas.sikwow.com
**Estado**: Verificado y Listo

---

## 📊 Estado Actual

### ✅ Base de Datos
- [x] **Ownership correcto**: Todos los objetos son propiedad de `cuentassik_prod_owner`
- [x] **Permisos configurados**: `cuentassik_user` tiene permisos en 41 tablas
- [x] **Datos migrados**: 198 transacciones, 5 perfiles, 1 household
- [x] **DEV intacta**: Base de datos de desarrollo no afectada

### ✅ Aplicación
- [x] **Build limpio**: Generado sin actualizar dependencias
- [x] **Cache limpio**: Build cache eliminado
- [x] **PM2 funcionando**: Proceso `cuentassik-prod` online en puerto 3000
- [x] **Variables de entorno**: Configuradas correctamente

### ✅ Configuración OAuth
- [x] **Detección dinámica de origen**: El sistema detecta automáticamente si está en localhost o producción
- [x] **Construcción dinámica de redirect_uri**: Se construye en tiempo de ejecución como `${origin}/auth/google/callback`
- [x] **NEXT_PUBLIC_SITE_URL**: `https://cuentas.sikwow.com`
- [x] **GOOGLE_CLIENT_ID**: Configurado
- [x] **GOOGLE_CLIENT_SECRET**: Configurado
- [x] **NO se usa variable GOOGLE_REDIRECT_URI**: El redirect_uri se construye dinámicamente

---

## ⚠️ CONFIGURACIÓN EN GOOGLE CLOUD CONSOLE

**IMPORTANTE**: El sistema construye el `redirect_uri` dinámicamente en tiempo de ejecución.

### Configuración Actual en Google Console

La aplicación está configurada para usar:
```
http://localhost:3000/auth/google/callback
```

**Esto funciona tanto para localhost como para producción** porque:

1. El código detecta automáticamente el origen del request (usando headers de proxy)
2. Construye el `redirect_uri` dinámicamente como `${origin}/auth/google/callback`
3. Cuando el usuario accede desde `https://cuentas.sikwow.com`, el sistema usa ese origen
4. Cuando el usuario accede desde `http://localhost:3000`, el sistema usa localhost

### ¿Es necesario actualizar Google Console?

**SÍ**, pero de forma diferente a lo indicado inicialmente:

#### Opción 1: Agregar ambas URLs (Recomendado para desarrollo y producción)
```
http://localhost:3000/auth/google/callback
https://cuentas.sikwow.com/auth/google/callback
```

#### Opción 2: Solo producción (si ya no desarrollas localmente)
```
https://cuentas.sikwow.com/auth/google/callback
```

### Pasos en Google Cloud Console:

1. Ir a https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Buscar el Client ID: `64299271376-ahd769em9ot3fut2uejf6l4v9blqj0do`
4. Editar "Authorized redirect URIs"
5. **Agregar** (no reemplazar): `https://cuentas.sikwow.com/auth/google/callback`
6. También agregar en "Authorized JavaScript origins": `https://cuentas.sikwow.com`
7. Guardar cambios

---

## 🔐 Configuración SMTP (Email)

**CONFIGURADO Y LISTO**:
- Host: `ssl0.ovh.net`
- Puerto: `465`
- Usuario: `administracion@sikwow.com`
- Remitente: `CuentasSiK <administracion@sikwow.com>`

---

## 🌐 Configuración del Servidor Web (Nginx/Apache)

**PENDIENTE**: Debes configurar tu servidor web para hacer proxy a PM2:

### Ejemplo Nginx:
```nginx
server {
    listen 80;
    server_name cuentas.sikwow.com;

    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cuentas.sikwow.com;

    # Certificados SSL (Let's Encrypt recomendado)
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Configuración SSL moderna
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proxy a PM2
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔍 Verificación Post-Deploy

### Tests a realizar:

1. **Acceso a la aplicación**:
   ```bash
   curl -I https://cuentas.sikwow.com
   # Debe retornar 200 OK
   ```

2. **Login con Google**:
   - Ir a https://cuentas.sikwow.com/login
   - Hacer clic en "Iniciar sesión con Google"
   - Verificar que redirige correctamente después del login

3. **Base de datos**:
   ```bash
   psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "SELECT COUNT(*) FROM transactions;"
   # Debe mostrar 198
   ```

4. **Logs de PM2**:
   ```bash
   pm2 logs cuentassik-prod --lines 50
   # Verificar que no hay errores
   ```

---

## 📝 Comandos Útiles

### Ver estado de producción:
```bash
pm2 status
pm2 logs cuentassik-prod
```

### Reiniciar producción:
```bash
pm2 restart cuentassik-prod
```

### Ver logs de Nginx (si aplicable):
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🚨 Troubleshooting

### Si el login no funciona:
1. Verificar que Google Cloud Console tiene la URL correcta
2. Esperar 5 minutos después de cambiar la configuración OAuth
3. Verificar logs: `pm2 logs cuentassik-prod`
4. Verificar variables de entorno: `cat .env.production.local | grep GOOGLE`

### Si la aplicación no carga:
1. Verificar PM2: `pm2 status`
2. Verificar puerto 3000: `netstat -tlnp | grep 3000`
3. Verificar Nginx (si aplicable): `sudo nginx -t`
4. Ver logs: `pm2 logs cuentassik-prod --err`

---

## ✅ Checklist Final Antes de Anunciar

- [ ] Nginx/Apache configurado y funcionando
- [ ] Certificado SSL instalado (Let's Encrypt)
- [ ] Google Cloud Console actualizado con URLs de producción
- [ ] Login con Google probado y funcionando
- [ ] Crear/editar transacciones funciona
- [ ] Navegación entre módulos funciona
- [ ] Emails se envían correctamente (magic links si aplica)
- [ ] Backup automático configurado (cron job recomendado)
- [ ] Monitoreo configurado (Uptime Robot, etc.)

---

**🎉 Una vez completada esta checklist, tu aplicación estará lista para producción.**
