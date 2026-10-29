import { create } from "zustand";
import { ScoredRouteOption } from "@/lib/engine/route-planner";

export type ViraAvatarState = "idle" | "listening" | "speaking" | "distress";
export type PortalViewMode = "split" | "fullmap" | "fullchat";
export type PortalLanguage = "en" | "hi";

export interface CopilotSafetyStop {
  id: string;
  stopNumber: number;
  name: string;
  hindiName: string;
  district: string;
  areaSlug?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  safetyScore: number;
  riskLevel: "LOW" | "CAUTION" | "ELEVATED" | "HIGH" | "ACTIVE_INCIDENT";
  whySafe: string;
  whySafeHi: string;
  status: "completed" | "current" | "upcoming";
  coordinates: [number, number];
}

export interface ActiveCopilotPlan {
  id: string;
  title: string;
  hindiTitle: string;
  originName: string;
  destinationName: string;
  departureTime: string;
  returnDeadline: string;
  safetyBufferMinutes: number;
  travelMode: "WALK" | "CAB" | "METRO" | "AUTO";
  overallSafetyScore: number;
  stops: CopilotSafetyStop[];
}

interface ActiveJourneyState {
  isMonitoring: boolean;
  startPlaceName: string;
  destPlaceName: string;
  currentPlaceName: string;
  selectedRoute: ScoredRouteOption | null;
  progressPercent: number;
  checkInMinutes: number;
  checkInRemainingSeconds: number;
  trustedCircleShared: boolean;
  deviationPromptActive: boolean;
  deviationCountdownSeconds: number;
}

interface SafetyStore {
  // User & context
  currentPlaceName: string;
  selectedAreaSlug: string;
  timeSliderHour: number;
  offlineModeEnabled: boolean;
  unreadAlertsCount: number;

  // Ghumo-style Portal Layout & AI Copilot State
  portalViewMode: PortalViewMode;
  language: PortalLanguage;
  mobilePreviewMode: boolean;
  copilotDrawerOpen: boolean;
  activeCopilotPlan: ActiveCopilotPlan;
  externalChatPrompt: string | null;

  // SOS state
  sosCountdownActive: boolean;
  sosCountdownSeconds: number;
  sosFullAlertActive: boolean;
  sosSilentMode: boolean;
  sosTriggerReason: string;

  // Vira 3D Companion state
  viraOpen: boolean;
  viraFullScreen: boolean;
  viraAvatarState: ViraAvatarState;
  viraMuted: boolean;
  viraDistressActive: boolean;
  viraLastSpokenText: string;
  viraGuidedTourActive: boolean;
  viraGuidedTourStep: number;
  highlightedSafeHavenId: string | null;

  // Active Journey state
  activeJourney: ActiveJourneyState;

  // Actions
  setCurrentPlaceName: (name: string) => void;
  setSelectedAreaSlug: (slug: string) => void;
  setTimeSliderHour: (hour: number) => void;
  setOfflineModeEnabled: (enabled: boolean) => void;
  incrementUnreadAlerts: () => void;
  clearUnreadAlerts: () => void;

  setPortalViewMode: (mode: PortalViewMode) => void;
  setLanguage: (lang: PortalLanguage) => void;
  setMobilePreviewMode: (mobile: boolean) => void;
  setCopilotDrawerOpen: (open: boolean) => void;
  setActiveCopilotPlan: (plan: ActiveCopilotPlan) => void;
  addPlaceToCopilotPlan: (place: {
    name: string;
    hindiName?: string;
    district: string;
    areaSlug?: string;
    safetyScore: number;
    riskLevel: "LOW" | "CAUTION" | "ELEVATED" | "HIGH" | "ACTIVE_INCIDENT";
    whySafe: string;
    coordinates: [number, number];
  }) => void;
  replanCopilotDelay: (delayMinutes: number) => void;
  replanCopilotAddSafeHaven: () => void;
  replanCopilotSwitchToCab: () => void;
  removeCopilotStop: (stopId: string) => void;
  extendCopilotStop: (stopId: string, extraMinutes: number) => void;
  setExternalChatPrompt: (prompt: string | null) => void;

