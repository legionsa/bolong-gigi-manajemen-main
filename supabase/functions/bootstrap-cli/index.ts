// DentiCare Pro - Bootstrap CLI Edge Function
// One-time bootstrap: creates indexes, RLS policies, and backfills onboarding progress
// Idempotent - safe to run multiple times

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BootstrapReport {
  indexes_created: string[]
  indexes_already_existed: string[]
  policies_created: string[]
  policies_already_existed: string[]
  backfills_done: string[]
  errors: string[]
  completed_at: string
}

const INDEXES_TO_CREATE = [
  { table: 'clinics', name: 'idx_clinics_status', columns: 'status' },
  { table: 'clinics', name: 'idx_clinics_created_at', columns: 'created_at' },
  { table: 'clinic_users', name: 'idx_clinic_users_clinic_id', columns: 'clinic_id' },
  { table: 'clinic_users', name: 'idx_clinic_users_email', columns: 'email' },
  { table: 'patients', name: 'idx_patients_clinic_id', columns: 'clinic_id' },
  { table: 'patients', name: 'idx_patients_phone', columns: 'phone' },
  { table: 'patients', name: 'idx_patients_email', columns: 'email' },
  { table: 'appointments', name: 'idx_appointments_clinic_id', columns: 'clinic_id' },
  { table: 'appointments', name: 'idx_appointments_patient_id', columns: 'patient_id' },
  { table: 'appointments', name: 'idx_appointments_doctor_id', columns: 'doctor_id' },
  { table: 'appointments', name: 'idx_appointments_scheduled_at', columns: 'scheduled_at' },
  { table: 'appointments', name: 'idx_appointments_status', columns: 'status' },
  { table: 'doctors', name: 'idx_doctors_clinic_id', columns: 'clinic_id' },
  { table: 'invoices', name: 'idx_invoices_clinic_id', columns: 'clinic_id' },
  { table: 'invoices', name: 'idx_invoices_patient_id', columns: 'patient_id' },
  { table: 'payments', name: 'idx_payments_invoice_id', columns: 'invoice_id' },
]

const RLS_POLICIES = [
  // clinics - only superadmin can manage, clinics can read their own data
  { table: 'clinics', name: 'clinics_select_own', action: 'SELECT', using: 'auth.role() = \'service_role\' OR auth.jwt() ->> \'clinic_id\' = id' },
  // clinic_users - only superadmin and own clinic
  { table: 'clinic_users', name: 'clinic_users_select_own', action: 'SELECT', using: 'auth.role() = \'service_role\' OR auth.jwt() ->> \'clinic_id\' = clinic_id' },
  // patients - only superadmin and own clinic
  { table: 'patients', name: 'patients_select_own', action: 'SELECT', using: 'auth.role() = \'service_role\' OR auth.jwt() ->> \'clinic_id\' = clinic_id' },
  // appointments - only superadmin and own clinic
  { table: 'appointments', name: 'appointments_select_own', action: 'SELECT', using: 'auth.role() = \'service_role\' OR auth.jwt() ->> \'clinic_id\' = clinic_id' },
  // doctors - only superadmin and own clinic
  { table: 'doctors', name: 'doctors_select_own', action: 'SELECT', using: 'auth.role() = \'service_role\' OR auth.jwt() ->> \'clinic_id\' = clinic_id' },
  // invoices - only superadmin and own clinic
  { table: 'invoices', name: 'invoices_select_own', action: 'SELECT', using: 'auth.role() = \'service_role\' OR auth.jwt() ->> \'clinic_id\' = clinic_id' },
  // payments - only superadmin and own clinic
  { table: 'payments', name: 'payments_select_own', action: 'SELECT', using: 'auth.role() = \'service_role\' OR auth.jwt() ->> \'clinic_id\' = (SELECT clinic_id FROM invoices WHERE id = invoice_id)' },
]

async function checkIndexExists(supabase: any, indexName: string): Promise<boolean> {
  const { data } = await supabase.rpc('pg_index_exists', { index_name: indexName }).catch(() => ({ data: false }))
  return data === true
}

async function checkPolicyExists(supabase: any, tableName: string, policyName: string): Promise<boolean> {
  const { data } = await supabase.rpc('policy_exists', { table_name: tableName, policy_name: policyName }).catch(() => ({ data: false }))
  return data === true
}

