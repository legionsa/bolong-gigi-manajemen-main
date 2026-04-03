// DentiCare Pro - BPJS Submit Claim Edge Function
// Submits claim to P-Care (SEP creation and INACBGrouper)
// Endpoints: POST /v2/sep (SEP creation), POST /v2/grouper (INACBGrouper)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// BPJS P-Care API configuration
const BPJS_PCARE_BASE_URL = "https://apijkn.bpjs-kesehatan.go.id/pcare-rest"

interface ClaimRequest {
  action: 'create_sep' | 'submit_claim' | 'group_claim'
  appointment_id: string
  clinic_id: string
  patient_id: string

  // SEP data
  sep_data?: {
    noKartu: string
    tglSep: string           // DD-MM-YYYY
    tglRujukan?: string      // DD-MM-YYYY
    noRujukan?: string
    kdRujukan?: string       // '1' for Faskes Pertama, '2' for Rujukan
    ppkPelayanan: string     // Faskes code
    jnsPelayanan: string     // '1' for Rawat Jalan, '2' for Rawat Inap
    catat?: string
    kdDiagnosa1: string      // ICD-10 primary diagnosis
    kdDiagnosa2?: string     // ICD-10 secondary diagnosis
    kdPoli?: string
    kdTkp?: string           // TKP code (usually '10' for dentist)
  }

  // INACBGrouper data (for procedure grouping/tariff calculation)
  group_data?: {
    claim_data: {
      diag_kasus: string     // '1' for new, '2' for repeat
      diag_primary: string   // ICD-10
      procedures: string[]    // ICD-9-CM array
      admits?: string
      stay_length?: number
      base_class?: string
    }
  }
}

interface BpjsCredential {
  cons_id: string
  secret_key: string
  app_code: string
  user_key?: string
  ppk_code?: string         // Faskes code for the clinic
}

/**
 * Get BPJS credentials for a clinic
 */
async function getBpjsCredentials(supabaseClient: any, clinicId: string): Promise<BpjsCredential | null> {
  // Try environment variables first (global fallback)
  const envConsId = Deno.env.get('SECRET_BPJS_CONS_ID')
  const envSecretKey = Deno.env.get('SECRET_BPJS_SECRET_KEY')
  const envAppCode = Deno.env.get('SECRET_BPJS_APP_CODE')
  const envUserKey = Deno.env.get('SECRET_BPJS_USER_KEY')
  const envPpkCode = Deno.env.get('SECRET_BPJS_PPK_CODE')

  if (envConsId && envSecretKey) {
    return {
      cons_id: envConsId,
      secret_key: envSecretKey,
      app_code: envAppCode || 'denticare',
      user_key: envUserKey,
      ppk_code: envPpkCode,
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
        return {
          cons_id: credentials.vault_key_id,
          secret_key: 'from-vault',
          app_code: credentials.key_name,
          ppk_code: credentials.key_name, // Would be resolved from clinic data
        }
      }

      // Get clinic's BPJS faskes ID from controlroom.clinics
      const { data: clinic, error: clinicError } = await supabaseClient
        .from('controlroom.clinics')
        .select('bpjs_faskes_id')
        .eq('id', clinicId)
        .maybeSingle()

      if (!clinicError && clinic?.bpjs_faskes_id) {
        return {
          cons_id: credentials?.vault_key_id || 'missing',
          secret_key: 'from-vault',
          app_code: credentials?.key_name || 'denticare',
          ppk_code: clinic.bpjs_faskes_id,
        }
      }
    } catch (e) {
      console.error('Error fetching clinic credentials:', e)
    }
  }

  return null
}

/**
 * Get clinic data including faskes ID
 */
async function getClinicData(supabaseClient: any, clinicId: string) {
  const { data: clinic, error } = await supabaseClient
    .from('public.clinics')
    .select('id, name, bpjs_faskes_id')
    .eq('id', clinicId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching clinic:', error)
    return null
  }

  return clinic
}

/**
 * Get patient data with NIK
 */
async function getPatientData(supabaseClient: any, patientId: string) {
  const { data: patient, error } = await supabaseClient
    .from('public.patients')
    .select('id, full_name, nik, phone, address, date_of_birth, gender, bpjs_number, bpjs_active')
    .eq('id', patientId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching patient:', error)
    return null
  }

  return patient
}

/**
 * Get appointment data with diagnoses and procedures
 */
async function getAppointmentData(supabaseClient: any, appointmentId: string) {
  const { data: appointment, error } = await supabaseClient
    .from('public.appointments')
    .select(`
      id,
      appointment_date,
      status,
      chief_complaint,
      diagnosis_notes,
      treatment_notes,
      doctor_id,
      diagnoses (
        id,
        icd10_code,
        description
      ),
      procedures (
        id,
        icd9cm_code,
        description
      )
    `)
    .eq('id', appointmentId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching appointment:', error)
    return null
  }

  return appointment
}

/**
 * Generate BPJS signature for authentication
 */
