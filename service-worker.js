const CACHE_NAME = "sharif-pharma-cache-v2"; // 💡 ভার্সন v2 তে আপডেট করা হলো, যাতে ব্রাউজার নিশ্চিতভাবে নতুন ফাইলগুলো ক্যাশ করে
const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  
  // 👇 এই পেজগুলো অফলাইনে চলার জন্য ক্যাশ করা আবশ্যক
  "./daily_collection_entry.html", // ডেটা এন্ট্রি ফর্ম
  "./daily_collection.html",        // হোম পেজের অন্য একটি লিঙ্ক
  
  // 👇 আইকন ফাইলগুলো PWA ইনস্টলের জন্য প্রয়োজন
  "./icon-192.png",                 
  "./icon-512.png"                  
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// পুরনো ক্যাশ ডিলিট করার জন্য 'activate' ইভেন্ট যোগ করা যেতে পারে (ঐচ্ছিক, তবে ভালো অভ্যাস)
self.addEventListener('activate', event => {
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
    })
  );
});
