"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map,
  Route,
  Navigation,
  Users,
  MessageSquare,
  Bell,
  Lock,
  Settings,
  ShieldAlert,
  LayoutDashboard,
  WifiOff,
  Sparkles,
  LogOut,
  Home,
  Compass,
  PhoneCall,
  Smartphone,
  Monitor,
  Menu,
  X,
  ArrowLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { useSafetyStore } from "@/store/useSafetyStore";
import { SirenIcon } from "@/components/ui/SirenIcon";
import { SafetyCopilotDrawer } from "@/components/copilot/SafetyCopilotDrawer";

export const ALL_PLATFORM_MODULES = [
  {
    id: "explore",
    href: "/explore",
    label: "Safety Map",
    labelHi: "सुरक्षा मानचित्र",
    shortLabel: "Map",
    subtitle: "Search any place in New Delhi & see 9 safety parameters",
    simpleHint: "Check safety of any place in New Delhi",
    icon: Map,
    mobileDock: true,
  },
  {
    id: "planner",
    href: "/planner",
    label: "Safe Route",
    labelHi: "सुरक्षित मार्ग",
    shortLabel: "Routes",
    subtitle: "Find the safest well-lit road between two places",
    simpleHint: "Find the safest road to your destination",
    icon: Route,
    mobileDock: true,
  },
  {
    id: "journey",
    href: "/journey",
    label: "Trip Monitor",
    labelHi: "लाइव यात्रा",
    shortLabel: "Trip",
    subtitle: "Track your live trip & get an alert if your cab changes route",
    simpleHint: "Track your live trip & route changes",
    icon: Navigation,
    mobileDock: true,
  },
  {
    id: "circle",
    href: "/circle",
    label: "Trusted Contacts",
    labelHi: "ट्रस्टेड सर्कल",
    shortLabel: "Contacts",
    subtitle: "Share your live trip with family or friends",
    simpleHint: "Choose family or friends for trip sharing",
    icon: Users,
    mobileDock: false,
  },
  {
    id: "reviews",
    href: "/reviews",
    label: "Area Reviews",
    labelHi: "समीक्षाएं",
    shortLabel: "Reviews",
    subtitle: "Read or share safety reviews of New Delhi roads",
    simpleHint: "Read and write local safety reviews",
    icon: MessageSquare,
    mobileDock: false,
  },
  {
    id: "alerts",
    href: "/alerts",
    label: "Live Alerts",
    labelHi: "लाइव अलर्ट",
    shortLabel: "Alerts",
    subtitle: "Live safety warnings & 9 parameters for New Delhi areas",
    simpleHint: "See live warnings & area safety scores",
    icon: Bell,
    badge: true,
    mobileDock: true,
  },
  {
    id: "sos",
    href: "/sos",
    label: "SOS Help",
    labelHi: "आपातकालीन SOS",
    shortLabel: "SOS",
    subtitle: "Send an emergency alert or call 112 Police immediately",
    simpleHint: "Emergency SOS alarm & 112 Police call",
    icon: ShieldAlert,
    isDanger: true,
    mobileDock: true,
  },
  {
    id: "settings",
    href: "/settings",
    label: "Privacy & Offline",
    labelHi: "ऑफलाइन व गोपनीयता",
    shortLabel: "Privacy",
    subtitle: "Control who sees your location & save offline safety numbers",
    simpleHint: "Manage privacy & offline safety mode",
    icon: Settings,
    mobileDock: false,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentPlaceName,
    offlineModeEnabled,
    unreadAlertsCount,
    language,
    setLanguage,
    mobilePreviewMode,
    setMobilePreviewMode,
    copilotDrawerOpen,
    setCopilotDrawerOpen,
    activeCopilotPlan,
    startSosCountdown,
    setViraOpen,
    setViraFullScreen,
  } = useSafetyStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeModule = useMemo(() => {
    return (
      ALL_PLATFORM_MODULES.find(
        (m) =>
          pathname === m.href ||
          (m.href === "/explore" && pathname.startsWith("/places/"))
      ) || ALL_PLATFORM_MODULES[0]
    );
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (window.location.hostname === "localhost") {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => regs.forEach((r) => r.unregister()))
          .catch(() => {});
      }
    }

    ALL_PLATFORM_MODULES.forEach((mod) => {
      try {
        router.prefetch(mod.href);
      } catch {
        // Ignore
      }
    });

    fetch("/api/express/bootstrap?hour=21").catch(() => {});
  }, [router]);

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 2) {
      router.back();
    } else if (pathname !== "/explore") {
      router.push("/explore");
    } else {
      router.push("/");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const innerContent = (
    <div
      className={`min-h-screen flex flex-col bg-blush-light text-ink ${
        mobilePreviewMode ? "vira-mobile-viewport" : ""
      }`}
    >
      {/* Offline Banner */}
      {offlineModeEnabled && (
        <div
          role="status"
          className="bg-blush-deep border-b border-brand-pink px-4 py-2.5 text-xs font-semibold text-ink flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-brand-pink shrink-0" />
            <span>
              Offline Safety Snapshot Active for{" "}
              <strong className="font-bold">{currentPlaceName}</strong>.
            </span>
          </div>
          <Link
            href="/settings"
            className="underline font-bold text-brand-pink hover:text-ink"
          >
            SMS 112 Fallback Card →
          </Link>
        </div>
      )}

      {/* TOP NAVIGATION HEADER — Clean, Spacious, Real-World Consumer Hierarchy */}
      <header className="sticky top-0 z-40 bg-surface-white/95 backdrop-blur-md border-b border-border-rose shadow-sm">
        {/* Tier 1: Back Button + Brand Identity + Essential Utilities */}
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Prominent Back Button + Brand Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <button
              type="button"
              onClick={handleGoBack}
              className="px-3 py-2 rounded-btn bg-blush-light border border-border-rose text-xs font-bold text-ink hover:bg-blush-deep hover:border-brand-pink transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
              title="Go Back to Previous Screen"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-4 h-4 text-brand-pink" />
              <span>{language === "hi" ? "वापस" : "Back"}</span>
            </button>

            <Link
              href="/"
              className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight text-ink shrink-0 group"
            >
              <span className="w-9 h-9 rounded-btn bg-brand-pink text-surface-white flex items-center justify-center font-extrabold text-base shadow-sm group-hover:scale-105 transition-transform">
                V
              </span>
              <div className="leading-tight hidden sm:block">
                <div className="flex items-center gap-2">
                  <span>Vira</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blush-light text-ink-muted border border-border-rose">
                    New Delhi
                  </span>
                </div>
                <p className="text-[11px] font-medium text-ink-muted">
                  {language === "hi"
                    ? "महिला सुरक्षा एवं मार्गदर्शक"
                    : "Women's Safety & Route Guide"}
                </p>
              </div>
            </Link>
          </div>

          {/* Right: Clean Utility Bar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile App Ratio Preview Switcher */}
            <button
              type="button"
              onClick={() => setMobilePreviewMode(!mobilePreviewMode)}
              className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn text-xs font-bold border transition-all ${
                mobilePreviewMode
                  ? "bg-brand-pink text-surface-white border-brand-pink shadow-sm"
                  : "bg-blush-light text-ink border-border-rose hover:border-brand-pink"
              }`}
              title="Preview in Mobile Smartphone View"
            >
              {mobilePreviewMode ? (
                <>
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop View</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-brand-pink" />
                  <span>Mobile View</span>
                </>
              )}
            </button>

            {/* Vira 3D Voice Companion Button */}
            <button
              type="button"
              onClick={() => {
                setViraOpen(true);
                setViraFullScreen(false);
              }}
              className="px-3.5 py-2 rounded-btn bg-blush-deep border border-brand-pink text-xs font-bold text-ink hover:bg-brand-pink hover:text-surface-white transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-pink" />
              <span>{language === "hi" ? "वीरा 3D" : "Ask Vira 3D"}</span>
            </button>

            {/* Journey Copilot Drawer Button */}
            {!mobilePreviewMode && (
              <button
                type="button"
                onClick={() => setCopilotDrawerOpen(!copilotDrawerOpen)}
                className={`px-3 py-2 rounded-btn text-xs font-bold border hidden sm:flex items-center gap-1.5 transition-all ${
                  copilotDrawerOpen
                    ? "bg-ink text-surface-white border-ink"
                    : "bg-surface-white text-ink border-border-rose hover:border-brand-pink"
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-brand-pink" />
                <span>Trip Plan</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blush-deep text-brand-pink text-[10px] font-extrabold">
                  {activeCopilotPlan.stops.length}
                </span>
              </button>
            )}

            {/* EN / हिन्दी Toggle */}
            {!mobilePreviewMode && (
              <div className="rounded-btn p-0.5 hidden sm:flex items-center bg-blush-light border border-border-rose">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition-all ${
                    language === "en"
                      ? "bg-surface-white text-ink shadow-sm"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("hi")}
                  className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition-all ${
                    language === "hi"
                      ? "bg-surface-white text-ink shadow-sm"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            )}

            {/* Emergency SOS Button */}
            <button
              type="button"
              onClick={() =>
                startSosCountdown("Header SOS Button Activated", false)
              }
              className="vira-btn-danger px-3.5 py-2 text-xs flex items-center gap-1.5 font-bold rounded-btn"
              aria-label="Trigger Emergency SOS"
            >
              <SirenIcon size={16} variant="on-red" />
              <span>SOS</span>
            </button>

            {/* All Sections Drawer Toggle (Mobile & Compact) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-btn bg-blush-light border border-border-rose text-ink ${
                mobilePreviewMode ? "inline-flex" : "lg:hidden inline-flex"
              }`}
              aria-label="Open All Sections Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Tier 2: Clean Module Navigation Bar (Hidden in Mobile View to keep mobile uncluttered) */}
        {!mobilePreviewMode && (
          <div className="border-t border-border-rose bg-surface-white">
            <div className="max-w-[1480px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
              <nav
                aria-label="Main Application Sections"
                className="flex items-center gap-1.5 min-w-max"
              >
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded-btn text-xs font-semibold text-ink-muted hover:text-ink hover:bg-blush-light flex items-center gap-1.5 transition-colors"
                >
                  <Home className="w-3.5 h-3.5 text-brand-pink" />
                  <span>Home</span>
                </Link>

                <span className="text-border-rose select-none">|</span>

                {ALL_PLATFORM_MODULES.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href === "/explore" &&
                      pathname.startsWith("/places/"));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative px-3.5 py-1.5 rounded-btn text-xs font-bold flex items-center gap-1.5 transition-colors ${
                        isActive
                          ? "text-surface-white"
                          : item.isDanger
                          ? "text-danger-red hover:bg-blush-deep"
                          : "text-ink-muted hover:text-ink hover:bg-blush-light"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="expressActiveTab"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 32,
                          }}
                          className={`absolute inset-0 rounded-btn ${
                            item.isDanger ? "bg-danger-red" : "bg-brand-pink"
                          }`}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {language === "hi" ? item.labelHi : item.label}
                        </span>
                        {item.badge && unreadAlertsCount > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                              isActive
                                ? "bg-surface-white text-brand-pink"
                                : "bg-danger-red text-surface-white"
                            }`}
                          >
                            {unreadAlertsCount}
                          </span>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </nav>

              <button
                type="button"
                onClick={handleLogout}
                className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold text-ink-muted hover:text-ink hover:bg-blush-light shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Collapsible All-Sections Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-surface-white border-t border-border-rose px-4 py-4 shadow-elevated"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-rose">
                <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                  All Sections & Tools
                </span>
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-bold text-brand-pink flex items-center gap-1"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Go to Home Page</span>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {ALL_PLATFORM_MODULES.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`p-3 rounded-card border text-xs font-bold flex items-center gap-2.5 transition-colors ${
                        isActive
                          ? "bg-brand-pink text-surface-white border-brand-pink"
                          : "bg-blush-light text-ink border-border-rose hover:border-brand-pink"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {language === "hi" ? item.labelHi : item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* UNIVERSAL CONTEXTUAL BREADCRUMB & QUICK BACK BAR (Appears on every page & section) */}
      <div className="bg-blush-deep/65 border-b border-border-rose">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumb + Back Navigation */}
          <div className="flex items-center gap-2 text-xs min-w-0">
            <Link
              href="/"
              className="font-semibold text-ink-muted hover:text-brand-pink flex items-center gap-1 shrink-0"
            >
              <Home className="w-3.5 h-3.5 text-brand-pink" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            <span className="font-bold text-ink truncate">
              {language === "hi" ? activeModule.labelHi : activeModule.label}
            </span>
            <span className="hidden md:inline text-ink-muted font-medium truncate">
              — {activeModule.subtitle}
            </span>
          </div>

          {/* Right Quick Context & Back Links */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-white border border-border-rose text-[11px] font-semibold text-ink">
              <MapPin className="w-3 h-3 text-brand-pink" />
              <span className="truncate max-w-[200px]">{currentPlaceName}</span>
            </span>

            {pathname !== "/explore" && (
              <Link
                href="/explore"
                className="px-3 py-1 rounded-full bg-surface-white border border-border-rose text-[11px] font-bold text-brand-pink hover:bg-brand-pink hover:text-surface-white transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Live Map</span>
              </Link>
            )}

            <a
              href="tel:112"
              className="px-2.5 py-1 rounded-full bg-surface-white border border-border-rose text-[11px] font-bold text-danger-red hover:bg-danger-red hover:text-surface-white transition-colors flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" />
              <span>112 Helpline</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Page Content with Generous Breathing Space */}
      <main className="flex-1 min-w-0 pb-24 md:pb-14">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>

      {/* Global Slide-Over AI Safe Journey Copilot Drawer */}
      <SafetyCopilotDrawer />

      {/* Native-Style Mobile Bottom Tab Bar (Sticky inside Mobile Frame or Fixed on Small Screens) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className={`${
          mobilePreviewMode
            ? "sticky bottom-0 left-0 right-0 flex"
            : "md:hidden fixed bottom-0 left-0 right-0 flex"
        } z-40 bg-surface-white/95 backdrop-blur-md border-t border-border-rose px-2 py-2 items-center justify-around shadow-elevated`}
      >
        <button
          type="button"
          onClick={handleGoBack}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-btn text-[10px] font-bold text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="w-4 h-4 mb-0.5 text-brand-pink" />
          <span>Back</span>
        </button>

        {ALL_PLATFORM_MODULES.filter((i) => i.mobileDock).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-btn text-[10px] font-bold transition-colors ${
                isActive
                  ? item.isDanger
                    ? "text-danger-red font-extrabold"
                    : "text-brand-pink font-extrabold"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-btn text-[10px] font-bold ${
            mobileMenuOpen
              ? "text-brand-pink font-extrabold"
              : "text-ink-muted"
          }`}
        >
          <Menu className="w-4 h-4 mb-0.5 text-brand-pink" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );

  // Realistic Mobile Smartphone Frame when Mobile App View is enabled
  if (mobilePreviewMode) {
    return (
      <div className="min-h-screen bg-blush-deep py-6 px-4 flex flex-col items-center justify-start">
        {/* Top Mode Switcher Bar outside the phone */}
        <div className="mb-4 px-5 py-2.5 rounded-full bg-surface-white border border-border-rose shadow-card flex flex-wrap items-center gap-4 text-xs font-bold text-ink">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand-pink" />
            <span>Mobile App View (430 × 880px Smartphone Layout)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoBack}
              className="px-3 py-1 rounded-full bg-blush-light border border-border-rose text-ink hover:border-brand-pink flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-brand-pink" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setMobilePreviewMode(false)}
              className="px-3.5 py-1 rounded-full bg-brand-pink text-surface-white text-[11px] font-extrabold shadow-sm"
            >
              Switch to Full Desktop View
            </button>
          </div>
        </div>

        {/* Realistic Smartphone Device Shell */}
        <div className="w-full max-w-[430px] h-[860px] rounded-[42px] border-[10px] border-ink bg-surface-white shadow-elevated overflow-hidden flex flex-col relative">
          {/* Phone Status Bar */}
          <div className="h-7 bg-ink text-surface-white px-6 flex items-center justify-between text-[11px] font-semibold shrink-0">
            <span>9:41</span>
            <span className="w-20 h-3 rounded-full bg-ink-muted/30" />
            <span>5G · 100%</span>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
            {innerContent}
          </div>
        </div>
      </div>
    );
  }

  return innerContent;
}
