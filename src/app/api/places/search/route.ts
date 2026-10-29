import { NextResponse } from "next/server";
import { searchIndianPlaces } from "@/lib/engine/places-geocoder";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const results = await searchIndianPlaces(q);
  return NextResponse.json({ places: results });
}
