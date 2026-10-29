// Roomie Service Worker
const CACHE_NAME = 'roomie-static-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification receiver for chore reminders and expense agreements
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'Roomie Notification';
    const options = {
      body: data.body || 'You have an update in your apartment.',
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      data: data.data || {},
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // plain text fallback
    event.waitUntil(
      self.registration.showNotification('Roomie Notification', {
        body: event.data.text(),
        icon: '/assets/icon-192.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
