// ================= Sheet + UI =================
const fmt=n=>n.toLocaleString("en-US");
function stacks(n){const s=Math.floor(n/64),r=n%64;if(!s)return r+" blocks";return s+(s===1?" stack":" stacks")+(r?" + "+r:"")}
function counts(){const m=new Map();for(const v of S.view.cells)if(v>=0)m.set(v,(m.get(v)||0)+1);return[...m.entries()].sort((a,b)=>b[1]-a[1])}
function renderMaterials(list,total){
  const st=ST(),inv=$("inv");inv.textContent="";$("mTitle").textContent=st.title;
  $("mSum").textContent=list.length+" "+st.kinds+" · "+fmt(total)+" "+st.units+(st.extra?" · "+st.extra(total):"");
  for(const[id,n]of list){const b=st.palette[id],it=document.createElement("div");it.className="item";
    const slot=document.createElement("div");slot.className="slot";const c=document.createElement("canvas");c.width=c.height=16;c.getContext("2d").drawImage(b.canvas,0,0);
    const badge=document.createElement("b");badge.textContent=n>999?Math.round(n/100)/10+"k":n;slot.append(c,badge);
    const txt=document.createElement("div"),nm=document.createElement("div"),am=document.createElement("div");nm.className="nm";nm.textContent=b.name;am.className="st";am.textContent=st.amount(n);
    txt.append(nm,am);it.append(slot,txt);inv.append(it)}}
