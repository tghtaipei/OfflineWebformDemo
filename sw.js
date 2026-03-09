/* =====================================================
   Service Worker — 離線暫存網頁 Demo
   策略：
     主頁面 / 靜態資源 → Network-First（有網路先更新；離線走快取）
     CDN 資源（localForage）→ Cache-First
   ===================================================== */

var CACHE = 'offline-form-v1';

var PRECACHE = [
  './',
  './index.html',
  'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js'
];

/* ── Install：預先快取所有資源 ─────────────────────── */
self.addEventListener('install', function(ev) {
  self.skipWaiting();
  ev.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.all(
        PRECACHE.map(function(url) {
          var req = url.startsWith('http')
            ? new Request(url, { mode: 'cors' })
            : new Request(url, { credentials: 'same-origin' });
          return fetch(req)
            .then(function(r) {
              if (r && (r.ok || r.type === 'opaque')) return cache.put(url, r);
            })
            .catch(function() {});
        })
      );
    })
  );
});

/* ── Activate：清除舊版快取 ───────────────────────── */
self.addEventListener('activate', function(ev) {
  ev.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

/* ── Fetch：攔截請求 ──────────────────────────────── */
self.addEventListener('fetch', function(ev) {
  var url = ev.request.url;

  /* CDN 資源：Cache-First（已快取就直接用，省流量） */
  if (url.indexOf('cdn.jsdelivr.net') !== -1) {
    ev.respondWith(
      caches.match(ev.request).then(function(cached) {
        if (cached) return cached;
        return fetch(ev.request, { mode: 'cors' }).then(function(r) {
          if (r && (r.ok || r.type === 'opaque'))
            caches.open(CACHE).then(function(c) { c.put(ev.request, r.clone()); });
          return r;
        });
      })
    );
    return;
  }

  /* 其餘請求（主頁面、靜態資源）：Network-First with Cache Fallback */
  ev.respondWith(
    fetch(ev.request).then(function(r) {
      if (r && r.ok)
        caches.open(CACHE).then(function(c) { c.put(ev.request, r.clone()); });
      return r;
    }).catch(function() {
      return caches.match(ev.request).then(function(cached) {
        if (cached) return cached;
        /* 頁面導航請求：離線時回傳快取的 index.html */
        if (ev.request.mode === 'navigate')
          return caches.match('./index.html');
      });
    })
  );
});
