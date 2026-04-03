// DentiCare Pro - BPJS Eligibility Edge Function
// Checks patient eligibility via P-Care API (BPJS endpoint)
// Endpoint: GET /v2/peserta/{nik}/prioritas/{tanggal}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// BPJS P-Care API configuration
const BPJS_PCARE_BASE_URL = "https://apijkn.bpjs-kesehatan.go.id/pcare-rest"

interface EligibilityRequest {
  nik: string
  tanggal?: string // Format: DD-MM-YYYY, defaults to today
  clinic_id?: string
}

interface BpjsCredential {
  cons_id: string
  secret_key: string
  app_code: string
  user_key?: string
}

/**
 * Get BPJS credentials for a clinic
 * Priority: 1. CLINIC_SECRETS (JSON blob), 2. SECRET_BPJS_* env vars
 */
async function getBpjsCredentials(supabaseClient: any, clinicId?: string): Promise<BpjsCredential | null> {
  // Try environment variables first (global fallback)
  const envConsId = Deno.env.get('SECRET_BPJS_CONS_ID')
  const envSecretKey = Deno.env.get('SECRET_BPJS_SECRET_KEY')
  const envAppCode = Deno.env.get('SECRET_BPJS_APP_CODE')
  const envUserKey = Deno.env.get('SECRET_BPJS_USER_KEY')

  if (envConsId && envSecretKey) {
    return {
      cons_id: envConsId,
      secret_key: envSecretKey,
      app_code: envAppCode || 'denticare',
      user_key: envUserKey,
    }
  }

  // Try to get from clinic credentials if clinic_id provided
  if (clinicId) {
    try {
      const { data: credentials, error } = await supabaseClient
        .from('controlroom.integration_credentials')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('integration', 'bpjs')
        .eq('status', 'active')
        .maybeSingle()

      if (!error && credentials) {
        // In production, would fetch actual secret from Vault using vault_key_id
        // For now, we'll use the credential record
        return {
          cons_id: credentials.vault_key_id, // This would be resolved from Vault
          secret_key: 'from-vault', // This would be the actual secret
          app_code: credentials.key_name,
        }
      }
    } catch (e) {
      console.error('Error fetching clinic credentials:', e)
    }
  }

  return null
}

/**
 * Generate BPJS signature for authentication
 */
function generateBpjsSignature(consId: string, secretKey: string, timestamp: string): string {
  const data = consId + secretKey + timestamp
  // Use SubtleCrypto for SHA-256 hash
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = crypto.subtle.digestSync('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Get current timestamp for BPJS API in format: DD-MM-YYYY HH:mm:ss
 */
function getBpjsTimestamp(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Check patient eligibility via BPJS P-Care API
 */
async function checkEligibility(
  nik: string,
  tanggal: string,
  credentials: BpjsCredential
): Promise<Response> {
  const timestamp = getBpjsTimestamp()
  const signature = generateBpjsSignature(credentials.cons_id, credentials.secret_key, timestamp)

  const url = `${BPJS_PCARE_BASE_URL}/v2/peserta/${nik}/prioritas/${tanggal}`

  console.log(`Checking eligibility for NIK: ${nik}, tanggal: ${tanggal}`)
  console.log(`Using credentials cons_id: ${credentials.cons_id}`)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-cons-id': credentials.cons_id,
        'X-timestamp': timestamp,
        'X-signature': signature,
        'user_key': credentials.user_key || '',
        'Content-Type': 'application/json',
      },
    })

    const responseText = await response.text()
    console.log(`BPJS API response status: ${response.status}`)
    console.log(`BPJS API response body: ${responseText}`)

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: 'BPJS API request failed',
          status: response.status,
          message: responseText,
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse response - BPJS returns wrapper with response
    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON from BPJS',
          raw: responseText,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the actual response data (BPJS wraps in response key)
    const responseData = data.response || data

    // Check if participant is active
    const participantStatus = responseData?.peserta?.aktif?.status?.toLowerCase()
    const isActive = participantStatus === 'aktif' || participantStatus === 'active'

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          nik: nik,
          is_eligible: isActive,
          status: participantStatus,
          participant: {
            noKartu: responseData?.peserta?.noKartu,
            nama: responseData?.peserta?.nama,
            nik: responseData?.peserta?.nik,
            kelas: responseData?.peserta?.kelas?.kelas || responseData?.peserta?.kelas,
            jenisPeserta: responseData?.peserta?.jenisPeserta,
            tanggalLahir: responseData?.peserta?.tglLahir,
            gender: responseData?.peserta?.sex,
            provider: {
              kdProvider: responseData?.peserta?.provUmum?.kdProvider,
              nmProvider: responseData?.peserta?.provUmum?.nmProvider,
            },
            aktif: responseData?.peserta?.aktif,
          },
          coverture: responseData?.coverture,
          last_updated: timestamp,
        },
        raw_response: responseData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error calling BPJS API:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to connect to BPJS API',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Parse request
    const { nik, tanggal, clinic_id }: EligibilityRequest = await req.json()

    if (!nik) {
      return new Response(
        JSON.stringify({ error: 'NIK is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate NIK format (16 digits)
    const nikClean = nik.replace(/\D/g, '')
    if (nikClean.length !== 16) {
      return new Response(
        JSON.stringify({ error: 'NIK must be 16 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Default to today if no tanggal provided
    const effectiveDate = tanggal || (() => {
      const now = new Date()
      const day = String(now.getDate()).padStart(2, '0')
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const year = now.getFullYear()
      return `${day}-${month}-${year}`
    })()

    // Get credentials
    const credentials = await getBpjsCredentials(supabaseClient, clinic_id)

    if (!credentials) {
      // In dev mode, return mock data
      const isDev = Deno.env.get('DEV_MODE') === 'true' || Deno.env.get('NODE_ENV') === 'development'

      if (isDev) {
        console.log('Dev mode: returning mock eligibility data')
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              nik: nikClean,
              is_eligible: true,
              status: 'aktif',
              participant: {
                noKartu: `000${nikClean}`,
                nama: 'MOCK PASIEN TEST',
                nik: nikClean,
                kelas: { kelas: 'Kelas I', kdKelas: '1' },
                jenisPeserta: 'PENERIMA BANTUAN IURAN (PBI)',
                tanggalLahir: '01-01-1990',
                gender: 'L',
                provider: {
                  kdProvider: '0165',
                  nmProvider: 'KLINIK GIGI MOCK',
                },
                aktif: {
                  status: 'AKTIF',
                  keterangan: 'PESERTA AKTIF',
                  tmt: '01-01-2024',
                },
              },
              coverture: {
                kelas: { kelas: 'Kelas I', kdKelas: '1' },
                tanggal: effectiveDate,
              },
            },
            mock: true,
            message: 'Dev mode: returning mock data. Configure SECRET_BPJS_* env vars for production.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          error: 'BPJS credentials not configured',
          message: 'Set SECRET_BPJS_CONS_ID, SECRET_BPJS_SECRET_KEY, and SECRET_BPJS_APP_CODE environment variables, or configure clinic credentials.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call BPJS API
    return await checkEligibility(nikClean, effectiveDate, credentials)

  } catch (error) {
    console.error('Eligibility check error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
