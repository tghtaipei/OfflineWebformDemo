/**
 * 離線暫存網頁Demo
 * 使用 HtmlService 提供具備離線暫存功能的電子表單
 *
 * URL 路由：
 *   /exec        → 主頁面 HTML
 *   /exec/sw.js  → Service Worker 腳本（讓 F5 離線也能正常顯示）
 */
function doGet(e) {
  // 提供 Service Worker 腳本
  if (e && e.pathInfo === 'sw.js') {
    return ContentService
      .createTextOutput(getSwCode())
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  // 主頁面
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('離線暫存網頁Demo')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * Service Worker 原始碼
 *
 * 頁面位於 /exec（無尾部斜線），SW 腳本位於 /exec/sw.js
 * scope 設為 /exec，SW 腳本路徑以 scope 為前綴，符合瀏覽器規範
 *
 * 快取策略：
 *   主頁面  → Network-First（有網路先更新；離線走快取）
 *   CDN 資源 → Cache-First（localForage 函式庫）
 */
function getSwCode() {
  return [
    "/* Service Worker — 離線暫存網頁 Demo v3 */",
    "var CACHE = 'offline-form-v3';",
    "var CDN = [",
    "  'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js'",
    "];",
    "",
    "/* 正規化 URL：移除尾部斜線，作為統一的快取 key */",
    "function pageKey(url) { return url.replace(/\\/$/, ''); }",
    "",
    "self.addEventListener('install', function(ev) {",
    "  self.skipWaiting();",
    "  /* scope 可能是 exec 或 exec/，統一用 exec（無斜線）作快取 key */",
    "  var key = pageKey(self.registration.scope);",
    "  ev.waitUntil(",
    "    caches.open(CACHE).then(function(cache) {",
    "      var tasks = [",
    "        fetch(key, {credentials:'same-origin'})",
    "          .then(function(r){ if(r&&r.ok) return cache.put(key, r); })",
    "          .catch(function(){})",
    "      ];",
    "      CDN.forEach(function(url){",
    "        tasks.push(",
    "          fetch(url, {mode:'cors'})",
    "            .then(function(r){ if(r&&(r.ok||r.type==='opaque')) return cache.put(url,r); })",
    "            .catch(function(){})",
    "        );",
    "      });",
    "      return Promise.all(tasks);",
    "    })",
    "  );",
    "});",
    "",
    "self.addEventListener('activate', function(ev) {",
    "  ev.waitUntil(",
    "    caches.keys().then(function(keys){",
    "      return Promise.all(",
    "        keys.filter(function(k){ return k!==CACHE; })",
    "           .map(function(k){ return caches.delete(k); })",
    "      );",
    "    }).then(function(){ return self.clients.claim(); })",
    "  );",
    "});",
    "",
    "self.addEventListener('fetch', function(ev) {",
    "  var url = ev.request.url;",
    "  var key = pageKey(self.registration.scope);",
    "",
    "  /* CDN 資源：Cache-First */",
    "  if(url.indexOf('cdn.jsdelivr.net') !== -1) {",
    "    ev.respondWith(",
    "      caches.match(ev.request).then(function(cached){",
    "        if(cached) return cached;",
    "        return fetch(ev.request,{mode:'cors'}).then(function(r){",
    "          if(r&&(r.ok||r.type==='opaque'))",
    "            caches.open(CACHE).then(function(c){ c.put(ev.request,r.clone()); });",
    "          return r;",
    "        });",
    "      })",
    "    );",
    "    return;",
    "  }",
    "",
    "  /* 主頁面：Network-First，離線走快取",
    "     比對 exec 與 exec/（帶或不帶斜線都接受）,不攔截 sw.js 本身 */",
    "  var urlKey = pageKey(url);",
    "  if(urlKey === key && url.indexOf('/sw.js') === -1) {",
    "    ev.respondWith(",
    "      fetch(ev.request, {credentials:'same-origin'})",
    "        .then(function(r){",
    "          if(r&&r.ok)",
    "            caches.open(CACHE).then(function(c){ c.put(key, r.clone()); });",
    "          return r;",
    "        })",
    "        .catch(function(){",
    "          return caches.match(key).then(function(cached){",
    "            if(cached) return cached;",
    "            return new Response(",
    "              '<!DOCTYPE html><html><head><meta charset=UTF-8><title>離線中</title></head>' +",
    "              '<body style=\"font-family:sans-serif;text-align:center;padding:60px\">' +",
    "              '<h2>&#128225; 目前離線</h2>' +",
    "              '<p>請先在<b>網路連線</b>狀態下開啟一次頁面，<br>之後離線刷新也能正常使用。</p>' +",
    "              '</body></html>',",
    "              {status:200,headers:{'Content-Type':'text/html;charset=utf-8'}}",
    "            );",
    "          });",
    "        })",
    "    );",
    "  }",
    "});"
  ].join('\n');
}