function renderSheet(P,canvas,scale,art,paper){
  const sticker=P.media==="sticker",SW=sticker?SHEET.w:P.win,SH=sticker?SHEET.h:P.hin,L=P.layout;
  canvas.width=Math.round(SW*scale);canvas.height=Math.round(SH*scale);const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);if(paper){ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height)}
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  if(!sticker){ctx.drawImage(art,0,0,canvas.width,canvas.height);return 1}
  const sw=L.rot?P.hin:P.win,sh=L.rot?P.win:P.hin,cols=Math.min(L.cols,L.n),rows=Math.ceil(L.n/cols);
  const ox=(SW-(cols*sw+(cols-1)*SHEET.gap))/2,oy=(SH-(rows*sh+(rows-1)*SHEET.gap))/2;
  for(let i=0;i<L.n;i++){const c=i%cols,r=Math.floor(i/cols),x=(ox+c*(sw+SHEET.gap))*scale,y=(oy+r*(sh+SHEET.gap))*scale;
    if(L.rot){ctx.save();ctx.translate(x+sw*scale,y);ctx.rotate(Math.PI/2);ctx.drawImage(art,0,0,P.win*scale,P.hin*scale);ctx.restore()}
    else ctx.drawImage(art,x,y,P.win*scale,P.hin*scale)}
  return L.n;
}
function renderSteps(P){
  const ol=$("steps");ol.textContent="";const scene=S.scene!=="none";
  const items=P.media==="sticker"?[
    "Save the sticker PNG here. It is tagged at 300 dpi"+(scene?".":" and has a transparent background, so the blade follows the people's outline."),
    "In Cricut Design Space, start a StickerPix Print + Cut project and upload the PNG.",
    "Set the width to "+P.win.toFixed(2)+" in with the size lock on.",
    P.copies>1?"Set the project quantity (or duplicate the image) to "+P.copies+", then send it to the machine. It prints all "+P.copies+" on one sheet and kiss-cuts each one.":"Send it to the machine. It prints the sticker and kiss-cuts around it."
  ]:[
    "Save the 4 × 6 photo PNG here ("+(P.win*DPI)+" × "+(P.hin*DPI)+" px at 300 dpi).",
    "In Cricut Design Space, choose a StickerPix photo print and upload the PNG.",
    "Size it to the full 4 × 6 in print and send it to the machine with a photo sheet loaded."];
  for(const t of items){const li=document.createElement("li");li.textContent=t;ol.append(li)}
}
function previewSize(P){const long=1100,ar=P.win/P.hin;return ar>=1?[long,Math.round(long/ar)]:[Math.round(long*ar),long]}
function redraw(){
  buildView(true);const P=frameSize(),[pw,ph]=previewSize(P),out=$("out");
  compose(out,pw,ph,true);describeOut();
  const list=counts(),total=list.reduce((a,b)=>a+b[1],0);
  if(!ST().photo){const{w:vw,cells}=S.view;let pairs=0,diff=0;for(let i=0;i<cells.length;i++){if(cells[i]<0)continue;
    for(const j of[i%vw<vw-1?i+1:-1,i+vw])if(j>=0&&j<cells.length&&cells[j]>=0){pairs++;if(cells[j]!==cells[i])diff++}}
   mark("Photo","busyness",(pairs?Math.round(diff/pairs*100):0)+"% of neighbouring cells differ · "+list.length+" "+ST().kinds+" · "+S.look)}
  if(!ST().photo){const{w:rw,h:rh,grid,lab,alpha,hasAlpha}=S.result,pal=ST().palette;let n=0,t=0;
   for(let i=0;i<rw*rh;i++)if(!hasAlpha||alpha[i]>=.42){t+=deltaE00([lab[i*3],lab[i*3+1],lab[i*3+2]],pal[grid[i]].lab);n++}
   mark("Photo","color error",(n?(t/n).toFixed(1):"0")+" ΔE2000 mean (cell color vs its block)")}
  $("dims").innerHTML="<strong>"+S.result.w+" × "+S.result.h+"</strong> "+ST().units+" · "+fmt(total)+" in the people";
  renderMaterials(list,total);
  const bpx=Math.min(P.win*DPI/S.view.w,P.hin*DPI/S.view.h);
  $("printRead").textContent=P.win.toFixed(2)+" × "+P.hin.toFixed(2)+" in · "+Math.round(P.win*DPI)+" × "+Math.round(P.hin*DPI)+" px\neach person "+ST().unit+" "+(bpx/DPI*25.4).toFixed(2)+" mm ("+bpx.toFixed(1)+" px)";
  $("inRead").textContent=P.win.toFixed(2)+" in";
  const warns=[];if(P.capped)warns.push("This picture is tall, so its width was reduced to fit the 7.68 in sheet.");
  const st=ST();if(st.minPx&&bpx<st.minPx)warns.push(st.units[0].toUpperCase()+st.units.slice(1)+" under "+st.minPx+" px lose their "+(st.textured?"texture":"shape")+
    " in print. Lower the detail or make the sticker wider.");
  $("printWarn").hidden=!warns.length;$("printWarn").textContent=warns.join(" ");
  const n=renderSheet(P,$("sheet"),40,out,true);
  $("sheetLabel").textContent=P.media==="sticker"?"Sheet 3.94 × 7.68 in":"Photo "+P.win+" × "+P.hin+" in";
  $("sheetRead").textContent=P.media==="sticker"?n+(n===1?" sticker":" stickers")+" per sheet":"1 photo";
  $("saveSticker").textContent=P.media==="sticker"?"Save sticker":"Save 4 × 6 photo";$("saveSheet").hidden=P.media!=="sticker";
  renderSteps(P);syncScale();backdropThumbs();
  mark("Print","piece",P.media+" "+P.win.toFixed(2)+" × "+P.hin.toFixed(2)+" in · "+Math.round(P.win*DPI)+" × "+Math.round(P.hin*DPI)+" px");
  if(P.media==="sticker")mark("Print","sheet",n+" up · "+P.layout.cols+" × "+P.layout.rows+(P.layout.rot?" rotated":"")+" · margin "+SHEET.margin+" in, gap "+SHEET.gap+" in");
  else DIAG.get("Print").delete("sheet");
}
let pending=0;
function run(){if(!S.src)return;$("busy").hidden=false;cancelAnimationFrame(pending);
  pending=requestAnimationFrame(()=>setTimeout(()=>{const t=performance.now();convert();redraw();$("busy").hidden=true;
    mark("Photo","blocks",S.result.w+" × "+S.result.h+" · "+since(t))},0))}
function restyle(){if(!S.result)return;$("busy").textContent=isWorld(S.scene)&&!meshes[S.scene]?"Building world…":"Placing blocks…";$("busy").hidden=false;cancelAnimationFrame(pending);pending=requestAnimationFrame(()=>setTimeout(()=>{redraw();$("busy").hidden=true},0))}
