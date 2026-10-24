// ================= Diagnostics (?debug=1) =================
// Build, timings and device facts for checking real phones at events. Values are collected
// always (a few object writes) but only shown with ?debug=1, and never leave the page.
const DEBUG=new URLSearchParams(location.search).get("debug")==="1";
const DIAG=new Map(["Build","Device","Detection","Photo","Print","Memory","Errors"].map(s=>[s,new Map()]));
let diagQueued=0;
function mark(sec,key,val){DIAG.get(sec).set(key,String(val));if(DEBUG&&!diagQueued)diagQueued=requestAnimationFrame(()=>{diagQueued=0;drawDiag()})}
const since=t=>Math.round(performance.now()-t)+" ms";
async function timed(sec,key,p){const t=performance.now();try{return await p}finally{mark(sec,key,since(t))}}
const mb=n=>(n/1048576).toFixed(1)+" MB";
