// DentiCare Pro - Process WhatsApp Webhook Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CONFIRM_KEYWORDS = ['ok', 'iya', 'ya', 'yes', 'confirm', 'konfirmasi', 'sudah', 'siap']
const CANCEL_KEYWORDS = ['batal', 'cancel', 'no', 'tidak', 'gak', 'tidak jadi']
const RESCHEDULE_KEYWORDS = ['reschedule', 'ubah jadwal', 'ganti jadwal', 'jadwalkan ulang']

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = await req.json()
    const messages = payload.messages || []

    for (const message of messages) {
      if (message.type !== 'text') continue

      const from = message.from
      const messageBody = message.text?.body?.toLowerCase().trim() || ''
      const messageId = message.id

      // Find patient by phone
      const { data: patient } = await supabase
        .from('patients')
        .select('id, full_name, phone_number')
        .eq('phone_number', from)
        .single()

      if (!patient) continue

      // Find pending appointment
      const { data: appointment } = await supabase
        .from('appointments')
        .select('id, appointment_date_time, status, reminder_status')
        .eq('patient_id', patient.id)
        .in('status', ['Dijadwalkan', 'confirmed'])
        .order('appointment_date_time', { ascending: true })
        .limit(1)
        .single()

      if (!appointment) continue

      let action: 'confirm' | 'cancel' | 'reschedule' | null = null

      if (CONFIRM_KEYWORDS.some(k => messageBody.includes(k))) action = 'confirm'
      else if (CANCEL_KEYWORDS.some(k => messageBody.includes(k))) action = 'cancel'
      else if (RESCHEDULE_KEYWORDS.some(k => messageBody.includes(k))) action = 'reschedule'

      if (!action) {
        await sendWhatsAppMessage(from,
          'Halo ' + patient.full_name + '! Balas: OK-Konfirmasi, BATAL-Batalkan, RESCHEDULE-Ubah jadwal',
          supabaseUrl, supabaseServiceKey)
        continue
      }

      if (action === 'confirm') {
        await supabase.from('appointments').update({ status: 'confirmed', reminder_status: 'confirmed' }).eq('id', appointment.id)
        await sendWhatsAppMessage(from, 'Appointment dikonfirmasi! Sampai jumpa.', supabaseUrl, supabaseServiceKey)
      } else if (action === 'cancel') {
        await supabase.from('appointments').update({ status: 'Dibatalkan', reminder_status: 'cancelled' }).eq('id', appointment.id)
        await sendWhatsAppMessage(from, 'Appointment dibatalkan. Gunakan online booking untuk jadwal baru.', supabaseUrl, supabaseServiceKey)
      } else if (action === 'reschedule') {
        await supabase.from('appointments').update({ status: 'Menunggu Konfirmasi Ulang', reminder_status: 'reschedule_requested' }).eq('id', appointment.id)
        await sendWhatsAppMessage(from, 'Permintaan ubah jadwal diterima. Tim akan menghubungi Anda.', supabaseUrl, supabaseServiceKey)
      }

      await supabase.from('communication_log').insert({
        patient_id: patient.id,
        appointment_id: appointment.id,
        channel: 'whatsapp',
        recipient: from,
        message: 'Patient action: ' + action,
        status: 'delivered',
        external_id: messageId,
      })
    }

    return new Response(JSON.stringify({ status: 'processed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

async function sendWhatsAppMessage(to: string, message: string, supabaseUrl: string, serviceRoleKey: string): Promise<string> {
  const apiKey = Deno.env.get('WHATSAPP_API_KEY')
  if (!apiKey) return 'wa_placeholder_' + Date.now()

  try {
    const response = await fetch('https://waba.360dialog.io/v1/messages', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, type: 'text', text: { body: message } }),
    })
    const result = await response.json()
    return result.messages?.[0]?.id || 'wa_' + Date.now()
  } catch (error: any) {
    console.error('WhatsApp error:', error)
    throw error
  }
}