  startSosCountdown: (reason?: string, silent?: boolean) => void;
  tickSosCountdown: () => void;
  triggerImmediateFullSos: (reason?: string, silent?: boolean) => void;
  cancelSos: () => void;

  setViraOpen: (open: boolean) => void;
  setViraFullScreen: (full: boolean) => void;
  setViraAvatarState: (state: ViraAvatarState) => void;
  setViraMuted: (muted: boolean) => void;
  setViraDistressActive: (active: boolean) => void;
  setViraLastSpokenText: (text: string) => void;
  setViraGuidedTour: (active: boolean, step?: number) => void;
  setHighlightedSafeHavenId: (id: string | null) => void;

  startMonitoredJourney: (params: {
    startPlaceName: string;
    destPlaceName: string;
    route: ScoredRouteOption | null;
    checkInMinutes?: number;
    shareWithCircle?: boolean;
  }) => void;
  syncPlannedTrip: (params: {
    startPlaceName: string;
    destPlaceName: string;
    departureTime: string; // "HH:mm"
    travelMode: "WALK" | "CAB" | "METRO" | "AUTO";
    route: ScoredRouteOption;
  }) => void;
  updateJourneyProgress: (percent: number, currentPlaceName?: string) => void;
  setCheckInTimer: (minutes: number) => void;
  tickCheckInTimer: () => void;
  triggerDeviationPrompt: () => void;
  resolveDeviationSafe: () => void;
  endMonitoredJourney: () => void;
}

