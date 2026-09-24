import nodemailer from 'nodemailer';

export interface EmailSendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
  code?: 'NOT_CONFIGURED' | 'DELIVERY_FAILED' | 'INVALID_RECIPIENT' | 'RATE_LIMITED' | 'SUCCESS';
}

export interface EmailProviderConfig {
  provider: 'smtp' | 'resend' | 'sendgrid' | 'postmark' | 'none';
  fromEmail: string;
  fromName: string;
  details?: Record<string, any>;
}

/**
 * Detects the active transactional email provider configuration.
 * Returns provider name or 'none' if unconfigured.
 */
export function getEmailProviderConfig(): EmailProviderConfig {
  const fromName = process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'Aaditech Security';
  const fromEmail =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.RESEND_FROM ||
    process.env.SENDGRID_FROM ||
    process.env.POSTMARK_FROM ||
    'security@aaditechs.in';

  // 1. Check Resend API
  if (process.env.RESEND_API_KEY?.trim()) {
    return {
      provider: 'resend',
      fromEmail,
      fromName,
      details: { hasApiKey: true },
    };
  }

  // 2. Check SendGrid API
  if (process.env.SENDGRID_API_KEY?.trim()) {
    return {
      provider: 'sendgrid',
      fromEmail,
      fromName,
      details: { hasApiKey: true },
    };
  }

  // 3. Check Postmark API
  if (process.env.POSTMARK_SERVER_TOKEN?.trim()) {
    return {
      provider: 'postmark',
      fromEmail,
      fromName,
      details: { hasToken: true },
    };
  }

  // 4. Check SMTP (Hostinger / Custom SMTP)
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim();
  if (smtpHost && smtpUser && smtpPass) {
    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    return {
      provider: 'smtp',
      fromEmail,
      fromName,
      details: {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        user: smtpUser,
      },
    };
  }

  return {
    provider: 'none',
    fromEmail,
    fromName,
  };
}

/**
 * Checks if a transactional email provider is configured.
 */
export function isEmailServiceConfigured(): boolean {
  const config = getEmailProviderConfig();
  return config.provider !== 'none';
}

/**
 * Sends a transactional email using the configured provider.
 * If no provider is configured, returns an explicit error without pretending delivery succeeded.
 */
export async function sendTransactionalEmail(options: EmailSendOptions): Promise<EmailSendResult> {
  const config = getEmailProviderConfig();

  if (config.provider === 'none') {
    return {
      success: false,
      code: 'NOT_CONFIGURED',
      error:
        'Transactional email provider is not configured on the server. Please configure SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) or API credentials (RESEND_API_KEY, SENDGRID_API_KEY, POSTMARK_SERVER_TOKEN) in environment variables.',
    };
  }

  const fromFormatted = `"${config.fromName}" <${options.from || config.fromEmail}>`;

  // --- Provider 1: Resend HTTP API ---
  if (config.provider === 'resend') {
    try {
      const apiKey = process.env.RESEND_API_KEY?.trim();
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromFormatted,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]+>/g, ''),
        }),
      });

      const data = (await res.json()) as any;
      if (res.ok && data?.id) {
        return {
          success: true,
          code: 'SUCCESS',
          messageId: data.id,
          provider: 'resend',
        };
      }
      return {
        success: false,
        code: 'DELIVERY_FAILED',
        error: data?.message || `Resend returned HTTP ${res.status}`,
        provider: 'resend',
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'DELIVERY_FAILED',
        error: `Resend dispatch failed: ${err?.message}`,
        provider: 'resend',
      };
    }
  }

  // --- Provider 2: SendGrid API ---
  if (config.provider === 'sendgrid') {
    try {
      const apiKey = process.env.SENDGRID_API_KEY?.trim();
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: options.to }] }],
          from: { email: options.from || config.fromEmail, name: config.fromName },
          subject: options.subject,
          content: [
            {
              type: 'text/html',
              value: options.html,
            },
          ],
        }),
      });

      if (res.status >= 200 && res.status < 300) {
        return {
          success: true,
          code: 'SUCCESS',
          messageId: res.headers.get('x-message-id') || `sg_${Date.now()}`,
          provider: 'sendgrid',
        };
      }
      const data = await res.text();
      return {
        success: false,
        code: 'DELIVERY_FAILED',
        error: `SendGrid returned HTTP ${res.status}: ${data}`,
        provider: 'sendgrid',
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'DELIVERY_FAILED',
        error: `SendGrid dispatch failed: ${err?.message}`,
        provider: 'sendgrid',
      };
    }
  }

  // --- Provider 3: Postmark API ---
  if (config.provider === 'postmark') {
    try {
      const serverToken = process.env.POSTMARK_SERVER_TOKEN?.trim();
      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': serverToken || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: fromFormatted,
          To: options.to,
          Subject: options.subject,
          HtmlBody: options.html,
          TextBody: options.text || options.html.replace(/<[^>]+>/g, ''),
        }),
      });

      const data = (await res.json()) as any;
      if (res.ok && data?.MessageID) {
        return {
          success: true,
          code: 'SUCCESS',
          messageId: data.MessageID,
          provider: 'postmark',
        };
      }
      return {
        success: false,
        code: 'DELIVERY_FAILED',
        error: data?.Message || `Postmark returned HTTP ${res.status}`,
        provider: 'postmark',
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'DELIVERY_FAILED',
        error: `Postmark dispatch failed: ${err?.message}`,
        provider: 'postmark',
      };
    }
  }

  // --- Provider 4: SMTP (Hostinger / Standard SMTP via Nodemailer) ---
  if (config.provider === 'smtp') {
    try {
      const details = config.details!;
      const transporter = nodemailer.createTransport({
        host: details.host,
        port: details.port,
        secure: details.secure,
        auth: {
          user: details.user,
          pass: process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim(),
        },
        tls: {
          rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
        },
      });

      const info = await transporter.sendMail({
        from: fromFormatted,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]+>/g, ''),
      });

      return {
        success: true,
        code: 'SUCCESS',
        messageId: info.messageId,
        provider: 'smtp',
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'DELIVERY_FAILED',
        error: `SMTP delivery error: ${err?.message}`,
        provider: 'smtp',
      };
    }
  }

  return {
    success: false,
    code: 'NOT_CONFIGURED',
    error: 'Unrecognized transactional email provider configuration.',
  };
}

