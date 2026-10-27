// ================= Backdrop key (green or blue screen) =================
// With a coloured screen behind people, keying out that colour gives a sharper cut-out than the detector, legs and
// seated people included. Detection still finds and separates the people, and anything outside their boxes (floor,
// the screen's edges, lights) is dropped. The screen colour is the most common strongly green or blue hue in the
// photo, so a white frame or a light stand doesn't confuse it. Screen-coloured fringes are removed from the edges
// (despill). Like any chroma key, clothing in the screen's own colour is keyed out too.
S.key={on:false,tol:5};
// KEY_MIN_COVER (in 007-pure-functions.js): share of the photo the screen colour must cover; tolerance 1–10 sets how much near-screen colour goes
// KEY_CLOTHES: share of what the detector is sure is a person that the key would remove, above which the people
// probably wear the screen's colour
const KEY_CLOTHES=.45;
function chromaKey(img,boxes,tol,mlMask){
  const W=img.naturalWidth||img.width,H=img.naturalHeight||img.height,c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(img,0,0);const id=x.getImageData(0,0,W,H),d=id.data,k=keyColor(d);if(!k)return null;
  const a=document.createElement("canvas");a.width=W;a.height=H;const ax=a.getContext("2d"),ad=ax.createImageData(W,H),A=ad.data;
  // people's boxes, a little larger, in pixels: everything outside them is backdrop
  const bx=(boxes||[]).map(b=>{const mx=b.w*.06*W,my=b.h*.04*H;return[b.x*W-mx,b.y*H-my,(b.x+b.w)*W+mx,(b.y+b.h)*H+my]});
  // the detector's own mask at this size, to notice clothes in the screen's colour
  let ml=null;if(mlMask){const m=document.createElement("canvas");m.width=W;m.height=H;const mx=m.getContext("2d",{willReadFrequently:true});mx.drawImage(mlMask,0,0,W,H);ml=mx.getImageData(0,0,W,H).data}
  const lo=4+tol*2.2,hi=lo+16;let kept=0,sure=0,sureKeyed=0;
  for(let y=0,i=0;y<H;y++)for(let X=0;X<W;X++,i+=4){
    const r=d[i],g=d[i+1],b=d[i+2],[cb,cr]=ycc(r,g,b),dist=Math.hypot(cb-k.cb,cr-k.cr);
    let t=dist<=lo?0:dist>=hi?1:((dist-lo)/(hi-lo))**2*(3-2*(dist-lo)/(hi-lo));
    if(bx.length&&!bx.some(q=>X>=q[0]&&X<=q[2]&&y>=q[1]&&y<=q[3]))t=0;
    if(ml&&ml[i]>200){sure++;if(t<.5)sureKeyed++}
    // despill near the screen colour: the screen's main channel can't exceed the brighter of the other two
    if(t>0&&dist<hi+10){const o=k.main===1?Math.max(r,b):Math.max(r,g);if(d[i+k.main]>o)d[i+k.main]=o}
    const v=Math.round(t*255);A[i]=A[i+1]=A[i+2]=v;A[i+3]=255;if(t>.5)kept++}
  x.putImageData(id,0,0);ax.putImageData(ad,0,0);
  return{src:c,alpha:a,key:k,cover:Math.round((1-kept/(W*H))*100),clothes:sure>500?sureKeyed/sure:0};
}
// S.srcRaw and S.alphaML keep the decoded photo and the detector's mask, so the key can be switched on and off,
// or retuned, without detecting people again
function applyKey(){
  if(!S.srcRaw)return;
  if(!S.key.on){S.src=S.srcRaw;S.alpha=S.alphaML;DIAG.get("Photo").delete("backdrop key");return}
  const t=performance.now(),k=chromaKey(S.srcRaw,S.boxesFull,S.key.tol,S.alphaML);
  if(k){S.src=k.src;S.alpha=k.alpha;$("keyNote").textContent="Screen colour found (rgb "+k.key.rgb.join(", ")+"); "+k.cover+"% of the photo removed."+
      (k.clothes>KEY_CLOTHES?" Careful: "+Math.round(k.clothes*100)+"% of what looks like people matches the screen colour, so clothes in that colour are being cut out. Turn this off for this photo, or lower Screen removal.":"");
    mark("Photo","backdrop key","rgb "+k.key.rgb.join(",")+" · "+k.cover+"% removed · "+since(t))}
  else{S.src=S.srcRaw;S.alpha=S.alphaML;$("keyNote").textContent="No green or blue screen found in this photo, so the cut-out uses person detection.";
    mark("Photo","backdrop key","no screen colour found")}
}
$("keyOn").addEventListener("change",e=>{S.key.on=e.target.checked;$("keyGroup").hidden=!S.key.on;applyKey();if(S.srcRaw)run()});
$("keyTol").addEventListener("input",e=>{S.key.tol=+e.target.value;$("keyRead").textContent=S.key.tol;applyKey();if(S.srcRaw)run()});
