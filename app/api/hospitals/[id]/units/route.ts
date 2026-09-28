import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser, resolveActingHospital } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const context = await requireAuthenticatedUser(); resolveActingHospital(context, id, ["clinician", "hospital_staff", "hospital_admin"]); const { data, error } = await getServiceClient().from("facility_units").select("*").eq("hospital_id", id).order("name"); if (error) throw error; return NextResponse.json({ units: data ?? [] }); } catch (error: any) { return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 }); }
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const context = await requireAuthenticatedUser(); resolveActingHospital(context, id, ["hospital_admin"]); const body = await request.json(); if (!body.name?.trim() || !["ICU", "HDU", "NICU"].includes(body.care_level)) return NextResponse.json({ error: "Unit name and care level are required." }, { status: 400 }); const { data, error } = await getServiceClient().from("facility_units").insert({ hospital_id: id, name: body.name.trim(), care_level: body.care_level, unit_type: body.unit_type?.trim() || "ward", capacity: Number(body.capacity) || 0, available_beds: Number(body.available_beds) || 0 }).select().single(); if (error) throw error; return NextResponse.json({ unit: data }, { status: 201 }); } catch (error: any) { return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 }); }
}
