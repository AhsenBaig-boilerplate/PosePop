// ================= Emoji on the picture =================
// Emoji stickers on top of the people and the world: Noto Emoji as vector SVG (the build's DECO list), so they print
// sharp at 300 dpi. Each one is {k (DECO_LIST index), x, y (centre, fractions of the picture), s (size, fraction of
// its shorter side), r (turn, radians)}; S.deco is drawn in order, so the last is on top. They are part of the edits:
// undo covers them, and a new photo or a kiosk reset clears them. They don't depend on the style, world or tool
// mode, and on a cut-out sticker they get the same white border as the people, so the cut line goes round them.
const DECO_LIST=__DECO__; // [[name, label, file]]
const DECO_SIZE=[.04,1.2],DECO_START=.22,DECO_STEP=.01,DECO_STEP_BIG=.05,DECO_TURN=Math.PI/12;
const decoImgs=[];
DECO_LIST.forEach(([name,label,file],k)=>{const b=document.createElement("button"),im=document.createElement("img");
  b.className="emo";b.type="button";b.setAttribute("aria-label","Add "+label);b.title=label;
  im.alt="";im.width=im.height=36;im.loading="lazy";im.decoding="async";im.src=file;b.append(im);decoImgs[k]=im;
  b.addEventListener("click",()=>addDeco(k));$("decoPick").append(b)});
// an image that isn't loaded yet (lazy in a closed tab) is drawn as soon as it arrives
function decoImg(k){const im=decoImgs[k];if(im.complete&&im.naturalWidth)return im;
  if(!im._wait){im._wait=1;im.loading="eager";im.addEventListener("load",()=>restyle(),{once:true})}return null}
function addDeco(k){pushHist();const n=S.deco.length,a=n*2.4,f=Math.min(1,n); // later ones spiral out from the first
  S.deco.push({k,x:.5+.2*f*Math.cos(a),y:.28+.14*f*Math.sin(a),s:DECO_START,r:0});S.decoSel=S.deco.length-1;
  decoUI();restyle();say(DECO_LIST[k][1]+" added")}
function removeDeco(i){const d=S.deco[i];if(!d)return;pushHist();S.deco.splice(i,1);S.decoSel=-1;decoUI();restyle();say(DECO_LIST[d.k][1]+" removed")}
const selDeco=()=>S.deco[S.decoSel]||null;
const clampDeco=d=>{d.x=Math.max(0,Math.min(1,d.x));d.y=Math.max(0,Math.min(1,d.y));d.s=Math.max(DECO_SIZE[0],Math.min(DECO_SIZE[1],d.s));
  d.r=Math.atan2(Math.sin(d.r),Math.cos(d.r))};
// the panel's controls follow the selected emoji
function decoUI(){const d=selDeco();$("decoEdit").hidden=!d;$("decoClear").hidden=!S.deco.length;if(!d)return;
  const sz=Math.round(d.s*100),deg=Math.round(d.r*180/Math.PI);$("decoSize").value=sz;$("decoSizeRead").textContent=sz+"%";
  $("decoTurn").value=deg;$("decoTurnRead").textContent=deg+"°";$("decoName").textContent=DECO_LIST[d.k][1]}
let decoSliding=false;
for(const[id,set]of[["decoSize",(d,v)=>d.s=v/100],["decoTurn",(d,v)=>d.r=v*Math.PI/180]]){
  $(id).addEventListener("input",e=>{const d=selDeco();if(!d)return;if(!decoSliding){pushHist();decoSliding=true}set(d,+e.target.value);clampDeco(d);decoUI();quick()});
  $(id).addEventListener("change",()=>{decoSliding=false;restyle()})}
$("decoRemove").addEventListener("click",()=>removeDeco(S.decoSel));
$("decoFront").addEventListener("click",()=>{const d=selDeco();if(!d||S.decoSel===S.deco.length-1)return;pushHist();S.deco.splice(S.decoSel,1);S.deco.push(d);S.decoSel=S.deco.length-1;restyle()});
$("decoClear").addEventListener("click",()=>{if(!S.deco.length)return;pushHist();S.deco=[];S.decoSel=-1;decoUI();restyle();say("All emoji removed")});

// drawing, called by compose() after the people. Outlines (a cut-out sticker's white border) go under every emoji first.
function drawDeco(ctx,Wpx,Hpx,outline){const m=Math.min(Wpx,Hpx),list=S.deco.map(d=>({d,im:decoImg(d.k),z:d.s*m})).filter(o=>o.im);
  const at=(o,f)=>{ctx.save();ctx.translate(o.d.x*Wpx,o.d.y*Hpx);ctx.rotate(o.d.r);f();ctx.restore()};
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  if(outline>0)for(const o of list){const p=Math.ceil(outline)+2,c=document.createElement("canvas");c.width=c.height=Math.ceil(o.z)+2*p;
    const x=c.getContext("2d");x.drawImage(o.im,p,p,o.z,o.z);x.globalCompositeOperation="source-in";x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);
    at(o,()=>{for(let k=0;k<16;k++){const t=k/16*2*Math.PI;ctx.drawImage(c,-o.z/2-p+Math.cos(t)*outline,-o.z/2-p+Math.sin(t)*outline)}})}
  for(const o of list)at(o,()=>ctx.drawImage(o.im,-o.z/2,-o.z/2,o.z,o.z))}