function generateBpjsSignature(consId: string, secretKey: string, timestamp: string): string {
  const data = consId + secretKey + timestamp
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = crypto.subtle.digestSync('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Get current timestamp for BPJS API
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
 * Create SEP (Surat Eligibilitas Peserta) via BPJS P-Care API
 */
async function createSep(
  sepData: ClaimRequest['sep_data'],
  credentials: BpjsCredential
): Promise<{ success: boolean; sep_no?: string; data?: any; error?: string }> {
  const timestamp = getBpjsTimestamp()
  const signature = generateBpjsSignature(credentials.cons_id, credentials.secret_key, timestamp)

  const url = `${BPJS_PCARE_BASE_URL}/v2/sep`

  console.log('Creating SEP with data:', JSON.stringify(sepData))

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-cons-id': credentials.cons_id,
        'X-timestamp': timestamp,
        'X-signature': signature,
        'user_key': credentials.user_key || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sepData),
    })

    const responseText = await response.text()
    console.log(`SEP creation response status: ${response.status}`)
    console.log(`SEP creation response body: ${responseText}`)

    if (!response.ok) {
      return {
        success: false,
        error: `BPJS API error: ${response.status} - ${responseText}`,
      }
    }

    const data = JSON.parse(responseText)

    // Check for SEP response - usually returns in data/sep key
    const sepResponse = data?.response || data?.data?.sep || data

    if (sepResponse?.noSep) {
      return {
        success: true,
        sep_no: sepResponse.noSep,
        data: sepResponse,
      }
    }

    // Handle different response formats
    if (data?.response?.noSep) {
      return {
        success: true,
        sep_no: data.response.noSep,
        data: data.response,
      }
    }

    return {
      success: false,
      error: `Unexpected response format: ${responseText}`,
    }
  } catch (error) {
    console.error('Error creating SEP:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Submit claim to INACBGrouper for tariff calculation
 */
async function submitToGrouper(
  groupData: ClaimRequest['group_data'],
  credentials: BpjsCredential
): Promise<{ success: boolean; grouped?: any; error?: string }> {
  const timestamp = getBpjsTimestamp()
  const signature = generateBpjsSignature(credentials.cons_id, credentials.secret_key, timestamp)

  const url = `${BPJS_PCARE_BASE_URL}/v2/grouper`

  console.log('Submitting to grouper with data:', JSON.stringify(groupData))

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-cons-id': credentials.cons_id,
        'X-timestamp': timestamp,
        'X-signature': signature,
        'user_key': credentials.user_key || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groupData),
    })

    const responseText = await response.text()
    console.log(`Grouper response status: ${response.status}`)
    console.log(`Grouper response body: ${responseText}`)

    if (!response.ok) {
      return {
        success: false,
        error: `BPJS API error: ${response.status} - ${responseText}`,
      }
    }

    const data = JSON.parse(responseText)
    const grouperResponse = data?.response || data

    return {
      success: true,
      grouped: grouperResponse,
    }
  } catch (error) {
    console.error('Error submitting to grouper:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Save claim to database
 */
async function saveClaim(
  supabaseClient: any,
  claimData: {
    appointment_id: string
    clinic_id: string
    patient_id: string
    sep_no: string
    diagnoses: any[]
    procedures: any[]
    total_claim_amount: number
    created_by: string
  }
) {
  // Check if claim already exists for this appointment
  const { data: existing } = await supabaseClient
    .from('public.bpjs_claims')
    .select('id')
    .eq('appointment_id', claimData.appointment_id)
    .maybeSingle()

  if (existing) {
    // Update existing claim
    const { data, error } = await supabaseClient
      .from('public.bpjs_claims')
      .update({
        sep_no: claimData.sep_no,
        diagnoses: claimData.diagnoses,
        procedures: claimData.procedures,
        total_claim_amount: claimData.total_claim_amount,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('appointment_id', claimData.appointment_id)
      .select()
      .single()

    if (error) throw error
    return { data, isUpdate: true }
  }

  // Create new claim
  const { data, error } = await supabaseClient
    .from('public.bpjs_claims')
    .insert({
      appointment_id: claimData.appointment_id,
      clinic_id: claimData.clinic_id,
      patient_id: claimData.patient_id,
      sep_no: claimData.sep_no,
      diagnoses: claimData.diagnoses,
      procedures: claimData.procedures,
      total_claim_amount: claimData.total_claim_amount,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      created_by: claimData.created_by,
    })
    .select()
    .single()

  if (error) throw error
  return { data, isUpdate: false }
}

/**
 * Get user from auth header
 */
async function getUserFromReq(supabaseClient: any, req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseClient.auth.getUser(token)

  if (error || !user) return null
  return user
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

    // Get user from request
    const user = await getUserFromReq(supabaseClient, req)
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const requestData: ClaimRequest = await req.json()

    const { action, appointment_id, clinic_id, patient_id, sep_data, group_data } = requestData

    if (!appointment_id || !clinic_id || !patient_id) {
      return new Response(
        JSON.stringify({ error: 'appointment_id, clinic_id, and patient_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get credentials
    const credentials = await getBpjsCredentials(supabaseClient, clinic_id)

    if (!credentials) {
      // Dev mode mock response
      const isDev = Deno.env.get('DEV_MODE') === 'true' || Deno.env.get('NODE_ENV') === 'development'

      if (isDev) {
        console.log('Dev mode: returning mock SEP')

        // Get appointment data for mock response
        const appointment = await getAppointmentData(supabaseClient, appointment_id)

        const mockSepNo = `SEP${Date.now()}`
        const mockDiagnoses = appointment?.diagnoses?.map((d: any) => ({
          code: d.icd10_code,
          description: d.description,
        })) || [{ code: 'K02.0', description: 'Dental Caries' }]

        const mockProcedures = appointment?.procedures?.map((p: any) => ({
          code: p.icd9cm_code,
          description: p.description,
        })) || [{ code: '23.01', description: 'Extraction of erupted tooth' }]

        // Save mock claim
        try {
          const { data: savedClaim } = await saveClaim(supabaseClient, {
            appointment_id,
            clinic_id,
            patient_id,
            sep_no: mockSepNo,
            diagnoses: mockDiagnoses,
            procedures: mockProcedures,
            total_claim_amount: 150000,
            created_by: user.id,
          })

          return new Response(
            JSON.stringify({
              success: true,
              mock: true,
              message: 'Dev mode: mock SEP created',
              data: {
                sep_no: mockSepNo,
                sep_created_at: new Date().toISOString(),
                diagnoses: mockDiagnoses,
                procedures: mockProcedures,
                claim: savedClaim,
                total_claim_amount: 150000,
              },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (saveError) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to save mock claim',
              details: saveError instanceof Error ? saveError.message : 'Unknown error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      return new Response(
        JSON.stringify({
          error: 'BPJS credentials not configured',
          message: 'Set SECRET_BPJS_* environment variables or configure clinic credentials.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get related data
    const [clinic, patient, appointment] = await Promise.all([
      getClinicData(supabaseClient, clinic_id),
      getPatientData(supabaseClient, patient_id),
      getAppointmentData(supabaseClient, appointment_id),
    ])

    if (!clinic || !patient) {
      return new Response(
        JSON.stringify({ error: 'Clinic or patient not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build SEP data from request or derive from appointment
    const sepPayload = sep_data || {
      noKartu: patient.bpjs_number || patient.nik, // Use BPJS number or NIK
      tglSep: (() => {
        const now = new Date()
        const day = String(now.getDate()).padStart(2, '0')
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const year = now.getFullYear()
        return `${day}-${month}-${year}`
      })(),
      kdRujukan: '1', // Faskes Pertama
      ppkPelayanan: credentials.ppk_code || clinic.bpjs_faskes_id || '0165',
      jnsPelayanan: '1', // Rawat Jalan
      catat: appointment?.chief_complaint || 'Pemeriksaan dan perawatan gigi',
      kdDiagnosa1: appointment?.diagnoses?.[0]?.icd10_code || 'K02.0',
      kdDiagnosa2: appointment?.diagnoses?.[1]?.icd10_code,
      kdPoli: '26', // Gigi dan Mulut (26 is standard for dental in BPJS)
      kdTkp: '10', // TKP code for dental
    }

    // Create SEP
    const sepResult = await createSep(sepPayload, credentials)

    if (!sepResult.success || !sepResult.sep_no) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create SEP',
          details: sepResult.error,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare diagnoses and procedures for saving
    const diagnoses = appointment?.diagnoses?.map((d: any) => ({
      code: d.icd10_code,
      description: d.description,
    })) || (sep_data?.kdDiagnosa1 ? [{ code: sep_data.kdDiagnosa1, description: '' }] : [])

    const procedures = appointment?.procedures?.map((p: any) => ({
      code: p.icd9cm_code,
      description: p.description,
    })) || []

    // If group_data provided, submit to INACBGrouper for tariff calculation
    let totalClaimAmount = 0
    if (group_data) {
      const grouperResult = await submitToGrouper(group_data, credentials)
      if (grouperResult.success && grouperResult.grouped) {
        totalClaimAmount = grouperResult.grouped?.total_tariff || grouperResult.grouped?.biaya || 0
      }
    }

    // Save claim to database
    const saveResult = await saveClaim(supabaseClient, {
      appointment_id,
      clinic_id,
      patient_id,
      sep_no: sepResult.sep_no,
      diagnoses,
      procedures,
      total_claim_amount: totalClaimAmount,
      created_by: user.id,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sep_no: sepResult.sep_no,
          sep_created_at: new Date().toISOString(),
          diagnoses,
          procedures,
          total_claim_amount: totalClaimAmount,
          claim: saveResult.data,
          grouper_response: group_data ? null : undefined, // Would include if called
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Submit claim error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
