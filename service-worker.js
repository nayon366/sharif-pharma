// service-worker.js

// CACHE_NAME ভার্সন: যেকোনো পরিবর্তনের পর অফলাইন ফাইল আপডেট করতে এটি পরিবর্তন করুন।
// ভার্সন বাড়ানো হয়েছে v1.4 থেকে v1.5-এ
const CACHE_NAME = 'my-pwa-cache-v1.5'; 

// ক্যাশ করার জন্য প্রয়োজনীয় সমস্ত ফাইলের তালিকা
const urlsToCache = [
  '/',
  'index.html',
  'daily_collection_entry.html', 
  'collection_form.html', 
  'collection_form_gb22.html', 
  'collection_form_gb23.html', 
  'customer_list.json', 
  'manifest.json',
  // যদি কোনো অতিরিক্ত CSS বা JS ফাইল থাকে, এখানে যুক্ত করুন
];

// Apps Script URL এবং LocalStorage Key: Service Worker-এও প্রয়োজন
const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzPqmGS5IdO16r0xv46IOAp64_mdUC41mxQYKtgWzRw6Xlv8fns9BocoDfZKv4BHmJm/exec"; 
const OFFLINE_STORAGE_KEY = 'offlineSubmissions_GB22'; // আপনার প্রধান Key

// --- ১. ইন্সটলেশন ফেজ: ক্যাশে ফাইল যুক্ত করা (পূর্বের লজিক) ---
self.addEventListener('install', event => {
  console.log('Service Worker: Installing and Caching App Shell');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// --- ২. ফেচ ফেজ: অফলাইন সাপোর্ট (পূর্বের লজিক) ---
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(error => {
            console.error('Service Worker: Fetch failed:', event.request.url, error);
        });
      })
  );
});

// --- ৩. অ্যাক্টিভেশন ফেজ: পুরাতন ক্যাশ ডিলিট করা (পূর্বের লজিক) ---
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating and Cleaning up old caches');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) 
  );
});

// --- ৪. 🌟 ব্যাকগ্রাউন্ড সিঙ্ক লজিক (নতুন সংযোজন) 🌟 ---

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
        // একটি খোলা উইন্ডোকে পোস্ট মেসেজ পাঠানো
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
