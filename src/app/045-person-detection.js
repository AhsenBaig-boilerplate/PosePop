// ================= Person detection (runs in src/detect.js) =================
// Detection runs in a Web Worker (src/detect-worker.js) where the browser has OffscreenCanvas, so the
// page stays responsive while people are found and tf.js never loads on the page. Otherwise, or with
// ?worker=0, the same code runs here on the page.
// Every model file tf.js fetches must match its Subresource Integrity hash; anything else is refused.
const MODEL_SRI={"__ASSET:models/selfie.json__":"__SRI:models/selfie.json__","__ASSET:models/selfie.bin__":"__SRI:models/selfie.bin__",
  "__ASSET:models/people.json__":"__SRI:models/people.json__","__ASSET:models/people.bin__":"__SRI:models/people.bin__",
  "__ASSET:models/bodypix.json__":"__SRI:models/bodypix.json__","__ASSET:models/bodypix.bin__":"__SRI:models/bodypix.bin__"};
// ?debug=1&gate=1 runs the cut-out gate even without WebGL, and gate=0 turns it off, so the tests can compare both
const DETECT_OPTS={gate:DEBUG?{1:true,0:false}[new URLSearchParams(location.search).get("gate")]:undefined};
const DETECT={tf:"__ASSET:vendor/tf.min.js__",tfSri:"__SRI:vendor/tf.min.js__",code:"__ASSET:detect.js__",codeSri:"__SRI:detect.js__",worker:"__ASSET:detect-worker.js__"};
let detectWorker=null,jobSeq=0;const jobs=new Map();
function setSeg(state,text){S.segMode=state;const el=$("segStatus");el.dataset.s=state;el.querySelector("span").textContent=text;mark("Detection","status",state)}
function loadScript(src,integrity){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;if(integrity)s.integrity=integrity;s.onload=res;s.onerror=()=>rej(new Error("script"));document.head.append(s)})}
function startWorker(){return new Promise((res,rej)=>{
  if(new URLSearchParams(location.search).get("worker")==="0")return rej(new Error("turned off with ?worker=0"));
  if(typeof Worker==="undefined"||typeof OffscreenCanvas==="undefined")return rej(new Error("no OffscreenCanvas in this browser"));
  const w=new Worker(DETECT.worker),fail=err=>{w.terminate();if(detectWorker===w)detectWorker=null;for(const j of jobs.values())j.rej(err);jobs.clear();rej(err)};
  w.onmessage=e=>{const m=e.data;
    if(m.type==="mark")mark(m.sec,m.key,m.val);
    else if(m.type==="ready"){detectWorker=w;res(m)}
    else if(m.type==="failed")fail(new Error(m.error));
    else{const j=jobs.get(m.id);if(!j)return;if(m.type==="progress"){j.progress(m.text);return}
      jobs.delete(m.id);if(m.type==="result")j.res(m);else j.rej(new Error(m.error))}};
  w.onerror=e=>{e.preventDefault();mark("Errors","detection worker",e.message||"worker error");fail(new Error(e.message||"worker error"))};
  w.postMessage({type:"init",tf:DETECT.tf,detect:DETECT.code,models:MODEL_SRI,opts:DETECT_OPTS});
})}
// asked the way tf.js asks: software-only WebGL counts as none
function pageHasWebGL(){try{const gl=document.createElement("canvas").getContext("webgl",{failIfMajorPerformanceCaveat:true});gl?.getExtension("WEBGL_lose_context")?.loseContext();return!!gl}catch(e){return false}}
async function startHere(){
  // TF.js bundles regenerator-runtime, which falls back to eval when this global is missing.
  // Declaring it keeps the page working under a CSP without 'unsafe-eval'.
  if(!("regeneratorRuntime" in window))window.regeneratorRuntime=undefined;
  await loadScript(DETECT.code,DETECT.codeSri);PosePopDetect.start(MODEL_SRI,mark,DETECT_OPTS);
  await timed("Detection","tf.js script",loadScript(DETECT.tf,DETECT.tfSri));
  return PosePopDetect.load();
}
const segReady=(async()=>{
  try{
    let r;
    try{r=await startWorker();
      // without WebGL in workers (Safari before 17) tf.js runs ~10× slower there: a short freeze on the page beats that
      if(r.backend!=="webgl"&&pageHasWebGL()){detectWorker.terminate();detectWorker=null;throw new Error("no WebGL in the worker")}
      mark("Detection","runs in","Web Worker (page stays responsive)")}
    catch(e){mark("Detection","runs in","page: "+e.message);r=await startHere()}
    mark("Detection","ready after",Math.round(performance.now())+" ms from page start");
    setSeg("ready","Person detection ready. People are cut out automatically.");
    if(!r.people)mark("Detection","status","ready without people model: cut-out by tiles only");
    return true;
  }catch(e){
    mark("Errors","detection load",e.message||e);
    setSeg("fallback","Person detection couldn't load here, so the cut-out uses color. Fix stray areas with Erase and Restore.");
    return false;
  }
})();
// resolves to {alpha, people, focus, boxes}; alpha is an ImageBitmap from the worker or a canvas from the page
async function segment(img,opts){
  if(!detectWorker)return PosePopDetect.segment(img,opts);
  const bm=await createImageBitmap(img),id=++jobSeq;
  return new Promise((res,rej)=>{jobs.set(id,{res,rej,progress:opts.progress});detectWorker.postMessage({type:"segment",id,image:bm},[bm])});
}
