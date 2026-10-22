// Offline support for events with flaky Wi-Fi. The build fills in the placeholders.
//  - One cache per build. Install stores this build's hashed files (each checked against its SRI
//    hash) and this build's index.html; activate deletes every other build's cache.
//  - Hashed files never change, so they are served from the cache first.
//  - index.html always comes from the network first, so a new deploy is never hidden behind a stale
//    page. The cached copy is used only when the network fails (offline), not when it's slow.
//  - version.json is never handled here: the page's update check always reaches the server.
"use strict";
const BUILD = "__BUILD_ID__";
const CACHE = "posepop-" + BUILD;
const PRECACHE = __PRECACHE__; // [{ url, integrity }] relative to this file
const scope = new URL("./", self.location).href;
const hashed = new Set(PRECACHE.map((f) => new URL(f.url, scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // a CDN edge can briefly serve the previous index.html after a deploy: only cache our own build's
    const res = await fetch(new URL("./?sw=" + BUILD, scope), { cache: "no-store" });
    if (!res.ok) throw new Error("index.html: HTTP " + res.status);
    const page = await res.text();
    if (!page.includes(`<meta name="build" content="${BUILD}">`)) throw new Error("index.html is not build " + BUILD);
    await cache.addAll(PRECACHE.map((f) => new Request(new URL(f.url, scope), { integrity: f.integrity })));
    await cache.put(scope, new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8" } }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("posepop-") && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url), page = new URL(scope).pathname;
  if (req.mode === "navigate" && url.origin === self.location.origin && (url.pathname === page || url.pathname === page + "index.html")) {
    event.respondWith(fetch(req).catch(async () => (await caches.match(scope, { cacheName: CACHE, ignoreVary: true })) || Response.error()));
    return;
  }
  const key = url.origin + url.pathname;
  if (hashed.has(key)) event.respondWith(caches.match(key, { cacheName: CACHE, ignoreVary: true }).then((hit) => hit || fetch(req)));
});
