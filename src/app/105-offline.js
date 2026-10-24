// ================= Offline =================
// src/sw.js caches this build so the app still opens and finds people with no network. The people
// model is the largest file and is cached with the rest in one step, so finding it means everything is there.
async function buildCached(){const bin=Object.keys(MODEL_SRI).find(u=>/people\.[0-9a-f]+\.bin$/.test(u));
  try{return!!(await caches.match(new URL(bin,location.href).href,{cacheName:"posepop|"+new URL("./",location.href).pathname+"|"+BUILD,ignoreVary:true}))}catch(e){return false}}
// Registered only once the models have loaded: installing copies this build's files, and doing that
// alongside the page's own downloads makes them compete (and the HTTP cache can refuse two writers).
// Afterwards the copy comes from the browser cache, so nothing is downloaded twice.
if("serviceWorker" in navigator&&!BUILD.startsWith("__")){
  segReady.then(()=>navigator.serviceWorker.register("sw.js")).then(async()=>{
    for(let i=0;i<90&&!(offlineOK=await buildCached());i++)await new Promise(r=>setTimeout(r,2000));
    mark("Build","offline",offlineOK?"this build is cached":"not cached yet");showVersion()
  }).catch(e=>{mark("Errors","offline cache",e.message||e);mark("Build","offline","unavailable")});
}else mark("Build","offline","not supported in this browser");
