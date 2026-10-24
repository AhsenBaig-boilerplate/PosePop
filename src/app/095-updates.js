// ================= Updates =================
// Every deploy gets a new build id. Hashed asset names make libraries, fonts and models
// immutable; only index.html and version.json can go stale, so we ask the server which
// build is current (bypassing every cache) and move to it with a versioned URL.
// build facts live in <meta> tags, so this file's hash (and so the build id) doesn't depend on them
const META=n=>document.querySelector('meta[name="'+n+'"]').content,BUILD=META("build"),BUILT_AT=META("built-at"),VERSION=META("version");
// Channels: the site root is the latest app (main, updates itself); /v/<version>/ is a pinned release,
// whose own version.json never changes, so it never auto-updates. releases.json lists them.
const PINNED=(location.pathname.match(/\/v\/([^/]+)\/(?:index\.html)?$/)||[])[1]||null;
const SITE_ROOT=PINNED?location.pathname.replace(/v\/[^/]+\/(?:index\.html)?$/,""):location.pathname.replace(/[^/]*$/,"");
let userWork=false,updateTo=null;
// footer line: which build this is, when it was built, and what the last update check found
let versionState="",offlineOK=false;
function showVersion(state){if(state!==undefined)versionState=state;
  const at=BUILT_AT.startsWith("__")?"":new Date(BUILT_AT).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});
  $("version").textContent="PosePop "+(BUILD.startsWith("__")?"(unbuilt source)":VERSION+(PINNED?" (pinned)":"")+(at?" · built "+at:""))+(versionState?" · "+versionState:"")+(offlineOK?" · works offline":"");
  $("version").title="Build "+BUILD}
showVersion("checking for updates…");
function goToBuild(b){const u=new URL(location.href);u.searchParams.set("v",b);location.replace(u.toString())}
async function checkForUpdate(){
  if(BUILD.startsWith("__"))return;
  if(!navigator.onLine){showVersion("offline");return}
  try{const r=await fetch("version.json?t="+Date.now(),{cache:"no-store"});if(!r.ok){showVersion("couldn't check for updates");return}const v=await r.json();
    mark("Build","server build",(v&&v.build)+" · checked "+new Date().toLocaleTimeString());
    if(!v||!v.build||v.build===BUILD){showVersion("up to date, checked "+new Date().toLocaleTimeString(undefined,{timeStyle:"short"}));return}
    updateTo=v.build;showVersion("update ready: version "+v.build.split("-")[0]);
    // nothing to lose yet: switch straight away, but only once, so a stale CDN edge can't cause a reload loop
    if(!userWork&&new URL(location.href).searchParams.get("v")!==v.build){goToBuild(v.build);return}
    $("update").hidden=false; // someone is mid-edit: let them choose when
  }catch(e){showVersion("couldn't check for updates")}
}
$("updateBtn").addEventListener("click",()=>{if(updateTo)goToBuild(updateTo)});
// tidy the address bar after a versioned reload
try{const u=new URL(location.href);if(u.searchParams.get("v")===BUILD){u.searchParams.delete("v");history.replaceState(null,"",u.pathname+u.search+u.hash)}}catch(e){}
setTimeout(checkForUpdate,4000);setInterval(checkForUpdate,5*60*1000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")checkForUpdate()});
window.addEventListener("online",checkForUpdate);
