import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/auth";

export async function GET() {
  const context = await getCurrentUserContext();
  if (!context) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return NextResponse.json({
    user: context.user,
    networkAdmin: context.networkAdmin,
    memberships: context.memberships
  });
}
