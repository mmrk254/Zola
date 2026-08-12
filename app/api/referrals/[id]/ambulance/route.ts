import { NextRequest, NextResponse } from "next/server";
import { transitionReferral } from "@/lib/transition-referral";

async function withBody(request: NextRequest, id: string, action: string, toStatus: Parameters<typeof transitionReferral>[2]) {
  const body = await request.json().catch(() => ({}));
  const result = await transitionReferral(id, action, toStatus, {}, { acting_hospital_id: body.acting_hospital_id });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ referral: result.referral });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withBody(request, id, "ambulance", "ambulance_arranged");
}
