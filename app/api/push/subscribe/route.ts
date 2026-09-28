import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser, resolveActingHospital } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const context = await requireAuthenticatedUser();
    const body = await request.json();
    const acting = resolveActingHospital(context, body.hospital_id, ["clinician", "hospital_staff", "hospital_admin"]);
    if (!body.subscription?.endpoint) return NextResponse.json({ error: "A push subscription is required." }, { status: 400 });
    const { error } = await getServiceClient().from("push_subscriptions").upsert({
      hospital_id: acting.hospitalId, user_id: context.user.id, endpoint: body.subscription.endpoint, subscription: body.subscription, updated_at: new Date().toISOString()
    }, { onConflict: "endpoint" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: any) { return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 }); }
}
