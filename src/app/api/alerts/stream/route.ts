import { getSafetyAlerts } from "@/lib/repositories/safety-repo";

export const dynamic = "force-dynamic";

const SIMULATED_STREAM_ADVISORIES = [
  {
    title: "Live Patrol Update: Connaught Place Radial Road 4",
    description:
      "Shakti Pink Patrol Vehicle #DL-PCR-14 stationed at Radial Road 4 intersection; corridor visibility verified clear.",
    areaSlug: "connaught-place-inner-circle",
    placeName: "Connaught Place Inner Circle Safe Corridor",
    riskLevel: "LOW",
    category: "PATROL_DISPATCH",
    source: "PATROL_UNIT",
    targetAudience: "ALL",
    whyReason: "Active PCR presence within 120m + 94/100 LED lighting.",
    activeUntil: "03:00 AM",
  },
  {
    title: "Crowd Drop Detection: Nehru Place West Escalator Plaza",
    description:
      "Pedestrian footfall dropped by 42% in the last 20 minutes. Vira recommends using the guarded Metro Skywalk entrance.",
    areaSlug: "nehru-place-skywalk-service-road",
    placeName: "Nehru Place Back Service Road & Metro Approach",
    riskLevel: "ELEVATED",
    category: "CROWD_DROP",
    source: "AI_PREDICTION",
    targetAudience: "ALL",
    whyReason: "Post-market closing crowd drop + 54/100 rear service lane lighting.",
    activeUntil: "01:30 AM",
  },
  {
    title: "Corroborated Commuter Report: Hauz Khas Park Perimeter Bend",
    description:
      "2 new commuter reports noted slow-moving unregistered cabs near the unlit park gate bend. Use the verified pre-paid booth.",
    areaSlug: "hauz-khas-deer-park-approach",
    placeName: "Hauz Khas Village Deer Park Approach Lane",
    riskLevel: "HIGH",
    category: "VERIFIED_REPORT",
    source: "COMMUNITY",
    targetAudience: "ALL",
    whyReason: "44/100 lighting score + 11 corroborated reports during peak hours.",
    activeUntil: "02:00 AM",
  },
];

export async function GET() {
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let simIndex = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      // Send initial latest alerts snapshot immediately
      try {
        const latest = await getSafetyAlerts("ALL");
        sendEvent("initial", { alerts: latest.slice(0, 8) });
      } catch {
        // Ignore initial error
      }

      // Emit a live check / simulated alert every 35 seconds (within 30-60s spec)
      intervalId = setInterval(async () => {
        try {
          const latest = await getSafetyAlerts("ALL");
          const sim =
            SIMULATED_STREAM_ADVISORIES[
              simIndex % SIMULATED_STREAM_ADVISORIES.length
            ];
          simIndex += 1;

          sendEvent("live_alert", {
            alert: {
              id: `live-${Date.now()}`,
              ...sim,
              createdAt: new Date().toISOString(),
            },
            latestDbAlert: latest[0] || null,
          });
        } catch {
          // Stream ended
        }
      }, 35000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
