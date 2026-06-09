import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase.rpc('close_expired_auctions')

  if (error) {
    console.error('close_expired_auctions error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  console.log(`Closed ${data} expired auctions`)
  return new Response(JSON.stringify({ closed: data }), { status: 200 })
})
