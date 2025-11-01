// sw.js - Ultra-Detailed Debugging Service Worker
console.log('Service Worker: Script loading...');

self.addEventListener('install', (event) => {
  console.log('✅ Service Worker: Installed');
  console.log('Service Worker: Skip waiting to activate immediately');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activated');
  console.log('Service Worker: Claiming clients...');
  event.waitUntil(self.clients.claim().then(() => {
    console.log('✅ Service Worker: Now controlling clients');
  }));
});

self.addEventListener('push', function(event) {
  console.log('🔔 Service Worker: Push event received!');
  console.log('Push Event:', event);
  
  if (!event.data) {
    console.log('❌ Service Worker: Push event has NO data');
    return;
  }

  console.log('✅ Service Worker: Push has data');

  let payload;
  try {
    // Try to parse as JSON first
    payload = event.data.json();
    console.log('✅ Service Worker: JSON payload parsed:', payload);
  } catch (jsonError) {
    console.log('❌ Service Worker: JSON parse failed, trying text:', jsonError);
    try {
      const text = event.data.text();
      payload = { title: 'Text Notification', body: text };
      console.log('✅ Service Worker: Text payload:', text);
    } catch (textError) {
      console.log('❌ Service Worker: Text parse also failed:', textError);
      payload = { title: 'Default', body: 'No payload data' };
    }
  }

  const title = payload.title || 'Default Title';
  const options = {
    body: payload.body || payload.message || 'Default message',
    icon: payload.icon || 'https://via.placeholder.com/128/0000FF/FFFFFF?text=PN',
    badge: payload.badge || 'https://via.placeholder.com/64/FF0000/FFFFFF?text=!',
    image: payload.image,
    tag: payload.tag || 'push-notification',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ],
    data: payload.data || { url: 'https://notificationtest-11.vercel.app' }
  };

  console.log('🎯 Service Worker: Showing notification with:', { title, options });

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('✅ Service Worker: Notification shown SUCCESSFULLY!');
        // Send message to all clients that notification was shown
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'NOTIFICATION_SHOWN',
              title: title,
              timestamp: new Date().toISOString()
            });
          });
        });
      })
      .catch(error => {
        console.error('❌ Service Worker: Error showing notification:', error);
      })
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('👆 Service Worker: Notification clicked!', event.notification);
  event.notification.close();

  if (event.action === 'open') {
    console.log('👉 Service Worker: Open action clicked');
    event.waitUntil(
      clients.openWindow('https://notificationtest-11.vercel.app')
    );
  } else if (event.action === 'close') {
    console.log('❌ Service Worker: Close action clicked');
  } else {
    console.log('👉 Service Worker: Default notification click');
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(windowClients => {
        for (let client of windowClients) {
          if (client.url.includes('https:') && 'focus' in client) {
            console.log('🔍 Service Worker: Focusing existing window');
            return client.focus();
          }
        }
        if (clients.openWindow) {
          console.log('🆕 Service Worker: Opening new window');
          return clients.openWindow('https://notificationtest-11.vercel.app');
        }
      })
    );
  }
});

self.addEventListener('message', (event) => {
  console.log('📨 Service Worker: Message received:', event.data);
  if (event.data && event.data.type === 'PING') {
    event.ports[0].postMessage({ type: 'PONG', message: 'Service Worker is alive!' });
  }
});

// Log that service worker executed
console.log('✅ Service Worker: Script executed successfully');
