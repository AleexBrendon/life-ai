/* Static application shell only: API responses and credentials are never cached here. */
const PRECACHE = [];
const CACHE_NAME = 'lifeai-shell-development';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('lifeai-shell-') && name !== CACHE_NAME) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () => (await caches.open(CACHE_NAME)).match('/index.html').then(response => response || caches.match('/'))));
  } else if (url.pathname.startsWith('/assets/') || PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
self.addEventListener('push', event => event.waitUntil((async () => {
  let payload; try { payload = event.data.json(); } catch { payload = {}; }
  await self.registration.showNotification(payload.title || 'LifeAI', { body: payload.body || 'Você tem uma atualização.', tag: payload.tag, data: { url: '/dashboard?painel=notificacoes' } });
})()));
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL('/dashboard?painel=notificacoes', self.location.origin).href;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const window = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (window) { await window.navigate(url); await window.focus(); } else await self.clients.openWindow(url);
  })());
});
