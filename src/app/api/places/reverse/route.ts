import { NextResponse } from "next/server";
import { reverseGeocodeToPlaceName } from "@/lib/engine/places-geocoder";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "28.6315");
  const lng = parseFloat(searchParams.get("lng") || "77.2167");

  const place = reverseGeocodeToPlaceName(lat, lng);
  return NextResponse.json({ place });
}
