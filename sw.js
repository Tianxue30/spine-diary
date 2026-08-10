// 离线缓存：让工作台在手机"添加到主屏幕"后能离线打开
// 导航/index.html 采用「网络优先」，确保重新部署后用户能立即拿到最新页面；
// 其余静态资源仍缓存优先，保证离线可用。
const CACHE = "spine-diary-v3";
const ASSETS = [".", "index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isNav = e.request.mode === "navigate" || url.pathname.endsWith("index.html");
  if (isNav) {
    // 网络优先：先尝试最新版本，失败才用缓存（离线兜底）
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
    );
    return;
  }
  // 其余资源缓存优先（离线可用）
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return resp;
    }).catch(() => caches.match("index.html")))
  );
});
