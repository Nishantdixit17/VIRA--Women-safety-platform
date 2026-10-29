import { NextResponse } from "next/server";
import {
  getAllAreaZonesWithRisk,
  getAllSafeHavens,
  getAreaZoneBySlug,
} from "@/lib/repositories/zones-repo";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hourParam = searchParams.get("hour");
    const slug = searchParams.get("slug");
    const hourOfDay = hourParam !== null ? parseInt(hourParam, 10) : 21;

    if (slug) {
      const zone = await getAreaZoneBySlug(slug, hourOfDay);
      if (!zone) {
        return NextResponse.json({ error: "Area zone not found" }, { status: 404 });
      }
      const safeHavens = await getAllSafeHavens(slug);
      return NextResponse.json({ zone, safeHavens });
    }

    const [zones, safeHavens] = await Promise.all([
      getAllAreaZonesWithRisk(hourOfDay),
      getAllSafeHavens(),
    ]);

    return NextResponse.json({
      evaluationHour: hourOfDay,
      zones,
      safeHavens,
    });
  } catch (err) {
    console.error("/api/risk error:", err);
    return NextResponse.json(
      { error: "Failed to compute risk intelligence" },
      { status: 500 }
    );
  }
}
