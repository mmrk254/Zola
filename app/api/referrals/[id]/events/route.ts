import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("referral_events")
    .select("*")
    .eq("referral_case_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data });
}
