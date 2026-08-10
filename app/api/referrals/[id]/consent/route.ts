import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServiceClient();
  const body = await request.json();

  const checks: boolean[] = body.checks ?? [];
  const allConfirmed = checks.length === 4 && checks.every(Boolean);

  if (!allConfirmed) {
    return NextResponse.json(
      { error: "All four consent checks must be confirmed before a referral can be sent." },
      { status: 400 }
    );
  }

  const { data: current } = await supabase
    .from("referral_cases")
    .select("status")
    .eq("id", id)
    .single();

  if (!current || !["draft", "consent_pending"].includes(current.status)) {
    return NextResponse.json({ error: "Referral is not awaiting consent." }, { status: 409 });
  }

  const { data: referral, error } = await supabase
    .from("referral_cases")
    .update({ status: "ready_to_send", consent_obtained: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("referral_events").insert({
    referral_case_id: id,
    from_status: current.status,
    to_status: "ready_to_send"
  });

  return NextResponse.json({ referral });
}
