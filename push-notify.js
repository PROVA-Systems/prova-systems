/* PROVA push-notify.js — Client-Side Push Notification Registration */
(function() {
  'use strict';
  
  window.provaPushNotify = {
    register: async function() {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) return true;
        
        const vapidKey = 'VAPID_KEY_PLACEHOLDER';
        if (!vapidKey || vapidKey === 'VAPID_KEY_PLACEHOLDER') return false;
        
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey
        });
        
        const email = localStorage.getItem('prova_sv_email') || '';
        if (email) {
          await fetch('/.netlify/functions/push-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'subscribe', email: email, subscription: newSub })
          });
        }
        return true;
      } catch(e) {
        console.warn('[Push] Registration failed:', e.message);
        return false;
      }
    },
    
    requestPermission: async function() {
      try {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        const result = await Notification.requestPermission();
        return result === 'granted';
      } catch(e) {
        return false;
      }
    }
  };
})();