// the selected emoji's frame, with a round handle (drag to resize and turn) and a remove button; kept on the canvas
function drawDecoSel(ctx,Wpx,Hpx){const d=selDeco();S.layout.deco=null;if(!d)return;
  const z=d.s*Math.min(Wpx,Hpx),hs=handlePx(ctx.canvas,HANDLE_CSS+6),u=hs/(HANDLE_CSS+6),half=z/2+hs*.4,cx=d.x*Wpx,cy=d.y*Hpx,c=Math.cos(d.r),s=Math.sin(d.r);
  const pt=(lx,ly)=>[Math.max(hs,Math.min(Wpx-hs,cx+lx*c-ly*s)),Math.max(hs,Math.min(Hpx-hs,cy+lx*s+ly*c))],turn=pt(half,half),del=pt(half,-half);
  ctx.save();ctx.translate(cx,cy);ctx.rotate(d.r);ctx.setLineDash([8*u,6*u]);ctx.lineWidth=2*u;ctx.strokeStyle="rgba(255,255,255,.95)";ctx.strokeRect(-half,-half,2*half,2*half);
  ctx.strokeStyle="rgba(0,0,0,.6)";ctx.lineDashOffset=7*u;ctx.strokeRect(-half,-half,2*half,2*half);ctx.restore();
  const dot=([x,y],fill)=>{ctx.beginPath();ctx.arc(x,y,hs*.6,0,2*Math.PI);ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=2*u;ctx.strokeStyle="rgba(0,0,0,.75)";ctx.stroke()};
  dot(turn,"#ffffff");const ar=hs*.28,a1=5.3;ctx.beginPath();ctx.arc(turn[0],turn[1],ar,.4,a1);ctx.strokeStyle="#000";ctx.lineWidth=2*u;ctx.stroke(); // a turn arrow
  const tx=turn[0]+ar*Math.cos(a1),ty=turn[1]+ar*Math.sin(a1),q2=hs*.16;ctx.beginPath();ctx.moveTo(tx+q2,ty+q2*.2);ctx.lineTo(tx-q2*.3,ty-q2);ctx.lineTo(tx-q2*.6,ty+q2*.7);ctx.closePath();ctx.fillStyle="#000";ctx.fill();
  dot(del,"#d93c3c");ctx.strokeStyle="#fff";ctx.lineWidth=2.5*u;const q=hs*.22;ctx.beginPath();
  ctx.moveTo(del[0]-q,del[1]-q);ctx.lineTo(del[0]+q,del[1]+q);ctx.moveTo(del[0]+q,del[1]-q);ctx.lineTo(del[0]-q,del[1]+q);ctx.stroke();
  S.layout.deco={turn,del,hs,cx,cy}}
// the top emoji under a canvas point, or -1
function decoAt(X,Y){const L=S.layout;if(!L)return-1;const m=Math.min(L.Wpx,L.Hpx);
  for(let i=S.deco.length-1;i>=0;i--){const d=S.deco[i],dx=X-d.x*L.Wpx,dy=Y-d.y*L.Hpx,c=Math.cos(-d.r),s=Math.sin(-d.r),h=d.s*m/2;
    if(Math.abs(dx*c-dy*s)<=h&&Math.abs(dx*s+dy*c)<=h)return i}
  return-1}
// pointer down with the Move tool: the drag to start for an emoji (or {done} after a tap on remove), else null.
// A handle wins only when the press is nearer to it than to the emoji's centre, so a small emoji can still be dragged
// on a phone, where the handles are big.
function decoDown(pt){const H=S.layout.deco,dist=p=>Math.hypot(pt.X-p[0],pt.Y-p[1]),near=p=>H&&dist(p)<=H.hs*1.2&&dist(p)<dist([H.cx,H.cy]);
  if(near(H&&H.del)){removeDeco(S.decoSel);return{done:true}}
  const d=selDeco();
  if(d&&near(H.turn))return{decoTurn:true,c:[H.cx,H.cy],a0:Math.atan2(pt.Y-H.cy,pt.X-H.cx),d0:Math.max(10,Math.hypot(pt.X-H.cx,pt.Y-H.cy)),r0:d.r,s0:d.s,pushed:false};
  const i=decoAt(pt.X,pt.Y);
  if(i<0){if(S.decoSel>=0){S.decoSel=-1;decoUI();quick()}return null}
  S.decoSel=i;decoUI();quick();return{deco:true,X:pt.X,Y:pt.Y,x:S.deco[i].x,y:S.deco[i].y,pushed:false}}
function decoMove(dr,pt){const d=selDeco();if(!d)return;
  if(!dr.pushed){if(dr.deco&&Math.hypot(pt.X-dr.X,pt.Y-dr.Y)<3)return;pushHist();dr.pushed=true}
  if(dr.deco){d.x=dr.x+(pt.X-dr.X)/S.layout.Wpx;d.y=dr.y+(pt.Y-dr.Y)/S.layout.Hpx}
  else{d.r=dr.r0+Math.atan2(pt.Y-dr.c[1],pt.X-dr.c[0])-dr.a0;d.s=dr.s0*Math.hypot(pt.X-dr.c[0],pt.Y-dr.c[1])/dr.d0}
  clampDeco(d);decoUI();quick()}
