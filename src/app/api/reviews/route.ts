import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCommunityReview,
  getCommunityReviews,
} from "@/lib/repositories/safety-repo";
import { getSessionUserFromCookies } from "@/lib/auth";

const reviewSchema = z.object({
  areaSlug: z.string().min(2),
  placeName: z.string().min(2),
  authorName: z.string().optional(),
  isAnonymous: z.boolean().default(true),
  rating: z.number().min(1).max(5),
  lightingRating: z.number().min(1).max(5).default(3),
  crowdRating: z.number().min(1).max(5).default(3),
  comment: z.string().min(6),
  timeWindow: z.string().default("21:00 - 23:00"),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const areaSlug = searchParams.get("areaSlug") || undefined;
  const data = await getCommunityReviews(areaSlug);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please select a place, rating (1-5), and write at least a brief safety note." },
        { status: 400 }
      );
    }

    const session = await getSessionUserFromCookies();
    const created = await createCommunityReview({
      areaSlug: parsed.data.areaSlug,
      placeName: parsed.data.placeName,
      userId: session?.id,
      authorName: parsed.data.authorName || session?.name || "Verified Commuter",
      isAnonymous: parsed.data.isAnonymous,
      rating: parsed.data.rating,
      lightingRating: parsed.data.lightingRating,
      crowdRating: parsed.data.crowdRating,
      comment: parsed.data.comment.trim(),
      timeWindow: parsed.data.timeWindow,
    });

    return NextResponse.json({ review: created });
  } catch (err) {
    console.error("/api/reviews POST error:", err);
    return NextResponse.json(
      { error: "Unable to submit community review." },
      { status: 500 }
    );
  }
}
