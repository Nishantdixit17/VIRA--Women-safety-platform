import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  computeEvidenceHash,
  GENESIS_PREV_HASH,
} from "../src/lib/engine/evidence-chain";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding VIRA Predictive Safety Intelligence database...");

  await prisma.evidenceRecord.deleteMany();
  await prisma.trustedContact.deleteMany();
  await prisma.savedJourneyPlan.deleteMany();
  await prisma.communityReview.deleteMany();
  await prisma.safetyAlert.deleteMany();
  await prisma.safeHaven.deleteMany();
  await prisma.areaZone.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Demo User & Demo Admin
  const userHash = await bcrypt.hash("vira1234", 10);
  const adminHash = await bcrypt.hash("admin1234", 10);

  const demoUser = await prisma.user.create({
    data: {
      name: "Ananya Sharma",
      email: "ananya@vira.safety",
      passwordHash: userHash,
      role: "USER",
      phone: "+91 98112 45890",
      privacySettingsJson: JSON.stringify({
        autoDeleteHours: 24,
        anonymousDefault: true,
        saveViraTranscripts: false,
        shareAuditLog: true,
      }),
    },
  });

  await prisma.user.create({
    data: {
      name: "ACP Kavita Deshmukh (Nodal Officer)",
      email: "admin@vira.safety",
      passwordHash: adminHash,
      role: "ADMIN",
      phone: "+91 98100 11200",
      privacySettingsJson: JSON.stringify({
        autoDeleteHours: 24,
        anonymousDefault: false,
        saveViraTranscripts: false,
        shareAuditLog: true,
      }),
    },
  });

  // 2. Seed Road Segments & Area Zones (8 realistic corridors across New Delhi)
  const zones = [
    {
      slug: "minto-bridge-underpass-lane",
      name: "Minto Bridge Underpass Service Corridor",
      corridorName: "Minto Road Railway Underpass & East Service Lane",
      city: "New Delhi",
      district: "Central Delhi",
      summary:
        "Railway underpass corridor connecting Connaught Place outer circle toward Deen Dayal Upadhyaya Marg. High daytime commuter volume, but severe visibility and footfall drop after 9:30 PM.",
      centerLat: 28.6368,
      centerLng: 77.2248,
      radiusMeters: 420,
      polygonJson: JSON.stringify([
        [28.6345, 77.2221],
        [28.6368, 77.2248],
        [28.6389, 77.2275],
      ]),
      lightingScore: 28,
      footfallScore: 24,
      cctvCoverage: 42,
      nearestPoliceName: "Barakhamba Road Police Booth",
      nearestPoliceDistM: 1120,
      nearestHospitalName: "LNJP Emergency Trauma Wing",
      nearestHospitalDistM: 1450,
      nearestTransitName: "Shivaji Bridge & Rajiv Chowk Gate 4",
      nearestTransitDistM: 880,
      peakRiskHours: "21:30 - 02:00",
      totalReports: 19,
      corroboratedReports: 13,
      verifiedReports: 6,
      baseSeverity: 88,
      recentIncidentDaysAgo: 2,
      recentIncidentsSummaryJson: JSON.stringify([
        "Verified report (2 days ago, 10:45 PM): Two street lamps beneath the eastern arch non-functional; unverified two-wheeler loitering reported by 4 commuters.",
        "Corroborated report (5 days ago, 11:15 PM): Aggressive catcalling and tailing along the pedestrian footpath; PCR patrol notified.",
        "Infrastructure audit: Sightlines obstructed by pillar blind spots and parked commercial tempos after 9:30 PM.",
      ]),
      patrolRecommendation:
        "Station 1 Pink Booth PCR van at the eastern underpass exit from 9:00 PM to 1:30 AM and expedite PWD LED lumen restoration on poles #14-#19.",
    },
    {
      slug: "hauz-khas-deer-park-approach",
      name: "Hauz Khas Village Deer Park Approach Lane",
      corridorName: "Hauz Khas Fort Back-Lane & Park Perimeter Stretch",
      city: "New Delhi",
      district: "South Delhi",
      summary:
        "Narrow single-carriageway approach bordering the forested Deer Park boundary. While the main cafe strip stays busy, the outer park wall stretch has sharp blind bends and taxi congestion bottlenecks.",
      centerLat: 28.5535,
      centerLng: 77.1942,
      radiusMeters: 380,
      polygonJson: JSON.stringify([
        [28.5512, 77.1965],
        [28.5535, 77.1942],
        [28.5554, 77.1921],
      ]),
      lightingScore: 44,
      footfallScore: 38,
      cctvCoverage: 54,
      nearestPoliceName: "Safdarjung Enclave Police Beat Post",
      nearestPoliceDistM: 820,
      nearestHospitalName: "AIIMS Trauma & Emergency Center",
      nearestHospitalDistM: 1850,
      nearestTransitName: "Green Park Metro Station Gate 2",
      nearestTransitDistM: 940,
      peakRiskHours: "22:00 - 02:00",
      totalReports: 17,
      corroboratedReports: 11,
      verifiedReports: 4,
      baseSeverity: 76,
      recentIncidentDaysAgo: 4,
      recentIncidentsSummaryJson: JSON.stringify([
        "Verified report (4 days ago, 11:30 PM): Unregistered cab solicitation and verbal harassment near the unlit park gate bend.",
        "Corroborated report (8 days ago, 10:15 PM): Poor lighting along the 350m stretch between the taxi stand and Aurobindo Marg feeder road.",
      ]),
      patrolRecommendation:
        "Deploy foot patrol beat officers between 10:00 PM and 1:30 AM at the Deer Park boundary turn and enforce verified pre-paid auto/cab pick-up bay.",
    },
    {
      slug: "munirka-outer-ring-underpass",
      name: "Munirka Flyover Underpass & Service Stretch",
      corridorName: "Outer Ring Road Munirka Service Slip Road",
      city: "New Delhi",
      district: "South West Delhi",
      summary:
        "Service slip road beneath the Munirka elevated corridor used by students and late-shift professionals commuting toward Vasant Vihar and JNU.",
      centerLat: 28.5562,
      centerLng: 77.1734,
      radiusMeters: 390,
      polygonJson: JSON.stringify([
        [28.5548, 77.1709],
        [28.5562, 77.1734],
        [28.5579, 77.1762],
      ]),
      lightingScore: 39,
      footfallScore: 34,
      cctvCoverage: 48,
      nearestPoliceName: "Vasant Vihar PCR Checkpost",
      nearestPoliceDistM: 890,
      nearestHospitalName: "Holy Angels Hospital Emergency",
      nearestHospitalDistM: 1200,
      nearestTransitName: "Munirka Metro Station Gate 3",
      nearestTransitDistM: 460,
      peakRiskHours: "21:00 - 01:30",
      totalReports: 15,
      corroboratedReports: 10,
      verifiedReports: 4,
      baseSeverity: 72,
      recentIncidentDaysAgo: 5,
      recentIncidentsSummaryJson: JSON.stringify([
        "Verified report (5 days ago, 10:20 PM): Dark shadow zones under flyover pillars #22-#28; pedestrians forced onto main carriageway due to blocked sidewalk.",
        "Community audit: Bus stop shelter illumination flickering after 10:00 PM.",
      ]),
      patrolRecommendation:
        "Coordinate with Municipal Corporation to clear sidewalk encroachments and install under-deck floodlights beneath flyover spans.",
    },
    {
      slug: "nehru-place-skywalk-service-road",
      name: "Nehru Place Back Service Road & Metro Approach",
      corridorName: "Nehru Place Commercial Complex West Service Lane",
      city: "New Delhi",
      district: "South East Delhi",
      summary:
        "High-density IT and commercial plaza that transitions rapidly from crowded daytime offices to deserted plazas once hardware markets close at 8:30 PM.",
      centerLat: 28.5494,
      centerLng: 77.2519,
      radiusMeters: 360,
      polygonJson: JSON.stringify([
        [28.5478, 77.2498],
        [28.5494, 77.2519],
        [28.5511, 77.2541],
      ]),
      lightingScore: 54,
      footfallScore: 42,
      cctvCoverage: 64,
      nearestPoliceName: "Kalkaji Police Assistance Booth",
      nearestPoliceDistM: 610,
      nearestHospitalName: "Apollo Gleneagles Urgent Care",
      nearestHospitalDistM: 1100,
      nearestTransitName: "Nehru Place Metro Station Skywalk",
      nearestTransitDistM: 310,
      peakRiskHours: "20:30 - 01:00",
      totalReports: 12,
      corroboratedReports: 8,
      verifiedReports: 3,
      baseSeverity: 58,
      recentIncidentDaysAgo: 7,
      recentIncidentsSummaryJson: JSON.stringify([
        "Verified report (7 days ago, 9:40 PM): Rear parking stairwell poorly lit; commuters advised to use the elevated Metro Skywalk with active CISF/guard visibility.",
      ]),
      patrolRecommendation:
        "Keep the elevated Metro Skywalk gates open until last train departure and station one campus security guard at the west escalator landing.",
    },
    {
      slug: "north-campus-vishwavidyalaya-mall-road",
      name: "North Campus Vishwavidyalaya & Cavalry Lane",
      corridorName: "Chhatra Marg & Vishwavidyalaya Metro Feeder Corridor",
      city: "New Delhi",
      district: "North Delhi",
      summary:
        "University precinct with heavy student movement. Main Mall Road is well-policed, while adjacent tree-lined side lanes experience reduced visibility after 9:30 PM.",
      centerLat: 28.6931,
      centerLng: 77.2143,
      radiusMeters: 350,
      polygonJson: JSON.stringify([
        [28.6912, 77.2118],
        [28.6931, 77.2143],
        [28.6951, 77.2165],
      ]),
      lightingScore: 66,
      footfallScore: 62,
      cctvCoverage: 76,
      nearestPoliceName: "Maurice Nagar Women Pink Booth",
      nearestPoliceDistM: 320,
      nearestHospitalName: "Vallabhbhai Patel Chest Institute Emergency",
      nearestHospitalDistM: 680,
      nearestTransitName: "Vishwavidyalaya Metro Station Gate 1",
      nearestTransitDistM: 220,
      peakRiskHours: "21:30 - 01:00",
      totalReports: 10,
      corroboratedReports: 7,
      verifiedReports: 2,
      baseSeverity: 48,
      recentIncidentDaysAgo: 11,
      recentIncidentsSummaryJson: JSON.stringify([
        "Corroborated report (11 days ago, 10:05 PM): Overgrown tree canopy along Cavalry Lane blocking two street lamps; main Chhatra Marg remains well lit with Pink Patrol presence.",
      ]),
      patrolRecommendation:
        "University Proctorial Board and Maurice Nagar Pink Booth to maintain joint e-rickshaw verification and pruning of street-lamp foliage.",
    },
    {
      slug: "lajpat-nagar-central-market-plaza",
      name: "Lajpat Nagar Central Market Metro Corridor",
      corridorName: "Veer Savarkar Marg & Central Market Metro Gate 5",
      city: "New Delhi",
      district: "South East Delhi",
      summary:
        "Bustling retail and residential transit corridor with dedicated Pink Police Booth, continuous shop-front illumination, and e-rickshaw feeder connectivity.",
      centerLat: 28.5677,
      centerLng: 77.2433,
      radiusMeters: 330,
      polygonJson: JSON.stringify([
        [28.5661, 77.2412],
        [28.5677, 77.2433],
        [28.5695, 77.2455],
      ]),
      lightingScore: 78,
      footfallScore: 75,
      cctvCoverage: 82,
      nearestPoliceName: "Lajpat Nagar Shakti Pink Police Booth",
      nearestPoliceDistM: 210,
      nearestHospitalName: "Moolchand Medcity 24x7 Emergency",
      nearestHospitalDistM: 740,
      nearestTransitName: "Lajpat Nagar Metro Interchange Gate 5",
      nearestTransitDistM: 150,
      peakRiskHours: "22:30 - 02:00",
      totalReports: 6,
      corroboratedReports: 4,
      verifiedReports: 1,
      baseSeverity: 34,
      recentIncidentDaysAgo: 16,
      recentIncidentsSummaryJson: JSON.stringify([
        "Community note (16 days ago): Main metro plaza is well-lit and monitored; avoid back residential alleys after market closing at 10:30 PM.",
      ]),
      patrolRecommendation:
        "Maintain current Shakti Pink Booth visibility at Metro Gate 5 during late evening interchange hours.",
    },
    {
      slug: "connaught-place-inner-circle",
      name: "Connaught Place Inner Circle Safe Corridor",
      corridorName: "Rajiv Chowk Block A-F Colonnade & Janpath Crossing",
      city: "New Delhi",
      district: "Central Delhi",
      summary:
        "High-visibility heritage colonnade equipped with Smart City LED lighting, 24x7 Delhi Police PCR deployment, panic call pillars, and verified late-night pharmacies.",
      centerLat: 28.6315,
      centerLng: 77.2167,
      radiusMeters: 340,
      polygonJson: JSON.stringify([
        [28.6298, 77.2145],
        [28.6315, 77.2167],
        [28.6331, 77.2192],
      ]),
      lightingScore: 94,
      footfallScore: 90,
      cctvCoverage: 95,
      nearestPoliceName: "Connaught Place Police Aid Post (Block B)",
      nearestPoliceDistM: 140,
      nearestHospitalName: "Ram Manohar Lohia Hospital Emergency",
      nearestHospitalDistM: 1100,
      nearestTransitName: "Rajiv Chowk Metro Station Gate 6",
      nearestTransitDistM: 110,
      peakRiskHours: "00:30 - 04:00",
      totalReports: 4,
      corroboratedReports: 3,
      verifiedReports: 0,
      baseSeverity: 16,
      recentIncidentDaysAgo: 26,
      recentIncidentsSummaryJson: JSON.stringify([
        "Safe City Audit: 95% active CCTV coverage, 24x7 women beat constables stationed at Rajiv Chowk Gates 1, 4, and 6.",
      ]),
      patrolRecommendation:
        "Standard Safe City benchmark corridor; continue 24x7 PCR presence at Janpath and Radial Road 4.",
    },
    {
      slug: "aiims-ansari-nagar-safe-corridor",
      name: "AIIMS Main Gate & Aurobindo Marg Medical Hub",
      corridorName: "Ansari Nagar Ring Road & AIIMS Metro Footbridge",
      city: "New Delhi",
      district: "South Delhi",
      summary:
        "Round-the-clock medical institutional zone with uninterrupted ambulance, pharmacy, security guard, and metro commuter presence 24 hours a day.",
      centerLat: 28.5672,
      centerLng: 77.2100,
      radiusMeters: 340,
      polygonJson: JSON.stringify([
        [28.5655, 77.2082],
        [28.5672, 77.2100],
        [28.5691, 77.2118],
      ]),
      lightingScore: 96,
      footfallScore: 93,
      cctvCoverage: 94,
      nearestPoliceName: "AIIMS Gate 1 Police Outpost",
      nearestPoliceDistM: 95,
      nearestHospitalName: "AIIMS 24x7 Emergency & Casualty",
      nearestHospitalDistM: 60,
      nearestTransitName: "AIIMS Metro Station Gate 1",
      nearestTransitDistM: 85,
      peakRiskHours: "02:00 - 04:30",
      totalReports: 3,
      corroboratedReports: 2,
      verifiedReports: 0,
      baseSeverity: 12,
      recentIncidentDaysAgo: 29,
      recentIncidentsSummaryJson: JSON.stringify([
        "Verified 24x7 Safe Haven anchor: Continuous lighting, hospital security desk, and police outpost at Gate 1.",
      ]),
      patrolRecommendation:
        "Maintain unobstructed pedestrian walkway between AIIMS Metro Gate 1 and Emergency reception.",
    },
  ];

  for (const z of zones) {
    await prisma.areaZone.create({ data: z });
  }

  // 3. Seed Safe Havens Network
  const safeHavens = [
    {
      name: "Connaught Place Shakti Pink Police Booth (Block B)",
      category: "POLICE_BOOTH",
      areaSlug: "connaught-place-inner-circle",
      placeName: "Connaught Place Inner Circle",
      address: "Block B Radial Road 2, Rajiv Chowk, New Delhi",
      lat: 28.6321,
      lng: 77.2175,
      openHours: "24x7 (Women Beat Officers on Duty)",
      contactPhone: "112 / 011-23412305",
      is24x7: true,
      verified: true,
      distanceText: "140 m away",
    },
    {
      name: "AIIMS Gate 1 Emergency & Police Aid Post",
      category: "HOSPITAL",
      areaSlug: "aiims-ansari-nagar-safe-corridor",
      placeName: "AIIMS Main Gate, Ansari Nagar",
      address: "Sri Aurobindo Marg, Ansari Nagar East, New Delhi",
      lat: 28.5675,
      lng: 77.2104,
      openHours: "24x7 Emergency & Security Reception",
      contactPhone: "112 / 011-26588500",
      is24x7: true,
      verified: true,
      distanceText: "95 m away",
    },
    {
      name: "Lajpat Nagar Shakti Pink Booth & Metro Helpdesk",
      category: "POLICE_BOOTH",
      areaSlug: "lajpat-nagar-central-market-plaza",
      placeName: "Lajpat Nagar Central Market",
      address: "Outside Lajpat Nagar Metro Gate 5, New Delhi",
      lat: 28.5681,
      lng: 77.2436,
      openHours: "24x7 Dedicated Women Help Desk",
      contactPhone: "112 / 1091",
      is24x7: true,
      verified: true,
      distanceText: "210 m away",
    },
    {
      name: "Apollo 24x7 Verified Safe Haven Pharmacy (CP Outer Circle)",
      category: "VERIFIED_BUSINESS",
      areaSlug: "minto-bridge-underpass-lane",
      placeName: "Connaught Place Outer Circle Minto Approach",
      address: "H-Block Outer Circle near Minto Road Crossing, New Delhi",
      lat: 28.6352,
      lng: 77.2219,
      openHours: "24x7 Lit Waiting Area, CCTV & Emergency Phone",
      contactPhone: "011-23324510",
      is24x7: true,
      verified: true,
      distanceText: "310 m away",
    },
    {
      name: "Hauz Khas Metro CISF Women Assistance Desk",
      category: "METRO_STATION",
      areaSlug: "hauz-khas-deer-park-approach",
      placeName: "Hauz Khas Metro Interchange",
      address: "Gate 1 Concourse Level, Outer Ring Road, New Delhi",
      lat: 28.5435,
      lng: 77.2068,
      openHours: "05:15 AM - 11:45 PM (24x7 Guarded Perimeter)",
      contactPhone: "155370 / 112",
      is24x7: true,
      verified: true,
      distanceText: "420 m away",
    },
    {
      name: "Maurice Nagar Campus Pink Police Booth",
      category: "HELP_DESK",
      areaSlug: "north-campus-vishwavidyalaya-mall-road",
      placeName: "North Campus Vishwavidyalaya",
      address: "Chhatra Marg Crossing, University Enclave, New Delhi",
      lat: 28.6926,
      lng: 77.2138,
      openHours: "24x7 Campus Women Safety Response Unit",
      contactPhone: "112 / 011-27667191",
      is24x7: true,
      verified: true,
      distanceText: "220 m away",
    },
  ];

  for (const sh of safeHavens) {
    await prisma.safeHaven.create({ data: sh });
  }

  // 4. Seed Community Safety Reviews
  const reviews = [
    {
      areaSlug: "minto-bridge-underpass-lane",
      placeName: "Minto Bridge Underpass Service Corridor",
      userId: demoUser.id,
      authorName: "Anonymous Verified Commuter",
      isAnonymous: true,
      rating: 2,
      lightingRating: 1,
      crowdRating: 2,
      comment:
        "Two floodlights under the eastern railway span were out at 10:15 PM and commercial tempos blocked visibility of the pedestrian footpath. Took the Rajiv Chowk Inner Circle corridor instead.",
      timeWindow: "22:00 - 23:00",
      moderationConfidence: 96,
      corroborations: 13,
    },
    {
      areaSlug: "hauz-khas-deer-park-approach",
      placeName: "Hauz Khas Village Deer Park Approach Lane",
      authorName: "Riya M. (Postgraduate Student)",
      isAnonymous: false,
      rating: 2,
      lightingRating: 2,
      crowdRating: 3,
      comment:
        "The main cafe lane is lively, but the 400m walk out past the Deer Park boundary wall after 10:30 PM has dark patches and aggressive cab touts. Always book pick-up from the lit main gate.",
      timeWindow: "22:00 - 23:30",
      moderationConfidence: 94,
      corroborations: 11,
    },
    {
      areaSlug: "connaught-place-inner-circle",
      placeName: "Connaught Place Inner Circle Safe Corridor",
      authorName: "Ananya Sharma",
      isAnonymous: false,
      rating: 5,
      lightingRating: 5,
      crowdRating: 5,
      comment:
        "Bright LED lighting along the entire Block B-F colonnade even at 11:00 PM. Shakti Pink Booth officers were actively patrolling near Rajiv Chowk Gate 6.",
      timeWindow: "21:00 - 23:00",
      moderationConfidence: 98,
      corroborations: 19,
    },
    {
      areaSlug: "aiims-ansari-nagar-safe-corridor",
      placeName: "AIIMS Main Gate & Aurobindo Marg Medical Hub",
      authorName: "Dr. Meera Nair (Resident Doctor)",
      isAnonymous: false,
      rating: 5,
      lightingRating: 5,
      crowdRating: 5,
      comment:
        "Safe 24x7 corridor for late hospital shift changes. Well-lit metro skywalk, round-the-clock pharmacy open, and immediate police aid post right at Gate 1.",
      timeWindow: "23:00 - 02:00",
      moderationConfidence: 99,
      corroborations: 22,
    },
    {
      areaSlug: "north-campus-vishwavidyalaya-mall-road",
      placeName: "North Campus Vishwavidyalaya & Cavalry Lane",
      authorName: "Anonymous Verified Commuter",
      isAnonymous: true,
      rating: 4,
      lightingRating: 3,
      crowdRating: 4,
      comment:
        "Chhatra Marg and Vishwavidyalaya Metro Gate 1 feel safe with student movement and the Pink Booth nearby, but avoid cutting through Cavalry Lane alone after 10 PM due to tree shadows.",
      timeWindow: "21:00 - 22:30",
      moderationConfidence: 93,
      corroborations: 7,
    },
  ];

  for (const rev of reviews) {
    await prisma.communityReview.create({ data: rev });
  }

  // 5. Seed Real-Time Safety Alerts
  const alerts = [
    {
      title: "Streetlight Outage & Elevated Watch: Minto Underpass East Span",
      description:
        "4 corroborated commuter reports indicate two non-functional street lamps beneath the eastern arch. Vira Safe Journey Planner is automatically routing evening walks via Outer Circle.",
      areaSlug: "minto-bridge-underpass-lane",
      placeName: "Minto Bridge Underpass Service Corridor",
      riskLevel: "HIGH",
      category: "LIGHTING_OUTAGE",
      source: "COMMUNITY",
      targetAudience: "ALL",
      whyReason:
        "Lighting index dropped to 28/100 + 13 corroborated reports + low pedestrian footfall after 9:30 PM.",
      activeUntil: "05:00 AM",
    },
    {
      title: "Late-Evening Crowd Thinning: Hauz Khas Deer Park Perimeter",
      description:
        "Footfall along the outer Deer Park approach road has dropped below 35%. Commuters are advised to use the verified cab pick-up zone near Aurobindo Marg.",
      areaSlug: "hauz-khas-deer-park-approach",
      placeName: "Hauz Khas Village Deer Park Approach Lane",
      riskLevel: "ELEVATED",
      category: "CROWD_DROP",
      source: "AI_PREDICTION",
      targetAudience: "ALL",
      whyReason:
        "Predicted temporal escalation between 10:00 PM and 2:00 AM combined with 820m distance to nearest police beat.",
      activeUntil: "02:30 AM",
    },
    {
      title: "Pink Patrol Unit Stationed: Vishwavidyalaya Metro Gate 1",
      description:
        "Nodal Police Control Room confirms dedicated Shakti PCR Van stationed outside Vishwavidyalaya Metro Gate 1 for late-evening library and hostel commuters.",
      areaSlug: "north-campus-vishwavidyalaya-mall-road",
      placeName: "North Campus Vishwavidyalaya & Cavalry Lane",
      riskLevel: "LOW",
      category: "PATROL_DISPATCH",
      source: "ADMIN_BROADCAST",
      targetAudience: "UNIVERSITY",
      whyReason:
        "Proactive institutional patrol deployment reducing response distance to under 150 meters.",
      activeUntil: "01:30 AM",
    },
    {
      title: "Sidewalk Obstruction Advisory: Munirka Flyover Slip Road",
      description:
        "Parked commercial vehicles obstructing 180m of the pedestrian walkway under Munirka Flyover. Use the lit Metro Footbridge crossing.",
      areaSlug: "munirka-outer-ring-underpass",
      placeName: "Munirka Flyover Underpass & Service Stretch",
      riskLevel: "ELEVATED",
      category: "VERIFIED_REPORT",
      source: "COMMUNITY",
      targetAudience: "MUNICIPAL",
      whyReason:
        "Obstructed pedestrian sightlines + 39/100 lighting score during 9:00 PM - 1:30 AM window.",
      activeUntil: "04:00 AM",
    },
  ];

  for (const al of alerts) {
    await prisma.safetyAlert.create({ data: al });
  }

  // 6. Seed Trusted Circle Contacts for Demo User
  const contacts = [
    {
      userId: demoUser.id,
      name: "Sunita Sharma (Mom)",
      relationship: "Mother",
      phone: "+91 98110 22334",
      email: "sunita.sharma@example.in",
      consentWhen: "NIGHT_ONLY",
      consentWhatJson: JSON.stringify({
        location: true,
        route: true,
        eta: true,
        status: true,
      }),
      consentDurationMinutes: 60,
      isActive: true,
      currentlySharing: true,
    },
    {
      userId: demoUser.id,
      name: "Priya Verma (Flatmate)",
      relationship: "Trusted Friend & Flatmate",
      phone: "+91 98712 88901",
      email: "priya.verma@example.in",
      consentWhen: "HIGH_RISK_ZONE",
      consentWhatJson: JSON.stringify({
        location: true,
        route: true,
        eta: true,
        status: true,
      }),
      consentDurationMinutes: 45,
      isActive: true,
      currentlySharing: false,
    },
    {
      userId: demoUser.id,
      name: "Rohan Sharma (Brother)",
      relationship: "Sibling",
      phone: "+91 98188 77665",
      email: "rohan.sharma@example.in",
      consentWhen: "SOS_ONLY",
      consentWhatJson: JSON.stringify({
        location: true,
        route: false,
        eta: true,
        status: true,
      }),
      consentDurationMinutes: 30,
      isActive: true,
      currentlySharing: false,
    },
  ];

  for (const c of contacts) {
    await prisma.trustedContact.create({ data: c });
  }

  // 7. Seed Hash-Chained Evidence Vault for Demo User
  const initialEvents = [
    {
      eventType: "TRUSTED_CIRCLE_NOTIFIED",
      placeName: "Connaught Place Inner Circle, New Delhi",
      summary:
        "Consent-based live journey sharing activated for Sunita Sharma (Mom) with automatic arrival expiry set to 45 minutes.",
      details: {
        sharedFields: ["Live Place Name", "Selected Safe Route", "ETA", "Check-in Status"],
        autoExpireOnArrival: true,
      },
      timestampIso: "2026-10-28T14:40:00.000Z",
    },
    {
      eventType: "SAFE_CHECKIN",
      placeName: "AIIMS Main Gate, Ansari Nagar, New Delhi",
      summary:
        "Automated 15-minute journey check-in verified safe along AIIMS & Metro Plaza Bright Corridor.",
      details: {
        corridorSafetyScore: 93,
        nearestSafeHaven: "AIIMS Gate 1 Emergency & Police Aid Post (95m)",
      },
      timestampIso: "2026-10-28T14:55:00.000Z",
    },
    {
      eventType: "ROUTE_DEVIATION",
      placeName: "Hauz Khas Village Approach Lane, New Delhi",
      summary:
        "Route deviation detected 180m off planned corridor near Deer Park turn; user confirmed safe within 6 seconds before escalation.",
      details: {
        deviationMeters: 180,
        userResponse: "Confirmed Safe (6s)",
        escalatedToSOS: false,
      },
      timestampIso: "2026-10-28T15:10:00.000Z",
    },
  ];

  let prevHash = GENESIS_PREV_HASH;
  for (let i = 0; i < initialEvents.length; i++) {
    const ev = initialEvents[i];
    const sequenceNumber = i + 1;
    const detailsJson = JSON.stringify(ev.details);
    const currentHash = computeEvidenceHash({
      sequenceNumber,
      userId: demoUser.id,
      eventType: ev.eventType,
      placeName: ev.placeName,
      summary: ev.summary,
      detailsJson,
      timestampIso: ev.timestampIso,
      prevHash,
    });

    await prisma.evidenceRecord.create({
      data: {
        userId: demoUser.id,
        sequenceNumber,
        eventType: ev.eventType,
        placeName: ev.placeName,
        summary: ev.summary,
        detailsJson,
        timestampIso: ev.timestampIso,
        prevHash,
        currentHash,
      },
    });

    prevHash = currentHash;
  }

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
