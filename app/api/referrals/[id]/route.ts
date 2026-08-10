import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("referral_cases")
    .select("*, referring:referring_facility_id(name), receiving:receiving_facility_id(name)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ referral: data });
}
