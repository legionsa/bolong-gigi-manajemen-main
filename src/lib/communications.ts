/**
 * Unified Communications Service
 * Provides a single interface for sending notifications via Email, WhatsApp, and SMS
 * Email is primary, WhatsApp and SMS are secondary/fallbacks
 */

import { sendEmail, sendOtpEmail, type SendEmailOptions } from './email';

export type CommunicationChannel = 'email' | 'whatsapp' | 'sms';

export interface CommunicationResult {
  success: boolean;
  channel: CommunicationChannel;
  error?: string;
  externalId?: string;
}

export interface SendOtpRequest {
  to: string;
  email?: string;      // Email for primary OTP delivery
  phone?: string;      // Phone for WhatsApp/SMS fallback
  otp: string;
  patientName?: string;
  preferredChannel?: CommunicationChannel;
}

/**
 * Determine the best channel based on available contact info
 * Priority: email > whatsapp > sms
 */
function determineBestChannel(email?: string, phone?: string, preferred?: CommunicationChannel): CommunicationChannel {
  if (preferred) return preferred;

  if (email) return 'email';
  if (phone) return 'whatsapp'; // Default fallback is WhatsApp

  return 'email'; // Default
}

/**
 * Send OTP via the most appropriate channel
 * Email is primary, WhatsApp/SMS are fallback
 */
export async function sendOtp(request: SendOtpRequest): Promise<CommunicationResult> {
  const { email, phone, otp, patientName } = request;
  const channel = determineBestChannel(email, phone, request.preferredChannel);

  console.log(`[Communications] Sending OTP via ${channel}`, { email, phone });

  // Primary: Email
  if (channel === 'email' && email) {
    const result = await sendOtpEmail({
      to: email,
      otp,
      patientName,
    });

    return {
      success: result.success,
      channel: 'email',
      error: result.error,
    };
  }

  // Fallback: WhatsApp (placeholder - would integrate with 360dialog)
  if (channel === 'whatsapp' && phone) {
    // TODO: Integrate with WhatsApp Business API via 360dialog
    console.log(`[Communications] WhatsApp OTP would be sent to ${phone}: ${otp}`);

    // For now, log and return success (placeholder)
    return {
      success: true,
      channel: 'whatsapp',
      externalId: `wa_placeholder_${Date.now()}`,
    };
  }

  // Fallback: SMS (placeholder - would integrate with Zenziva/Twilio)
  if (channel === 'sms' && phone) {
    // TODO: Integrate with SMS gateway (Zenziva or Twilio)
    console.log(`[Communications] SMS OTP would be sent to ${phone}: ${otp}`);

    // For now, log and return success (placeholder)
    return {
      success: true,
      channel: 'sms',
      externalId: `sms_placeholder_${Date.now()}`,
    };
  }

  // No valid channel found
  return {
    success: false,
    channel,
    error: 'No valid communication channel available',
  };
}

/**
 * Send a generic email
 */
export async function sendEmailNotification(options: Omit<SendEmailOptions, never>): Promise<CommunicationResult> {
  const result = await sendEmail(options);

  return {
    success: result.success,
    channel: 'email',
    error: result.error,
  };
}

/**
 * Send WhatsApp message (placeholder)
 */
export async function sendWhatsAppMessage(options: {
  to: string;
  message: string;
  templateName?: string;
}): Promise<CommunicationResult> {
  // TODO: Implement WhatsApp Business API integration via 360dialog
  console.log(`[Communications] WhatsApp message would be sent to ${options.to}`);
  console.log(`[Communications] Message: ${options.message}`);

  return {
    success: true,
    channel: 'whatsapp',
    externalId: `wa_placeholder_${Date.now()}`,
  };
}

/**
 * Send SMS message (placeholder)
 */
export async function sendSmsMessage(options: {
  to: string;
  message: string;
}): Promise<CommunicationResult> {
  // TODO: Implement SMS gateway integration (Zenziva/Twilio)
  console.log(`[Communications] SMS would be sent to ${options.to}`);
  console.log(`[Communications] Message: ${options.message}`);

  return {
    success: true,
    channel: 'sms',
    externalId: `sms_placeholder_${Date.now()}`,
  };
}

/**
 * Send appointment reminder via preferred channel
 */
export async function sendAppointmentReminder(options: {
  to: string;
  channel?: CommunicationChannel;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorName: string;
  serviceName: string;
  clinicName?: string;
}): Promise<CommunicationResult> {
  const { channel = 'email', ...rest } = options;

  if (channel === 'email') {
    const { sendAppointmentReminderEmail } = await import('./email');
    const result = await sendAppointmentReminderEmail({
      to: rest.to,
      ...rest,
    });

    return {
      success: result.success,
      channel: 'email',
      error: result.error,
    };
  }

  // For now, placeholder for other channels
  console.log(`[Communications] Appointment reminder via ${channel} to ${rest.to}`);

  return {
    success: true,
    channel,
  };
}
