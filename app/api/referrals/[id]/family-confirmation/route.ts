import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { transitionReferral } from "@/lib/transition-referral";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { relationship, name, phone, consent_given } = body;

  if (!relationship || !name || !phone) {
    return NextResponse.json(
      { error: "relationship, name, and phone are required" },
      { status: 400 }
    );
  }

  const result = await transitionReferral(id, "family-confirmation", "family_confirmed");
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const supabase = getServiceClient();
  const { data: confirmation, error } = await supabase
    .from("family_confirmations")
    .insert({ referral_case_id: id, relationship, name, phone, consent_given: Boolean(consent_given) })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ referral: result.referral, confirmation });
}
