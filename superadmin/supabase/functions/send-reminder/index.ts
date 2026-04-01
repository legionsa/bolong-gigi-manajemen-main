import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderPayload {
  appointmentId: string
  patientId: string
  channel: 'email' | 'whatsapp' | 'sms'
  reminderType: '48h' | '24h' | '2h'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let payload: ReminderPayload

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      payload = await req.json()
    } else {
      const text = await req.text()
      const params = new URLSearchParams(text)
      payload = {
        appointmentId: params.get('appointmentId') || '',
        patientId: params.get('patientId') || '',
        channel: (params.get('channel') as 'email' | 'whatsapp' | 'sms') || 'email',
        reminderType: (params.get('reminderType') as '48h' | '24h' | '2h') || '24h',
      }
    }

    const { appointmentId, patientId, channel, reminderType } = payload

    console.log(`Processing ${reminderType} reminder for appointment ${appointmentId} via ${channel}`)

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        patients:patient_id (
          id,
          full_name,
          email,
          phone_number
        ),
        users:doctor_id (
          full_name
        ),
        services:service_id (
          name
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      console.error('Appointment not found:', appointmentError)
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const patient = appointment.patients as any
    const doctor = appointment.users as any
    const service = appointment.services as any

    if (!patient) {
      console.error('Patient not found for appointment')
      return new Response(
        JSON.stringify({ error: 'Patient not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const appointmentTime = appointment.appointment_time.substring(0, 5)

    let message = ''
    let recipient = ''
    let externalId = ''

    if (channel === 'email' && patient.email) {
      recipient = patient.email
      message = `Halo ${patient.full_name},

Ini adalah pengingat janji temu di DentiCare Pro:

📅 Tanggal: ${appointmentDate}
⏰ Waktu: ${appointmentTime}
👨‍⚕️ Dokter: Dr. ${doctor?.full_name || '-'}
🏥 Layanan: ${service?.name || '-'}

Silakan tiba 15 menit lebih awal. Sampai jumpa!

Pesan ini dikirim otomatis oleh sistem.`
    } else if (channel === 'whatsapp' && patient.phone_number) {
      recipient = patient.phone_number
      message = `Halo ${patient.full_name}! 👋

Ini pengingat janji temu di DentiCare Pro:

📅 ${appointmentDate}
⏰ ${appointmentTime}
👨‍⚕️ Dr. ${doctor?.full_name || '-'}
🏥 ${service?.name || '-'}

Balas "OK" untuk konfirmasi. Sampai jumpa! 😊`
    } else if (channel === 'sms' && patient.phone_number) {
      recipient = patient.phone_number
      message = `DentiCare Pro: Pengingat janji temu ${appointmentDate} jam ${appointmentTime}. Dr. ${doctor?.full_name || '-'}. Balas OK untuk konfirmasi.`
    } else {
      return new Response(
        JSON.stringify({ error: 'No valid recipient for selected channel' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (channel === 'email' && resendApiKey && patient.email) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'DentiCare Pro <noreply@denticare.example.com>',
            to: patient.email,
            subject: `📅 Pengingat Janji Temu - ${appointmentDate}`,
            text: message,
          }),
        })

        if (emailResponse.ok) {
          const emailData = await emailResponse.json()
          externalId = emailData.id

          await supabase.from('communication_log').insert({
            patient_id: patientId,
            appointment_id: appointmentId,
            channel: 'email',
            recipient: patient.email,
            message,
            status: 'sent',
            external_id: externalId,
            sent_at: new Date().toISOString(),
          })

          await supabase
            .from('appointments')
            .update({
              reminder_status: `sent_${reminderType}`,
              email_reminder_sent: true,
            })
            .eq('id', appointmentId)

          console.log(`Email reminder sent to ${patient.email}`)
        } else {
          throw new Error(`Resend API error: ${emailResponse.status}`)
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError)

        await supabase.from('communication_log').insert({
          patient_id: patientId,
          appointment_id: appointmentId,
          channel: 'email',
          recipient: patient.email,
          message,
          status: 'failed',
          error_message: String(emailError),
        })
      }
    } else if (channel === 'whatsapp') {
      console.log(`[WHATSAPP PLACEHOLDER] Would send to ${recipient}: ${message}`)

      await supabase.from('communication_log').insert({
        patient_id: patientId,
        appointment_id: appointmentId,
        channel: 'whatsapp',
        recipient,
        message,
        status: 'sent',
        external_id: `wa_placeholder_${Date.now()}`,
        sent_at: new Date().toISOString(),
      })

      await supabase
        .from('appointments')
        .update({
          reminder_status: `sent_${reminderType}`,
          whatsapp_reminder_sent: true,
        })
        .eq('id', appointmentId)
    } else if (channel === 'sms') {
      console.log(`[SMS PLACEHOLDER] Would send to ${recipient}: ${message}`)

      await supabase.from('communication_log').insert({
        patient_id: patientId,
        appointment_id: appointmentId,
        channel: 'sms',
        recipient,
        message,
        status: 'sent',
        external_id: `sms_placeholder_${Date.now()}`,
        sent_at: new Date().toISOString(),
      })

      await supabase
        .from('appointments')
        .update({
          reminder_status: `sent_${reminderType}`,
          sms_reminder_sent: true,
        })
        .eq('id', appointmentId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        channel,
        recipient,
        externalId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-reminder:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})