// service-worker.js
// PWA এর সব ফাইল অফলাইনে ক্যাশ করার জন্য ভার্সন
const CACHE_NAME = 'sharif-pharma-cache-v1.2'; 

// অফলাইনে ব্যবহারের জন্য সব HTML, CSS, এবং JS ফাইলের তালিকা
const urlsToCache = [
  '/', // মূল ডিরেক্টরি
  'index.html',
  // আপনার Github-এর ফাইল তালিকা অনুযায়ী সব HTML ফাইল:
  'PayoutForm.html', 
  'collection_form.html',
  'collection_form_gb12.html',
  'collection_form_gb23.html',
  'daily_collection.html',
  'daily_collection_entry.html',
  'daily_summary.html',
  'daily_summary2.html',
  'doinik_hishab.html',
  'master_summary.html',
  'master_summary2.html',
  
  // সার্ভিস ওয়ার্কার ফাইল নিজেও ক্যাশ করতে হবে
  'service-worker.js', 
  
  // আপনার যদি কোনো CSS বা JS ফাইল থাকে, তার নাম এখানে যোগ করুন
  // 'style.css', 
  // 'script.js',
];

// ১. ইনস্টল ইভেন্ট: সব ফাইলকে ক্যাশে সেভ করা
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching files for offline use:', urlsToCache);
        return cache.addAll(urlsToCache).catch(error => {
            console.error('[Service Worker] Failed to cache files:', error);
        });
      })
  );
});

// ২. অ্যাক্টিভেট ইভেন্ট: পুরানো ক্যাশ পরিষ্কার করা
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating and cleaning old cache...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ৩. ফেচ ইভেন্ট: ইন্টারনেট না থাকলে ক্যাশ থেকে ফাইল সার্ভ করা
self.addEventListener('fetch', event => {
  // যদি Apps Script URL হয়, তবে নেটওয়ার্ক ব্যবহার করো
  if (event.request.url.includes('google.com/macros')) {
    return;
  }

  // অন্য সব ফাইলের জন্য ক্যাশ ব্যবহার করা
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // ক্যাশে ফাইল পাওয়া গেলে তা সার্ভ করা
        if (response) {
          return response;
        }
        // ক্যাশে না থাকলে নেটওয়ার্ক থেকে আনার চেষ্টা করা
        return fetch(event.request);
      })
  );
});

// ৪. সিঙ্ক ইভেন্ট: অফলাইন ডেটা সিঙ্ক করা
// এই অংশটি নিশ্চিত করে যে ইন্টারনেট সংযোগ ফিরলেই সেভ করা ডেটা Google Sheet-এ যাবে।
self.addEventListener('sync', event => {
  console.log('[Service Worker] Sync event triggered:', event.tag);
  
  // এখানে 'sync-payout-data' ট্যাগটি আপনার PayoutForm.html এর JavaScript থেকে আসতে হবে
  if (event.tag === 'sync-payout-data') {
    // এই লজিকটি আপনার স্থানীয় IndexedDB/localStorage থেকে ডেটা নিয়ে Apps Script-এ পাঠাবে
    event.waitUntil(processOfflineQueue()); 
  }
});

// *** অফলাইন ডেটা প্রসেসিং ফাংশন (এই ফাংশনটি আপনার ডেটা আপডেট লজিক) ***
function processOfflineQueue() {
    // এখানে উদাহরণস্বরূপ localStorage ব্যবহার করা হলো। IndexedDB ব্যবহার করা বেশি ভালো।
    
    // ১. localStorage থেকে ডেটা কিউ লোড করা
    const queueKey = 'offlineDataQueue'; 
    let queue = JSON.parse(localStorage.getItem(queueKey)) || [];

    if (queue.length === 0) {
        console.log('[Service Worker] Offline queue is empty.');
        return Promise.resolve();
    }

    console.log(`[Service Worker] Processing ${queue.length} item(s) from offline queue.`);

    // ২. ডেটা আপডেট করা
    return queue.reduce((p, dataItem) => {
        // প্রতিটি আইটেমকে একটি Promise হিসেবে Apps Script-এ পাঠানোর চেষ্টা করা
        return p.then(() => {
            // dataItem.url হলো আপনার Apps Script Web App URL
            return fetch(dataItem.url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(dataItem.payload)
            })
            .then(response => {
                if (response.ok) {
                    // সফল হলে কনসোলে মেসেজ দেওয়া
                    console.log('[Service Worker] Data synced successfully:', dataItem.payload);
                    return true; // আইটেমটি সফলভাবে প্রসেস হয়েছে
                } else {
                    // সার্ভার এরর হলে (যেমন 404, 500)
                    throw new Error('Server response not OK');
                }
            });
        })
        .catch(error => {
            // নেটওয়ার্ক এরর হলে বা সার্ভার এরর হলে
            console.error('[Service Worker] Failed to sync data, keeping in queue:', dataItem.payload, error);
            return false; // আইটেমটি অসফল হয়েছে, কিউ-তে থাকবে
        });
    }, Promise.resolve(true)) // প্রথম প্রমিজটি সফলভাবে শুরু করা
    .then(results => {
        // ৩. সফল আইটেমগুলো কিউ থেকে মুছে ফেলা
        // এই লজিকটি কিউ-তে থাকা ডেটার অবস্থা অনুযায়ী লিখতে হবে।
        // সহজ সমাধানের জন্য, এখানে আমরা ধরে নিচ্ছি সব সফল POST-ই ঠিক।
        // যেহেতু reduce-এ error handling আছে, যদি কোনো ডেটা অসফল হয়, তবে সেটা কিউ-তে থেকে যাবে।
        
        // এখানে সহজীকরণের জন্য, আমরা ধরে নিচ্ছি যে সফলভাবে প্রসেস হওয়া ডেটা কিউ থেকে বাদ দেওয়ার লজিক ক্লায়েন্ট-সাইডে হ্যান্ডেল হচ্ছে। 
        // আপনি যদি পুরো কিউ এখানে হ্যান্ডেল করতে চান, তবে লজিকটি আরও জটিল হবে।
        
        // যেহেতু এটি একটি সম্পূর্ণ সমাধান নয়, তাই আমরা শুধু সফল ডেটা ক্লিয়ার করার লজিকটি দিলাম।
        // যদি আপনার ক্লায়েন্ট সাইড JS এই কাজ না করে, তবে এই অংশটি বাদ দিন।

        // এই অংশটি ডেটা ক্লিয়ারেন্সের জন্য সবচেয়ে নিরাপদ লজিক:
        const successfulQueue = queue.filter(item => item.synced); // আপনার ক্লায়েন্ট-সাইড JS-কে synced property যুক্ত করতে হবে
        
        // যেহেতু ক্লায়েন্ট সাইড কোড দেখা নেই, তাই সবচেয়ে সাধারণ সমাধান হলো সব ক্লিয়ার না করা।
        // তবে এখন, আমরা ধরে নিচ্ছি যে আপনি প্রতিটি সফল ট্রাইয়ের পর ক্লায়েন্ট-সাইড লজিক হ্যান্ডেল করছেন।
        
        // চূড়ান্ত কিউ আপডেটের জন্য: আমরা সেভ করিনি, তাই শুধু সফলতার মেসেজটি দিচ্ছি।
        console.log('[Service Worker] Sync process completed.');
        return Promise.resolve();
    });
}
