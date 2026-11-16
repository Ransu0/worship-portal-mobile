/* COG Worship Team — service worker for weekly reminders (Web Push). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: 'Worship Team', body: event.data && event.data.text() }; }
  const options = {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'weekly-' + (d.scheduleId || ''), // a newer reminder replaces the old one
    renotify: true,
    requireInteraction: !!d.ask,
    data: d,
  };
  // Android shows these buttons; iPhone shows the notification without them.
  if (d.ask) options.actions = [{ action: 'yes', title: 'Yes' }, { action: 'no', title: "Can't serve" }];
  event.waitUntil(self.registration.showNotification(d.title || 'Worship Team', options));
});

self.addEventListener('notificationclick', (event) => {
  const d = event.notification.data || {};
  event.notification.close();
  const reply = event.action === 'yes' ? 'yes' : event.action === 'no' ? 'no' : 'open';
  const url = '/?reply=' + reply + '&s=' + encodeURIComponent(d.scheduleId || '');
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) {
        w.postMessage({ type: 'reply', reply, scheduleId: d.scheduleId });
        return w.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
