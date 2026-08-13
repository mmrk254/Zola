import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: membershipId } = await params;
    const body = await request.json();
    const supabase = getServiceClient();

    const { data: membership, error: fetchError } = await supabase
      .from("hospital_memberships")
      .select("id, hospital_id, user_id, role, status, users(id, name, email)")
      .eq("id", membershipId)
      .single();

    if (fetchError || !membership) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }

    const context = await requireAuthenticatedUser();
    const targetHospitalId = membership.hospital_id;

    const canEdit =
      context.networkAdmin ||
      context.memberships.some(
        (m) =>
          m.hospital_id === targetHospitalId && m.status === "active" && m.role === "hospital_admin"
      );

    if (!canEdit) {
      return NextResponse.json(
        { error: "You must be a hospital admin for this facility to edit staff accounts." },
        { status: 403 }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.role && ["clinician", "hospital_staff", "hospital_admin"].includes(body.role)) {
      updates.role = body.role;
    }
    if (body.status && ["active", "revoked"].includes(body.status)) {
      updates.status = body.status;
    }

    const { data: updated, error } = await supabase
      .from("hospital_memberships")
      .update(updates)
      .eq("id", membershipId)
      .select("id, role, status, created_at, users(id, name, email)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.name?.trim()) {
      await supabase.from("users").update({ name: body.name.trim() }).eq("id", membership.user_id);
    }

    if (updates.role) {
      await supabase.from("users").update({ role: updates.role }).eq("id", membership.user_id);
    }

    if (body.password && body.password.length >= 8) {
      await supabase.auth.admin.updateUserById(membership.user_id, { password: body.password });
    }

    return NextResponse.json({ staff: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }
}
