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

  const dataToSync = queue[0];
  
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

    // রিকোয়েস্ট নেটওয়ার্ক লেভেলে সফল হলে (no-cors এ স্ট্যাটাস চেক করা কঠিন)
    // কিউ থেকে আইটেমটি সরিয়ে দিন
    queue.shift(); 
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    
    // যদি আরও ডেটা থাকে, তবে আবার সিঙ্ক করার চেষ্টা করুন
    if (queue.length > 0) {
      await self.registration.sync.register('sync-payout-data');
    }

  } catch (error) {
    // নেটওয়ার্ক এরর হলে, Service Worker অটোমেটিক আবার চেষ্টা করবে
    console.error('Sync failed:', error);
    throw new Error('Sync failed, will retry later.');
  }
}

// ------------------- Installation (PWA ক্যাশিং-এর জন্য) -------------------
// এটি PWA-এর জন্য ঐচ্ছিক কিন্তু ভালো প্র্যাকটিস
const CACHE_NAME = 'spl-pwa-v1';
const urlsToCache = [
  '/', // আপনার রুট HTML
  'PayoutForm.html', // Payout ফর্ম
  'service-worker.js',
  // আপনার অন্যান্য CSS/JS ফাইল এখানে যোগ করতে পারেন
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
  // ক্যাশ থেকে ফাইলগুলি পরিবেশন করা
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
