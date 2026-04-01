// DentiCare Pro - Patient OTP Edge Function
// Handles OTP generation and validation for patient portal login

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OtpRequest {
  action: 'generate' | 'verify'
  phone?: string
  email?: string
  otp_code?: string
  patient_id?: string
  channel?: 'whatsapp' | 'sms' | 'email'
  purpose?: 'login' | 'verify_identity' | 'reset_password'
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function hashOTP(otp: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(otp + Deno.env.get('OTP_SECRET') || 'denticare-otp-secret')
  const hashBuffer = crypto.subtle.digest('SHA-256', data)
  return hashBuffer.then(buffer => {
    const hashArray = Array.from(new Uint8Array(buffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { action, phone, email, otp_code, patient_id, channel = 'whatsapp', purpose = 'login' }: OtpRequest = await req.json()

    if (action === 'generate') {
      if (!phone && !email) {
        return new Response(
          JSON.stringify({ error: 'Phone or email required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let patientQuery = supabaseClient.from('patients').select('id, phone, email, full_name')

      if (phone) {
        patientQuery = patientQuery.eq('phone', phone)
      } else if (email) {
        patientQuery = patientQuery.eq('email', email)
      }

      const { data: patient, error: patientError } = await patientQuery.maybeSingle()

      if (patientError) {
        console.error('Patient lookup error:', patientError)
      }

      if (!patient) {
        return new Response(
          JSON.stringify({ error: 'Patient not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const expiresThreshold = new Date(Date.now() - 60 * 1000).toISOString()
      const { data: recentOtp } = await supabaseClient
        .from('patient_portal_tokens')
        .select('id')
        .eq('patient_id', patient.id)
        .eq('token_type', 'otp')
        .gte('created_at', expiresThreshold)
        .is('used_at', null)
        .maybeSingle()

      if (recentOtp) {
        return new Response(
          JSON.stringify({ error: 'OTP already sent. Please wait 60 seconds before requesting again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const otp = generateOTP()
      const hashedOtp = await hashOTP(otp)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

      await supabaseClient
        .from('patient_portal_tokens')
        .delete()
        .eq('patient_id', patient.id)
        .eq('token_type', 'otp')
        .is('used_at', null)

      const { error: insertError } = await supabaseClient
        .from('patient_portal_tokens')
        .insert({
          patient_id: patient.id,
          token_hash: hashedOtp,
          token_type: 'otp',
          expires_at: expiresAt.toISOString(),
        })

      if (insertError) {
        console.error('OTP insert error:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to generate OTP' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const message = channel === 'email'
        ? `Kode OTP DentiCare Pro Anda: ${otp}. Berlaku 5 menit. Jangan bagikan kode ini.`
        : `DentiCare Pro OTP: ${otp}. Berlaku 5 menit. JANGAN bagikan.`

      let sent = false
      if (channel === 'email' && patient.email) {
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        if (resendApiKey) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'DentiCare Pro <noreply@denticare.pro>',
                to: patient.email,
                subject: 'Kode OTP DentiCare Pro',
                text: message,
              }),
            })
            sent = true
          } catch (e) {
            console.error('Email send error:', e)
          }
        }
      } else if ((channel === 'whatsapp' || channel === 'sms') && patient.phone) {
        const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY')
        if (whatsappApiKey) {
          try {
            await fetch('https://waba.360dialog.io/v1/messages', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${whatsappApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: patient.phone, type: 'text', text: { body: message } }),
            })
            sent = true
          } catch (e) {
            console.error('WhatsApp send error:', e)
          }
        }
      }

      const isDev = Deno.env.get('DEV_MODE') === 'true'

      return new Response(
        JSON.stringify({
          success: true,
          message: sent ? 'OTP sent' : 'OTP generated (simulation mode)',
          patient_id: patient.id,
          patient_name: patient.full_name,
          expiresAt: expiresAt.toISOString(),
          ...(isDev && { otp_for_testing: otp }),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'verify') {
      if (!otp_code || !patient_id) {
        return new Response(
          JSON.stringify({ error: 'OTP code and patient_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: otpRecord, error: otpError } = await supabaseClient
        .from('patient_portal_tokens')
        .select('id, patient_id, token_hash, expires_at, used_at')
        .eq('patient_id', patient_id)
        .eq('token_type', 'otp')
        .is('used_at', null)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (otpError || !otpRecord) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired OTP' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const hashedInputOtp = await hashOTP(otp_code)

      if (hashedInputOtp !== otpRecord.token_hash) {
        return new Response(
          JSON.stringify({ error: 'Invalid OTP' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await supabaseClient
        .from('patient_portal_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', otpRecord.id)

      const sessionToken = crypto.randomUUID()
      const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

      await supabaseClient
        .from('patient_portal_tokens')
        .insert({
          patient_id: patient_id,
          token_hash: sessionToken,
          token_type: 'session',
          expires_at: sessionExpires.toISOString(),
        })

      return new Response(
        JSON.stringify({
          success: true,
          message: 'OTP verified',
          session_token: sessionToken,
          expires_at: sessionExpires.toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "generate" or "verify"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('OTP function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})