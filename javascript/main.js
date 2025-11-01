const backendUrl = "https://notification-backend-test-101.vercel.app";

async function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Service Worker Registration at page load
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('sw.js');
      console.log('Service Worker registered at load:', registration);
    } catch (error) {
      console.error('Service Worker registration failed at load:', error);
    }
  });
}

document.getElementById("subscribeBtn").addEventListener("click", async () => {
  const name = document.getElementById("username").value.trim();
  if (!name) return alert("Enter your name first!");

  // Check/request notification permission before subscribing
  try {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permStatus = await navigator.permissions.query({ name: 'notifications' });
        if (permStatus.state === 'denied') {
          return alert('Notification permission is blocked. Please enable it in your browser settings.');
        }
      } catch (e) {
        // Some browsers may throw for unsupported permission names; fall back to request below
      }
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return alert('Cannot subscribe without notification permission.');
      }
    }
  } catch (err) {
    console.warn('Permission check/request failed:', err);
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return alert('Cannot subscribe without notification permission.');
  }

  // Ensure service worker is registered and get a usable registration
  let reg;
  try {
    console.log("Getting service worker registration...");
    
    // First, wait for service worker to be ready
    reg = await navigator.serviceWorker.ready;
    console.log("Service Worker ready:", reg);
    
    // Check if we have an active service worker
    if (!navigator.serviceWorker.controller) {
      console.log("No active service worker controller. Trying to register...");
      reg = await navigator.serviceWorker.register('sw.js');
      console.log("Service Worker registered:", reg);
    }
    
  } catch (swErr) {
    console.error('Service worker ready/registration failed:', swErr);
    return alert('Service worker unavailable — check console for details.');
  }

  alert("Registering for push notifications...");
  
  try {
    // Get VAPID public key from server
    console.log("Fetching VAPID public key...");
    const res = await fetch(`${backendUrl}/vapid-public-key`);
    if (!res.ok) throw new Error(`Failed to fetch VAPID key: ${res.status}`);
    
    const data = await res.json();
    console.log("Received VAPID public key:", data.publicKey);
    console.log("Key length:", data.publicKey.length);
    
    // Convert the base64 string to Uint8Array
    const appServerKey = await urlBase64ToUint8Array(data.publicKey);
    console.log("Converted key to Uint8Array, length:", appServerKey.length);
    
    // Verify the key is the correct length (should be 65 bytes for P-256)
    if (appServerKey.length !== 65) {
      console.warn(`Unexpected key length: ${appServerKey.length}, expected 65`);
    }
    
    // Subscribe to push manager
    console.log("Subscribing to push manager...");
    console.log("PushManager available:", reg.pushManager);
    console.log("Service Worker state:", reg.active?.state);
    navigator.serviceWorker.ready.then(async registration => {
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const newSub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey
    });
    console.log('New subscription:', newSub);
  } else {
    console.log('Already subscribed:', subscription);
  }
});
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey
    });
    
    console.log("Push subscription successful:", subscription);
    
    // Convert subscription to JSON to verify it's valid
    const subscriptionJSON = subscription.toJSON();
    console.log("Subscription JSON:", subscriptionJSON);
    
    // Send subscription to server
    console.log("Sending subscription to server...");
    const subscribeResponse = await fetch(`${backendUrl}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name, 
        subscription: subscriptionJSON 
      })
    });

    if (!subscribeResponse.ok) {
      const errorText = await subscribeResponse.text();
      throw new Error(`Failed to save subscription: ${subscribeResponse.status} - ${errorText}`);
    }

    const result = await subscribeResponse.json();
    console.log("Server response:", result);
    
    console.log("Subscribed successfully");
    alert("Subscribed successfully!");

    // Heartbeat every 30 seconds
    setInterval(() => {
      fetch(`${backendUrl}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      }).catch(err => console.log('Heartbeat failed:', err));
    }, 30000);

  } catch (error) {
    console.error('Subscription failed:', error);
    alert(`Subscription failed: ${error.message}`);
  }
});

// Send a test notification via the backend and optionally show a local notification
async function sendNotification(name) {
  if (!name) return alert("Enter your name first!");

  try {
    console.log("Requesting server to send test notification for:", name);
    const res = await fetch(`${backendUrl}/test-subscription/${encodeURIComponent(name)}`);
    const data = await res.json();
    console.log("Test notification response:", data);

    if (!res.ok || !data.test_success) {
      return alert(`Test failed: ${data.error || 'server indicated failure'}`);
    }

    alert("Server triggered test notification.");

    // Optionally show a local notification via the service worker (falls back silently)
    if (Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification("Test Notification", {
            body: "Server dispatched a test push — check your device.",
            icon: "https://via.placeholder.com/64"
          });
        } else {
          console.warn("No service worker registration available to showNotification.");
        }
      } catch (swErr) {
        console.warn("showNotification failed:", swErr);
      }
    }
  } catch (err) {
    console.error("sendNotification error:", err);
    alert(`Failed to send test notification: ${err.message || err}`);
  }
}

document.getElementById("testNotificationBtn").addEventListener("click", async () => {
  const name = document.getElementById("username").value.trim();
  await sendNotification(name);
});
