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

    const body = await req.json()
    const { order_id, transaction_status, gross_amount } = body

    // Verify signature key
    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY') ?? ''
    const expectedKey = Buffer.from(serverKey + ':').toString('base64')
    if (req.headers.get('x鲜花键') !== expectedKey) {
      throw new Error('Invalid webhook signature')
    }

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      // Extract account_id from order_id or custom fields
      const accountId = body.custom_fields?.account_id || order_id.split('-')[1]

      // Determine tier
      const tier = gross_amount > 1000000 ? 'pro' : 'pro'
      const expiresAt = new Date(Date.now() + (gross_amount > 1000000 ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()

      // Update account tier
      await supabaseClient
        .from('accounts')
        .update({
          tier: 'pro',
          tier_activated_at: new Date().toISOString(),
          tier_expires_at: expiresAt,
        })
        .eq('id', accountId)

      // Reactivate over_limit users
      await supabaseClient
        .from('clinic_users')
        .update({ status: 'active' })
        .eq('account_id', accountId)
        .eq('status', 'over_limit')

      // Log subscription event
      await supabaseClient.from('subscription_events').insert({
        account_id: accountId,
        event_type: 'upgraded',
        from_tier: 'free',
        to_tier: 'pro',
        amount_idr: gross_amount,
        payment_method: body.payment_type,
        reference_id: body.transaction_id,
      })
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})