// ================= Editing: move, scale, erase, undo =================
const out=$("out");
const hist=[],redoStack=[];
const snap=()=>JSON.stringify({fixes:S.fixes,place:S.place,sel:S.sel,gplace:S.gplace,edges:S.edges,deco:S.deco,decoSel:S.decoSel});
function pushHist(){hist.push(snap());if(hist.length>80)hist.shift();redoStack.length=0;histUI()}
function restoreSnap(js){const o=JSON.parse(js);S.fixes=o.fixes;S.place=o.place;S.sel=o.sel;S.gplace=o.gplace;S.edges=o.edges;S.deco=o.deco;S.decoSel=o.decoSel;decoUI();syncScale();restyle()}
function undo(){if(!hist.length)return;redoStack.push(snap());restoreSnap(hist.pop());histUI();say("Undone")}
function redo(){if(!redoStack.length)return;hist.push(snap());restoreSnap(redoStack.pop());histUI();say("Redone")}
function histUI(){$("undo").disabled=!hist.length;$("redo").disabled=!redoStack.length}
function resetEdits(){hist.length=0;redoStack.length=0;S.fixes=[];S.place=[];S.sel=0;S.gplace={dx:0,dy:0,s:1};S.edges=[];S.boxSel=0;S.deco=[];S.decoSel=-1;decoUI();histUI();syncScale()}
$("undo").addEventListener("click",undo);$("redo").addEventListener("click",redo);
document.addEventListener("keydown",e=>{if(!(e.ctrlKey||e.metaKey))return;const k=e.key.toLowerCase();
  if(k==="z"&&!e.shiftKey){e.preventDefault();undo()}else if(k==="y"||(k==="z"&&e.shiftKey)){e.preventDefault();redo()}});
$("resetLayout").addEventListener("click",()=>{const G=S.gplace;if(!S.place.length&&G.s===1&&!G.dx&&!G.dy)return;pushHist();S.place=[];S.gplace={dx:0,dy:0,s:1};syncScale();restyle()});
$("resetFix").addEventListener("click",()=>{if(!S.fixes.length)return;pushHist();S.fixes=[];restyle()});
$("resetBoxes").addEventListener("click",()=>{if(!S.edges.length)return;pushHist();S.edges=[];restyle()});
const place=L=>S.place[L]||(S.place[L]={dx:0,dy:0,s:1});
const cur=()=>S.moveMode==="group"?S.gplace:place(S.sel); // what move, resize, pinch, scroll and Size act on
function syncScale(){const p=S.moveMode==="group"?S.gplace:S.place[S.sel];const v=Math.round((p?p.s:1)*100);$("scale").value=v;$("sizeRead").textContent=v+"%";
  const n=S.view?S.view.layers.length:1;$("sizeLabel").textContent=n<2?"Size":S.moveMode==="group"?"Size of group":"Size of person "+(S.sel+1);syncMoveUI()}
// "Move each" needs two or more people; "Adjust boxes" needs detected people
function syncMoveUI(){const n=S.view?S.view.layers.length:1,nb=(S.boxes||[]).length,m=$("moveMode");
  m.querySelector('[data-v="each"]').hidden=n<2;m.querySelector('[data-v="boxes"]').hidden=!nb;
  if((S.moveMode==="each"&&n<2)||(S.moveMode==="boxes"&&!nb)){setMoveMode("group");return}
  m.hidden=S.tool!=="move"||(n<2&&!nb);$("resetBoxes").hidden=S.tool!=="move"||S.moveMode!=="boxes"}
