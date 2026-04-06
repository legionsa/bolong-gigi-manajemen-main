import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const now = new Date().toISOString()

    // 1. Find expired trials
    const { data: expiredAccounts } = await supabaseClient
      .from('accounts')
      .select('id, owner_user_id, tier')
      .eq('tier', 'pro_trial')
      .lt('trial_ends_at', now)

    if (expiredAccounts && expiredAccounts.length > 0) {
      const expiredIds = expiredAccounts.map(a => a.id)

      // 2. Set tier to 'free'
      await supabaseClient
        .from('accounts')
        .update({ tier: 'free' })
        .in('id', expiredIds)

      // 3. Set over_limit status on excess staff
      // For each expired account, find clinics with excess users and mark over_limit
      for (const account of expiredAccounts) {
        // Get all clinic_users for this account
        const { data: clinicUsers } = await supabaseClient
          .from('clinic_users')
          .select('*, clinics!inner(*)')
          .eq('account_id', account.id)

        if (!clinicUsers) continue

        // Group by clinic
        const byClinic: Record<string, typeof clinicUsers> = {}
        for (const cu of clinicUsers) {
          if (!byClinic[cu.clinic_id]) byClinic[cu.clinic_id] = []
          byClinic[cu.clinic_id].push(cu)
        }

        // For each clinic, check limits
        for (const [clinicId, users] of Object.entries(byClinic)) {
          const doctors = users.filter(u => u.role === 'doctor' && u.status === 'active')
          const frontDesks = users.filter(u => u.role === 'front_desk' && u.status === 'active')
          const admins = users.filter(u => u.role === 'admin' && u.status === 'active')

          // Free tier: max 2 doctors, 1 front desk, 1 admin
          const toDeactivate = [
            ...doctors.slice(2),  // keep first 2
            ...frontDesks.slice(1), // keep first 1
            ...admins.slice(1),   // keep first 1
          ]

          for (const cu of toDeactivate) {
            await supabaseClient
              .from('clinic_users')
              .update({ status: 'over_limit' })
              .eq('id', cu.id)
          }
        }

        // 4. Log subscription events
        await supabaseClient.from('subscription_events').insert({
          account_id: account.id,
          event_type: 'trial_expired',
          from_tier: 'pro_trial',
          to_tier: 'free',
          notes: 'Trial expired automatically',
        })
      }
    }

    // 5. Send expiry warning emails (3 days before)
    const warningDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: warningAccounts } = await supabaseClient
      .from('accounts')
      .select('id, owner_user_id')
      .eq('tier', 'pro_trial')
      .gte('trial_ends_at', now)
      .lt('trial_ends_at', warningDate)

    // TODO: Send emails via sendOtp/sendGrid for warningAccounts

    return new Response(
      JSON.stringify({
        expired: expiredAccounts?.length || 0,
        warned: warningAccounts?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})