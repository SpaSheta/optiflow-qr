import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Verify the caller is a super admin using their JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super admin status
    const { data: saCheck } = await anonClient
      .from("super_admins")
      .select("id")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!saCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: not a super admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      restaurant_name,
      slug,
      contact_name,
      contact_phone,
      contact_email,
      address,
      currency,
      tax_rate,
      plan,
      notes,
      tables,
    } = body;

    if (!restaurant_name || !slug || !contact_email) {
      return new Response(
        JSON.stringify({ error: "restaurant_name, slug, and contact_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create auth user (with email pre-confirmed)
    const { data: newUserData, error: createUserErr } = await adminClient.auth.admin.createUser({
      email: contact_email,
      email_confirm: true,
      password: crypto.randomUUID(), // random temp password, will be reset
    });

    if (createUserErr) {
      // If user already exists, try to find them
      if (createUserErr.message?.includes("already been registered")) {
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        const existingUser = users?.find((u: any) => u.email === contact_email);
        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: "User exists but could not be found" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Use existing user
        newUserData!.user = existingUser;
      } else {
        return new Response(
          JSON.stringify({ error: createUserErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const ownerId = newUserData!.user!.id;

    // 2. Insert restaurant
    const { data: restaurantData, error: restErr } = await adminClient
      .from("restaurants")
      .insert({
        name: restaurant_name,
        slug,
        owner_user_id: ownerId,
        contact_name: contact_name || null,
        contact_phone: contact_phone || null,
        email: contact_email,
        address: address || null,
        currency: currency || "IQD",
        tax_rate: tax_rate ?? 0,
        plan: plan || "starter",
        notes: notes || null,
        status: "active",
        created_by_super_admin: true,
      })
      .select()
      .single();

    if (restErr) {
      return new Response(
        JSON.stringify({ error: `Restaurant insert failed: ${restErr.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Insert default theme
    await adminClient.from("restaurant_themes").insert({
      restaurant_id: restaurantData.id,
    });

    // 4. Insert tables (trigger auto-creates QR tokens)
    if (tables && Array.isArray(tables) && tables.length > 0) {
      const tableRows = tables.map((t: any) => ({
        restaurant_id: restaurantData.id,
        table_number: String(t.table_number),
        label: t.label || null,
        capacity: t.capacity || 4,
      }));

      const { error: tablesErr } = await adminClient.from("tables").insert(tableRows);
      if (tablesErr) {
        console.error("Tables insert error:", tablesErr.message);
      }
    }

    // 5. Generate password reset link so owner can set their password
    const { data: resetData, error: resetErr } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: contact_email,
    });

    if (resetErr) {
      console.error("Password reset link error:", resetErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        restaurant: restaurantData,
        owner_user_id: ownerId,
        reset_link_sent: !resetErr,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