const brush=$("brush");let brushTimer=0; // the Erase and Restore brush ring (see brushShow)
function setMoveMode(v){S.moveMode=v;$("moveMode").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===v)));syncScale();setTool(S.tool)}
function setTool(v){S.tool=v;brushHide();out.classList.toggle("painting",v!=="move");out.classList.toggle("moving",v==="move");const mv=S.moveMode;
  $("brushGroup").hidden=!(v==="erase"||v==="keep");$("sizeGroup").hidden=v!=="move"||mv==="boxes";
  $("toolHint").textContent=v==="move"?(mv==="boxes"?"Drag a box edge to choose which blocks belong to each person. Blocks outside every box are cropped away.":
      !canMove()?"Pick a world or the 4 × 6 photo to move people around.":
      mv==="each"?"Drag a person to move them on their own. Drag a corner handle, pinch, scroll, or use Size to resize.":
      "Drag to move everyone together. Drag a corner handle, pinch, scroll, or use Size to resize the group."):
    v==="erase"?"Drag over anything that isn't part of a person.":v==="area"?"Tap a leftover patch, like a car seat or a wall, to remove all of it at once.":"Drag over parts of a person that were cut away.";
  syncMoveUI();if(S.result)quick()}
seg("tool",setTool);seg("moveMode",setMoveMode);
$("brushSize").addEventListener("input",e=>{S.brushSize=+e.target.value;$("brushRead").textContent=S.brushSize+(S.brushSize===1?" block":" blocks");brushPreview()});
let scaling=false;
$("scale").addEventListener("input",e=>{if(!canMove()||!S.view)return;if(!scaling){pushHist();scaling=true}cur().s=+e.target.value/100;$("sizeRead").textContent=e.target.value+"%";quick()});
$("scale").addEventListener("change",()=>{scaling=false;restyle()});

function canvasPt(e){const r=out.getBoundingClientRect();return{X:(e.clientX-r.left)/r.width*out.width,Y:(e.clientY-r.top)/r.height*out.height}}
function toGrid(X,Y,Lr){const L=S.layout,P=L.pl(Lr.L);return{gx:Lr.ax+((X-L.ox-P.dx*L.Wpx)/L.cell-Lr.ax)/P.s,gy:Lr.ay+((Y-L.oy-P.dy*L.Hpx)/L.cell-Lr.ay)/P.s}}
function hitLayer(X,Y){const L=S.layout;if(!L||!S.view)return null;const{w,h,lay}=S.view;
  for(let k=L.order.length-1;k>=0;k--){const Lr=L.order[k],g=toGrid(X,Y,Lr),x=Math.floor(g.gx),y=Math.floor(g.gy);if(x>=0&&y>=0&&x<w&&y<h&&lay[y*w+x]===Lr.L)return Lr}
  return null}
function strokePt(X,Y,Lr){const g=toGrid(X,Y,Lr),pad=S.view.pad,{w,h}=S.result;return[(g.gx-pad+S.crop.x0)/w,(g.gy-pad+S.crop.y0)/h]}
function boxHit(X,Y,touch){ // a box edge near the pointer (the selected box wins ties), else the smallest box under it
  const B=S.layout&&S.layout.boxes;if(!B)return null;const tol=(touch?24:12)*out.width/out.getBoundingClientRect().width;let best=null;
  B.forEach(([x0,y0,x1,y1],k)=>{const inY=Y>=y0-tol&&Y<=y1+tol,inX=X>=x0-tol&&X<=x1+tol;
    for(const[ed,d]of[["l",inY?Math.abs(X-x0):1e9],["r",inY?Math.abs(X-x1):1e9],["t",inX?Math.abs(Y-y0):1e9],["b",inX?Math.abs(Y-y1):1e9]]){
      const sc=d-(k===S.boxSel?tol:0);if(d<=tol&&(!best||sc<best.sc))best={k,ed,sc}}});
  if(best)return best;
  let k=-1,area=1e18;B.forEach(([x0,y0,x1,y1],i)=>{const a=(x1-x0)*(y1-y0);if(X>=x0&&X<=x1&&Y>=y0&&Y<=y1&&a<area){area=a;k=i}});
  return k<0?null:{k,ed:null}}
