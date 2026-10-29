import { NextResponse } from "next/server";
import { getAllAreaZonesWithRisk } from "@/lib/repositories/zones-repo";

export async function GET() {
  try {
    const zones = await getAllAreaZonesWithRisk(21);
    const corridors = zones.map((z) => ({
      id: z.id,
      slug: z.slug,
      name: z.name,
      corridorName: z.corridorName,
      lightingScore: z.lightingScore,
      cctvCoverage: z.cctvCoverage,
      verifiedReports: z.verifiedReports,
      riskScore: z.evaluation.score,
      riskLevel: z.evaluation.level,
      recommendedAction: z.patrolRecommendation,
      status: z.evaluation.level === "HIGH" ? "ATTENTION_REQUIRED" : "PATROL_ACTIVE",
    }));

    return NextResponse.json({
      success: true,
      corridors,
    });
  } catch (err) {
    console.error("GET /api/admin error:", err);
    return NextResponse.json({ success: false, corridors: [] }, { status: 500 });
  }
}
