import { NextRequest, NextResponse } from "next/server";
import { transitionReferral } from "@/lib/transition-referral";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!reason) {
    return NextResponse.json({ error: "A decline reason is required (e.g. no beds available)." }, { status: 400 });
  }

  const result = await transitionReferral(
    id,
    "decline",
    "ready_to_send",
    { receiving_facility_id: null },
    {
      acting_hospital_id: body.acting_hospital_id,
      receiving_facility_id: body.receiving_facility_id ?? body.acting_hospital_id,
      notes: reason
    }
  );
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ referral: result.referral });
}
