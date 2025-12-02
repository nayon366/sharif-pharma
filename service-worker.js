// service-worker.js

// CACHE_NAME ভার্সন: যেকোনো পরিবর্তনের পর অফলাইন ফাইল আপডেট করতে এটি পরিবর্তন করুন।
// ভার্সন v1.5
const CACHE_NAME = 'my-pwa-cache-v1.5'; 

// ক্যাশ করার জন্য প্রয়োজনীয় সমস্ত ফাইলের তালিকা
const urlsToCache = [
  '/',
  'index.html',
  'daily_collection_entry.html', 
  // 📌 আপনার সমস্ত কালেকশন ফর্ম যোগ করা হয়েছে
  'collection_form_gb12.html', 
  'collection_form_gb22.html', 
  'collection_form_gb23.html', 
  
  // 📌 প্রয়োজনীয় ডেটা এবং মেটা ফাইল
  'customer_list.json', 
  'manifest.json',
  // যদি কোনো অতিরিক্ত CSS বা JS ফাইল থাকে, এখানে যুক্ত করুন
];

// Apps Script URL: ডেটা সাবমিশনের জন্য (ক্যাশ করা উচিত নয়)
const GOOGLE_SHEET_WEB_APP_URL_PARTIAL = "script.google.com/macros/"; 
// LocalStorage Key: Service Worker-এ সিঙ্ক ট্যাগ করার জন্য প্রয়োজন
const OFFLINE_STORAGE_KEY = 'offlineSubmissions_GB22'; 

// --- ১. ইন্সটলেশন ফেজ: ক্যাশে ফাইল যুক্ত করা ---
self.addEventListener('install', event => {
  console.log('Service Worker: Installing and Caching App Shell (v1.5)');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // এই ক্যাশিং ফেইল করলে সম্পূর্ণ Service Worker ইনস্টল হবে না।
        return cache.addAll(urlsToCache); 
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('Service Worker: Initial caching failed', err))
  );
});

// --- ২. ফেচ ফেজ: অফলাইন সাপোর্ট (আপডেট করা লজিক) ---
self.addEventListener('fetch', event => {
    // 📌 ডেটা সাবমিশন URL কে ক্যাশ করা এড়িয়ে যাওয়া
    if (event.request.url.includes(GOOGLE_SHEET_WEB_APP_URL_PARTIAL)) {
        // Data Submission request সরাসরি নেটওয়ার্কে যাবে
        return;
    }

    // 📌 ক্যাশ ফাস্ট, নেটওয়ার্ক ফলব্যাক লজিক
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // যদি ক্যাশে ফাইলটি পাওয়া যায়, তবে সেটি রিটার্ন করা
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // যদি ক্যাশে না পাওয়া যায়, তবে নেটওয়ার্ক থেকে আনার চেষ্টা করা
                return fetch(event.request).catch(error => {
                    console.error('Service Worker: Fetch failed from network (Offline?)', event.request.url, error);
                    // এখানে আপনি ইউজারকে অফলাইন পেজ দেখাতে পারেন, যদি fetch ফেল করে
                    // কিন্তু যেহেতু আমরা সমস্ত HTML ক্যাশ করছি, এটি খুব কম ঘটবে
                });
            })
    );
});


// --- ৩. অ্যাক্টিভেশন ফেজ: পুরাতন ক্যাশ ডিলিট করা ---
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating and Cleaning up old caches (v1.5)');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) 
  );
});

// --- ৪. 🌟 ব্যাকগ্রাউন্ড সিঙ্ক লজিক 🌟 ---

self.addEventListener('sync', (event) => {
    // এই ট্যাগটি আপনার HTML ফাইলে রেজিস্টার করা হবে
    if (event.tag === 'sync-offline-submissions') { 
        console.log('Service Worker: Background sync triggered.');
        // আমরা সরাসরি LocalStorage অ্যাক্সেস করতে পারি না, তাই খোলা ক্লায়েন্ট উইন্ডোকে সিঙ্ক শুরু করতে বলব।
        event.waitUntil(notifyClientsToSync()); 
    }
});


async function notifyClientsToSync() {
    // Service Worker সব খোলা উইন্ডোগুলিকে খুঁজে বের করে
    const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    
    // যদি একটিও খোলা উইন্ডো থাকে (এমনকি ব্যাকগ্রাউন্ডে), তাকে সিঙ্ক শুরু করার নির্দেশ দেওয়া হবে।
    if (allClients.length > 0) {
        // প্রথম খোলা উইন্ডোকে পোস্ট মেসেজ পাঠানো (সাধারণত এটিই ফ্রন্ট-মোস্ট উইন্ডো)
        allClients[0].postMessage({
            type: 'START_SYNC',
            message: 'Network is back. Initiating data sync from LocalStorage.'
        });
        console.log('Service Worker: Notified client to start sync.');
        return;
    }
    // যদি কোনো ক্লায়েন্ট খোলা না থাকে, ডেটা সিঙ্ক করার জন্য অ্যাপটি খোলা পর্যন্ত অপেক্ষা করতে হবে।
    console.log('Service Worker: No open client found. Sync will start upon app launch.');
}

// Service Worker যখন কোনো মেসেজ পায়, তখন সেই অনুযায়ী কাজ করবে।
self.addEventListener('message', (event) => {
    // এটি কেবল ডিবাগিং-এর জন্য
    console.log('Service Worker received message:', event.data); 
});
