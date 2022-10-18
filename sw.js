//SW version
const version = '1.0';

//Static Cache - App Shell
const appAssets = [
    'index.html',
    'main.js',
    'images/flame.png',
    'images/logo.png',
    'images/sync.png',
    'vendor/bootstrap.min.css',
    'vendor/jquery.min.js',
];

//SW install
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(`static-${version}`)
            .then(cache => cache.addAll(appAssets))
            .catch(err => console.log("err", err))
    )
})

//SW activate
self.addEventListener('activate', (e) => {
    //Clean static code
    let cleaned = caches.keys().then(keys => {
        keys.forEach(key => {
            if (key !== `static-${version}` && key.match('static-')) {
                return caches.delete(key);
            }
        })
    })
    e.waitUntil(cleaned)
})

//Static cache strategy - Cache with Network fallback.
const staticCache = (req, cachedName = `static-${version}`) => {
    return caches.match(req).then(cachedRes => {
        //Return cached response if found
        if (cachedRes) return cachedRes;

        //Fallback to network
        return fetch(req).then(networkRes => {
            //update cache with new response
            caches.open(cachedName)
                .then(cache => cache.put(req, networkRes));

            //Return clone of network response
            return networkRes.clone();
        }).catch(err => {
            console.log(err);
        })
    }) 
}

const fallbackCache = (req) => {
    //Try Network
    return fetch(req)
        .then(networkRes => {
            console.log("networkRes", networkRes)
            console.log("req", req)
            //Check res is OK, else go to cache.
            if (!networkRes.ok) {
                console.log("failed")
                throw "Fetch Error"
            }
            console.log("im updating the cache")
            //Update cache
            caches.open(`static-${version}`)
                .then(cache => cache.put(req, networkRes));

            //Return clone of network response
            console.log("returning clone")
            return networkRes.clone();
        })
        .catch(err => {
            console.log("This part of the console log", req)
            return caches.match(req)
        });
}

const cleanGiphyCache = (giphys) => {
    caches.open('giphy').then(cache => {
        //Get all cache entries
        cache.keys().then(keys => {
            //Loop entries (requests)
            keys.forEach(key => {
                //If entry is NOT part of current Giphys, Delete
                if (!giphys.includes(key.url)) cache.delete(key);
            })
        })
    })
}

//SW Fetch
self.addEventListener('fetch', e => {
    //App shell
    if (e.request.url.match(location.origin)) {
        console.log("location.origin", location.origin)
        e.respondWith( staticCache(e.request) ); 
    
    //Giphy API
    } else if (e.request.url.match('api.giphy.com/v1/gifs/trending')) {
        console.log("this request url is for giphy")
        e.respondWith( fallbackCache(e.request));
    //Gipy Media
    } else if(e.request.url.match('giphy.com/media')){
        e.respondWith(staticCache(e.request, 'giphy'))
    }
})

//Listen for message from client
self.addEventListener('message', e => {
    //Identify message
    if (e.data.action === 'cleanGiphyCache') cleanGiphyCache(e.data.giphys); 
})