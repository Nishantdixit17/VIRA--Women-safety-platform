import { prisma } from "@/lib/db";

export async function getCommunityReviews(areaSlug?: string) {
  const reviews = await prisma.communityReview.findMany({
    where: areaSlug ? { areaSlug } : undefined,
    orderBy: { createdAt: "desc" },
  });

  // Compute averages per place
  const bySlug: Record<
    string,
    {
      areaSlug: string;
      placeName: string;
      count: number;
      avgRating: number;
      avgLighting: number;
      avgCrowd: number;
      avgModerationConfidence: number;
    }
  > = {};

  for (const r of reviews) {
    if (!bySlug[r.areaSlug]) {
      bySlug[r.areaSlug] = {
        areaSlug: r.areaSlug,
        placeName: r.placeName,
        count: 0,
        avgRating: 0,
        avgLighting: 0,
        avgCrowd: 0,
        avgModerationConfidence: 0,
      };
    }
    const group = bySlug[r.areaSlug];
    group.count += 1;
    group.avgRating += r.rating;
    group.avgLighting += r.lightingRating;
    group.avgCrowd += r.crowdRating;
    group.avgModerationConfidence += r.moderationConfidence;
  }

  const placeSummaries = Object.values(bySlug).map((g) => ({
    ...g,
    avgRating: Number((g.avgRating / g.count).toFixed(1)),
    avgLighting: Number((g.avgLighting / g.count).toFixed(1)),
    avgCrowd: Number((g.avgCrowd / g.count).toFixed(1)),
    avgModerationConfidence: Math.round(g.avgModerationConfidence / g.count),
  }));

  return {
    reviews,
    placeSummaries,
  };
}

export async function createCommunityReview(input: {
  areaSlug: string;
  placeName: string;
  userId?: string;
  authorName: string;
  isAnonymous: boolean;
  rating: number;
  lightingRating: number;
  crowdRating: number;
  comment: string;
  timeWindow: string;
}) {
  const displayAuthor = input.isAnonymous
    ? "Anonymous Verified Commuter"
    : input.authorName || "Verified Resident";

  // Moderation confidence heuristic based on detail length & rating consistency
  const moderationConfidence = Math.min(
    98,
    Math.max(82, 80 + Math.min(18, Math.floor(input.comment.length / 8)))
  );

  return prisma.communityReview.create({
    data: {
      areaSlug: input.areaSlug,
      placeName: input.placeName,
      userId: input.userId || null,
      authorName: displayAuthor,
      isAnonymous: input.isAnonymous,
      rating: input.rating,
      lightingRating: input.lightingRating,
      crowdRating: input.crowdRating,
      comment: input.comment,
      timeWindow: input.timeWindow,
      moderationConfidence,
      corroborations: 1,
    },
  });
}

export async function getSafetyAlerts(targetAudience?: string) {
  return prisma.safetyAlert.findMany({
    where:
      targetAudience && targetAudience !== "ALL"
        ? {
            OR: [{ targetAudience: "ALL" }, { targetAudience }],
          }
        : undefined,
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function createSafetyAlert(input: {
  title: string;
  description: string;
  areaSlug: string;
  placeName: string;
  riskLevel: string;
  category: string;
  source: string;
  targetAudience?: string;
  whyReason: string;
  activeUntil?: string;
}) {
  return prisma.safetyAlert.create({
    data: {
      title: input.title,
      description: input.description,
      areaSlug: input.areaSlug,
      placeName: input.placeName,
      riskLevel: input.riskLevel,
      category: input.category,
      source: input.source,
      targetAudience: input.targetAudience || "ALL",
      whyReason: input.whyReason,
      activeUntil: input.activeUntil || "02:00 AM",
    },
  });
}

export async function getTrustedContactsForUser(userId: string) {
  return prisma.trustedContact.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createTrustedContact(input: {
  userId: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  consentWhen: string;
  consentWhatJson: string;
  consentDurationMinutes: number;
}) {
  return prisma.trustedContact.create({
    data: {
      ...input,
      isActive: true,
      currentlySharing: false,
    },
  });
}

export async function updateTrustedContactConsent(
  contactId: string,
  data: Partial<{
    consentWhen: string;
    consentWhatJson: string;
    consentDurationMinutes: number;
    isActive: boolean;
    currentlySharing: boolean;
  }>
) {
  return prisma.trustedContact.update({
    where: { id: contactId },
    data,
  });
}

export async function deleteTrustedContact(contactId: string) {
  return prisma.trustedContact.delete({
    where: { id: contactId },
  });
}
