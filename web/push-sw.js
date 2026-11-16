// Service worker: shows the weekly reminders and opens the app when one is tapped.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch (e) {
    d = { title: 'Worship Team', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(d.title || 'Worship Team', {
      body: d.body || '',
      icon: 'icons/Icon-192.png',
      badge: 'icons/badge-96.png',
      tag: 'serve-' + (d.scheduleId || ''),
      renotify: true,
      data: { scheduleId: d.scheduleId || '' },
      // Android Chrome shows these buttons; iPhone shows the notification only (tap opens the app).
      actions: [
        { action: 'yes', title: 'Yes' },
        { action: 'no', title: "Can't serve" },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const sid = (event.notification.data && event.notification.data.scheduleId) || '';
  const reply = event.action === 'yes' ? 'yes' : event.action === 'no' ? 'no' : 'open';
  const url = new URL('./?reply=' + reply + (sid ? '&s=' + encodeURIComponent(sid) : ''), self.registration.scope).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      try {
        await w.navigate(url);
        return w.focus();
      } catch (e) { /* try the next one */ }
    }
    return self.clients.openWindow(url);
  })());
});
