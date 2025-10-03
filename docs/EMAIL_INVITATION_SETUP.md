# Configuración de Email Templates para Invitaciones

## Contexto

El sistema de invitaciones de CuentasSiK usa **tokens personalizados** almacenados en la tabla `invitations`, **NO usa el sistema de confirmación de Supabase Auth**.

Por lo tanto, **NO necesitas modificar los templates de Supabase Auth** (Confirm signup, Magic Link, etc.). Esos son para el login, no para las invitaciones al hogar.

## ¿Cómo Funciona el Sistema Actual?

1. **Owner crea invitación** → Se genera un token único en la tabla `invitations`
2. **Owner copia el link** → Lo envía manualmente por WhatsApp, email personal, etc.
3. **Invitado abre el link** → `/app/invite/{token}`
4. **Sistema valida** → Si el token es válido, agrega al usuario al hogar

## Próximo Paso: Email Automático

Para enviar emails automáticos cuando se crea una invitación, necesitas integrar un servicio de email.

### Opción 1: Resend (Recomendado)

**Ventajas**:
- ✅ Fácil de integrar
- ✅ Gratuito hasta 3,000 emails/mes
- ✅ Excelente deliverability
- ✅ API simple

**Configuración**:

1. **Crear cuenta en Resend**:
   - Ir a https://resend.com
   - Crear cuenta gratuita
   - Verificar dominio (o usar `onboarding@resend.dev` para testing)

2. **Obtener API Key**:
   - Dashboard → API Keys → Create API Key
   - Copiar la key

3. **Agregar a variables de entorno**:
```env
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

4. **Instalar SDK**:
```bash
npm install resend
```

5. **Actualizar `sendInvitationEmail()` en `app/app/household/invitations/actions.ts`**:

```typescript
import { Resend } from 'resend';

