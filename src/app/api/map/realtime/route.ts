import { NextRequest, NextResponse } from "next/server";
import { buildRealtimeMapPayload } from "@/lib/realtime/map-telemetry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hourParam = searchParams.get("hour");
    const qParam = searchParams.get("q") || undefined;
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");

    const hour = hourParam !== null ? parseInt(hourParam, 10) : 21;
    const clickLat = latParam !== null ? parseFloat(latParam) : undefined;
    const clickLng = lngParam !== null ? parseFloat(lngParam) : undefined;

    const payload = await buildRealtimeMapPayload({
      hour: isNaN(hour) ? 21 : hour,
      searchQuery: qParam,
      clickLat,
      clickLng,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to build real-time map telemetry", details: String(error) },
      { status: 500 }
    );
  }
}
