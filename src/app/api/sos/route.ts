import { NextResponse } from "next/server";
import { listSosEvents, upsertSosEvent } from "@/lib/realtime/sos-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ events: listSosEvents() });
}

/** Create or update an SOS event (location pings, siren on/off, status changes). */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const event = upsertSosEvent(body);
    return NextResponse.json({ event });
  } catch {
    return NextResponse.json({ error: "Invalid SOS payload" }, { status: 400 });
  }
}
