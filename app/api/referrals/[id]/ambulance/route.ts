import { NextRequest, NextResponse } from "next/server";
import { transitionReferral } from "@/lib/transition-referral";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await transitionReferral(id, "ambulance", "ambulance_arranged");
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ referral: result.referral });
}
