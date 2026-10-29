"use client";

import { AdminEvidenceSection } from "@/components/admin/AdminEvidenceSection";
import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  Users,
  FileCheck2,
  Lock,
  MessageSquare,
  Lightbulb,
  ShieldCheck,
  Search,
  PlusCircle,
  PhoneCall,
  MapPin,
  LogOut,
  Activity,
  ClipboardCheck,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { SirenIcon } from "@/components/ui/SirenIcon";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { NineSafetyParametersGrid } from "@/components/safety/NineSafetyParametersGrid";
import {
  computeNineSafetyParameters,
  INDIAN_PLACES_DIRECTORY,
} from "@/lib/engine/places-geocoder";
import { RiskLevel } from "@/lib/engine/risk-engine";

type AdminTabId =
  | "ALL"
  | "EMERGENCY_COMPLAINTS"
  | "USER_ACTIVITY"
  | "CASE_DATA_CHECK"
  | "POLICE_CIVIC_REVIEWS"
  | "EVIDENCE_VAULT";

interface EmergencyComplaintItem {
  id: string;
  userName: string;
  userPhone: string;
  placeName: string;
  complaintType: string;
  description: string;
  reportedAt: string;
  assignedStation: string;
  status: "UNSOLVED" | "IN_PROGRESS" | "SOLVED";
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  solvedAt?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  mapsLink?: string;
  sirenActive?: boolean;
  sirenStartedAt?: string;
  sirenStoppedAt?: string;
}

interface CombinedUserActivityItem {
  id: string;
  userName: string;
  userEmail: string;
  activityType:
    | "Live Monitored Trip"
    | "Safe Route Navigation"
    | "15-Min Check-In Timer"
    | "Trusted Circle Share"
    | "Area Safety Check";
  routeOrArea: string;
  travelMode: "Walk" | "Cab" | "Auto" | "Metro";
  safetyScore: number;
  status: "SAFE & ACTIVE" | "CHECK-IN DUE SOON" | "ROUTE WATCH";
  lastPing: string;
  pingSent?: boolean;
}

interface CurrentCaseCheckItem {
  caseId: string;
  title: string;
  complainant: string;
  placeName: string;
  district: string;
  lat: number;
  lng: number;
  reportedWindow: string;
  corroboratingReports: number;
  cctvFeedStatus: string;
  policeUnitAssigned: string;
  dataVerified: boolean;
  caseSummary: string;
}

interface PoliceCivicReviewItem {
  id: string;
  userName: string;
  placeName: string;
  category: "POLICE_PATROL" | "CIVIC_LIGHTING_CCTV";
  rating: number;
  comment: string;
  reportedTime: string;
  recommendedAction: string;
  actionStatus: "PENDING" | "DISPATCHED" | "RESOLVED";
}

interface EvidenceRecord {
  id: string;
  eventType: string;
  placeName: string;
  summary: string;
  previousHash: string;
  currentHash: string;
  createdAt: string;
}

const INITIAL_EMERGENCY_COMPLAINTS: EmergencyComplaintItem[] = [
  {
    id: "EMG-9041",
    userName: "Ananya Sharma",
    userPhone: "+91 98110-44290",
    placeName: "Minto Bridge Underpass Lane, Connaught Place",
    complaintType: "High-Priority SOS Trigger",
    description:
      "Emergency SOS triggered at 10:15 PM due to dark underpass stretch and suspicious two-wheeler following near railway bridge.",
    reportedAt: "10:15 PM",
    assignedStation: "Connaught Place Police Station · PCR-01",
    status: "UNSOLVED",
    priority: "CRITICAL",
  },
  {
    id: "EMG-9038",
    userName: "Meera Nair",
    userPhone: "+91 98182-77310",
    placeName: "Paharganj Main Bazaar Back Lane",
    complaintType: "Stalking & Harassment Complaint",
    description:
      "Reported group loitering and verbal harassment near Paharganj metro feeder lane after 9:45 PM.",
    reportedAt: "09:48 PM",
    assignedStation: "Paharganj Police Station · PCR-04",
    status: "UNSOLVED",
    priority: "CRITICAL",
  },
  {
    id: "EMG-9035",
    userName: "Riya Kapoor",
    userPhone: "+91 99104-55120",
    placeName: "Nehru Place Flyover Service Road",
    complaintType: "Cab Route Deviation Alert",
    description:
      "Cab deviated 240m off the recommended Safest Route onto an unlit service lane; user requested immediate police check.",
    reportedAt: "09:30 PM",
    assignedStation: "Kalkaji / Nehru Place Police Post · PCR-09",
    status: "IN_PROGRESS",
    priority: "HIGH",
  },
  {
    id: "EMG-9029",
    userName: "Kavita Verma",
    userPhone: "+91 98711-20944",
    placeName: "Hauz Khas Village Rear Parking Lane",
    complaintType: "Dark Stretch & Suspicious Activity",
    description:
      "3 consecutive streetlights out near deer park boundary wall; lone commuter requested escort to Hauz Khas Metro Gate 1.",
    reportedAt: "08:55 PM",
    assignedStation: "Hauz Khas Police Station · Pink Booth",
    status: "SOLVED",
    priority: "HIGH",
    solvedAt: "09:12 PM",
  },
  {
    id: "EMG-9022",
    userName: "Pooja Gupta",
    userPhone: "+91 98109-66381",
    placeName: "Rohini Sector 7 Metro Feeder Road",
    complaintType: "Missed Safe-Arrival Check-In",
    description:
      "15-minute check-in timer expired; PCR-14 verified commuter reached home safely after phone battery drop.",
    reportedAt: "08:20 PM",
    assignedStation: "Rohini North Police Station · PCR-14",
    status: "SOLVED",
    priority: "MEDIUM",
    solvedAt: "08:34 PM",
  },
];

