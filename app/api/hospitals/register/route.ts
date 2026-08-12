import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { hospital_name, admin_name, admin_email, phone, hospital_type } = body;

  if (!hospital_name || !admin_name || !admin_email || !phone) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { error } = await supabase.from("hospital_applications").insert({
    hospital_name,
    admin_name,
    admin_email,
    phone,
    hospital_type: hospital_type ?? "referring",
    status: "pending"
  });

  if (error) {
    if (error.message.includes("hospital_applications")) {
      return NextResponse.json(
        { error: "Registration storage is not configured yet. Contact the platform team directly." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
