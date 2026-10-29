// Person detection and cut-out (MoveNet MultiPose + MediaPipe Selfie Segmentation + BodyPix, Apache-2.0, via TensorFlow.js).
// Runs inside the Web Worker (detect-worker.js) where the browser has OffscreenCanvas, otherwise on the page.
// The host calls start(models, report, opts) before loading tf.js, then load(), then segment() per photo.
//   models: {url: SRI hash}, relative to this file's folder; every model file tf.js fetches must match its hash
//   report(section, key, value): timings and facts for the ?debug=1 panel
//   opts.gate: true runs the BodyPix gate even without WebGL, false turns it off (tests only, ?debug=1&gate=1 or 0)
"use strict";
self.PosePopDetect = (() => {
let segModel=null,poseModel=null,bodyModel=null,gateOpt,MODELS={},early=new Map(),report=()=>{},detectPasses=0;
const mk=(w,h)=>{if(typeof OffscreenCanvas!=="undefined")return new OffscreenCanvas(w,h);const c=document.createElement("canvas");c.width=w;c.height=h;return c};
const since=t=>Math.round(performance.now()-t)+" ms",mb=n=>(n/1048576).toFixed(1)+" MB";
async function timed(key,p){const t=performance.now();try{return await p}finally{report("Detection",key,since(t))}}

function start(models,rep,opts){MODELS=models;if(rep)report=rep;gateOpt=opts&&opts.gate;
  // Start downloading the models right away, so the 16 MB overlaps tf.js loading and starting up
  // instead of waiting for it. tf.js picks these responses up when it asks for the same files.
  early=new Map(Object.entries(models).map(([url,integrity])=>{const p=fetch(url,{integrity});p.catch(()=>{});return[url,p]}))}
function loadModel(json){
  return tf.loadGraphModel(json,{fetchFunc:(url,init)=>{const key=new URL(url,self.location.href).pathname.split("/").slice(-2).join("/"),integrity=MODELS[key];
    // the early download is retried once if it failed (flaky Wi-Fi); an integrity failure fails again
    const e=early.get(key);if(e){early.delete(key);return e.catch(()=>fetch(url,{...init,integrity}))}
    return integrity?fetch(url,{...init,integrity}):Promise.reject(new Error("no integrity hash for "+key))}});
}
async function load(){ // tf.js must already be loaded; resolves to {people: whether the people model loaded, backend}
  await timed("backend start",(async()=>{try{await tf.setBackend("webgl")}catch(e){}await tf.ready()})());
  report("Detection","backend",tf.getBackend()==="webgl"?"webgl "+tf.env().getNumber("WEBGL_VERSION"):tf.getBackend()+" (WebGL unavailable to tf.js: detection will be slow)");
  const json=k=>Object.keys(MODELS).find(u=>new RegExp("models/"+k+"\\.[0-9a-f]+\\.json$").test(u));
  // The people and body models are optional: without them the cut-out falls back to Selfie alone. The body model (the
  // cut-out gate) only runs on WebGL: on the CPU it takes about 12 s per person, against 0.4 s for Selfie.
  const gpu=tf.getBackend()==="webgl";
  [segModel,poseModel,bodyModel]=await Promise.all([timed("cut-out model",loadModel(json("selfie"))),
    timed("people model",loadModel(json("people"))).catch(e=>{report("Errors","people model",e.message||e);return null}),
    (gateOpt??gpu)?timed("body model",loadModel(json("bodypix"))).catch(e=>{report("Errors","body model",e.message||e);return null}):null]);
  report("Detection","body gate",bodyModel?"on"+(gpu?"":" (forced without WebGL)"):gateOpt===false?"off (turned off)":gpu?"off (body model didn't load)":"off (no WebGL: it would add about 12 s per person)");
  // transferSize is 0 when a file came from the browser cache
  const res=performance.getEntriesByType("resource").filter(r=>/\/(models|vendor)\//.test(r.name)),got=res.reduce((a,r)=>a+(r.transferSize||0),0);
  report("Detection","downloaded",mb(got)+" of "+mb(res.reduce((a,r)=>a+(r.decodedBodySize||0),0))+(got?"":" (cached)"));
  memory();return{people:!!poseModel,backend:tf.getBackend()};
}
function memory(){const m=tf.memory();report("Memory","tf.js",m.numTensors+" tensors · "+mb(m.numBytes))}

function workCanvas(img,maxSide){
  const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,sc=Math.min(1,maxSide/Math.max(iw,ih));
  const c=mk(Math.round(iw*sc),Math.round(ih*sc)),x=c.getContext("2d");x.imageSmoothingQuality="high";x.drawImage(img,0,0,c.width,c.height);return c;
}
async function detectIn(c,rx,ry,rw,rh,step){ // MoveNet MultiPose on one region; up to 6 people
  detectPasses++;step();rx=Math.max(0,Math.round(rx));ry=Math.max(0,Math.round(ry));rw=Math.min(Math.round(rw),c.width-rx);rh=Math.min(Math.round(rh),c.height-ry);
  const sc=512/Math.max(rw,rh),iw=Math.max(32,Math.round(rw*sc/32)*32),ih=Math.max(32,Math.round(rh*sc/32)*32);
  const out=tf.tidy(()=>{const img=tf.browser.fromPixels(c).slice([ry,rx,0],[rh,rw,3]);
    return poseModel.execute(tf.image.resizeBilinear(img,[ih,iw]).toInt().expandDims(0))});
  const d=await out.data();out.dispose();const found=[];
  for(let i=0;i<6;i++){const o=i*56,score=d[o+55];if(score<.15)continue;
    const kp=[];for(let k=0;k<17;k++)kp.push({y:ry+d[o+k*3]*rh,x:rx+d[o+k*3+1]*rw,s:d[o+k*3+2]});
    const vis=kp.filter(p=>p.s>.2);if(vis.length<3)continue;
    // tight box from the visible joints; the model's own box is often too wide in groups
    const x0=Math.min(...vis.map(p=>p.x)),x1=Math.max(...vis.map(p=>p.x)),y0=Math.min(...vis.map(p=>p.y)),y1=Math.max(ry+d[o+53]*rh,...vis.map(p=>p.y));
    found.push({x0,x1,y0,y1,score,kp,area:Math.max(1,(x1-x0)*(y1-y0))})}
  return found;
}
// In a group, someone whose legs weren't found (dark trousers on a dark backdrop, say) gets a box that stops at the
// waist, and each cut-out is clipped to its box, so a gap opens between their neighbours. When the people whose legs
// were found reach lower, and nobody stands in front of this person's legs, their box is extended down to that floor.
// people: tight boxes {x0, x1, y0, y1, kp (17 MoveNet keypoints {x, y, s})}; pure, so it's unit-tested.
const LEG_KP=[13,14,15,16],KP_SEEN=.2,FRONT_COVER=.5;
function extendLegs(people){
  const legs=p=>LEG_KP.some(i=>p.kp[i].s>KP_SEEN),withLegs=people.filter(legs);
  if(!withLegs.length||withLegs.length===people.length)return people;
  const floor=Math.max(...withLegs.map(p=>p.y1));
  return people.map(p=>{if(legs(p)||p.y1>=floor)return p;
    // the legs would be below the shoulders (or the middle of the box when they weren't found)
    const ls=p.kp[5],rs=p.kp[6],w=p.x1-p.x0,[a,b]=ls.s>KP_SEEN&&rs.s>KP_SEEN?[Math.min(ls.x,rs.x),Math.max(ls.x,rs.x)]:[p.x0+w*.2,p.x1-w*.2];
    const inFront=people.some(q=>q!==p&&q.y1>p.y1&&q.y0<floor&&(Math.min(b,q.x1)-Math.max(a,q.x0))>(b-a)*FRONT_COVER);
    return inFront?p:{...p,y1:floor,h0:p.y1-p.y0}})} // h0: the found height, which sets the head margin
async function findPeople(c,progress){
  if(!poseModel)return[];
  const W=c.width,H=c.height,ar=W/H,wide=ar>1.15||ar<.87,side=Math.min(W,H),len=Math.max(W,H),n=wide?Math.max(2,Math.ceil((len-side)/(side*.5))+1):0;
  const step=()=>progress("Finding people (pass "+detectPasses+" of "+(2+n)+")…");
  let all=await detectIn(c,0,0,W,H,step);
  // people cut off by the photo's edge are easy to miss, so look again with grey margins added
  {const px=Math.round(W*.18),py=Math.round(H*.08),pc=mk(W+2*px,H+2*py);
   const g=pc.getContext("2d");g.fillStyle="#7f7f7f";g.fillRect(0,0,pc.width,pc.height);g.drawImage(c,px,py);
   for(const p of await detectIn(pc,0,0,pc.width,pc.height,step)){p.kp.forEach(q=>{q.x-=px;q.y-=py});p.x0-=px;p.x1-=px;p.y0-=py;p.y1-=py;
     if(p.x1>0&&p.x0<W)all.push(p)}}
  // wide or tall photos (groups): also look in overlapping windows so nobody at the edges is missed
  if(wide){const land=ar>1,stp=(len-side)/(n-1);
    for(let t=0;t<n;t++){const o=t*stp;all=all.concat(await detectIn(c,land?o:0,land?0:o,land?side:W,land?H:side,step))}}
  // merge duplicates found in more than one window: keep the stronger detection
  all.sort((a,b)=>b.score-a.score);const kept=[];
  const iou=(a,b)=>{const ix=Math.max(0,Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)),iy=Math.max(0,Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0)),I=ix*iy;return I/(a.area+b.area-I)};
  // people in groups overlap (arms round shoulders), so judge duplicates by where the head and shoulders are
  const core=p=>{const pts=[0,1,2,3,4,5,6].map(i=>p.kp[i]).filter(q=>q.s>.2);if(!pts.length)return null;
    const ls=p.kp[5],rs=p.kp[6],sw=ls.s>.2&&rs.s>.2?Math.hypot(ls.x-rs.x,ls.y-rs.y):Math.max(8,(p.x1-p.x0)*.3);
    return{x:pts.reduce((a,q)=>a+q.x,0)/pts.length,y:pts.reduce((a,q)=>a+q.y,0)/pts.length,sw}};
  const same=(a,b)=>{const ca=core(a),cb=core(b);if(ca&&cb)return Math.hypot(ca.x-cb.x,ca.y-cb.y)<Math.min(ca.sw,cb.sw)*.55;return iou(a,b)>.6};
  for(const p of all)if(!kept.some(k=>same(k,p)))kept.push(p);
  if(!kept.length){report("Photo","detections",all.length+" raw → 0");return kept}
  // drop tiny people far behind the main subjects (crowds)
  const big=Math.max(...kept.map(p=>p.y1-p.y0)),front=extendLegs(kept.filter(p=>(p.y1-p.y0)>=big*.35));
  report("Photo","detections",all.length+" raw → "+kept.length+" merged → "+front.length+" after crowd filter");
  return front.map(p=>{const bw=p.x1-p.x0,bh=p.y1-p.y0,head=Math.max(bw*.35,(p.h0||bh)*.16);
    return{x0:Math.max(0,p.x0-bw*.22-head*.3),x1:Math.min(W,p.x1+bw*.22+head*.3),y0:Math.max(0,p.y0-head*.95),y1:Math.min(H,p.y1+bh*.08),score:p.score,kp:p.kp}});
}
async function selfieMask(c,sx,sy,side){ // returns 256×256 mask canvas for a square region
  const m=mk(256,256),crop=mk(256,256),cx=crop.getContext("2d");cx.imageSmoothingQuality="high";
  cx.fillStyle="#808080";cx.fillRect(0,0,256,256);cx.drawImage(c,sx,sy,side,side,0,0,256,256);
  const t=tf.tidy(()=>segModel.execute(tf.browser.fromPixels(crop).toFloat().div(255).expandDims(0)).squeeze());
  const d=await t.data();t.dispose();const mx=m.getContext("2d"),id=mx.createImageData(256,256);
  for(let i=0;i<65536;i++){const v=Math.max(0,Math.min(255,d[i]*255));id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=v;id.data[i*4+3]=255}
  mx.putImageData(id,0,0);return m;
}
// Where a person's body is, from BodyPix (MobileNet 1.0, full body), for the same square region: a 256×256 gate canvas.
// Selfie Segmentation has sharp edges but is tuned for head-and-shoulders shots, so on a seated or full-length person
// it also keeps chairs, car seats, flags and smudges. Multiplying its mask by this gate keeps Selfie's edges only where
// BodyPix agrees a person is near. The gate is BodyPix blurred by GATE_GROW (the blur's spread, as a fraction of the
// region; a box blur 3.5× as wide spreads like a Gaussian of that size), so it reaches a little past BodyPix's coarse
// edge and doesn't cut into hair or fingers Selfie found; GATE_LO is the blurred probability below which it closes.
// Tuned on the NASA test photos: it drops the car seat in seated.jpg, the chair in single.jpg and the flags in group7.jpg.
const BODY_IN=513,GATE_GROW=.025,GATE_LO=.22;
async function bodyGate(c,sx,sy,side){
  const crop=mk(BODY_IN,BODY_IN),cx=crop.getContext("2d");cx.imageSmoothingQuality="high";
  cx.fillStyle="#808080";cx.fillRect(0,0,BODY_IN,BODY_IN);cx.drawImage(c,sx,sy,side,side,0,0,BODY_IN,BODY_IN);
  const k=Math.max(3,Math.round(256*GATE_GROW*3.5)|1);
  const t=tf.tidy(()=>{const x=tf.browser.fromPixels(crop).toFloat().div(127.5).sub(1).expandDims(0);
    const p=tf.image.resizeBilinear(tf.sigmoid(bodyModel.execute(x,"float_segments")),[256,256]);
    return tf.avgPool(p,k,1,"same").sub(GATE_LO).div(.25).clipByValue(0,1).squeeze()});
  const d=await t.data();t.dispose();const m=mk(256,256),mx=m.getContext("2d"),id=mx.createImageData(256,256);
  for(let i=0;i<65536;i++){const v=Math.round(d[i]*255);id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=v;id.data[i*4+3]=255}
  mx.putImageData(id,0,0);return m;
}
// img: canvas or ImageBitmap. progress(text) labels each step; cancelled() lets a newer photo stop this one.
async function segment(img,{progress=()=>{},cancelled=()=>false}={}){
  const say=t=>{if(cancelled())throw new Error("cancelled");progress(t)};
  const c=workCanvas(img,1600),W=c.width,H=c.height;
  const ac=mk(W,H),ax=ac.getContext("2d");ax.fillStyle="#000";ax.fillRect(0,0,W,H);
  detectPasses=0;let t0=performance.now();
  const people=await findPeople(c,say);
  report("Photo","find people",since(t0)+" · "+detectPasses+" passes on "+W+" × "+H);t0=performance.now();
  if(people.length){
    ax.globalCompositeOperation="lighten";ax.imageSmoothingQuality="high";
    for(const[i,p]of people.entries()){
      say("Cutting out person "+(i+1)+" of "+people.length+"…");
      // square crop around each person, padded so the model sees head-and-shoulders framing
      const bw=p.x1-p.x0,bh=p.y1-p.y0,side=Math.max(bw,bh)*1.12,cx=(p.x0+p.x1)/2,cy=(p.y0+p.y1)/2;
      const sx=cx-side/2,sy=cy-side/2,m=await selfieMask(c,sx,sy,side);
      // keep only what falls inside this person's box
      const clip=mk(W,H),kx=clip.getContext("2d");
      kx.globalCompositeOperation="lighten";kx.drawImage(m,sx,sy,side,side);
      // a second, tighter head-and-shoulders pass: the model is tuned for that framing
      const ls=p.kp[5],rs=p.kp[6],face=[0,1,2,3,4].map(i=>p.kp[i]).filter(q=>q.s>.2);
      if(ls.s>.2&&rs.s>.2){const sw=Math.max(Math.hypot(ls.x-rs.x,ls.y-rs.y),...face.length>1?[Math.max(...face.map(q=>q.x))-Math.min(...face.map(q=>q.x))]:[0])*1;
        const hx=(ls.x+rs.x)/2,hy=(ls.y+rs.y)/2-sw*.45,hs=sw*2.9;kx.drawImage(await selfieMask(c,hx-hs/2,hy-hs/2,hs),hx-hs/2,hy-hs/2,hs,hs)}
      if(bodyModel){kx.globalCompositeOperation="multiply";kx.drawImage(await bodyGate(c,sx,sy,side),sx,sy,side,side)}
      kx.globalCompositeOperation="source-over";kx.globalCompositeOperation="destination-in";kx.fillStyle="#fff";kx.fillRect(p.x0,p.y0,bw,bh);
      ax.drawImage(clip,0,0);
    }
    ax.globalCompositeOperation="source-over";
  }else{
    // nobody found: overlapping square tiles across the whole photo
    const side=Math.min(W,H),n=Math.max(1,Math.ceil((Math.max(W,H)-side)/(side*.6))+1),step=n>1?(Math.max(W,H)-side)/(n-1):0;
    ax.globalCompositeOperation="lighten";
    for(let t=0;t<n;t++){say("Cutting out (part "+(t+1)+" of "+n+")…");const ox=W>H?t*step:0,oy=W>H?0:t*step;ax.drawImage(await selfieMask(c,ox,oy,side),ox,oy,side,side)}
    ax.globalCompositeOperation="source-over";
  }
  report("Photo","cut out",since(t0)+(people.length?" · "+people.length+(people.length===1?" person":" people"):" · tiles, nobody found"));
  memory();
  const focus=people.length?(()=>{let x0=Math.min(...people.map(p=>p.x0)),x1=Math.max(...people.map(p=>p.x1)),y0=Math.min(...people.map(p=>p.y0)),y1=Math.max(...people.map(p=>p.y1));
    const mw=(x1-x0)*.12,mh=(y1-y0)*.08;x0=Math.max(0,x0-mw);x1=Math.min(W,x1+mw);y0=Math.max(0,y0-mh);y1=Math.min(H,y1+mh*.5);
    return{x:x0/W,y:y0/H,w:(x1-x0)/W,h:(y1-y0)/H}})():null;
  return{alpha:ac,people:people.length,focus,boxes:people.map(p=>({x:p.x0/W,y:p.y0/H,w:(p.x1-p.x0)/W,h:(p.y1-p.y0)/H}))};
}
return{start,load,segment,extendLegs};
})();