function dragEdge(X,Y,k,ed){ // move one edge of box k to the pointer, keeping the box at least 2 blocks across
  const L=S.layout,R=S.result,C=S.crop,p=S.view.pad,gx=((X-L.ox)/L.cell-p+C.x0)/R.w,gy=((Y-L.oy)/L.cell-p+C.y0)/R.h;
  const b=effBoxes()[k],mx=2/R.w,my=2/R.h,cl=(v,a,z)=>Math.max(a,Math.min(z,v));let x0=b.x,y0=b.y,x1=b.x+b.w,y1=b.y+b.h;
  if(ed==="l")x0=cl(gx,0,x1-mx);else if(ed==="r")x1=cl(gx,x0+mx,1);else if(ed==="t")y0=cl(gy,0,y1-my);else y1=cl(gy,y0+my,1);
  S.edges[k]={x:x0,y:y0,w:x1-x0,h:y1-y0}}

let quickPending=0;
function quick(){cancelAnimationFrame(quickPending);quickPending=requestAnimationFrame(()=>{if(!S.view)return;const P=frameSize();compose(out,...previewSize(P),true)})}
function rebuildQuick(){cancelAnimationFrame(quickPending);quickPending=requestAnimationFrame(()=>{buildView();const P=frameSize();compose(out,...previewSize(P),true)})}

