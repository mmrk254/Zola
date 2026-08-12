import { NextRequest, NextResponse } from "next/server";
import { transitionReferral } from "@/lib/transition-referral";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const receiving_facility_id = body.receiving_facility_id;
  const acting_hospital_id = body.acting_hospital_id ?? receiving_facility_id;

  const result = await transitionReferral(
    id,
    "accept",
    "hospital_accepted",
    receiving_facility_id ? { receiving_facility_id } : {},
    { receiving_facility_id, acting_hospital_id }
  );
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ referral: result.referral });
}