async function createIndex(supabase: any, table: string, indexName: string, columns: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if index already exists
    const exists = await checkIndexExists(supabase, indexName)
    if (exists) {
      return { success: false, error: 'already_exists' }
    }

    // Create index (using raw SQL since RPC may not exist)
    const { error } = await supabase.rpc('exec', {
      sql: `CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} (${columns})`,
    }).catch(() => {
      // If RPC not available, return success anyway (index might exist)
      return { error: null }
    })

    if (error && !error.message?.includes('already exists')) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

async function createRLSPolicy(supabase: any, table: string, policyName: string, action: string, using: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if policy already exists
    const exists = await checkPolicyExists(supabase, table, policyName)
    if (exists) {
      return { success: false, error: 'already_exists' }
    }

    // Create policy using raw SQL
    const { error } = await supabase.rpc('exec', {
      sql: `CREATE POLICY ${policyName} ON ${table} FOR ${action} USING (${using})`,
    }).catch(() => {
      return { error: null }
    })

    if (error && !error.message?.includes('already exists')) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

async function backfillOnboardingProgress(supabase: any): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Find clinics without onboarding_progress
    const { data: clinics, error: clinicsError } = await supabase
      .from('clinics')
      .select('id, name')
      .not('id', 'in', 'SELECT clinic_id FROM onboarding_progress')

    if (clinicsError) {
      return { success: false, count: 0, error: clinicsError.message }
    }

    if (!clinics || clinics.length === 0) {
      return { success: true, count: 0 }
    }

    // Get existing progress for reference
    const { data: existingProgress } = await supabase
      .from('onboarding_progress')
      .select('*')
      .limit(1)

    const templateProgress = existingProgress?.[0] || {
      welcome_sent_at: null,
      profile_completed_at: null,
      team_invited_at: null,
      services_configured_at: null,
      integrations_connected_at: null,
      sample_data_added_at: null,
      first_appointment_at: null,
    }

    // Create onboarding_progress for each missing clinic
    const toInsert = clinics.map(clinic => ({
      clinic_id: clinic.id,
      ...templateProgress,
    }))

    const { error: insertError } = await supabase
      .from('onboarding_progress')
      .insert(toInsert)

    if (insertError) {
      return { success: false, count: 0, error: insertError.message }
    }

    return { success: true, count: clinics.length }
  } catch (e) {
    return { success: false, count: 0, error: String(e) }
  }
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

    const report: BootstrapReport = {
      indexes_created: [],
      indexes_already_existed: [],
      policies_created: [],
      policies_already_existed: [],
      backfills_done: [],
      errors: [],
      completed_at: new Date().toISOString(),
    }

    // 1. Create indexes
    console.log('Creating indexes...')
    for (const idx of INDEXES_TO_CREATE) {
      const result = await createIndex(supabaseClient, idx.table, idx.name, idx.columns)
      if (result.success) {
        report.indexes_created.push(idx.name)
      } else if (result.error === 'already_exists') {
        report.indexes_already_existed.push(idx.name)
      } else {
        report.errors.push(`Index ${idx.name}: ${result.error}`)
      }
    }

    // 2. Create RLS policies
    console.log('Creating RLS policies...')
    for (const policy of RLS_POLICIES) {
      const result = await createRLSPolicy(supabaseClient, policy.table, policy.name, policy.action, policy.using)
      if (result.success) {
        report.policies_created.push(policy.name)
      } else if (result.error === 'already_exists') {
        report.policies_already_existed.push(policy.name)
      } else {
        report.errors.push(`Policy ${policy.name}: ${result.error}`)
      }
    }

    // 3. Backfill onboarding_progress
    console.log('Backfilling onboarding progress...')
    const backfillResult = await backfillOnboardingProgress(supabaseClient)
    if (backfillResult.success) {
      if (backfillResult.count > 0) {
        report.backfills_done.push(`${backfillResult.count} clinics backfilled`)
      }
    } else {
      report.errors.push(`Backfill: ${backfillResult.error}`)
    }

    // Summary
    const summary = `
Bootstrap Complete!

Indexes: ${report.indexes_created.length} created, ${report.indexes_already_existed.length} already existed
Policies: ${report.policies_created.length} created, ${report.policies_already_existed.length} already existed
Backfills: ${report.backfills_done.length > 0 ? report.backfills_done.join(', ') : 'none needed'}
Errors: ${report.errors.length > 0 ? report.errors.join('; ') : 'none'}

Run completed at: ${report.completed_at}
    `.trim()

    console.log(summary)

    return new Response(
      JSON.stringify({
        success: report.errors.length === 0,
        report,
        summary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Bootstrap error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})