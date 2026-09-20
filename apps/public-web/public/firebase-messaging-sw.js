/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0',
  authDomain: 'autodealers-7f62e.firebaseapp.com',
  projectId: 'autodealers-7f62e',
  storageBucket: 'autodealers-7f62e.firebasestorage.app',
  messagingSenderId: '857179023916',
  appId: '1:857179023916:web:6919fe5ae77f78d3b1bf89',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'AutoDealers';
  const body = payload.notification?.body || payload.data?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/brand/ad-platform-logo.png',
    data: payload.data || {},
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  const rawRoute = data.route || data.url || data.href || data.link || data.actionUrl || '/';
  const route = /^https?:\/\//i.test(rawRoute)
    ? rawRoute
    : new URL(String(rawRoute).startsWith('/') ? rawRoute : `/${rawRoute}`, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(route);
          return client.focus();
        }
      }
      return clients.openWindow(route);
    })
  );
});
