-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "phone" TEXT NOT NULL DEFAULT '+91 98765 43210',
    "privacySettingsJson" TEXT NOT NULL DEFAULT '{"autoDeleteHours":24,"anonymousDefault":true,"saveViraTranscripts":false,"shareAuditLog":true}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AreaZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "corridorName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "centerLat" REAL NOT NULL,
    "centerLng" REAL NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "polygonJson" TEXT NOT NULL,
    "lightingScore" INTEGER NOT NULL,
    "footfallScore" INTEGER NOT NULL,
    "cctvCoverage" INTEGER NOT NULL,
    "nearestPoliceName" TEXT NOT NULL,
    "nearestPoliceDistM" INTEGER NOT NULL,
    "nearestHospitalName" TEXT NOT NULL,
    "nearestHospitalDistM" INTEGER NOT NULL,
    "nearestTransitName" TEXT NOT NULL,
    "nearestTransitDistM" INTEGER NOT NULL,
    "peakRiskHours" TEXT NOT NULL,
    "totalReports" INTEGER NOT NULL,
    "corroboratedReports" INTEGER NOT NULL,
    "verifiedReports" INTEGER NOT NULL,
    "baseSeverity" INTEGER NOT NULL,
    "recentIncidentDaysAgo" INTEGER NOT NULL,
    "recentIncidentsSummaryJson" TEXT NOT NULL,
    "patrolRecommendation" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SafeHaven" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "areaSlug" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "openHours" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "is24x7" BOOLEAN NOT NULL DEFAULT true,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "distanceText" TEXT NOT NULL DEFAULT '250 m away'
);

-- CreateTable
CREATE TABLE "CommunityReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaSlug" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "userId" TEXT,
    "authorName" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "rating" INTEGER NOT NULL,
    "lightingRating" INTEGER NOT NULL,
    "crowdRating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "timeWindow" TEXT NOT NULL DEFAULT '20:00 - 22:00',
    "moderationConfidence" INTEGER NOT NULL DEFAULT 92,
    "corroborations" INTEGER NOT NULL DEFAULT 4,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SafetyAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "areaSlug" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL DEFAULT 'ALL',
    "whyReason" TEXT NOT NULL,
    "activeUntil" TEXT NOT NULL DEFAULT '02:00 AM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TrustedContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "consentWhen" TEXT NOT NULL DEFAULT 'MANUAL',
    "consentWhatJson" TEXT NOT NULL DEFAULT '{"location":true,"route":true,"eta":true,"status":true}',
    "consentDurationMinutes" INTEGER NOT NULL DEFAULT 45,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentlySharing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrustedContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detailsJson" TEXT NOT NULL,
    "timestampIso" TEXT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "currentHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedJourneyPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startPlaceName" TEXT NOT NULL,
    "destPlaceName" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "travelMode" TEXT NOT NULL,
    "preference" TEXT NOT NULL,
    "selectedRouteType" TEXT NOT NULL,
    "safetyScore" INTEGER NOT NULL,
    "etaMinutes" INTEGER NOT NULL,
    "distanceKm" REAL NOT NULL,
    "explanationSummary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedJourneyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AreaZone_slug_key" ON "AreaZone"("slug");
