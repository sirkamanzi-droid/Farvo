// Handles background Web Push messages for Omulimi.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : 'A crop-care activity is due.' };
  }

  const title = payload.title || 'Omulimi · Farm update';
  const options = {
    body: payload.body || 'There is a new update relevant to your farm. Open Omulimi to review it.',
    icon: payload.icon || '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: payload.tag || 'omulimi-farm-update',
    data: { url: payload.url || '/' },
    renotify: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
