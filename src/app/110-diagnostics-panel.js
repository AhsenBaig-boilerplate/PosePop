// ================= Diagnostics panel =================
function gpuInfo(){ // a throwaway context, released straight away, so the 3D world's renderer is untouched
  try{const gl=document.createElement("canvas").getContext("webgl2")||document.createElement("canvas").getContext("webgl");if(!gl)return"no WebGL";
    const ext=gl.getExtension("WEBGL_debug_renderer_info"),name=gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER);
    const out=name+" · "+(typeof WebGL2RenderingContext!=="undefined"&&gl instanceof WebGL2RenderingContext?"WebGL 2":"WebGL 1")+" · max texture "+gl.getParameter(gl.MAX_TEXTURE_SIZE);
    gl.getExtension("WEBGL_lose_context")?.loseContext();return out}catch(e){return"unavailable"}}
function sampleMemory(){
  if(window.tf&&tf.memory){const m=tf.memory();mark("Memory","tf.js",m.numTensors+" tensors · "+mb(m.numBytes))}
  if(performance.memory)mark("Memory","JS heap",mb(performance.memory.usedJSHeapSize)+" of "+mb(performance.memory.jsHeapSizeLimit));
  else mark("Memory","JS heap","not reported by this browser");
}
function diagText(){const lines=["PosePop diagnostics · "+new Date().toISOString()];
  for(const[sec,rows]of DIAG)if(rows.size){lines.push(sec);for(const[k,v]of rows)lines.push("  "+k+": "+v)}
  return lines.join("\n")}
function drawDiag(){if(!DEBUG||$("diagBody").hidden)return;const box=$("diagList");box.textContent="";
  for(const[sec,rows]of DIAG){if(!rows.size)continue;
    const h=document.createElement("h4");h.textContent=sec;const dl=document.createElement("dl");
    for(const[k,v]of rows){const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=k;dd.textContent=v;dl.append(dt,dd)}
    box.append(h,dl)}}
if(DEBUG){
  mark("Build","build",BUILD);mark("Build","page",location.pathname+location.search);
  mark("Device","browser",navigator.userAgent);
  mark("Device","screen",screen.width+" × "+screen.height+" @"+devicePixelRatio+"x · viewport "+innerWidth+" × "+innerHeight);
  mark("Device","memory",navigator.deviceMemory?navigator.deviceMemory+" GB (rounded by browser)":"not reported by this browser");
  mark("Device","CPU cores",navigator.hardwareConcurrency||"not reported");
  mark("Device","WebGL",gpuInfo());
  addEventListener("error",e=>mark("Errors","last error",e.message||"script error"));
  addEventListener("unhandledrejection",e=>mark("Errors","last rejection",(e.reason&&e.reason.message)||e.reason));
  addEventListener("resize",()=>mark("Device","screen",screen.width+" × "+screen.height+" @"+devicePixelRatio+"x · viewport "+innerWidth+" × "+innerHeight));
  $("diag").hidden=false;sampleMemory();setInterval(()=>{if(!$("diagBody").hidden)sampleMemory()},2000);
  $("diagToggle").addEventListener("click",()=>{const open=$("diagBody").hidden;$("diagBody").hidden=!open;
    $("diagToggle").setAttribute("aria-expanded",String(open));$("diag").classList.toggle("closed",!open);if(open){sampleMemory();drawDiag()}});
  $("diagCopy").addEventListener("click",async()=>{sampleMemory();
    try{await navigator.clipboard.writeText(diagText());$("diagMsg").textContent="Copied. Photos and file names are not included."}
    catch(e){$("diagMsg").textContent="Copy isn't available here. Take a screenshot instead."}});
}