async function sendInvitationEmail({
  to,
  householdName,
  inviterEmail,
  token,
}: {
  to: string;
  householdName: string;
  inviterEmail: string;
  token: string;
}) {
  // Verificar que la API key existe
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email send');
    return { success: false, error: 'Email service not configured' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  
  // URL del link de invitación
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/app/invite/${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'CuentasSiK <noreply@tu-dominio.com>', // Cambiar por tu dominio verificado
      to: [to],
      subject: `${inviterEmail} te invita a unirte a ${householdName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitación a CuentasSiK</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🏠 CuentasSiK</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              
              <h2 style="color: #1f2937; margin-top: 0;">¡Te han invitado a un hogar!</h2>
              
              <p style="font-size: 16px; color: #4b5563;">
                <strong>${inviterEmail}</strong> quiere que te unas a <strong>${householdName}</strong> en CuentasSiK.
              </p>
              
              <p style="font-size: 16px; color: #4b5563;">
                CuentasSiK es una aplicación para gestionar gastos compartidos entre parejas o roommates.
                Podrás ver todos los gastos del hogar, contribuir de forma proporcional y mantener las finanzas organizadas.
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${inviteUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 14px 32px; 
                          text-decoration: none; 
                          border-radius: 6px; 
                          font-weight: 600;
                          font-size: 16px;
                          display: inline-block;">
                  Aceptar Invitación
                </a>
              </div>
              
              <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 16px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                  <strong>⏰ Importante:</strong> Este link expira en 7 días. Si no tienes cuenta en CuentasSiK, 
                  primero necesitarás registrarte con este mismo email.
                </p>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
                También puedes copiar y pegar este enlace en tu navegador:
              </p>
              <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 4px; font-family: monospace;">
                ${inviteUrl}
              </p>
              
            </div>
            
            <div style="text-align: center; padding: 20px 0; color: #9ca3af; font-size: 12px;">
              <p style="margin: 5px 0;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
              <p style="margin: 5px 0;">© 2025 CuentasSiK - Gestión de Gastos Compartidos</p>
            </div>
            
          </body>
        </html>
      `,
      text: `
¡Te han invitado a un hogar!

${inviterEmail} quiere que te unas a ${householdName} en CuentasSiK.

Para aceptar la invitación, visita este enlace:
${inviteUrl}

Este link expira en 7 días.

Si no esperabas esta invitación, puedes ignorar este correo.

© 2025 CuentasSiK
      `.trim(),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data);
    return { success: true, emailId: data?.id };
    
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
```

### Opción 2: Supabase Edge Function (Sin Dependencias Externas)

Si prefieres no usar servicios externos, puedes crear una Edge Function en Supabase que use cualquier SMTP.

**Pasos**:

1. **Crear Edge Function**:
```bash
npx supabase functions new send-invitation-email
```

2. **Implementar en `supabase/functions/send-invitation-email/index.ts`**:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { to, householdName, inviterEmail, token } = await req.json()
  
  const inviteUrl = `https://tu-dominio.com/app/invite/${token}`
  
  // Aquí puedes usar SMTP, SendGrid, Mailgun, etc.
  // Ejemplo con fetch a un servicio de email
  
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

3. **Llamar desde `actions.ts`**:
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invitation-email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({ to, householdName, inviterEmail, token })
})
```

## ⚠️ Importante: No Usar Templates de Supabase Auth

**NO modifiques estos templates** (son para el sistema de autenticación, no para invitaciones):
- ❌ Confirm signup
- ❌ Invite user
- ❌ Magic Link
- ❌ Change Email Address
- ❌ Reset Password

Estos templates son para:
- Confirmar cuenta nueva (signup)
- Magic link para login
- Resetear contraseña
- Cambiar email

**Nuestro sistema de invitaciones es independiente** y usa la tabla `invitations` con tokens personalizados.

## Testing del Email

### 1. Testing Local (Sin Enviar Emails)

El código actual ya hace logging:
```typescript
console.log('Invitation email would be sent:');
console.log(`To: ${to}`);
console.log(`Link: ${inviteUrl}`);
```

Puedes ver estos logs en la consola del servidor durante desarrollo.

### 2. Testing con Resend (Sandbox Mode)

Resend tiene un modo sandbox para testing:
```typescript
from: 'onboarding@resend.dev' // Email de testing de Resend
```

### 3. Testing en Producción

Una vez configurado Resend:
1. Crear invitación desde la UI
2. Verificar en Dashboard de Resend que el email fue enviado
3. Revisar bandeja de entrada del destinatario
4. Click en el link y verificar que funciona

## Configuración de Dominio (Producción)

Para que los emails no caigan en spam:

1. **Verificar dominio en Resend**:
   - Agregar registros DNS (SPF, DKIM, DMARC)
   - Esperar verificación (puede tardar hasta 48h)

2. **Registros DNS requeridos**:
```
TXT @ "v=spf1 include:resend.com ~all"
TXT resend._domainkey "{DKIM_KEY_from_Resend}"
TXT _dmarc "v=DMARC1; p=none; rua=mailto:admin@tu-dominio.com"
```

3. **Cambiar `from` en el código**:
```typescript
from: 'CuentasSiK <invites@tu-dominio.com>'
```

## Resumen de Integración

### Archivo a Modificar

**`app/app/household/invitations/actions.ts`**

Busca la función `sendInvitationEmail()` (línea ~220) y reemplázala con el código de Resend mostrado arriba.

### Variables de Entorno

```env
# .env.local (desarrollo)
RESEND_API_KEY=re_xxxxxxxxxxxxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Vercel (producción)
RESEND_API_KEY=re_xxxxxxxxxxxxx
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
```

### Dependencias

```bash
npm install resend
```

### Flujo Completo

1. Owner crea invitación → `createInvitation()`
2. Se genera token y se guarda en DB
3. Se llama a `sendInvitationEmail()`
4. Resend envía el email con el link
5. Invitado recibe email y clickea link
6. Sistema valida token y agrega al hogar

## Template HTML Final (Para Copy-Paste)

El template HTML completo está en el código de arriba. Es responsive, tiene:
- ✅ Header con gradiente
- ✅ Botón de acción destacado
- ✅ Información clara del invitador y hogar
- ✅ Advertencia de expiración
- ✅ Link alternativo (texto plano)
- ✅ Footer discreto
- ✅ Versión plain text para clientes que no soportan HTML

## Troubleshooting

**Problema**: Email no llega
- ✅ Verificar que `RESEND_API_KEY` está configurada
- ✅ Revisar logs de Resend Dashboard
- ✅ Verificar que el dominio está verificado (producción)
- ✅ Revisar carpeta de spam

**Problema**: Link no funciona
- ✅ Verificar que `NEXT_PUBLIC_SITE_URL` tiene el valor correcto
- ✅ No debe terminar en `/`
- ✅ Usar `https://` en producción

**Problema**: Token expirado
- ✅ Los tokens expiran en 7 días
- ✅ Owner puede crear una nueva invitación
- ✅ Cancelar invitaciones viejas si es necesario
