import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { canAccessReferral, requireAuthenticatedUser } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let context;
  try {
    context = await requireAuthenticatedUser();
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("referral_cases")
    .select("*, referring:referring_facility_id(name), receiving:receiving_facility_id(name)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  if (!canAccessReferral(context, { ...data, status: data.status })) {
    return NextResponse.json({ error: "You do not have access to this referral." }, { status: 403 });
  }

  return NextResponse.json({ referral: data });
}
