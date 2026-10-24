// ================= Kiosk mode (?kiosk=1) =================
// For events: a start screen, a live camera with a 3-2-1 countdown, big Retake and Save buttons, and a reset
// to the start screen 60 s after a save that clears the guest's photo. Any tap restarts the 60 s, so a guest
// who is still editing isn't cut off. Operators long-press the title for 1.5 s to show or hide everything else.
const KIOSK=new URLSearchParams(location.search).get("kiosk")==="1",RESET_S=60,LONG_PRESS_MS=1500;
let camStream=null,facing="user",resetAt=0,resetTick=0,wakeLock=null,shooting=false;
function toast(t){const el=$("kToast");el.textContent=t;el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>el.hidden=true,2600)}
function afterSave(){if(!KIOSK)return;resetAt=Date.now()+RESET_S*1000;showReset();clearInterval(resetTick);resetTick=setInterval(showReset,1000)}
function showReset(){const left=Math.max(0,Math.ceil((resetAt-Date.now())/1000));
  if(!left){kioskReset();return}$("kReset").hidden=false;$("kReset").textContent="Saved! Starting over for the next guest in "+left+" s. Tap anything to keep editing."}
function kioskReset(){
  clearInterval(resetTick);resetAt=0;$("kReset").hidden=true;closeCam();
  // forget this guest's photo: cancel any detection still running and go back to the built-in sample
  loading++;DIAG.get("Photo").clear();sample();resetEdits();userWork=false;
  $("tool").querySelector('[data-v="move"]').click();note("Showing the built-in sample. Take or choose a photo to start.");run();
  document.documentElement.classList.remove("unlocked");$("kStart").hidden=false;scrollTo(0,0);
  checkForUpdate(); // nobody's work is open now, so a waiting update applies straight away
}
async function keepAwake(){if(!("wakeLock" in navigator)||(wakeLock&&!wakeLock.released))return;
  try{wakeLock=await navigator.wakeLock.request("screen");mark("Build","wake lock","on")}catch(e){mark("Build","wake lock","unavailable: "+(e.message||e))}}
function goFullscreen(){const el=document.documentElement;try{const r=(el.requestFullscreen||el.webkitRequestFullscreen)?.call(el);r&&r.catch&&r.catch(()=>{})}catch(e){}}
function closeCam(){if(camStream){for(const t of camStream.getTracks())t.stop();camStream=null}$("kVideo").srcObject=null;$("kCam").hidden=true}
async function openCam(){
  $("kCam").hidden=false;$("kCamMsg").textContent="";$("kCount").textContent="";$("kShoot").disabled=true;
  if(camStream)for(const t of camStream.getTracks())t.stop();
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error("no camera API in this browser");
    camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1920},height:{ideal:1920}},audio:false});
    const v=$("kVideo");v.srcObject=camStream;v.classList.toggle("mirror",facing==="user");await v.play();$("kShoot").disabled=false;
  }catch(e){
    // denied or unavailable: the phone's own camera still works, just without the countdown
    $("kCamMsg").textContent="The live camera isn't available ("+(e.name==="NotAllowedError"?"permission was denied":e.message||e.name)+"). Tap Take photo to use the phone's camera instead.";
    $("kShoot").disabled=false;camStream=null;
  }
}
async function shoot(){
  if(shooting)return;if(!camStream){closeCam();$("cam").click();return}
  shooting=true;$("kShoot").disabled=true;const n=$("kCount");
  for(const s of["3","2","1"]){n.textContent=s;n.classList.remove("tick");void n.offsetWidth;n.classList.add("tick");await new Promise(r=>setTimeout(r,1000))}
  n.textContent="";$("kFlash").hidden=false;setTimeout(()=>$("kFlash").hidden=true,450);
  // the saved photo is the camera's real view; only the preview is mirrored
  const v=$("kVideo"),c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);
  const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.92));shooting=false;closeCam();
  if(blob)loadFile(new File([blob],"camera.jpg",{type:"image/jpeg"}),"Camera");else note("The camera photo couldn't be read. Try again.");
}
function longPress(el,fn){let t=0;const stop=()=>clearTimeout(t);
  el.addEventListener("pointerdown",()=>{stop();t=setTimeout(fn,LONG_PRESS_MS)});
  for(const ev of["pointerup","pointerleave","pointercancel"])el.addEventListener(ev,stop);el.addEventListener("contextmenu",e=>e.preventDefault())}
function toggleSettings(){const on=document.documentElement.classList.toggle("unlocked");
  if(on){$("kStart").hidden=true;closeCam()}toast(on?"Settings shown. Long-press the title again to hide them.":"Settings hidden.")}
if(KIOSK){
  document.documentElement.classList.add("kiosk");$("kStart").hidden=false;$("kbar").hidden=false;
  $("kGo").addEventListener("click",()=>{goFullscreen();keepAwake();$("kStart").hidden=true;openCam()});
  $("kRetake").addEventListener("click",()=>{clearInterval(resetTick);resetAt=0;$("kReset").hidden=true;openCam()});
  $("kSave").addEventListener("click",()=>$("saveSticker").click());
  $("kShoot").addEventListener("click",shoot);
  $("kBack").addEventListener("click",closeCam);
  $("kFlip").addEventListener("click",()=>{facing=facing==="user"?"environment":"user";openCam()});
  $("kExit").addEventListener("click",()=>{const u=new URL(location.href);u.searchParams.delete("kiosk");closeCam();try{document.exitFullscreen?.()}catch(e){}location.replace(u.toString())});
  for(const h of document.querySelectorAll("h1"))longPress(h,toggleSettings);
  // a guest still editing gets another 60 s
  document.addEventListener("pointerdown",()=>{if(resetAt)resetAt=Date.now()+RESET_S*1000},true);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")keepAwake();else closeCam()});
  mark("Build","kiosk","on");
}
