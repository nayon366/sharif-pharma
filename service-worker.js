// =========================================================================
// SERVICE WORKER FILE (service-worker.js)
// =========================================================================

const QUEUE_KEY = 'payoutQueue';
// Apps Script URL
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPJVZ4dLyu5GmvqKM3A1UErYN1fflEX1c3XgZtEY2-aBxBG0AI8wG8d4iGBOatxJE/exec'; 

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
      mode: 'no-cors',
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
      await self.registration.sync.register('sync-payout-data');
    }
    console.log('Successfully synced one item. Items remaining:', queue.length);

  } catch (error) {
    console.error('Sync failed, will retry later:', error);
    throw new Error('Sync failed, will retry later.'); // পরবর্তীতে পুনরায় চেষ্টা করার জন্য এরর নিক্ষেপ করুন
  }
}

// ------------------- Installation (PWA ক্যাশিং-এর জন্য) -------------------
const CACHE_NAME = 'spl-pwa-v1';
const urlsToCache = [
  '/', 
  'PayoutForm.html', 
  'service-worker.js',
  // আপনার অন্যান্য HTML ফাইল এখানে যোগ করুন, যেমন:
  // 'index.html', 
  // 'daily_collection_entry.html', 
  // 'daily_collection.html', 
  // 'master_summary.html', 
  // 'master_summary2.html', 
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker installed and caching assets.');
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
