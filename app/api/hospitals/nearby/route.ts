import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { haversineKm } from "@/lib/geolocation";
import { demoHospitals, demoCapacity } from "@/lib/demo-data";
import { CareLevel } from "@/lib/types";

export type NearbyHospital = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
  available_beds: number;
  facility_status: string;
};

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser();
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }

  const lat = parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(request.nextUrl.searchParams.get("lng") ?? "");
  const careLevel = request.nextUrl.searchParams.get("care_level") as CareLevel | null;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  if (!careLevel || !["ICU", "HDU", "NICU"].includes(careLevel)) {
    return NextResponse.json({ error: "care_level must be ICU, HDU, or NICU" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    const results = buildNearbyFromDemo(lat, lng, careLevel);
    return NextResponse.json({ hospitals: results });
  }

  const supabase = getServiceClient();

  const { data: hospitals, error: hospError } = await supabase
    .from("hospitals")
    .select("id, name, address, latitude, longitude")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (hospError) return NextResponse.json({ error: hospError.message }, { status: 500 });

  const { data: capacity, error: capError } = await supabase
    .from("hospital_capacity")
    .select("hospital_id, care_level, available_beds, facility_status")
    .eq("care_level", careLevel)
    .gt("available_beds", 0)
    .eq("facility_status", "open");

  if (capError) return NextResponse.json({ error: capError.message }, { status: 500 });

  const capacityMap = new Map(
    (capacity ?? []).map((c) => [c.hospital_id, c])
  );

  const results: NearbyHospital[] = (hospitals ?? [])
    .filter((h) => capacityMap.has(h.id))
    .map((h) => {
      const cap = capacityMap.get(h.id)!;
      const distance_km = haversineKm(
        { latitude: lat, longitude: lng },
        { latitude: h.latitude!, longitude: h.longitude! }
      );
      return {
        id: h.id,
        name: h.name,
        address: h.address,
        latitude: h.latitude!,
        longitude: h.longitude!,
        distance_km,
        available_beds: cap.available_beds,
        facility_status: cap.facility_status
      };
    })
    .sort((a, b) => a.distance_km - b.distance_km);

  return NextResponse.json({ hospitals: results });
}

function buildNearbyFromDemo(lat: number, lng: number, careLevel: CareLevel): NearbyHospital[] {
  return demoHospitals
    .filter((h) => h.latitude != null && h.longitude != null)
    .map((h) => {
      const cap = demoCapacity.find((c) => c.hospital_id === h.id && c.care_level === careLevel);
      const distance_km = haversineKm(
        { latitude: lat, longitude: lng },
        { latitude: h.latitude!, longitude: h.longitude! }
      );
      return {
        id: h.id,
        name: h.name,
        address: h.address ?? null,
        latitude: h.latitude!,
        longitude: h.longitude!,
        distance_km,
        available_beds: cap?.available_beds ?? 0,
        facility_status: cap?.facility_status ?? "closed"
      };
    })
    .filter((h) => h.available_beds > 0 && h.facility_status === "open")
    .sort((a, b) => a.distance_km - b.distance_km);
}
