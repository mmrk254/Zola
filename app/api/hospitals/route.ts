import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser, getAccessibleHospitalIds } from "@/lib/auth";

export async function GET(request: NextRequest) {
  let context;
  try {
    context = await requireAuthenticatedUser();
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  if (context.networkAdmin) {
    const { data, error } = await supabase.from("hospitals").select("*").order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ hospitals: data });
  }

  const hospitalIds = getAccessibleHospitalIds(context);
  if (!hospitalIds.length) {
    return NextResponse.json({ hospitals: [] });
  }

  const { data, error } = await supabase
    .from("hospitals")
    .select("*")
    .in("id", hospitalIds)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ hospitals: data });
}