export const useSafetyStore = create<SafetyStore>((set) => ({
  currentPlaceName: "Connaught Place Inner Circle, New Delhi",
  selectedAreaSlug: "minto-bridge-underpass-lane",
  timeSliderHour: 21,
  offlineModeEnabled: false,
  unreadAlertsCount: 2,

  portalViewMode: "split",
  language: "en",
  mobilePreviewMode: false,
  copilotDrawerOpen: false,
  externalChatPrompt: null,
  activeCopilotPlan: {
    id: "copilot-evening-safe-circuit",
    title: "Evening Safe Commute Corridor (CP → AIIMS → Hauz Khas)",
    hindiTitle: "रात्रिकालीन सुरक्षित यात्रा मार्ग (कनॉट प्लेस → एम्स → हौज खास)",
    originName: "Connaught Place Inner Circle",
    destinationName: "Hauz Khas Metro Gate 1",
    departureTime: "9:30 PM",
    returnDeadline: "10:35 PM",
    safetyBufferMinutes: 22,
    travelMode: "METRO",
    overallSafetyScore: 92,
    stops: [
      {
        id: "stop-cp-inner",
        stopNumber: 1,
        name: "Connaught Place Inner Circle & Shakti Pink Booth",
        hindiName: "कनॉट प्लेस इनर सर्कल एवं शक्ति पिंक बूथ",
        district: "Central Delhi",
        areaSlug: "connaught-place-inner-circle",
        startTime: "9:30 PM",
        endTime: "9:42 PM",
        durationMinutes: 12,
        safetyScore: 93,
        riskLevel: "LOW",
        whySafe:
          "94/100 municipal LED lighting, 91/100 active footfall, and 24x7 Shakti Pink Police Booth 140m from Rajiv Chowk Gate 6.",
        whySafeHi:
          "94/100 एलईडी स्ट्रीट लाइटिंग, सक्रिय पैदल आवाजाही और राजीव चौक गेट 6 के पास 24x7 शक्ति पिंक पुलिस बूथ।",
        status: "completed",
        coordinates: [28.6315, 77.2167],
      },
      {
        id: "stop-aiims-corridor",
        stopNumber: 2,
        name: "AIIMS Trauma & Medical Transit Safe Haven",
        hindiName: "एम्स मुख्य द्वार सुरक्षित ट्रांजिट कॉरिडोर",
        district: "South Delhi",
        areaSlug: "aiims-ansari-nagar-corridor",
        startTime: "9:42 PM",
        endTime: "10:00 PM",
        durationMinutes: 18,
        safetyScore: 94,
        riskLevel: "LOW",
        whySafe:
          "Bypasses dark Minto/ITO stretches via Yellow Line corridor; 96/100 hospital perimeter lighting and 24x7 police outpost at Gate 1.",
        whySafeHi:
          "अंधेरे अंडरपास को बायपास करते हुए 96/100 अस्पताल परिसर रोशनी और 24x7 पुलिस चौकी सुरक्षा।",
        status: "current",
        coordinates: [28.5672, 77.21],
      },
      {
        id: "stop-hauz-khas-main",
        stopNumber: 3,
        name: "Hauz Khas Metro Station Gate 1 (Avoids Deer Park Lane)",
        hindiName: "हौज खास मेट्रो स्टेशन गेट 1 (मुख्य आउटर रिंग रोड)",
        district: "South Delhi",
        areaSlug: "hauz-khas-deer-park-approach",
        startTime: "10:00 PM",
        endTime: "10:13 PM",
        durationMinutes: 13,
        safetyScore: 89,
        riskLevel: "CAUTION",
        whySafe:
          "Exits onto lit Outer Ring Road with CISF Women Helpdesk & Pink PCR van instead of the unlit Deer Park boundary wall.",
        whySafeHi:
          "अंधेरे डियर पार्क लेन के बजाय रोशनी वाले आउटर रिंग रोड और सीआईएसएफ महिला हेल्पडेस्क से सुरक्षित निकास।",
        status: "upcoming",
        coordinates: [28.5494, 77.2001],
      },
    ],
  },

  sosCountdownActive: false,
  sosCountdownSeconds: 5,
  sosFullAlertActive: false,
  sosSilentMode: false,
  sosTriggerReason: "Manual SOS Button Activated",

  viraOpen: false,
  viraFullScreen: false,
  viraAvatarState: "idle",
  viraMuted: false,
  viraDistressActive: false,
  viraLastSpokenText:
    "Hi, I am Vira, your predictive safety companion. Ask me why an area is risky, plan a safe route, or tap I feel unsafe for immediate support.",
  viraGuidedTourActive: false,
  viraGuidedTourStep: 0,
  highlightedSafeHavenId: null,

  activeJourney: {
    isMonitoring: true,
    startPlaceName: "Connaught Place Inner Circle",
    destPlaceName: "Hauz Khas Metro Station",
    currentPlaceName: "AIIMS Main Gate, Ansari Nagar, New Delhi",
    selectedRoute: null,
    progressPercent: 42,
    checkInMinutes: 15,
    checkInRemainingSeconds: 15 * 60,
    trustedCircleShared: true,
    deviationPromptActive: false,
    deviationCountdownSeconds: 10,
  },

  setCurrentPlaceName: (currentPlaceName) => set({ currentPlaceName }),
  setSelectedAreaSlug: (selectedAreaSlug) => set({ selectedAreaSlug }),
  setTimeSliderHour: (timeSliderHour) => set({ timeSliderHour }),
  setOfflineModeEnabled: (offlineModeEnabled) => set({ offlineModeEnabled }),
  incrementUnreadAlerts: () =>
    set((s) => ({ unreadAlertsCount: s.unreadAlertsCount + 1 })),
  clearUnreadAlerts: () => set({ unreadAlertsCount: 0 }),

  setPortalViewMode: (portalViewMode) => set({ portalViewMode }),
  setLanguage: (language) => set({ language }),
  setMobilePreviewMode: (mobilePreviewMode) => set({ mobilePreviewMode }),
  setCopilotDrawerOpen: (copilotDrawerOpen) => set({ copilotDrawerOpen }),
  setActiveCopilotPlan: (activeCopilotPlan) => set({ activeCopilotPlan }),
  setExternalChatPrompt: (externalChatPrompt) => set({ externalChatPrompt }),

  addPlaceToCopilotPlan: (place) =>
    set((s) => {
      const existing = s.activeCopilotPlan.stops.some(
        (st) => st.name === place.name
      );
      if (existing) {
        return { copilotDrawerOpen: true };
      }
      const nextNum = s.activeCopilotPlan.stops.length + 1;
      const newStop: CopilotSafetyStop = {
        id: `stop-${Date.now()}`,
        stopNumber: nextNum,
        name: place.name,
        hindiName: place.hindiName || place.name,
        district: place.district,
        areaSlug: place.areaSlug,
        startTime: "10:15 PM",
        endTime: "10:30 PM",
        durationMinutes: 15,
        safetyScore: place.safetyScore,
        riskLevel: place.riskLevel,
        whySafe: place.whySafe,
        whySafeHi: place.whySafe,
        status: "upcoming",
        coordinates: place.coordinates,
      };
      return {
        copilotDrawerOpen: true,
        activeCopilotPlan: {
          ...s.activeCopilotPlan,
          stops: [...s.activeCopilotPlan.stops, newStop],
        },
      };
    }),

  replanCopilotDelay: (delayMinutes) =>
    set((s) => {
      const newBuffer = Math.max(
        10,
        s.activeCopilotPlan.safetyBufferMinutes - Math.round(delayMinutes / 3)
      );
      return {
        copilotDrawerOpen: true,
        activeCopilotPlan: {
          ...s.activeCopilotPlan,
          title: `Replanned (+${delayMinutes}m Delay Protected): ${s.activeCopilotPlan.originName} → ${s.activeCopilotPlan.destinationName}`,
          safetyBufferMinutes: newBuffer,
          overallSafetyScore: Math.min(96, s.activeCopilotPlan.overallSafetyScore + 2),
          stops: s.activeCopilotPlan.stops.map((st, idx) => ({
            ...st,
            whySafe:
              idx === s.activeCopilotPlan.stops.length - 1
                ? `Auto-replanned for ${delayMinutes}m delay: pick-up moved to a brightly lit main-road spot near ${s.activeCopilotPlan.destinationName}.`
                : st.whySafe,
          })),
        },
      };
    }),

  replanCopilotAddSafeHaven: () =>
    set((s) => {
      const hasBooth = s.activeCopilotPlan.stops.some((st) =>
        st.id.includes("pink-pcr")
      );
      if (hasBooth) return { copilotDrawerOpen: true };
      const planStop = s.activeJourney.selectedRoute?.safeStops?.[0];
      const inserted: CopilotSafetyStop = {
        id: `stop-pink-pcr-${Date.now()}`,
        stopNumber: 2,
        name: planStop
          ? `${planStop.name} Check-In`
          : `Nearest 24x7 Police Booth near ${s.activeCopilotPlan.destinationName}`,
        hindiName: planStop ? planStop.name : "नज़दीकी 24x7 पुलिस बूथ",
        district: planStop?.placeName || s.activeCopilotPlan.destinationName,
        startTime: "9:50 PM",
        endTime: "9:56 PM",
        durationMinutes: 6,
        safetyScore: 96,
        riskLevel: "LOW",
        whySafe:
          "Verified 24x7 police / safe stop added as a mid-journey check-in point on your route.",
        whySafeHi:
          "24x7 पुलिस / सुरक्षित पड़ाव मध्य-यात्रा सुरक्षा चेक-इन के रूप में जोड़ा गया।",
        status: "upcoming",
        coordinates: planStop
          ? [planStop.lat, planStop.lng]
          : s.activeCopilotPlan.stops[0]?.coordinates || [28.6139, 77.209],
      };
      const updatedStops = [
        s.activeCopilotPlan.stops[0],
        inserted,
        ...s.activeCopilotPlan.stops.slice(1),
      ].map((st, idx) => ({ ...st, stopNumber: idx + 1 }));
      return {
        copilotDrawerOpen: true,
        activeCopilotPlan: {
          ...s.activeCopilotPlan,
          overallSafetyScore: 95,
          stops: updatedStops,
        },
      };
    }),

  replanCopilotSwitchToCab: () =>
    set((s) => ({
      copilotDrawerOpen: true,
      activeCopilotPlan: {
        ...s.activeCopilotPlan,
        travelMode: "CAB",
        safetyBufferMinutes: s.activeCopilotPlan.safetyBufferMinutes + 8,
        overallSafetyScore: 95,
        title: `Verified Cab Corridor: ${s.activeCopilotPlan.originName} → ${s.activeCopilotPlan.destinationName}`,
      },
    })),

  removeCopilotStop: (stopId) =>
    set((s) => {
      const remaining = s.activeCopilotPlan.stops
        .filter((st) => st.id !== stopId)
        .map((st, idx) => ({ ...st, stopNumber: idx + 1 }));
      return {
        activeCopilotPlan: {
          ...s.activeCopilotPlan,
          stops: remaining,
        },
      };
    }),

  extendCopilotStop: (stopId, extraMinutes) =>
    set((s) => ({
      activeCopilotPlan: {
        ...s.activeCopilotPlan,
        safetyBufferMinutes: Math.max(
          8,
          s.activeCopilotPlan.safetyBufferMinutes - Math.round(extraMinutes / 2)
        ),
        stops: s.activeCopilotPlan.stops.map((st) =>
          st.id === stopId
            ? { ...st, durationMinutes: st.durationMinutes + extraMinutes }
            : st
        ),
      },
    })),

  startSosCountdown: (reason = "Manual SOS Activated", silent = false) =>
    set({
      sosCountdownActive: true,
      sosCountdownSeconds: 5,
      sosFullAlertActive: false,
      sosSilentMode: silent,
      sosTriggerReason: reason,
    }),

  tickSosCountdown: () =>
    set((state) => {
      if (!state.sosCountdownActive) return state;
      if (state.sosCountdownSeconds <= 1) {
        return {
          sosCountdownActive: false,
          sosCountdownSeconds: 0,
          sosFullAlertActive: true,
        };
      }
      return {
        sosCountdownSeconds: state.sosCountdownSeconds - 1,
      };
    }),

  triggerImmediateFullSos: (reason = "Immediate Emergency SOS", silent = false) =>
    set({
      sosCountdownActive: false,
      sosCountdownSeconds: 0,
      sosFullAlertActive: true,
      sosSilentMode: silent,
      sosTriggerReason: reason,
    }),

  cancelSos: () =>
    set({
      sosCountdownActive: false,
      sosCountdownSeconds: 5,
      sosFullAlertActive: false,
      sosSilentMode: false,
      viraDistressActive: false,
      viraAvatarState: "idle",
    }),

  setViraOpen: (viraOpen) => set({ viraOpen }),
  setViraFullScreen: (viraFullScreen) =>
    set({ viraFullScreen, viraOpen: viraFullScreen ? true : undefined }),
  setViraAvatarState: (viraAvatarState) => set({ viraAvatarState }),
  setViraMuted: (viraMuted) => set({ viraMuted }),
  setViraDistressActive: (viraDistressActive) =>
    set({
      viraDistressActive,
      viraAvatarState: viraDistressActive ? "distress" : "idle",
    }),
  setViraLastSpokenText: (viraLastSpokenText) => set({ viraLastSpokenText }),
  setViraGuidedTour: (viraGuidedTourActive, viraGuidedTourStep = 0) =>
    set({ viraGuidedTourActive, viraGuidedTourStep }),
  setHighlightedSafeHavenId: (highlightedSafeHavenId) =>
    set({ highlightedSafeHavenId }),

  startMonitoredJourney: ({
    startPlaceName,
    destPlaceName,
    route,
    checkInMinutes = 15,
    shareWithCircle = true,
  }) =>
    set({
      activeJourney: {
        isMonitoring: true,
        startPlaceName,
        destPlaceName,
        currentPlaceName: startPlaceName,
        selectedRoute: route,
        progressPercent: 18,
        checkInMinutes,
        checkInRemainingSeconds: checkInMinutes * 60,
        trustedCircleShared: shareWithCircle,
        deviationPromptActive: false,
        deviationCountdownSeconds: 10,
      },
    }),

  /**
   * Called by the Safe Route planner every time the trip changes, so the
   * Safe Journey Copilot and the Trip Monitor always follow the planned trip.
   */
  syncPlannedTrip: ({
    startPlaceName,
    destPlaceName,
    departureTime,
    travelMode,
    route,
  }) =>
    set((s) => {
      const [hh, mm] = departureTime.split(":").map((n) => parseInt(n, 10));
      const baseMin = (isNaN(hh) ? 21 : hh) * 60 + (isNaN(mm) ? 0 : mm);
      const fmt = (total: number) => {
        const t = ((total % 1440) + 1440) % 1440;
        const h24 = Math.floor(t / 60);
        const m = t % 60;
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        return `${h12}:${String(m).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
      };
      const legs = route.legs.length > 0 ? route.legs : [];
      let cursor = baseMin;
      const geo = route.geometry;
      const stops: CopilotSafetyStop[] = legs.map((leg, idx) => {
        const start = cursor;
        cursor += Math.max(1, Math.round(leg.durationMinutes));
        const gi = geo.length
          ? Math.min(
              geo.length - 1,
              Math.round(((idx + 1) / legs.length) * (geo.length - 1))
            )
          : 0;
        const status: CopilotSafetyStop["status"] =
          idx === 0 ? "current" : "upcoming";
        return {
          id: `trip-leg-${idx}-${leg.id}`,
          stopNumber: idx + 1,
          name: leg.corridorName,
          hindiName: leg.corridorName,
          district: destPlaceName,
          areaSlug: leg.areaSlug,
          startTime: fmt(start),
          endTime: fmt(cursor),
          durationMinutes: Math.max(1, Math.round(leg.durationMinutes)),
          safetyScore: leg.safetyScore,
          riskLevel: leg.riskLevel,
          whySafe: leg.plainReason,
          whySafeHi: leg.plainReason,
          status,
          coordinates: (geo[gi] as [number, number]) || [28.6139, 77.209],
        };
      });
      const arrive = fmt(baseMin + Math.round(route.durationMinutes));
      return {
        activeCopilotPlan: {
          id: `copilot-${startPlaceName}-${destPlaceName}`.replace(/\s+/g, "-"),
          title: `${startPlaceName} → ${destPlaceName} (${route.title})`,
          hindiTitle: `${startPlaceName} → ${destPlaceName}`,
          originName: startPlaceName,
          destinationName: destPlaceName,
          departureTime: fmt(baseMin),
          returnDeadline: arrive,
          safetyBufferMinutes: Math.max(
            8,
            Math.round(route.durationMinutes * 0.25)
          ),
          travelMode,
          overallSafetyScore: route.safetyScore,
          stops,
        },
        currentPlaceName: startPlaceName,
        activeJourney: {
          ...s.activeJourney,
          startPlaceName,
          destPlaceName,
          currentPlaceName: startPlaceName,
          selectedRoute: route,
          progressPercent: s.activeJourney.isMonitoring ? 0 : 0,
          deviationPromptActive: false,
        },
      };
    }),

  updateJourneyProgress: (progressPercent, currentPlaceName) =>
    set((s) => ({
      activeJourney: {
        ...s.activeJourney,
        progressPercent,
        currentPlaceName: currentPlaceName || s.activeJourney.currentPlaceName,
      },
    })),

  setCheckInTimer: (minutes) =>
    set((s) => ({
      activeJourney: {
        ...s.activeJourney,
        checkInMinutes: minutes,
        checkInRemainingSeconds: minutes * 60,
      },
    })),

  tickCheckInTimer: () =>
    set((s) => ({
      activeJourney: {
        ...s.activeJourney,
        checkInRemainingSeconds: Math.max(
          0,
          s.activeJourney.checkInRemainingSeconds - 1
        ),
      },
    })),

  triggerDeviationPrompt: () =>
    set((s) => ({
      activeJourney: {
        ...s.activeJourney,
        deviationPromptActive: true,
        deviationCountdownSeconds: 10,
      },
    })),

  resolveDeviationSafe: () =>
    set((s) => ({
      activeJourney: {
        ...s.activeJourney,
        deviationPromptActive: false,
        deviationCountdownSeconds: 10,
      },
    })),

  endMonitoredJourney: () =>
    set((s) => ({
      activeJourney: {
        ...s.activeJourney,
        isMonitoring: false,
        progressPercent: 100,
        trustedCircleShared: false,
        deviationPromptActive: false,
      },
    })),
}));
