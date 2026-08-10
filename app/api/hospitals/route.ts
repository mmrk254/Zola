import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("hospitals").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ hospitals: data });
}
