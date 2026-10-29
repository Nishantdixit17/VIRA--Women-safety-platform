const CACHE_NAME = "vira-safety-offline-v2";
const APP_SHELL = ["/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = event.request.url;

  // Never intercept Next.js internal chunks, HMR, or SSE streams
  if (
    url.includes("/_next/") ||
    url.includes("webpack-hmr") ||
    url.includes("/api/alerts/stream") ||
    url.includes("localhost:3000")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && url.includes("/api/risk")) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response(
          JSON.stringify({ offline: true, message: "Offline fallback active" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
  );
});