const INITIAL_USER_ACTIVITIES: CombinedUserActivityItem[] = [
  {
    id: "ACT-101",
    userName: "Ananya Sharma",
    userEmail: "ananya@vira.safety",
    activityType: "Live Monitored Trip",
    routeOrArea: "Connaught Place → Hauz Khas (Safest Route)",
    travelMode: "Cab",
    safetyScore: 93,
    status: "SAFE & ACTIVE",
    lastPing: "12s ago",
  },
  {
    id: "ACT-102",
    userName: "Priya Verma",
    userEmail: "priya.v@vira.safety",
    activityType: "15-Min Check-In Timer",
    routeOrArea: "DU North Campus → Kamla Nagar Market",
    travelMode: "Walk",
    safetyScore: 86,
    status: "CHECK-IN DUE SOON",
    lastPing: "28s ago",
  },
  {
    id: "ACT-103",
    userName: "Sneha Gupta",
    userEmail: "sneha.g@vira.safety",
    activityType: "Safe Route Navigation",
    routeOrArea: "Saket Select Citywalk → Lajpat Nagar Central Market",
    travelMode: "Metro",
    safetyScore: 94,
    status: "SAFE & ACTIVE",
    lastPing: "19s ago",
  },
  {
    id: "ACT-104",
    userName: "Aditi Rao",
    userEmail: "aditi.rao@vira.safety",
    activityType: "Trusted Circle Share",
    routeOrArea: "Dwarka Sector 21 → Janakpuri District Centre",
    travelMode: "Auto",
    safetyScore: 88,
    status: "ROUTE WATCH",
    lastPing: "41s ago",
  },
  {
    id: "ACT-105",
    userName: "Simran Kaur",
    userEmail: "simran.k@vira.safety",
    activityType: "Live Monitored Trip",
    routeOrArea: "Rajouri Garden → Patel Nagar Main Road",
    travelMode: "Cab",
    safetyScore: 91,
    status: "SAFE & ACTIVE",
    lastPing: "9s ago",
  },
  {
    id: "ACT-106",
    userName: "Divya Malhotra",
    userEmail: "divya.m@vira.safety",
    activityType: "Area Safety Check",
    routeOrArea: "India Gate & Mandi House Circle, New Delhi",
    travelMode: "Walk",
    safetyScore: 95,
    status: "SAFE & ACTIVE",
    lastPing: "33s ago",
  },
];

const INITIAL_CURRENT_CASES: CurrentCaseCheckItem[] = [
  {
    caseId: "CASE-2026-101",
    title: "Minto Bridge Underpass Night Stalking & Lighting Outage",
    complainant: "Ananya Sharma (+91 98110-44290)",
    placeName: "Minto Bridge Underpass Lane",
    district: "Central Delhi",
    lat: 28.6353,
    lng: 77.225,
    reportedWindow: "9:30 PM – 11:30 PM",
    corroboratingReports: 6,
    cctvFeedStatus: "Cam #ND-104 & #ND-105 Footage Locked (32% Coverage Gap)",
    policeUnitAssigned: "Connaught Place PS · Sub-Inspector R. Meena",
    dataVerified: true,
    caseSummary:
      "6 corroborated community reports of two-wheeler stalking and dim underpass lighting (28%). All 9 safety parameters audited below.",
  },
  {
    caseId: "CASE-2026-102",
    title: "Paharganj Main Bazaar Back-Lane Harassment Cluster",
    complainant: "Meera Nair (+91 98182-77310)",
    placeName: "Paharganj",
    district: "Central Delhi",
    lat: 28.6448,
    lng: 77.214,
    reportedWindow: "9:00 PM – 1:00 AM",
    corroboratingReports: 5,
    cctvFeedStatus: "New Delhi Railway Station Gate 2 Cam Active",
    policeUnitAssigned: "Paharganj PS · Night Patrol Unit PCR-04",
    dataVerified: false,
    caseSummary:
      "Repeated complaints of loitering and verbal harassment on narrow side alleys off Main Bazaar after 9:30 PM.",
  },
  {
    caseId: "CASE-2026-103",
    title: "Nehru Place Flyover Service Road Cab Deviation Case",
    complainant: "Riya Kapoor (+91 99104-55120)",
    placeName: "Nehru Place",
    district: "South East Delhi",
    lat: 28.5491,
    lng: 77.2533,
    reportedWindow: "8:45 PM – 11:15 PM",
    corroboratingReports: 4,
    cctvFeedStatus: "Outer Ring Road ANPR Camera Verified",
    policeUnitAssigned: "Kalkaji PS · PCR-09",
    dataVerified: false,
    caseSummary:
      "Commercial complex shutters close after 8:30 PM leaving the back service road isolated with 38% lighting.",
  },
  {
    caseId: "CASE-2026-104",
    title: "Hauz Khas Village Rear Lane Streetlight & Patrol Audit",
    complainant: "Kavita Verma (+91 98711-20944)",
    placeName: "Hauz Khas",
    district: "South Delhi",
    lat: 28.5494,
    lng: 77.2001,
    reportedWindow: "10:00 PM – 1:30 AM",
    corroboratingReports: 3,
    cctvFeedStatus: "Hauz Khas Metro & Market Cams Active (84%)",
    policeUnitAssigned: "Hauz Khas PS · Shakti Pink Booth",
    dataVerified: true,
    caseSummary:
      "Main road is well-lit (88%), but rear parking lane near deer park needed luminaire replacement and Pink PCR post.",
  },
];