const pointers=new Map();let drag=null;
out.addEventListener("pointerdown",e=>{
  if(!S.view||!S.layout)return;try{out.setPointerCapture(e.pointerId)}catch(_){}const pt=canvasPt(e);pointers.set(e.pointerId,pt);
  if(S.tool==="move"){
    if(S.moveMode==="boxes"){if(pointers.size>1)return;const hit=boxHit(pt.X,pt.Y,e.pointerType==="touch");drag=null;if(!hit)return;
      S.boxSel=hit.k;if(hit.ed)drag={box:true,k:hit.k,ed:hit.ed,pushed:false};quick();return}
    if(pointers.size===2&&drag&&(drag.deco||drag.decoTurn)){const[a,b]=[...pointers.values()],d=selDeco();if(!d)return;if(!drag.pushed)pushHist();
      drag={decoPinch:true,d0:Math.max(10,Math.hypot(a.X-b.X,a.Y-b.Y)),a0:Math.atan2(b.Y-a.Y,b.X-a.X),s0:d.s,r0:d.r,pushed:true};return}
    if(pointers.size===1){const dd=decoDown(pt);if(dd){drag=dd.done?null:dd;return}}
    if(!canMove())return;
    if(pointers.size===2){const[a,b]=[...pointers.values()];const pushed=!!(drag&&drag.pushed);if(!pushed)pushHist();drag={pinch:true,d0:Math.hypot(a.X-b.X,a.Y-b.Y),s0:cur().s,pushed:true};return}
    const sel=S.layout.sel,tol=sel?sel.hs*1.4:0;
    if(sel&&sel.corners.some(([cx,cy])=>Math.abs(pt.X-cx)<=tol&&Math.abs(pt.Y-cy)<=tol)){ // grab a corner to resize
      const p=cur(),d0=Math.max(10,Math.hypot(pt.X-sel.anchor[0],pt.Y-sel.anchor[1]));pushHist();drag={resize:true,anchor:sel.anchor,d0,s0:p.s,pushed:true};return}
    const Lr=hitLayer(pt.X,pt.Y);if(!Lr){drag=null;return}
    S.sel=Lr.L;syncScale();const p=cur();drag={X:pt.X,Y:pt.Y,dx:p.dx,dy:p.dy,pushed:false};quick();return}
  const Lr=hitLayer(pt.X,pt.Y)||S.layout.order.find(l=>l.L===S.sel)||S.layout.order[0];if(!Lr)return;
  pushHist();
  if(S.tool==="area"){const q=strokePt(pt.X,pt.Y,Lr);S.fixes.push({t:"area",x:q[0],y:q[1]});restyle();return}
  drag={stroke:{t:S.tool,L:Lr.L,r:S.brushSize*.75,pts:[strokePt(pt.X,pt.Y,Lr)]},Lr};S.fixes.push(drag.stroke);rebuildQuick();
});
out.addEventListener("pointermove",e=>{
  const pt=canvasPt(e);
  if(pointers.has(e.pointerId))pointers.set(e.pointerId,pt);
  if(drag&&(drag.deco||drag.decoTurn)&&pointers.size<2){decoMove(drag,pt);return}
  if(drag&&drag.decoPinch&&pointers.size===2){const[a,b]=[...pointers.values()],d=selDeco();if(d){d.s=drag.s0*Math.hypot(a.X-b.X,a.Y-b.Y)/drag.d0;d.r=drag.r0+Math.atan2(b.Y-a.Y,b.X-a.X)-drag.a0;clampDeco(d);decoUI();quick()}return}
  if(drag&&drag.box){if(!drag.pushed){pushHist();drag.pushed=true}dragEdge(pt.X,pt.Y,drag.k,drag.ed);rebuildQuick();return}
  if(drag&&drag.pinch&&pointers.size===2){const[a,b]=[...pointers.values()];cur().s=Math.max(.25,Math.min(2.5,drag.s0*Math.hypot(a.X-b.X,a.Y-b.Y)/Math.max(10,drag.d0)));syncScale();quick();return}
  if(drag&&drag.resize){cur().s=Math.max(.25,Math.min(2.5,drag.s0*Math.hypot(pt.X-drag.anchor[0],pt.Y-drag.anchor[1])/drag.d0));syncScale();quick();return}
  if(drag&&drag.stroke){drag.stroke.pts.push(strokePt(pt.X,pt.Y,drag.Lr));rebuildQuick();return}
  if(drag&&S.tool==="move"&&pointers.size===1&&!drag.pinch&&!drag.resize){if(!drag.pushed){if(Math.hypot(pt.X-drag.X,pt.Y-drag.Y)<3)return;pushHist();drag.pushed=true}
    const p=cur();p.dx=drag.dx+(pt.X-drag.X)/S.layout.Wpx;p.dy=drag.dy+(pt.Y-drag.Y)/S.layout.Hpx;quick();return}
  if(!S.view||!S.layout)return;
  if(S.tool==="move"&&S.moveMode==="boxes"){const hit=boxHit(pt.X,pt.Y,e.pointerType==="touch");out.style.cursor=hit&&hit.ed?(hit.ed==="l"||hit.ed==="r"?"ew-resize":"ns-resize"):""}
  else if(S.tool==="move"&&S.layout.deco&&[S.layout.deco.turn,S.layout.deco.del].some(p=>Math.hypot(pt.X-p[0],pt.Y-p[1])<=S.layout.deco.hs*1.2))out.style.cursor="pointer";
  else if(S.tool==="move"&&decoAt(pt.X,pt.Y)>=0)out.style.cursor="move";
  else if(S.tool==="move"){const sel=S.layout.sel,tol=sel?sel.hs*1.4:0,k=sel?sel.corners.findIndex(([cx,cy])=>Math.abs(pt.X-cx)<=tol&&Math.abs(pt.Y-cy)<=tol):-1;
    out.style.cursor=k<0?"":(k===0||k===3?"nwse-resize":"nesw-resize")}
  const di=decoAt(pt.X,pt.Y);if(di>=0){$("hover").textContent=DECO_LIST[S.deco[di].k][1];return}
  const Lr=hitLayer(pt.X,pt.Y);
  if(!Lr){$("hover").textContent="";return}const g=toGrid(pt.X,pt.Y,Lr),v=S.view.cells[Math.floor(g.gy)*S.view.w+Math.floor(g.gx)];
  $("hover").innerHTML=v>=0?"<strong>"+ST().palette[v].name+"</strong>"+(S.view.layers.length>1?" · person "+(Lr.L+1):""):"";
});
// The brush ring: where an Erase or Restore stroke will go, and how big it is. Its radius is the stroke's (brushSize × .75
// cells of the person it lands on, at that person's size). Mouse and pen show it while hovering; touch while painting.
const brushTool=()=>S.tool==="erase"||S.tool==="keep";
function brushHide(){clearTimeout(brushTimer);brush.hidden=true;out.classList.remove("brushing")}
function brushShow(cx,cy,X,Y){const L=S.layout;if(!brushTool()||!L||!S.view){brushHide();return}
  const Lr=hitLayer(X,Y)||L.order.find(l=>l.L===S.sel)||L.order[0];if(!Lr){brushHide();return}
  const r=out.getBoundingClientRect(),f=frame.getBoundingClientRect(),d=2*S.brushSize*.75*L.cell*L.pl(Lr.L).s*r.width/out.width;
  brush.classList.toggle("keep",S.tool==="keep");Object.assign(brush.style,{left:(cx-f.left)+"px",top:(cy-f.top)+"px",width:d+"px",height:d+"px"});brush.hidden=false}
