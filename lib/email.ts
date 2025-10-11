import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Sistema de envío de emails con Nodemailer
 * Soporta SMTP configurado via variables de entorno
 */

let transporter: Transporter | null = null;

/**
 * Obtiene o crea el transporter de nodemailer
 */
function getTransporter(): Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true'; // true para 465, false para otros puertos
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error(
        'SMTP configuration is incomplete. Required: SMTP_HOST, SMTP_USER, SMTP_PASS'
      );
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    console.log(`✅ SMTP configured: ${user}@${host}:${port} (secure: ${secure})`);
  }

  return transporter;
}

/**
 * Envía un email con magic link para autenticación
 */
export async function sendMagicLinkEmail(
  to: string,
  magicLinkUrl: string
): Promise<void> {
  console.log('📧 Starting sendMagicLinkEmail...');
  console.log('📧 Recipient:', to);
  console.log('📧 Magic link URL:', magicLinkUrl.substring(0, 80) + '...');

  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  console.log('📧 From address:', from);

  const mailOptions = {
    from: from,
    to,
    subject: 'Tu enlace de acceso a CuentasSiK',
    text: `
Hola,

Has solicitado acceder a tu cuenta de CuentasSiK.

Haz clic en el siguiente enlace para iniciar sesión:

${magicLinkUrl}

Este enlace expira en 1 hora.

Si no solicitaste este correo, puedes ignorarlo de forma segura.

---
CuentasSiK
    `,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 24px;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background: #2563eb;
              color: #ffffff;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 6px;
              font-weight: 600;
              text-align: center;
              margin: 20px 0;
            }
            .button:hover {
              background: #1d4ed8;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
            }
            .warning {
              background: #fef2f2;
              border-left: 4px solid #ef4444;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning p {
              margin: 0;
              color: #991b1b;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 CuentasSiK</h1>
            </div>

            <div class="content">
              <p>¡Hola!</p>

              <p>Has solicitado acceder a tu cuenta de <strong>CuentasSiK</strong>. Haz clic en el botón de abajo para iniciar sesión:</p>

              <div style="text-align: center;">
                <a href="${magicLinkUrl}" class="button">Acceder a mi cuenta</a>
              </div>

              <p style="color: #666; font-size: 14px;">
                O copia y pega este enlace en tu navegador:<br>
                <a href="${magicLinkUrl}" style="color: #2563eb; word-break: break-all;">${magicLinkUrl}</a>
              </p>

              <div class="warning">
                <p><strong>⏱️ Este enlace expira en 1 hora</strong></p>
                <p style="margin-top: 5px;">Si no solicitaste este correo, puedes ignorarlo de forma segura.</p>
              </div>
            </div>

            <div class="footer">
              <p>CuentasSiK - Gestión familiar simplificada</p>
              <p style="font-size: 12px; color: #999; margin-top: 10px;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  console.log('📧 Sending email via SMTP...');
  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log(`✉️ Magic link sent to ${to}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

/**
 * Envía un email de invitación a un household
 */
export async function sendHouseholdInvitationEmail(
  to: string,
  inviterName: string,
  householdName: string,
  invitationUrl: string
): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const mailOptions = {
    from: `CuentasSiK <${from}>`,
    to,
    subject: `🏠 ${inviterName} te ha invitado a ${householdName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 24px;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background: #16a34a;
              color: #ffffff;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 6px;
              font-weight: 600;
              text-align: center;
              margin: 20px 0;
            }
            .button:hover {
              background: #15803d;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
            }
            .info-box {
              background: #f0f9ff;
              border-left: 4px solid #2563eb;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏠 Invitación a Household</h1>
            </div>

            <div class="content">
              <p>¡Hola!</p>

              <p><strong>${inviterName}</strong> te ha invitado a unirte al household <strong>${householdName}</strong> en CuentasSiK.</p>

              <div class="info-box">
                <p style="margin: 0;"><strong>¿Qué es un Household?</strong></p>
                <p style="margin: 5px 0 0 0;">Un espacio compartido donde puedes gestionar finanzas familiares, dividir gastos y llevar el control de contribuciones de forma colaborativa.</p>
              </div>

              <div style="text-align: center;">
                <a href="${invitationUrl}" class="button">Aceptar Invitación</a>
              </div>

              <p style="color: #666; font-size: 14px;">
                O copia y pega este enlace en tu navegador:<br>
                <a href="${invitationUrl}" style="color: #2563eb; word-break: break-all;">${invitationUrl}</a>
              </p>
            </div>

            <div class="footer">
              <p>CuentasSiK - Gestión familiar simplificada</p>
              <p style="font-size: 12px; color: #999; margin-top: 10px;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      🏠 Invitación a Household

      ¡Hola!

      ${inviterName} te ha invitado a unirte al household ${householdName} en CuentasSiK.

      Haz clic en el siguiente enlace para aceptar la invitación:

      ${invitationUrl}

      ---
      CuentasSiK - Gestión familiar simplificada
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Invitation email sent to ${to}`);
}

/**
 * Función auxiliar para verificar la configuración SMTP
 */
export async function verifySmtpConfig(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('✅ SMTP configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ SMTP configuration error:', error);
    return false;
  }
}
