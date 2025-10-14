# 🔐 JWT en CuentasSiK

Este proyecto utiliza JSON Web Tokens (JWT) para autenticar y autorizar peticiones en el backend (Server Actions y middleware).

## ¿Qué es un JWT?

Un JWT es un token firmado que contiene claims (datos) y que el servidor puede verificar sin consultar a una base de datos en cada petición. Consta de tres partes: header, payload y signature.

## ¿Para qué lo usamos?

- Identificar al usuario en el middleware y en Server Actions.
- Asociar el `profile_id`/usuario con el hogar activo.
- Establecer la sesión de forma stateless entre cliente y servidor.

## Variables de entorno relevantes

- `JWT_SECRET`: clave para firmar/verificar tokens. Debe ser secreta y fuerte.

Generar un secret seguro:

```bash
openssl rand -base64 32
```

## Flujo simplificado

1. Usuario inicia sesión (por email/magic link o login clásico).
2. El backend genera un JWT firmado con `JWT_SECRET` y lo guarda en cookie/httpOnly.
3. En cada request, el middleware valida el JWT y reconstruye el contexto del usuario.
4. Las Server Actions confían en ese contexto para aplicar reglas de negocio y filtros por `household_id`.

## Buenas prácticas

- No exponer el JWT en `localStorage` (se recomienda cookie httpOnly/secure en prod).
- Rotar `JWT_SECRET` si es comprometido; invalidar sesiones si procede.
- Establecer expiración razonable y refresco controlado.
- No incluir información sensible en el payload; solo IDs y claims mínimos.

## Errores frecuentes

- `JWT_SECRET` vacío o por defecto: tokens inválidos o inseguros.
- Reloj del servidor desincronizado: problemas con expiraciones (`exp`).
- Cookies no presentes en proxy/reverse: revisar configuración del proxy.

Para más detalles, revisa el middleware y utilidades en `lib/auth.ts` y `middleware.ts`.# 🔐 JWT en CuentasSiK

Breve explicación del uso de JWT en la app.

## ¿Qué es un JWT?

Un JSON Web Token es un token firmado que permite autenticar y autorizar sin almacenar estado en servidor.

## Cómo lo usamos

- Se firma con `JWT_SECRET` usando HMAC-SHA256 (via `jose`).
- Contiene claims mínimos (id de perfil y expiración).
- Tiempo de vida corto; se renueva con flujos seguros.
- Se transporta de forma segura (cookies httpOnly/secure o headers según flujo).

## Buenas prácticas

- Mantén `JWT_SECRET` largo y aleatorio (>= 32 bytes base64).
- Usa HTTPS en producción.
- Evita exponer el token en `localStorage` si puedes usar cookies httpOnly.
- Invalida/rota tokens cambiando secreto si hay incidente.

## Variables relacionadas

- `JWT_SECRET`: clave de firma y verificación obligatoria.
- `NEXT_PUBLIC_SITE_URL`: afecta URLs de callback y cookies.

Para detalles de implementación, revisa `lib/auth.ts` y middleware.