/**
 * Sends a password reset email to the user with secure formatting and security notices.
 * Never logs or exposes raw tokens or sensitive URLs in output logs.
 */
export async function sendPasswordResetEmail(
  user: { email: string; full_name?: string },
  resetUrl: string
): Promise<EmailSendResult> {
  const recipientName = user.full_name?.trim() || 'Valued User';
  const brandName = 'Aaditech Business Growth Architecture (ABGA)';
  const brandUrl = 'https://bga.aaditechs.in';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your ABGA Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #312e81 0%, #1e1b4b 100%); border-bottom: 1px solid #3730a3;">
              <div style="display: inline-block; padding: 12px 16px; background-color: #4f46e5; border-radius: 12px; font-weight: 900; font-size: 18px; color: #ffffff; letter-spacing: -0.5px;">
                ABGA
              </div>
              <h1 style="margin: 16px 0 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                Password Reset Request
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #cbd5e1;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 22px; color: #94a3b8;">
                We received a request to reset your password for your <strong>${brandName}</strong> account (<code>${user.email}</code>).
              </p>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4); text-align: center;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="background-color: #0f172a; border-radius: 10px; border: 1px solid #334155; padding: 16px; margin: 24px 0 0;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px;">
                  🔒 Security Details
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 18px; color: #94a3b8;">
                  <li>This link expires automatically in <strong>30 minutes</strong>.</li>
                  <li>This link is for <strong>single use only</strong>.</li>
                  <li>If you did not request this password reset, please disregard this email. Your existing credentials remain completely secure.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #64748b;">
                ${brandName} • <a href="${brandUrl}" style="color: #6366f1; text-decoration: none;">bga.aaditechs.in</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Automated Transactional Security Service • Do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Hello ${recipientName},

We received a request to reset your password for your ${brandName} account (${user.email}).

Please click the following link to reset your password within 30 minutes:
${resetUrl}

This link is valid for 30 minutes and can only be used once. If you did not request this reset, please ignore this email.

