import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id, amount, currency } = await req.json();

    if (!payment_id || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing payment_id or amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: Integrate with real FIB API
    // For now, return placeholder data so the UI flow works
    // When FIB API credentials are configured, replace this with actual API calls:
    //
    // 1. POST to FIB API to create a payment request
    // 2. Receive QR code URL and deep link
    // 3. Set up webhook for payment status updates
    //
    // FIB API docs: https://docs.fib.iq

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update payment with placeholder FIB data
    await supabase.from("payments").update({
      fib_transaction_id: `fib_${payment_id.slice(0, 8)}`,
      // In production, these would come from FIB API response
      fib_qr_url: null,
      fib_deep_link: null,
    }).eq("id", payment_id);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: `fib_${payment_id.slice(0, 8)}`,
        qr_url: null, // Will be populated when FIB API is integrated
        deep_link: null, // Will be populated when FIB API is integrated
        message: "FIB payment initiated. Awaiting FIB API integration for QR code generation.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
