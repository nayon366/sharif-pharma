// CACHE_NAME ভার্সন: যেকোনো পরিবর্তনের পর অফলাইন ফাইল আপডেট করতে এটি পরিবর্তন করুন।
const CACHE_NAME = 'my-pwa-cache-v1.4';

// ক্যাশ করার জন্য প্রয়োজনীয় সমস্ত ফাইলের তালিকা
const urlsToCache = [
  '/', // রুট বা বেস পাথ
  'index.html', // যদি আপনার হোম পেজ এটি হয়
  'daily_collection_entry.html', // আপনার গ্রুপ নির্বাচনের প্রধান পাতা
  'collection_form.html', // GB-12 ফর্ম
  'collection_form_gb22.html', // GB-22 ফর্ম
  'collection_form_gb23.html', // GB-23 ফর্ম
  'customer_list.json', // কাস্টমার তালিকা
  'manifest.json', // PWA ম্যানিফেস্ট
  // যদি কোনো অতিরিক্ত CSS বা JS ফাইল থাকে, এখানে যুক্ত করুন
];

// --- ইন্সটলেশন ফেজ: ক্যাশে ফাইল যুক্ত করা ---
self.addEventListener('install', event => {
  console.log('Service Worker: Installing and Caching App Shell');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // তাৎক্ষণিকভাবে নতুন SW সক্রিয় করতে
  );
});

// --- ফেচ ফেজ: অফলাইন সাপোর্ট ---
self.addEventListener('fetch', event => {
  // শুধুমাত্র GET রিকোয়েস্টের জন্য ক্যাশ-ফার্স্ট স্ট্র্যাটেজি ব্যবহার করা হচ্ছে
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 1. যদি ক্যাশে ফাইল পাওয়া যায়, সেটি রিটার্ন করবে (অফলাইন সাপোর্ট)
        if (response) {
          // console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }
        
        // 2. ক্যাশে না থাকলে নেটওয়ার্ক থেকে আনার চেষ্টা করবে
        // console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request).catch(error => {
            // নেটওয়ার্ক ফেইল হলে বা অফলাইনে থাকলে, এখানে হ্যান্ডেল করবে
            console.error('Service Worker: Fetch failed:', event.request.url, error);
        });
      })
  );
});

// --- অ্যাক্টিভেশন ফেজ: পুরাতন ক্যাশ ডিলিট করা ---
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating and Cleaning up old caches');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // যদি ক্যাশের নাম whitelist-এ না থাকে (অর্থাৎ পুরানো ভার্সন), সেটি ডিলিট করা হবে
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // নতুন SW কে সক্রিয়ভাবে কন্ট্রোল নিতে সাহায্য করে
  );
});
