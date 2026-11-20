// Anwarz PC version (installed from northviamarketing.com/app): shows the website's alerts as
// Windows notifications (Web Push) and opens the right page when one is clicked.
// The website sends { title, body, data: { type, id }, urgent } (lib/push.ts → sendWebPush).

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {
    msg = { title: 'Anwarz', body: event.data ? event.data.text() : '' };
  }
  const data = msg.data || {};
  event.waitUntil(
    self.registration.showNotification(msg.title || 'Anwarz', {
      body: msg.body || '',
      icon: '/app/icons/icon-192.png',
      badge: '/app/icons/icon-192.png',
      tag: data.alertId || undefined,
      requireInteraction: Boolean(msg.urgent), // urgent ones stay until clicked
      data,
    })
  );
});

// Where a click goes (same as the phone: lib/notifications.ts openAlert).
function pathFor(data) {
  switch (data.type) {
    case 'task':
      return data.id ? `/app/task/${data.id}` : '/app/tasks';
    case 'email':
      return data.id ? `/app/email/${data.id}` : '/app/inbox';
    case 'skipped':
      return '/app/inbox?view=skipped';
    case 'review':
      return '/app/reviews';
    case 'jl_order':
    case 'jl_sample':
      return '/app/jl';
    case 'ads':
      return '/app/marketing';
    case 'chat':
      return '/app/chat';
    case 'connections':
      return '/app/connections';
    default:
      return '/app/';
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = pathFor(event.notification.data || {});
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.includes('/app'));
      if (open) {
        open.navigate(url).catch(() => undefined);
        return open.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
