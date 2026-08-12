import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  try {
    const context = await requireAuthenticatedUser();
    const isHospitalAdmin =
      context.networkAdmin ||
      context.memberships.some((m) => m.role === "hospital_admin" && m.status === "active");

    if (!isHospitalAdmin) {
      return NextResponse.json(
        { error: "Hospital administrator access only. Staff should use Create a referral on the homepage." },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, user: context.user, memberships: context.memberships });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }
}
