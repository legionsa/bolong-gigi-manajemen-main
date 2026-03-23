import { Resend } from 'resend';

// Initialize Resend client - will use API key from environment
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY || 're_placeholder_key');

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendOtpOptions {
  to: string;
  otp: string;
  patientName?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Skip if using placeholder key
    if (!import.meta.env.VITE_RESEND_API_KEY || import.meta.env.VITE_RESEND_API_KEY === 're_placeholder_key') {
      console.log('[Email] Resend API key not configured. Email would be sent to:', to);
      console.log('[Email] Subject:', subject);
      console.log('[Email] Content:', text || ' (HTML only)');
      return { success: true };
    }

    const { data, error } = await resend.emails.send({
      from: import.meta.env.VITE_EMAIL_FROM || 'DentiCare Pro <onboarding@resend.dev>',
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('[Email] Send error:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Sent successfully:', data?.id);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Send OTP email for patient portal login
 */
export async function sendOtpEmail({ to, otp, patientName }: SendOtpOptions): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 32px 24px; text-align: center; }
        .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2563eb; background: #eff6ff; padding: 16px 32px; border-radius: 8px; display: inline-block; margin: 16px 0; }
        .message { color: #6b7280; font-size: 14px; line-height: 1.6; }
        .warning { background: #fef3c7; color: #92400e; padding: 12px; border-radius: 8px; font-size: 12px; margin-top: 16px; }
        .footer { background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Kode OTP DentiCare Pro</h1>
        </div>
        <div class="content">
          <p class="message">Halo${patientName ? ` ${patientName}` : ''},</p>
          <p class="message">Berikut adalah kode OTP untuk login ke Patient Portal:</p>
          <div class="otp-code">${otp}</div>
          <p class="message">Kode ini berlaku selama <strong>5 menit</strong>.</p>
          <div class="warning">
            ⚠️ Jangan bagikan kode ini kepada siapapun. Tim DentiCare tidak akan pernah meminta kode OTP Anda.
          </div>
        </div>
        <div class="footer">
          <p>DentiCare Pro - Sistem Manajemen Klinik Gigi</p>
          <p>Email ini dikirim otomatis, mohon jangan balas.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Halo${patientName ? ` ${patientName}` : ''},

Berikut adalah kode OTP untuk login ke Patient Portal:

${otp}

Kode ini berlaku selama 5 menit.

PERINGATAN: Jangan bagikan kode ini kepada siapapun. Tim DentiCare tidak akan pernah meminta kode OTP Anda.

---
DentiCare Pro - Sistem Manajemen Klinik Gigi
  `;

  return sendEmail({
    to,
    subject: `🔐 Kode OTP DentiCare Pro - ${otp}`,
    html,
    text,
  });
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminderEmail(options: {
  to: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorName: string;
  serviceName: string;
  clinicName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const clinicName = options.clinicName || 'DentiCare Pro';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 24px; text-align: center; }
        .content { padding: 32px 24px; }
        .info-grid { display: grid; gap: 12px; margin: 20px 0; }
        .info-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; }
        .info-icon { font-size: 20px; }
        .info-label { font-size: 12px; color: #6b7280; }
        .info-value { font-size: 14px; font-weight: 600; color: #111827; }
        .cta { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
        .footer { background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 Pengingat Janji Temu</h1>
        </div>
        <div class="content">
          <p>Halo <strong>${options.patientName}</strong>,</p>
          <p>Ini adalah pengingat bahwa Anda memiliki janji temu di <strong>${clinicName}</strong>:</p>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-icon">📅</span>
              <div>
                <div class="info-label">Tanggal</div>
                <div class="info-value">${options.appointmentDate}</div>
              </div>
            </div>
            <div class="info-item">
              <span class="info-icon">⏰</span>
              <div>
                <div class="info-label">Waktu</div>
                <div class="info-value">${options.appointmentTime}</div>
              </div>
            </div>
            <div class="info-item">
              <span class="info-icon">👨‍⚕️</span>
              <div>
                <div class="info-label">Dokter</div>
                <div class="info-value">Dr. ${options.doctorName}</div>
              </div>
            </div>
            <div class="info-item">
              <span class="info-icon">🏥</span>
              <div>
                <div class="info-label">Layanan</div>
                <div class="info-value">${options.serviceName}</div>
              </div>
            </div>
          </div>

          <p class="info-label">Silakan tiba 15 menit lebih awal. Sampai jumpa! 😊</p>
        </div>
        <div class="footer">
          <p>${clinicName} - Sistem Manajemen Klinik Gigi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: options.to,
    subject: `📅 Pengingat Janji Temu - ${options.appointmentDate} ${options.appointmentTime}`,
    html,
  });
}

/**
 * Send welcome email for new patient portal activation
 */
export async function sendWelcomeEmail(options: {
  to: string;
  patientName: string;
  clinicName?: string;
  portalUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const clinicName = options.clinicName || 'DentiCare Pro';
  const portalUrl = options.portalUrl || 'https://denticare.example.com/portal';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; text-align: center; }
        .content { padding: 32px 24px; }
        .feature-list { list-style: none; padding: 0; margin: 20px 0; }
        .feature-list li { padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 12px; }
        .feature-icon { font-size: 20px; }
        .cta { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
        .footer { background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Selamat Datang di Patient Portal!</h1>
        </div>
        <div class="content">
          <p>Halo <strong>${options.patientName}</strong>,</p>
          <p>Selamat! Anda sekarang terdaftar di Patient Portal <strong>${clinicName}</strong>.</p>

          <p>Dengan portal ini Anda dapat:</p>
          <ul class="feature-list">
            <li><span class="feature-icon">📅</span> Melihat jadwal janji temu</li>
            <li><span class="feature-icon">📋</span> Mengakses rekam medis</li>
            <li><span class="feature-icon">💳</span> Melihat dan membayar invoice</li>
            <li><span class="feature-icon">📝</span> Update data pribadi</li>
          </ul>

          <a href="${portalUrl}" class="cta">Kunjungi Patient Portal</a>
        </div>
        <div class="footer">
          <p>${clinicName} - Sistem Manajemen Klinik Gigi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: options.to,
    subject: `🎉 Selamat Datang di Patient Portal ${clinicName}!`,
    html,
  });
}
