import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser, resolveActingHospital } from "@/lib/auth";
import { CareLevel, CapacitySnapshot, FacilityStatus } from "@/lib/types";

const CARE_LEVELS: CareLevel[] = ["ICU", "HDU", "NICU"];
export const dynamic = "force-dynamic";
const FRESH = { "Cache-Control": "private, no-store, max-age=0" };

type CapacityRow = {
  hospital_id: string;
  care_level: CareLevel;
  available_beds: number;
  facility_status: FacilityStatus;
  updated_at: string;
};

function formatCapacity(rows: CapacityRow[], hospitalId: string): CapacitySnapshot[] {
  const byLevel = new Map(rows.map((row) => [row.care_level, row]));
  return CARE_LEVELS.map((level) => {
    const row = byLevel.get(level);
    if (!row) {
      return {
        hospital_id: hospitalId,
        care_level: level,
        available_beds: 0,
        facility_status: "open" as FacilityStatus,
        updated_at: "Never"
      };
    }
    return {
      hospital_id: row.hospital_id,
      care_level: row.care_level,
      available_beds: row.available_beds,
      facility_status: row.facility_status,
      updated_at: new Date(row.updated_at).toLocaleString()
    };
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const context = await requireAuthenticatedUser();
    resolveActingHospital(context, id, ["hospital_admin", "hospital_staff", "clinician"]);

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("hospital_capacity")
      .select("hospital_id, care_level, available_beds, facility_status, updated_at")
      .eq("hospital_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ capacity: formatCapacity((data ?? []) as CapacityRow[], id) }, { headers: FRESH });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const context = await requireAuthenticatedUser();
    resolveActingHospital(context, id, ["hospital_admin"]);

    const body = await request.json();
    const incoming = Array.isArray(body.capacity) ? body.capacity : [];
    if (incoming.length !== CARE_LEVELS.length || CARE_LEVELS.some(level => incoming.filter((row: CapacitySnapshot) => row.care_level === level).length !== 1) || incoming.some((row: CapacitySnapshot) => !Number.isSafeInteger(row.available_beds) || row.available_beds < 0 || !["open", "at_capacity", "closed"].includes(row.facility_status) || (row.hospital_id && row.hospital_id !== id))) {
      return NextResponse.json({ error: "Supply ICU, HDU and NICU capacity for this hospital, using non-negative whole bed counts and valid statuses." }, { status: 400 });
    }

    const rows = CARE_LEVELS.map((level) => {
      const item = incoming.find((row: CapacitySnapshot) => row.care_level === level);
      const availableBeds = Math.max(0, Number(item?.available_beds ?? 0));
      const facilityStatus = ["open", "at_capacity", "closed"].includes(item?.facility_status)
        ? item.facility_status
        : "open";

      return {
        hospital_id: id,
        care_level: level,
        available_beds: availableBeds,
        facility_status: facilityStatus,
        updated_at: new Date().toISOString()
      };
    });

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("hospital_capacity")
      .upsert(rows, { onConflict: "hospital_id,care_level" })
      .select("hospital_id, care_level, available_beds, facility_status, updated_at");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ capacity: formatCapacity((data ?? []) as CapacityRow[], id) }, { headers: FRESH });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }
}
