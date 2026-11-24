const CACHE_NAME = "cch-pwa-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./estilo.css",
  "./script.js",
  "./examenes_cibernetica.html",
  "./examenes_estadistica.html",
  "./panel_examen_cibernetica.js",
  "./panel_examen_estadistica.js",
  "./bitacoras/index.html",
  "./bitacoras/manifest.webmanifest",
  "./apk/www/favicon.png",
  "./apk/www/icon-192.png",
  "./apk/www/icon-512.png"
];
const CACHEABLE_FILE = /\.(?:html|css|js|webmanifest|png|svg|ico|woff2?)$/i;

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL.map(path => new URL(path, self.registration.scope).href)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith("cch-pwa-shell-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (request.method !== "GET" || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (request.mode !== "navigate" && !CACHEABLE_FILE.test(url.pathname)) return;
  if (url.search) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      const cacheControl = response.headers.get("Cache-Control") || "";
      if (response.ok
        && response.type === "basic"
        && new URL(response.url).origin === scope.origin
        && !/\b(?:private|no-store)\b/i.test(cacheControl)) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      throw error;
    }
  })());
});