---
${brandName}
https://bga.aaditechs.in
  `.trim();

  return sendTransactionalEmail({
    to: user.email,
    subject: 'Reset your password - Aaditech Business Growth (ABGA)',
    html,
    text,
  });
}

/**
 * Validates connection to transactional email provider (SMTP handshake or API key check).
 */
export async function testEmailConnection(creds?: Record<string, any>): Promise<{ success: boolean; message: string; details?: any }> {
  // 1. If explicit credentials passed from UI
  if (creds && (creds.smtpHost || creds.host || creds.apiKey || creds.resendApiKey || creds.sendgridApiKey || creds.postmarkToken)) {
    const host = (creds.smtpHost || creds.host || '').trim();
    const user = (creds.smtpUser || creds.user || creds.email || '').trim();
    const pass = (creds.smtpPass || creds.pass || creds.password || '').trim();
    const port = Number(creds.smtpPort || creds.port) || 465;
    const apiKey = (creds.apiKey || creds.resendApiKey || creds.sendgridApiKey || creds.postmarkToken || '').trim();
    const provider = (creds.provider || (apiKey.startsWith('re_') ? 'resend' : apiKey.startsWith('SG.') ? 'sendgrid' : 'smtp')).toLowerCase().trim();

    if (provider === 'resend' || apiKey.startsWith('re_')) {
      try {
        const res = await fetch('https://api.resend.com/api-keys', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          return { success: true, message: 'Verified! Resend API key is valid and active.' };
        }
        return { success: false, message: `Resend API authentication failed (HTTP ${res.status}).` };
      } catch (err: any) {
        return { success: false, message: `Resend connection error: ${err?.message}` };
      }
    }

    if (provider === 'sendgrid' || apiKey.startsWith('SG.')) {
      try {
        const res = await fetch('https://api.sendgrid.com/v3/user/profile', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          return { success: true, message: 'Verified! SendGrid API key is valid and active.' };
        }
        return { success: false, message: `SendGrid API authentication failed (HTTP ${res.status}).` };
      } catch (err: any) {
        return { success: false, message: `SendGrid connection error: ${err?.message}` };
      }
    }

    if (provider === 'postmark') {
      try {
        const res = await fetch('https://api.postmarkapp.com/server', {
          headers: { 'X-Postmark-Server-Token': apiKey, 'Accept': 'application/json' },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const data: any = await res.json();
          return { success: true, message: `Verified! Postmark server active (${data.Name || 'Server'}).` };
        }
        return { success: false, message: `Postmark authentication failed (HTTP ${res.status}).` };
      } catch (err: any) {
        return { success: false, message: `Postmark connection error: ${err?.message}` };
      }
    }

    if (host && user && pass) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
        });
        await transporter.verify();
        return { success: true, message: `Verified! Connected to SMTP Server at ${host}:${port} as ${user}.` };
      } catch (err: any) {
        return { success: false, message: `SMTP verification failed: ${err?.message}` };
      }
    }
  }

  // 2. Check system-level configuration
  const config = getEmailProviderConfig();
  if (config.provider === 'none') {
    return {
      success: false,
      message: 'No transactional email provider is configured. Please provide SMTP details or an API key.',
    };
  }

  if (config.provider === 'smtp') {
    const details = config.details!;
    try {
      const transporter = nodemailer.createTransport({
        host: details.host,
        port: details.port,
        secure: details.secure,
        auth: {
          user: details.user,
          pass: process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim(),
        },
        tls: { rejectUnauthorized: false },
      });
      await transporter.verify();
      return { success: true, message: `Verified! Active SMTP connection to ${details.host}:${details.port} (${details.user}).` };
    } catch (err: any) {
      return { success: false, message: `System SMTP connection error: ${err?.message}` };
    }
  }

  if (config.provider === 'resend') {
    try {
      const res = await fetch('https://api.resend.com/api-keys', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY?.trim()}` },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        return { success: true, message: 'Verified! System Resend API connection is active.' };
      }
      return { success: false, message: `Resend API authentication returned HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, message: `Resend API error: ${err?.message}` };
    }
  }

  if (config.provider === 'sendgrid') {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY?.trim()}` },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        return { success: true, message: 'Verified! System SendGrid API connection is active.' };
      }
      return { success: false, message: `SendGrid API authentication returned HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, message: `SendGrid API error: ${err?.message}` };
    }
  }

  if (config.provider === 'postmark') {
    try {
      const res = await fetch('https://api.postmarkapp.com/server', {
        headers: { 'X-Postmark-Server-Token': process.env.POSTMARK_SERVER_TOKEN?.trim() || '', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        return { success: true, message: 'Verified! System Postmark API connection is active.' };
      }
      return { success: false, message: `Postmark API authentication returned HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, message: `Postmark API error: ${err?.message}` };
    }
  }

  return { success: false, message: 'Unrecognized email provider configuration.' };
}

