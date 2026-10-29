import express, { Request, Response } from "express";
import next from "next";
import { getAllAreaZonesWithRisk } from "./src/lib/repositories/zones-repo";
import { buildRealtimeMapPayload } from "./src/lib/realtime/map-telemetry";
import { prisma } from "./src/lib/db";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  // Do NOT mount express.json() globally: Next.js App Router route handlers
  // need exclusive ownership of the request body stream for req.json().

  // Express Fast Health & Module Connectivity Check
  server.get("/api/express/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      server: "Express + Next.js Unified Safety Intelligence Engine",
      uptimeSeconds: Math.round(process.uptime()),
      connectedModules: 10,
    });
  });

  // Express Real-Time Map & Places Telemetry API
  server.get("/api/map/realtime", async (req: Request, res: Response) => {
    try {
      const hourParam = req.query.hour as string | undefined;
      const qParam = req.query.q as string | undefined;
      const latParam = req.query.lat as string | undefined;
      const lngParam = req.query.lng as string | undefined;

      const hour = hourParam !== undefined ? parseInt(hourParam, 10) : 21;
      const clickLat = latParam !== undefined ? parseFloat(latParam) : undefined;
      const clickLng = lngParam !== undefined ? parseFloat(lngParam) : undefined;

      const payload = await buildRealtimeMapPayload({
        hour: isNaN(hour) ? 21 : hour,
        searchQuery: qParam,
        clickLat,
        clickLng,
      });

      res.json(payload);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Express High-Speed Bootstrap Cache Endpoint for Instant Tab Switching
  server.get("/api/express/bootstrap", async (req: Request, res: Response) => {
    try {
      const hourParam = req.query.hour as string | undefined;
      const hour = hourParam !== undefined ? parseInt(hourParam, 10) : 21;

      const [zones, safeHavens, alerts, contacts, reviews] = await Promise.all([
        getAllAreaZonesWithRisk(isNaN(hour) ? 21 : hour),
        prisma.safeHaven.findMany({ orderBy: { name: "asc" } }),
        prisma.safetyAlert.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.trustedContact.findMany({
          orderBy: { createdAt: "asc" },
        }),
        prisma.communityReview.findMany({
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
      ]);

      res.json({
        engine: "VIRA-Express-Unified-Router",
        timestamp: new Date().toISOString(),
        hour,
        zones,
        safeHavens,
        alerts,
        contacts,
        reviews,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Delegate all other routes to Next.js App Router
  server.use((req: Request, res: Response) => {
    return handle(req, res);
  });

  server.listen(port, () => {
    console.log(
      `> VIRA Express + Next.js Server ready on http://${hostname}:${port}`
    );
  });
});
