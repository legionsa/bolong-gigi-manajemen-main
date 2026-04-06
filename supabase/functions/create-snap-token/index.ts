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

    // Verify user
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)
    if (!user) throw new Error('Unauthorized')

    const { plan, accountId } = await req.json()

    // Verify account ownership
    const { data: account } = await supabaseClient
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .eq('owner_user_id', user.id)
      .single()

    if (!account) throw new Error('Account not found')

    const amount = plan === 'annual' ? 2990000 : 299000
    const description = plan === 'annual' ? 'DentiCare Pro - Tahunan' : 'DentiCare Pro - Bulanan'

    // In production: call Midtrans Snap API
    // For now: return mock token
    const midtransServerKey = Deno.env.get('MIDTRANS_SERVER_KEY')

    if (!midtransServerKey) {
      // Development mode - return mock response
      return new Response(
        JSON.stringify({
          snap_token: 'mock_snap_token_dev_mode',
          mock: true,
          message: 'Set MIDTRANS_SERVER_KEY to enable real payments'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Real Midtrans Snap integration
    const midtransUrl = 'https://app.midtrans.com/snap/v1/transactions'
    const auth = btoa(midtransServerKey + ':')

    const transaction = await fetch(midtransUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: `DCP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          gross_amount: amount,
        },
        customer_details: {
          email: user.email,
          first_name: user.user_metadata?.full_name || 'User',
        },
        item_details: [{
          id: plan,
          price: amount,
          quantity: 1,
          name: description,
        }],
        custom_fields: {
          account_id: accountId,
        },
      }),
    })

    const result = await transaction.json()
    if (result.error) throw new Error(result.error.messages)

    return new Response(
      JSON.stringify({ snap_token: result.token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})