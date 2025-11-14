// =========================================================================
// SERVICE WORKER FILE (service-worker.js)
// =========================================================================

const QUEUE_KEY = 'payoutQueue';
// !!! এখানে আপনার Apps Script URL টি অবশ্যই দিন !!!
const APP_SCRIPT_URL = 'আপনার_সঠিক_Apps_Script_URL/exec'; 

// ------------------- Background Sync Logic -------------------
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-payout-data') {
    event.waitUntil(syncPayoutData());
  }
});

async function syncPayoutData() {
  const queueString = localStorage.getItem(QUEUE_KEY);
  if (!queueString) return;
  
  let queue = JSON.parse(queueString);
  if (queue.length === 0) return;

  const dataToSync = queue[0]; // কিউ এর প্রথম ডেটা
  
  try {
    // Apps Script URL এ POST রিকোয়েস্ট পাঠানো হচ্ছে
    await fetch(APP_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Cross-Domain সমস্যার জন্য no-cors
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSync)
    });

    // রিকোয়েস্ট নেটওয়ার্ক লেভেলে সফল হলে, কিউ থেকে আইটেমটি সরিয়ে দিন
    queue.shift(); 
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    
    // যদি আরও ডেটা থাকে, তবে আবার সিঙ্ক করার চেষ্টা করুন
    if (queue.length > 0) {
      // সার্ভিস ওয়ার্কারকে আবার সিঙ্ক করার জন্য অনুরোধ করা
      await self.registration.sync.register('sync-payout-data');
    }

  } catch (error) {
    // নেটওয়ার্ক এরর হলে, Service Worker অটোমেটিক আবার চেষ্টা করবে
    console.error('Sync failed:', error);
    // throw Error ব্যবহার করলে Service Worker আবার ট্রাই করবে
    throw new Error('Sync failed, will retry later.');
  }
}

// ------------------- Installation (PWA ক্যাশিং-এর জন্য - ঐচ্ছিক) -------------------
const CACHE_NAME = 'spl-pwa-v1';
const urlsToCache = [
  '/', 
  'PayoutForm.html', 
  'service-worker.js',
  // আপনার অন্যান্য HTML ফাইল এখানে যোগ করুন
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