function brushAt(e){if(e.pointerType==="touch"&&!pointers.has(e.pointerId)){brushHide();return}clearTimeout(brushTimer);const pt=canvasPt(e);brushShow(e.clientX,e.clientY,pt.X,pt.Y);
  out.classList.toggle("brushing",!brush.hidden&&e.pointerType!=="touch")}
// moving the Brush slider shows the new size in the middle of the picture for a moment
function brushPreview(){const r=out.getBoundingClientRect();brushShow(r.left+r.width/2,r.top+r.height/2,out.width/2,out.height/2);clearTimeout(brushTimer);brushTimer=setTimeout(brushHide,1200)}
out.addEventListener("pointerdown",brushAt);out.addEventListener("pointermove",brushAt);out.addEventListener("pointerleave",brushHide);
function endPointer(e){pointers.delete(e.pointerId);if(e.pointerType==="touch")brushHide();if(pointers.size)return;if(drag){const was=drag;drag=null;if(was.pushed||was.stroke||was.pinch)restyle()}}
["pointerup","pointercancel"].forEach(t=>out.addEventListener(t,endPointer));
out.addEventListener("wheel",e=>{if(S.tool!=="move"||S.moveMode==="boxes"||!S.view)return;const pt=canvasPt(e),di=decoAt(pt.X,pt.Y);
  if(di>=0&&di===S.decoSel){e.preventDefault();if(!scaling){pushHist();scaling=true}clearTimeout(out._wt);out._wt=setTimeout(()=>{scaling=false;restyle()},350);
    const d=selDeco();d.s*=Math.exp(-e.deltaY*.0015);clampDeco(d);decoUI();quick();return}
  if(!canMove())return;e.preventDefault();const Lr=hitLayer(pt.X,pt.Y);if(Lr)S.sel=Lr.L;
  if(!scaling){pushHist();scaling=true}clearTimeout(out._wt);out._wt=setTimeout(()=>{scaling=false;restyle()},350);
  const p=cur();p.s=Math.max(.25,Math.min(2.5,p.s*Math.exp(-e.deltaY*.0015)));syncScale();quick()},{passive:false});

const peek=$("peek"),orig=$("orig");
const show=v=>{if(!S.layout||!S.src)return;if(v){const r=out.getBoundingClientRect(),f=frame.getBoundingClientRect(),L=S.layout,p=S.view.pad,k=r.width/out.width;
  const C=S.crop,R=S.result,gw=R.w,gh=R.h;Object.assign(orig.style,{left:(r.left-f.left+(L.ox+(p-C.x0)*L.cell)*k)+"px",top:(r.top-f.top+(L.oy+(p-C.y0)*L.cell)*k)+"px",width:(gw*L.cell*k)+"px",height:(gh*L.cell*k)+"px",clipPath:"inset("+(C.y0/gh*100)+"% "+((gw-1-C.x1)/gw*100)+"% "+((gh-1-C.y1)/gh*100)+"% "+(C.x0/gw*100)+"%)"})}orig.hidden=!v};
peek.addEventListener("pointerdown",()=>show(true));["pointerup","pointerleave","pointercancel"].forEach(t=>peek.addEventListener(t,()=>show(false)));
peek.addEventListener("keydown",e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();show(true)}});peek.addEventListener("keyup",()=>show(false));