const INITIAL_POLICE_CIVIC_REVIEWS: PoliceCivicReviewItem[] = [
  {
    id: "REV-501",
    userName: "Neha Gupta (Verified Commuter)",
    placeName: "Minto Bridge Underpass Lane, Central Delhi",
    category: "CIVIC_LIGHTING_CCTV",
    rating: 2,
    comment:
      "4 LED streetlights under the railway bridge are flickering or completely off after 9 PM. Please repair lights and add a camera facing the footpath.",
    reportedTime: "Today, 9:40 PM",
    recommendedAction: "PWD Luminaire Repair + 2 Night-Vision CCTV Units",
    actionStatus: "PENDING",
  },
  {
    id: "REV-502",
    userName: "Anonymous Commuter",
    placeName: "Paharganj Main Bazaar Feeder Road",
    category: "POLICE_PATROL",
    rating: 2,
    comment:
      "Men loiter near the dark corner outside the side alley after 10 PM. A stationary PCR van or foot patrol between 9 PM and 1 AM will make women feel much safer.",
    reportedTime: "Today, 9:15 PM",
    recommendedAction: "Deploy Stationary Shakti PCR Van (9 PM – 1 AM)",
    actionStatus: "DISPATCHED",
  },
  {
    id: "REV-503",
    userName: "Sonalika Roy (DU Student)",
    placeName: "Kamla Nagar & DU North Campus Ridge Road",
    category: "POLICE_PATROL",
    rating: 3,
    comment:
      "Main Chhatra Marg is safe, but the side road toward Maurice Nagar gets very quiet after 9:30 PM when library closes.",
    reportedTime: "Yesterday, 10:05 PM",
    recommendedAction: "Increase University Beat Constable Rounds at 9:30 PM",
    actionStatus: "PENDING",
  },
  {
    id: "REV-504",
    userName: "Ritu Sharma",
    placeName: "Connaught Place Inner Circle (Gate 2)",
    category: "CIVIC_LIGHTING_CCTV",
    rating: 5,
    comment:
      "Bright streetlights, working CCTV cameras, and helpful women police officers at the Pink Booth right outside Rajiv Chowk Metro.",
    reportedTime: "Yesterday, 8:50 PM",
    recommendedAction: "Maintain Gold-Standard Safe Corridor Benchmark",
    actionStatus: "RESOLVED",
  },
];

function AdminPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab") as AdminTabId | null;

  const [activeTab, setActiveTab] = useState<AdminTabId>(
    initialTabParam &&
      [
        "ALL",
        "EMERGENCY_COMPLAINTS",
        "USER_ACTIVITY",
        "CASE_DATA_CHECK",
        "POLICE_CIVIC_REVIEWS",
        "EVIDENCE_VAULT",
      ].includes(initialTabParam)
      ? initialTabParam
      : "ALL"
  );

  // 1. Emergency Complaints State (with Solved / Unsolved Tracker)
  const [complaints, setComplaints] = useState<EmergencyComplaintItem[]>(
    INITIAL_EMERGENCY_COMPLAINTS
  );
  const [complaintFilter, setComplaintFilter] = useState<
    "ALL" | "UNSOLVED" | "IN_PROGRESS" | "SOLVED"
  >("ALL");
  const [newComplaintUser, setNewComplaintUser] = useState("");
  const [newComplaintPhone, setNewComplaintPhone] = useState("+91 98112-30490");
  const [newComplaintPlace, setNewComplaintPlace] = useState(
    "Karol Bagh Metro Road, New Delhi"
  );
  const [newComplaintType, setNewComplaintType] = useState(
    "Emergency SOS Complaint"
  );
  const [newComplaintDesc, setNewComplaintDesc] = useState("");

  // 2. Combined Users Activity State
  const [userActivities, setUserActivities] = useState<
    CombinedUserActivityItem[]
  >(INITIAL_USER_ACTIVITIES);
  const [activitySearch, setActivitySearch] = useState("");

  // 3. Current Cases Data Check State
  const [cases, setCases] = useState<CurrentCaseCheckItem[]>(
    INITIAL_CURRENT_CASES
  );
  const [selectedCaseId, setSelectedCaseId] = useState<string>("CASE-2026-101");
  const [customCheckLocation, setCustomCheckLocation] = useState("");

  // 4. Police & Civic Reviews State
  const [reviews, setReviews] = useState<PoliceCivicReviewItem[]>(
    INITIAL_POLICE_CIVIC_REVIEWS
  );
  const [reviewFilter, setReviewFilter] = useState<
    "ALL" | "POLICE_PATROL" | "CIVIC_LIGHTING_CCTV"
  >("ALL");
  const [corridors, setCorridors] = useState<
    Array<{
      id: string;
      slug: string;
      name: string;
      corridorName: string;
       lightingScore: number;
      cctvCoverage: number;
      verifiedReports: number;
      riskScore: number;
      riskLevel: RiskLevel;
      recommendedAction: string;
      status: string;
    }>
  >([]);

  // 5. Evidence Vault State
  const [evidenceRecords, setEvidenceRecords] = useState<EvidenceRecord[]>([]);
  const [chainValid, setChainValid] = useState<boolean>(true);
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [evidenceEventType, setEvidenceEventType] =
    useState("INCIDENT_NOTE");
  const [evidencePlace, setEvidencePlace] = useState(
    "Connaught Place, New Delhi"
  );
  const [evidenceSummary, setEvidenceSummary] = useState("");

  const [bannerMessage, setBannerMessage] = useState("");

  // Load any live SOS complaints from localStorage + API data for Admin & Evidence
  const syncLiveAdminData = async () => {
    try {
      const savedRaw = localStorage.getItem("vira_emergency_complaints");
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw) as EmergencyComplaintItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setComplaints((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const merged = [
              ...parsed.filter((c) => !existingIds.has(c.id)),
              ...prev,
            ];
            return merged;
          });
        }
      }
    } catch {
      // Ignore storage error
    }

    try {
      const [adminRes, evRes, sosRes] = await Promise.all([
        fetch("/api/admin").then((r) => r.json()).catch(() => null),
        fetch("/api/evidence").then((r) => r.json()).catch(() => null),
        fetch("/api/sos").then((r) => r.json()).catch(() => null),
      ]);
      if (adminRes?.corridors) {
        setCorridors(adminRes.corridors);
      }
      if (evRes?.records) {
        setEvidenceRecords(evRes.records);
        setChainValid(Boolean(evRes.chainValid));
      }
      if (sosRes?.events && Array.isArray(sosRes.events)) {
        setComplaints((prev) => {
          const map = new Map(prev.map((c) => [c.id, c]));
          for (const ev of sosRes.events) {
            const existing = map.get(ev.id);
            map.set(ev.id, {
              ...(existing || {}),
              ...ev,
            });
          }
          return [...map.values()];
        });
      }
    } catch {
      // Keep local state if offline
    }
  };

  useEffect(() => {
    syncLiveAdminData();
    const interval = setInterval(() => {
      fetch("/api/sos")
        .then((r) => r.json())
        .then((d) => {
          if (d?.events && Array.isArray(d.events)) {
            setComplaints((prev) => {
              const map = new Map(prev.map((c) => [c.id, c]));
              for (const ev of d.events) {
                const existing = map.get(ev.id);
                map.set(ev.id, {
                  ...(existing || {}),
                  ...ev,
                });
              }
              return [...map.values()];
            });
          }
        })
        .catch(() => {});
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Toggle Complaint Solved / Unsolved Status
  const handleUpdateComplaintStatus = (
    id: string,
    nextStatus: "UNSOLVED" | "IN_PROGRESS" | "SOLVED"
  ) => {
    const nowStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setComplaints((prev) => {
      const updated = prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: nextStatus,
              solvedAt: nextStatus === "SOLVED" ? nowStr : undefined,
            }
          : c
      );
      try {
        localStorage.setItem(
          "vira_emergency_complaints",
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      return updated;
    });
    setBannerMessage(
      `Complaint ${id} status updated to ${
        nextStatus === "SOLVED"
          ? "SOLVED ✓"
          : nextStatus === "IN_PROGRESS"
          ? "IN PROGRESS (PCR Dispatched)"
          : "UNSOLVED (Reopened)"
      }.`
    );
  };

  const handleCreateEmergencyComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComplaintUser.trim() || !newComplaintDesc.trim()) return;
    const newItem: EmergencyComplaintItem = {
      id: `EMG-${Math.floor(1000 + Math.random() * 9000)}`,
      userName: newComplaintUser.trim(),
      userPhone: newComplaintPhone.trim() || "+91 98110-00000",
      placeName: newComplaintPlace.trim() || "New Delhi",
      complaintType: newComplaintType,
      description: newComplaintDesc.trim(),
      reportedAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      assignedStation: "New Delhi Police Control Room · PCR-02",
      status: "UNSOLVED",
      priority: "CRITICAL",
    };
    setComplaints((prev) => {
      const next = [newItem, ...prev];
      try {
        localStorage.setItem("vira_emergency_complaints", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    setNewComplaintUser("");
    setNewComplaintDesc("");
    setBannerMessage(
      `New emergency complaint ${newItem.id} logged as UNSOLVED in the Emergency Tracker.`
    );
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceSummary.trim()) return;
    try {
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: evidenceEventType,
          placeName: evidencePlace,
          summary: evidenceSummary,
        }),
      });
      if (res.ok) {
        setEvidenceSummary("");
        await syncLiveAdminData();
        setBannerMessage(
          "New tamper-evident SHA-256 evidence block recorded in Admin Vault."
        );
      }
    } catch {
      // ignore
    }
  };

  const filteredComplaints = complaints.filter((c) =>
    complaintFilter === "ALL" ? true : c.status === complaintFilter
  );
  const unsolvedCount = complaints.filter(
    (c) => c.status === "UNSOLVED"
  ).length;
  const inProgressCount = complaints.filter(
    (c) => c.status === "IN_PROGRESS"
  ).length;
  const solvedCount = complaints.filter((c) => c.status === "SOLVED").length;

  const selectedCase =
    cases.find((c) => c.caseId === selectedCaseId) || cases[0];

  const customLocationMatch = customCheckLocation.trim()
    ? INDIAN_PLACES_DIRECTORY.find(
        (p) =>
          p.name.toLowerCase().includes(customCheckLocation.toLowerCase()) ||
          p.shortName.toLowerCase().includes(customCheckLocation.toLowerCase())
      )
    : null;

  const caseSafetyParams = customLocationMatch
    ? computeNineSafetyParameters(
        customLocationMatch.lat,
        customLocationMatch.lng,
        customLocationMatch.shortName,
        customLocationMatch.district
      )
    : computeNineSafetyParameters(
        selectedCase.lat,
        selectedCase.lng,
        selectedCase.placeName,
        selectedCase.district
      );

  const filteredReviews = reviews.filter((r) =>
    reviewFilter === "ALL" ? true : r.category === reviewFilter
  );

  const filteredActivities = userActivities.filter(
    (u) =>
      !activitySearch.trim() ||
      u.userName.toLowerCase().includes(activitySearch.toLowerCase()) ||
      u.routeOrArea.toLowerCase().includes(activitySearch.toLowerCase()) ||
      u.activityType.toLowerCase().includes(activitySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-blush-light text-ink flex flex-col">
      {/* Dedicated Admin Portal Top Header Bar */}
      <header className="sticky top-0 z-40 bg-ink text-surface-white border-b border-brand-pink shadow-elevated">
        <div className="max-w-[1550px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-3 py-1.5 rounded-lg bg-surface-white/10 hover:bg-brand-pink text-surface-white text-xs font-bold transition-colors"
            >
              ← Back to Landing Page
            </button>

            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-brand-pink text-surface-white flex items-center justify-center font-extrabold text-base">
                V
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight">
                    VIRA ADMIN PORTAL
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-danger-red text-surface-white text-[10px] font-extrabold uppercase">
                    {unsolvedCount} Unsolved Emergency Complaints
                  </span>
                </div>
                <p className="text-[11px] text-surface-white/75">
                  Police & Civic Command · Evidence Vault · Combined User
                  Activity · Case Data Check · Emergency Complaints Tracker
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                syncLiveAdminData();
                setBannerMessage("Live Admin Portal data refreshed.");
              }}
              className="px-3 py-1.5 rounded-lg bg-surface-white/10 hover:bg-surface-white/20 text-surface-white text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-brand-pink" />
              <span>Sync Live Data</span>
            </button>

            <Link
              href="/explore"
              className="px-3 py-1.5 rounded-lg bg-surface-white/10 hover:bg-surface-white/20 text-surface-white text-xs font-bold"
            >
              View User Safety Map
            </Link>

            <Link
              href="/login?role=admin"
              className="px-3.5 py-1.5 rounded-lg bg-brand-pink text-surface-white text-xs font-extrabold flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Admin Sign Out</span>
            </Link>
          </div>
        </div>

        {/* 5 Admin Sections Navigation Bar */}
        <div className="bg-surface-white text-ink border-t border-border-rose">
          <div className="max-w-[1550px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto">
            {(
              [
                {
                  id: "ALL",
                  label: "All 5 Admin Sections",
                  icon: ShieldCheck,
                },
                {
                  id: "EMERGENCY_COMPLAINTS",
                  label: `1. Emergency Complaints (${unsolvedCount} Unsolved / ${solvedCount} Solved)`,
                  icon: ShieldAlert,
                },
                {
                  id: "USER_ACTIVITY",
                  label: "2. Combined Users Activity Dashboard",
                  icon: Activity,
                },
                {
                  id: "CASE_DATA_CHECK",
                  label: "3. Current Cases Data Check (9 Parameters)",
                  icon: ClipboardCheck,
                },
                {
                  id: "POLICE_CIVIC_REVIEWS",
                  label: "4. Police & Civic Reviews Section",
                  icon: MessageSquare,
                },
                {
                  id: "EVIDENCE_VAULT",
                  label: "5. SHA-256 Evidence Section",
                  icon: Lock,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 border transition-all ${
                    isActive
                      ? "bg-brand-pink text-surface-white border-brand-pink shadow-sm"
                      : "bg-blush-light text-ink border-border-rose hover:border-brand-pink"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-[1550px] w-full mx-auto p-4 sm:p-6 space-y-8 flex-1">
        {bannerMessage && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-blush-deep border-2 border-brand-pink text-xs sm:text-sm font-bold text-ink flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-pink shrink-0" />
              {bannerMessage}
            </span>
            <button
              type="button"
              onClick={() => setBannerMessage("")}
              className="text-xs font-extrabold text-ink-muted hover:text-ink"
            >
              Close
            </button>
          </div>
        )}

        {/* Top Executive Summary Strip Across All 5 Admin Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div
            onClick={() => setActiveTab("EMERGENCY_COMPLAINTS")}
            className="vira-card p-4 border-2 border-danger-red cursor-pointer hover:bg-blush-deep transition-colors"
          >
            <div className="text-[11px] font-extrabold uppercase text-danger-red">
              1. Emergency Complaints
            </div>
            <div className="text-2xl font-extrabold text-ink mt-1">
              {unsolvedCount} Unsolved · {solvedCount} Solved
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              {inProgressCount} PCR units currently dispatched
            </div>
          </div>

          <div
            onClick={() => setActiveTab("USER_ACTIVITY")}
            className="vira-card p-4 cursor-pointer hover:bg-blush-deep transition-colors"
          >
            <div className="text-[11px] font-extrabold uppercase text-brand-pink">
              2. Combined Users Activity
            </div>
            <div className="text-2xl font-extrabold text-ink mt-1">
              1,480 Users · 42 Live Trips
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              318 Safe Routes & 96 Family Shares today
            </div>
          </div>

          <div
            onClick={() => setActiveTab("CASE_DATA_CHECK")}
            className="vira-card p-4 cursor-pointer hover:bg-blush-deep transition-colors"
          >
            <div className="text-[11px] font-extrabold uppercase text-brand-pink">
              3. Current Cases Data Check
            </div>
            <div className="text-2xl font-extrabold text-ink mt-1">
              {cases.filter((c) => c.dataVerified).length}/{cases.length}{" "}
              Verified
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              Audited against all 9 Safety Parameters
            </div>
          </div>

          <div
            onClick={() => setActiveTab("POLICE_CIVIC_REVIEWS")}
            className="vira-card p-4 cursor-pointer hover:bg-blush-deep transition-colors"
          >
            <div className="text-[11px] font-extrabold uppercase text-brand-pink">
              4. Police & Civic Reviews
            </div>
            <div className="text-2xl font-extrabold text-ink mt-1">
              {reviews.length} Reviews · {corridors.length || 6} Corridors
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              Patrol deployment & streetlight fixes
            </div>
          </div>

          <div
            onClick={() => setActiveTab("EVIDENCE_VAULT")}
            className="vira-card p-4 cursor-pointer hover:bg-blush-deep transition-colors"
          >
            <div className="text-[11px] font-extrabold uppercase text-brand-pink">
              5. SHA-256 Evidence Section
            </div>
            <div className="text-2xl font-extrabold text-ink mt-1">
              {evidenceRecords.length} Chained Proofs
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              Hash Chain:{" "}
              <strong className="text-brand-pink">
                {chainValid ? "100% VALID" : "CHECK NEEDED"}
              </strong>
            </div>
          </div>
        </div>

        {/* =====================================================================
            SECTION 1: EMERGENCY PLACE FOR COMPLAINTS (SOLVED / UNSOLVED TRACKER)
           ===================================================================== */}
        {(activeTab === "ALL" || activeTab === "EMERGENCY_COMPLAINTS") && (
          <section className="tab-shift-enter vira-card p-5 sm:p-6 border-2 border-danger-red space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-rose pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-danger-red text-surface-white text-xs font-extrabold uppercase">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Admin Section 1 · Emergency Complaints Desk</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-ink mt-1">
                  Incoming Emergency Complaints & Solved / Unsolved Tracker
                </h2>
                <p className="text-xs text-ink-muted">
                  All emergency SOS triggers, stalking reports, and distress
                  complaints arrive here in real time. Track whether each
                  complaint is <strong>UNSOLVED</strong>,{" "}
                  <strong>IN PROGRESS (PCR Dispatched)</strong>, or{" "}
                  <strong>SOLVED</strong>.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "ALL", label: `All (${complaints.length})` },
                    {
                      id: "UNSOLVED",
                      label: `🔴 Unsolved (${unsolvedCount})`,
                    },
                    {
                      id: "IN_PROGRESS",
                      label: `🟡 In Progress (${inProgressCount})`,
                    },
                    { id: "SOLVED", label: `🟢 Solved (${solvedCount})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setComplaintFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                      complaintFilter === f.id
                        ? "bg-ink text-surface-white border-ink"
                        : "bg-blush-light text-ink border-border-rose hover:border-brand-pink"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emergency Complaints Cards List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredComplaints.map((comp) => {
                const isUnsolved = comp.status === "UNSOLVED";
                const isInProgress = comp.status === "IN_PROGRESS";
                const isSolved = comp.status === "SOLVED";

                return (
                  <div
                    key={comp.id}
                    className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 ${
                      isUnsolved
                        ? "bg-blush-deep border-danger-red"
                        : isInProgress
                        ? "bg-blush-light border-brand-pink"
                        : "bg-surface-white border-border-rose"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-ink text-surface-white text-xs font-extrabold">
                            {comp.id}
                          </span>
                          <span className="text-xs font-extrabold text-brand-pink">
                            {comp.complaintType}
                          </span>
                        </div>

                        {/* SOLVED / UNSOLVED TRACKER BADGE */}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                            isUnsolved
                              ? "bg-danger-red text-surface-white border-danger-red"
                              : isInProgress
                              ? "bg-brand-pink text-surface-white border-brand-pink"
                              : "bg-emerald-700 text-surface-white border-emerald-700"
                          }`}
                        >
                          {isUnsolved
                            ? "🔴 UNSOLVED"
                            : isInProgress
                            ? "🟡 IN PROGRESS (PCR SENT)"
                            : `🟢 SOLVED ${
                                comp.solvedAt ? `(${comp.solvedAt})` : "✓"
                              }`}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-ink">
                          {comp.userName}{" "}
                          <span className="text-xs font-bold text-ink-muted">
                            ({comp.userPhone}) · Reported at {comp.reportedAt}
                          </span>
                        </h3>
                        <div className="text-xs font-bold text-danger-red flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>Location: {comp.placeName}</span>
                        </div>
                      </div>

                      {/* LIVE EMERGENCY SIREN STATUS INDICATOR */}
                      {comp.sirenActive && (
                        <div className="animate-pulse px-3.5 py-2.5 rounded-xl bg-danger-red text-surface-white font-extrabold text-xs flex items-center justify-between shadow-elevated">
                          <span className="flex items-center gap-2">
                            <SirenIcon size={18} active variant="on-red" />
                            <span>EMERGENCY SIREN SOUNDING LIVE AT HIGH VOLUME</span>
                          </span>
                          {comp.sirenStartedAt && (
                            <span className="text-[10px] uppercase tracking-wider opacity-90">
                              Triggered {comp.sirenStartedAt}
                            </span>
                          )}
                        </div>
                      )}

                      {!comp.sirenActive && comp.sirenStoppedAt && (
                        <div className="px-3 py-1.5 rounded-lg bg-blush-light border border-border-rose text-[11px] font-bold text-ink-muted flex items-center justify-between">
                          <span>Siren stopped at {comp.sirenStoppedAt}</span>
                          <span className="text-emerald-700">Audio Muted / Reset</span>
                        </div>
                      )}

                      {/* PINPOINT PRECISION GPS COORDINATES & MAP LINK */}
                      {typeof comp.lat === "number" && typeof comp.lng === "number" && (
                        <div className="p-2.5 rounded-xl bg-surface-white border border-border-rose flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-ink">
                            <MapPin className="w-4 h-4 text-danger-red shrink-0" />
                            <span>
                              GPS: {comp.lat.toFixed(6)}, {comp.lng.toFixed(6)}
                              {comp.accuracy ? ` (±${comp.accuracy}m precision)` : ""}
                            </span>
                          </div>
                          {comp.mapsLink && (
                            <a
                              href={comp.mapsLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-blush-deep border border-brand-pink text-brand-pink font-extrabold hover:bg-brand-pink hover:text-surface-white transition-colors flex items-center gap-1 text-[11px]"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View on Google Maps</span>
                            </a>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-ink bg-surface-white p-3 rounded-xl border border-border-rose leading-relaxed">
                        {comp.description}
                      </p>

                      <div className="text-[11px] font-bold text-ink-muted">
                        Assigned Unit:{" "}
                        <strong className="text-ink">
                          {comp.assignedStation}
                        </strong>
                      </div>
                    </div>

                    {/* 1-Click Solved / Unsolved Action Buttons */}
                    <div className="pt-2.5 border-t border-border-rose flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {!isSolved && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateComplaintStatus(comp.id, "SOLVED")
                            }
                            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-surface-white text-xs font-extrabold flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark as Solved ✓</span>
                          </button>
                        )}

                        {isUnsolved && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateComplaintStatus(
                                comp.id,
                                "IN_PROGRESS"
                              )
                            }
                            className="vira-btn-primary px-3.5 py-2 text-xs font-extrabold"
                          >
                            Dispatch PCR Unit
                          </button>
                        )}

                        {isSolved && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateComplaintStatus(comp.id, "UNSOLVED")
                            }
                            className="vira-btn-secondary px-3 py-1.5 text-xs font-bold"
                          >
                            Reopen as Unsolved
                          </button>
                        )}
                      </div>

                      <a
                        href={`tel:${comp.userPhone.replace(/\s+/g, "")}`}
                        className="px-3 py-1.5 rounded-xl bg-surface-white border border-border-rose text-xs font-bold text-ink hover:border-brand-pink flex items-center gap-1"
                      >
                        <PhoneCall className="w-3 h-3 text-brand-pink" />
                        <span>Call User</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form to Log / Simulate a New Incoming Emergency Complaint */}
            <form
              onSubmit={handleCreateEmergencyComplaint}
              className="p-4 rounded-2xl bg-blush-light border border-border-rose space-y-3"
            >
              <div className="text-xs font-extrabold uppercase text-brand-pink flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" />
                <span>
                  Log New Incoming Emergency Complaint (Starts as UNSOLVED)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <input
                  type="text"
                  required
                  value={newComplaintUser}
                  onChange={(e) => setNewComplaintUser(e.target.value)}
                  placeholder="Complainant Name (e.g., Neha Joshi)"
                  className="px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
                />
                <input
                  type="text"
                  value={newComplaintPhone}
                  onChange={(e) => setNewComplaintPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
                />
                <input
                  type="text"
                  required
                  value={newComplaintPlace}
                  onChange={(e) => setNewComplaintPlace(e.target.value)}
                  placeholder="New Delhi Location"
                  className="px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
                />
                <select
                  value={newComplaintType}
                  onChange={(e) => setNewComplaintType(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
                >
                  <option value="High-Priority SOS Trigger">
                    High-Priority SOS Trigger
                  </option>
                  <option value="Stalking / Following Complaint">
                    Stalking / Following Complaint
                  </option>
                  <option value="Harassment Complaint">
                    Harassment Complaint
                  </option>
                  <option value="Cab Route Deviation Alert">
                    Cab Route Deviation Alert
                  </option>
                  <option value="Dark Stretch / Streetlight Outage">
                    Dark Stretch / Streetlight Outage
                  </option>
                </select>
                <button
                  type="submit"
                  className="vira-btn-danger py-2 px-4 text-xs font-extrabold"
                >
                  + Add Emergency Complaint
                </button>
              </div>
              <input
                type="text"
                required
                value={newComplaintDesc}
                onChange={(e) => setNewComplaintDesc(e.target.value)}
                placeholder="Describe the emergency complaint details (e.g., Suspicious vehicle following near Metro Gate 3)..."
                className="w-full px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
              />
            </form>
          </section>
        )}

        {/* =====================================================================
            SECTION 2: ACTIVITY DASHBOARD OF THE COMBINED USERS
           ===================================================================== */}
        {(activeTab === "ALL" || activeTab === "USER_ACTIVITY") && (
          <section className="tab-shift-enter vira-card p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-rose pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blush-deep text-brand-pink text-xs font-extrabold uppercase border border-brand-pink">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Admin Section 2 · Combined Users Activity</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-ink mt-1">
                  Live Activity Dashboard of All Combined Platform Users
                </h2>
                <p className="text-xs text-ink-muted">
                  Real-time monitoring of active trips, safe route searches,
                  check-in timers, and family shares across New Delhi.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Filter users, routes, or areas..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
                />
              </div>
            </div>

            {/* Combined Users KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-3.5 rounded-xl bg-blush-light border border-border-rose">
                <div className="text-[11px] font-bold uppercase text-ink-muted">
                  Active Monitored Trips
                </div>
                <div className="text-2xl font-extrabold text-brand-pink">
                  42 Live Trips
                </div>
                <div className="text-[11px] text-ink-muted">
                  Across Central, South & West Delhi
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-blush-light border border-border-rose">
                <div className="text-[11px] font-bold uppercase text-ink-muted">
                  Safe Route Searches Today
                </div>
                <div className="text-2xl font-extrabold text-ink">
                  318 Routes
                </div>
                <div className="text-[11px] text-ink-muted">
                  89% chose the Safest Recommended Road
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-blush-light border border-border-rose">
                <div className="text-[11px] font-bold uppercase text-ink-muted">
                  Active Trusted Circle Shares
                </div>
                <div className="text-2xl font-extrabold text-ink">
                  96 Family Shares
                </div>
                <div className="text-[11px] text-ink-muted">
                  Auto-revokes upon safe arrival
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-blush-light border border-border-rose">
                <div className="text-[11px] font-bold uppercase text-ink-muted">
                  Check-In Timers Armed
                </div>
                <div className="text-2xl font-extrabold text-ink">
                  29 Active Timers
                </div>
                <div className="text-[11px] text-ink-muted">
                  15-min & 30-min safe arrival watches
                </div>
              </div>
            </div>

            {/* Combined Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-rose text-[11px] font-extrabold uppercase text-ink-muted">
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Current Feature / Activity</th>
                    <th className="py-2.5 px-3">
                      New Delhi Route / Current Location
                    </th>
                    <th className="py-2.5 px-3">Travel Mode</th>
                    <th className="py-2.5 px-3">Safety Score</th>
                    <th className="py-2.5 px-3">Live Status</th>
                    <th className="py-2.5 px-3 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-rose">
                  {filteredActivities.map((act) => (
                    <tr key={act.id} className="hover:bg-blush-light/60">
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-ink">
                          {act.userName}
                        </div>
                        <div className="text-[11px] text-ink-muted">
                          {act.userEmail}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-brand-pink">
                        {act.activityType}
                      </td>
                      <td className="py-3 px-3 font-semibold text-ink">
                        {act.routeOrArea}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-blush-deep border border-border-rose font-bold text-ink">
                          {act.travelMode}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-ink">
                        {act.safetyScore}/100
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            act.status === "SAFE & ACTIVE"
                              ? "bg-emerald-700 text-surface-white"
                              : "bg-brand-pink text-surface-white"
                          }`}
                        >
                          {act.status} · {act.lastPing}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setUserActivities((prev) =>
                              prev.map((u) =>
                                u.id === act.id
                                  ? {
                                      ...u,
                                      pingSent: true,
                                      status: "SAFE & ACTIVE",
                                      lastPing: "Just now",
                                    }
                                  : u
                              )
                            );
                            setBannerMessage(
                              `Safety check ping sent to ${act.userName} (${act.routeOrArea}).`
                            );
                          }}
                          className="vira-btn-secondary px-3 py-1.5 text-[11px] font-bold"
                        >
                          {act.pingSent
                            ? "✓ Safety Ping Verified"
                            : "Send Check-In Ping"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* =====================================================================
            SECTION 3: DATA CHECK OF CURRENT CASES (WITH 9 SAFETY PARAMETERS)
           ===================================================================== */}
        {(activeTab === "ALL" || activeTab === "CASE_DATA_CHECK") && (
          <section className="tab-shift-enter vira-card p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-rose pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blush-deep text-brand-pink text-xs font-extrabold uppercase border border-brand-pink">
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Admin Section 3 · Data Check of Current Cases</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-ink mt-1">
                  Current Cases Data Verification & 9-Parameter Safety Audit
                </h2>
                <p className="text-xs text-ink-muted">
                  Select any current case or search any New Delhi location to
                  cross-check all 9 safety parameters, CCTV feeds, corroborating
                  reports, and nearest police station details.
                </p>
              </div>

              <div className="w-full sm:w-80">
                <input
                  type="text"
                  value={customCheckLocation}
                  onChange={(e) => setCustomCheckLocation(e.target.value)}
                  placeholder="Or type any New Delhi place to data-check..."
                  className="w-full px-3.5 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
                />
              </div>
            </div>

            {/* Case Selector Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {cases.map((c) => {
                const isSelected =
                  !customCheckLocation.trim() && c.caseId === selectedCase.caseId;
                return (
                  <div
                    key={c.caseId}
                    onClick={() => {
                      setCustomCheckLocation("");
                      setSelectedCaseId(c.caseId);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? "bg-blush-deep border-2 border-brand-pink"
                        : "bg-surface-white border-border-rose hover:bg-blush-light"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded bg-ink text-surface-white text-[10px] font-extrabold">
                          {c.caseId}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            c.dataVerified
                              ? "bg-emerald-700 text-surface-white"
                              : "bg-danger-red text-surface-white"
                          }`}
                        >
                          {c.dataVerified
                            ? "✓ DATA VERIFIED"
                            : "PENDING DATA CHECK"}
                        </span>
                      </div>
                      <h3 className="text-xs font-extrabold text-ink">
                        {c.title}
                      </h3>
                      <p className="text-[11px] text-ink-muted">
                        {c.placeName} ({c.district}) · {c.corroboratingReports}{" "}
                        Reports
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCases((prev) =>
                          prev.map((item) =>
                            item.caseId === c.caseId
                              ? { ...item, dataVerified: !item.dataVerified }
                              : item
                          )
                        );
                        setBannerMessage(
                          `Case ${c.caseId} data verification status updated.`
                        );
                      }}
                      className="vira-btn-secondary py-1.5 px-3 text-[11px] font-extrabold w-full"
                    >
                      {c.dataVerified
                        ? "✓ Case Data Verified (Toggle)"
                        : "Mark Case Data Verified ✓"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Selected Case Detail + 9 Safety Parameters Grid */}
            <div className="p-4 rounded-2xl bg-blush-light border border-border-rose space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-extrabold uppercase text-brand-pink">
                    Active Case Data Sheet · {selectedCase.caseId}
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-ink">
                    {customLocationMatch
                      ? `Live Data Check: ${customLocationMatch.name}`
                      : selectedCase.title}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {selectedCase.caseSummary}
                  </p>
                </div>

                <div className="text-xs space-y-1 bg-surface-white p-3 rounded-xl border border-border-rose">
                  <div>
                    <span className="font-bold text-ink-muted">CCTV Check: </span>
                    <strong className="text-ink">
                      {selectedCase.cctvFeedStatus}
                    </strong>
                  </div>
                  <div>
                    <span className="font-bold text-ink-muted">
                      Assigned Officer:{" "}
                    </span>
                    <strong className="text-ink">
                      {selectedCase.policeUnitAssigned}
                    </strong>
                  </div>
                </div>
              </div>

              <NineSafetyParametersGrid
                placeName={
                  customLocationMatch
                    ? customLocationMatch.shortName
                    : selectedCase.placeName
                }
                safetyParams={caseSafetyParams}
              />
            </div>
          </section>
        )}

        {/* =====================================================================
            SECTION 4: POLICE AND CIVIC REVIEWS SECTION
           ===================================================================== */}
        {(activeTab === "ALL" || activeTab === "POLICE_CIVIC_REVIEWS") && (
          <section className="tab-shift-enter vira-card p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-rose pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blush-deep text-brand-pink text-xs font-extrabold uppercase border border-brand-pink">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Admin Section 4 · Police & Civic Reviews</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-ink mt-1">
                  Police Patrol & Civic Infrastructure Reviews Queue
                </h2>
                <p className="text-xs text-ink-muted">
                  Moved from the normal user app into the Admin Portal: review
                  commuter reports on dark streets, broken streetlights, CCTV
                  gaps, and night patrol needs across New Delhi.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "ALL", label: "All Reviews" },
                    {
                      id: "POLICE_PATROL",
                      label: "🚔 Police Patrol Reviews",
                    },
                    {
                      id: "CIVIC_LIGHTING_CCTV",
                      label: "💡 Civic Lighting & CCTV Reviews",
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setReviewFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
                      reviewFilter === tab.id
                        ? "bg-brand-pink text-surface-white border-brand-pink"
                        : "bg-blush-light text-ink border-border-rose"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-blush-light border border-border-rose flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-white border border-border-rose text-[11px] font-extrabold text-brand-pink">
                        {rev.category === "POLICE_PATROL"
                          ? "🚔 POLICE PATROL REVIEW"
                          : "💡 CIVIC STREETLIGHT / CCTV REVIEW"}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          rev.actionStatus === "RESOLVED"
                            ? "bg-emerald-700 text-surface-white"
                            : rev.actionStatus === "DISPATCHED"
                            ? "bg-brand-pink text-surface-white"
                            : "bg-ink text-surface-white"
                        }`}
                      >
                        {rev.actionStatus}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-ink">
                        {rev.placeName}
                      </h3>
                      <div className="text-[11px] text-ink-muted">
                        By {rev.userName} · {rev.reportedTime} · Safety Rating:{" "}
                        {rev.rating}/5
                      </div>
                    </div>

                    <p className="text-xs text-ink bg-surface-white p-3 rounded-xl border border-border-rose">
                      &ldquo;{rev.comment}&rdquo;
                    </p>

                    <div className="text-xs font-bold text-ink">
                      Recommended Action:{" "}
                      <span className="text-brand-pink">
                        {rev.recommendedAction}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border-rose flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReviews((prev) =>
                          prev.map((r) =>
                            r.id === rev.id
                              ? { ...r, actionStatus: "DISPATCHED" }
                              : r
                          )
                        );
                        setBannerMessage(
                          `Team dispatched for review ${rev.id} at ${rev.placeName}.`
                        );
                      }}
                      className="vira-btn-primary px-3 py-1.5 text-xs font-bold"
                    >
                      {rev.category === "POLICE_PATROL"
                        ? "Assign Night Patrol"
                        : "Order Streetlight / CCTV Fix"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReviews((prev) =>
                          prev.map((r) =>
                            r.id === rev.id
                              ? { ...r, actionStatus: "RESOLVED" }
                              : r
                          )
                        );
                        setBannerMessage(
                          `Review ${rev.id} (${rev.placeName}) marked as RESOLVED.`
                        );
                      }}
                      className="vira-btn-secondary px-3 py-1.5 text-xs font-bold"
                    >
                      Mark Resolved ✓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =====================================================================
            SECTION 5: TAMPER-EVIDENT EVIDENCE SECTION (SHA-256 VAULT)
           ===================================================================== */}
        {(activeTab === "ALL" || activeTab === "EVIDENCE_VAULT") && (
          <div className="tab-shift-enter">
            <AdminEvidenceSection onNotify={setBannerMessage} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blush-light" />}>
      <AdminPortalContent />
    </Suspense>
  );
}



