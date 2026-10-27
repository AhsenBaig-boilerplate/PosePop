// ================= Composition =================
const MAXW=SHEET.w-2*SHEET.margin,MAXH=SHEET.h-2*SHEET.margin;
function layoutFor(win,hin,n){ // best grid for n stickers of this size (or as many as fit when n is null)
  let best=null;
  for(const rot of[false,true]){const sw=rot?hin:win,sh=rot?win:hin;
    const cols=Math.floor((MAXW+SHEET.gap+1e-6)/(sw+SHEET.gap)),rows=Math.floor((MAXH+SHEET.gap+1e-6)/(sh+SHEET.gap)),cap=cols*rows;
    if(!cap)continue;const cnt=n?Math.min(n,cap):cap;if(!best||cnt>best.n)best={rot,cols,rows,n:cnt}}
  return best||{rot:false,cols:1,rows:1,n:1};
}
function sizeForCount(n,ar){ // ar = width/height; largest sticker so that n fit
  let best=null;
  for(const rot of[false,true]){const a=rot?1/ar:ar;
    for(let cols=1;cols<=n;cols++){const rows=Math.ceil(n/cols);
      const cw=(MAXW-(cols-1)*SHEET.gap)/cols,ch=(MAXH-(rows-1)*SHEET.gap)/rows;if(cw<=0||ch<=0)continue;
      const pw=Math.min(cw,ch*a),ph=pw/a;if(!best||pw*ph>best.area)best={area:pw*ph,win:rot?ph:pw,hin:rot?pw:ph}}}
  const win=Math.floor(best.win*100)/100,hin=win/ar;return{win,hin};
}
function frameSize(){ // inches of the printed piece
  const{w,h}=S.view;
  if(S.media==="photo"){const land=w>h;return{media:"photo",win:land?6:4,hin:land?4:6,layout:{rot:false,cols:1,rows:1,n:1}}}
  let win,hin,capped=false;
  if(S.count){({win,hin}=sizeForCount(S.count,w/h))}
  else{win=Math.min(S.inches,MAXW);hin=win*h/w;if(hin>MAXH){hin=MAXH;win=hin*w/h;capped=true}}
  const layout=layoutFor(win,hin,S.count||null);
  return{media:"sticker",win,hin,capped,copies:layout.n,layout};
}
// Handles keep one size on screen whatever the canvas is scaled to (it is 1100 px wide but often shown at 300 px on a
// phone), and are bigger on touch screens. Only the preview draws them.
const HANDLE_CSS=matchMedia("(pointer:coarse)").matches?24:14;
const handlePx=(canvas,css)=>{const w=canvas.getBoundingClientRect().width;return Math.round(css*(w?canvas.width/w:1))};
function canMove(){return S.scene!=="none"||S.media==="photo"}
// backgrounds that aren't 3D worlds: the photo's own background, a plain color, or the operator's own image
const BACKDROPS={original:1,color:1,image:1},isWorld=k=>k!=="none"&&!BACKDROPS[k];
function cover(ctx,im,W,H){const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,s=Math.max(W/iw,H/ih);ctx.imageSmoothingQuality="high";ctx.drawImage(im,(W-iw*s)/2,(H-ih*s)/2,iw*s,ih*s)}
// the photo's own background, placed so that people who haven't been moved sit exactly where they were
function drawOriginal(ctx,ox,oy,cell){const im=work().img,iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,R=S.result,C=S.crop,p=S.view.pad,cw=C.x1-C.x0+1,ch=C.y1-C.y0+1;
  ctx.imageSmoothingQuality="high";ctx.drawImage(im,C.x0/R.w*iw,C.y0/R.h*ih,cw/R.w*iw,ch/R.h*ih,ox+p*cell,oy+p*cell,cw*cell,ch*cell)}
// Detector mask with its strength in the alpha channel (it arrives as a grey image), made once per photo.
// The cut-out model is sure about heads and shoulders but often only 30–60 % sure about legs; drawn as is, that
// leaves see-through smudges, so the unsure middle is sharpened (PHOTO_EDGE: below → clear, above → solid).
const PHOTO_EDGE=[.35,.65];
function alphaMask(Wk){if(Wk.alphaA!==undefined)return Wk.alphaA;if(!Wk.alpha)return Wk.alphaA=null;
  const a=Wk.alpha,c=document.createElement("canvas");c.width=a.width;c.height=a.height;const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(a,0,0);
  const d=x.getImageData(0,0,c.width,c.height),[lo,hi]=PHOTO_EDGE;
  for(let i=0;i<d.data.length;i+=4){const t=Math.min(1,Math.max(0,(d.data[i]/255-lo)/(hi-lo)));d.data[i+3]=255*t*t*(3-2*t);d.data[i]=d.data[i+1]=d.data[i+2]=255}
  x.putImageData(d,0,0);return Wk.alphaA=c}
let photoCache=null;
// One person as the real photo: the photo × the detector's soft mask × this person's cells. The cells are grown by
// one into empty space, so the photo's own soft edge decides the outline, while splits between people and erasing
// follow the cells. Kept to the person's own box so a group stays light on memory.
function photoLayer(Lr){
  if(!photoCache||photoCache.view!==S.view)photoCache={view:S.view,m:new Map()};
  if(photoCache.m.has(Lr.L))return photoCache.m.get(Lr.L);
  const Wk=work(),im=Wk.img,iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,R=S.result,C=S.crop,{w:vw,h:vh,cells,lay,pad:p}=S.view,e=Lr.e;
  const x0=Math.max(0,e.x0-1),y0=Math.max(0,e.y0-1),x1=Math.min(vw-1,e.x1+1),y1=Math.min(vh-1,e.y1+1),mw=x1-x0+1,mh=y1-y0+1;
  const own=i=>cells[i]>=0&&lay[i]===Lr.L,mc=document.createElement("canvas");mc.width=mw;mc.height=mh;const mx=mc.getContext("2d"),md=mx.createImageData(mw,mh);
  for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){const vx=x0+x,vy=y0+y,i=vy*vw+vx;
    const on=own(i)||(cells[i]<0&&((vx>0&&own(i-1))||(vx<vw-1&&own(i+1))||(vy>0&&own(i-vw))||(vy<vh-1&&own(i+vw))));md.data[(y*mw+x)*4+3]=on?255:0}
  mx.putImageData(md,0,0);
  const sx=(x0-p+C.x0)/R.w*iw,sy=(y0-p+C.y0)/R.h*ih,sw=mw/R.w*iw,sh=mh/R.h*ih,ow=Math.max(1,Math.round(sw)),oh=Math.max(1,Math.round(sh));
  const c=document.createElement("canvas");c.width=ow;c.height=oh;const x=c.getContext("2d");x.imageSmoothingQuality="high";
  x.drawImage(im,sx,sy,sw,sh,0,0,ow,oh);x.globalCompositeOperation="destination-in";x.imageSmoothingEnabled=true;x.drawImage(mc,0,0,ow,oh);
  const A=alphaMask(Wk);if(A){const k=A.width/iw;x.drawImage(A,sx*k,sy*k,sw*k,sh*k,0,0,ow,oh)}
  const sil=document.createElement("canvas");sil.width=ow;sil.height=oh;const sx2=sil.getContext("2d");sx2.drawImage(c,0,0);sx2.globalCompositeOperation="source-in";sx2.fillStyle="#fff";sx2.fillRect(0,0,ow,oh);
  const L={c,sil,x0,y0,mw,mh};photoCache.m.set(Lr.L,L);return L}
function compose(canvas,Wpx,Hpx,preview){
  canvas.width=Wpx;canvas.height=Hpx;const ctx=canvas.getContext("2d");ctx.clearRect(0,0,Wpx,Hpx);
  const{w,h,cells}=S.view,world=isWorld(S.scene)&&THREE_OK,hasScene=world||!!BACKDROPS[S.scene],st=ST();
  if(world){try{ctx.drawImage(renderScene(S.scene,Wpx,Hpx),0,0)}catch(e){THREE_OK=false;worldFail()}}
  else if(S.scene==="color"){ctx.fillStyle=S.bgColor;ctx.fillRect(0,0,Wpx,Hpx)}
  else if(S.media==="photo"||hasScene){ctx.fillStyle="#ffffff";ctx.fillRect(0,0,Wpx,Hpx)}
  if(S.scene==="image"&&S.bgImage)cover(ctx,S.bgImage,Wpx,Hpx);
  // the original background keeps the photo's own scale, so people line up with it; other backgrounds leave headroom
  const cell=Math.min(Wpx/w,Hpx/h)*(hasScene&&S.scene!=="original"?.86:1),ox=(Wpx-cell*w)/2,oy=Hpx-cell*h,{lay,layers}=S.view,movable=canMove();
  if(S.scene==="original")drawOriginal(ctx,ox,oy,cell);
  // while adjusting boxes everyone stands where they were in the photo, so boxes line up with the blocks
  const boxing=preview&&S.tool==="move"&&S.moveMode==="boxes",ID={dx:0,dy:0,s:1},G=S.gplace,byL=new Map(layers.map(l=>[l.L,l]));
  // the group scales around the bottom centre of everyone together
  const GAx=layers.length?(Math.min(...layers.map(l=>l.e.x0))+Math.max(...layers.map(l=>l.e.x1))+1)/2:0,GAy=layers.length?Math.max(...layers.map(l=>l.e.y1))+1:0;
  // each person's own placement, then the group's, folded into one {dx,dy,s} so every caller stays the same
  const pl=L=>{if(!movable||boxing)return ID;const P=S.place[L]||ID,Lr=byL.get(L);if(!Lr||(G.s===1&&!G.dx&&!G.dy))return P;
    return{s:P.s*G.s,dx:G.s*P.dx+G.dx+(1-G.s)*(GAx-Lr.ax)*cell/Wpx,dy:G.s*P.dy+G.dy+(1-G.s)*(GAy-Lr.ay)*cell/Hpx}};
  const order=layers.slice().sort((a,b)=>(a.ay+pl(a.L).dy*h)-(b.ay+pl(b.L).dy*h));
  S.layout={ox,oy,cell,w,h,Wpx,Hpx,order,pl};
  const rect=(x,y,Lr)=>{const P=pl(Lr.L),c=cell*P.s,X0=ox+(Lr.ax+(x-Lr.ax)*P.s)*cell+P.dx*Wpx,Y0=oy+(Lr.ay+(y-Lr.ay)*P.s)*cell+P.dy*Hpx;
    const a=Math.round(X0),b2=Math.round(Y0);return[a,b2,Math.round(X0+c)-a,Math.round(Y0+c)-b2]};
  const byLayer=new Map(layers.map(l=>[l.L,[]]));const border=[];
  for(let i=0;i<w*h;i++){if(cells[i]===-1)continue;if(cells[i]===-2){border.push(i);continue}const L=lay[i];if(byLayer.has(L))byLayer.get(L).push(i)}
  if(hasScene&&S.scene!=="original"&&S.shadow){
    const m=document.createElement("canvas");m.width=Wpx;m.height=Hpx;const mx=m.getContext("2d");mx.fillStyle="#000";
    for(const Lr of order)for(const i of byLayer.get(Lr.L)){const r=rect(i%w,i/w|0,Lr);mx.fillRect(r[0],r[1],r[2],r[3])}
    ctx.save();ctx.globalAlpha=.42;ctx.filter="blur("+Math.max(2,Math.round(cell*1.4))+"px)";ctx.drawImage(m,Math.round(cell*.9),Math.round(cell*.5));ctx.restore();
  }
  ctx.imageSmoothingEnabled=false;
  if(st.photo){ // cut-out border traced around the photo's own outline instead of whole cells
    if(border.length){const r=S.border*cell;for(const Lr of order){const L=photoLayer(Lr),a=rect(L.x0,L.y0,Lr),c=cell*pl(Lr.L).s;ctx.imageSmoothingEnabled=true;
      for(let k=0;k<16;k++){const t=k/16*2*Math.PI;ctx.drawImage(L.sil,a[0]+Math.cos(t)*r,a[1]+Math.sin(t)*r,L.mw*c,L.mh*c)}}}}
  else for(const i of border){ctx.fillStyle="#ffffff";const x=i%w,y=i/w|0;ctx.fillRect(Math.round(ox+x*cell),Math.round(oy+y*cell),Math.round(ox+(x+1)*cell)-Math.round(ox+x*cell),Math.round(oy+(y+1)*cell)-Math.round(oy+y*cell))}
  if(st.photo)for(const Lr of order){const L=photoLayer(Lr),a=rect(L.x0,L.y0,Lr),c=cell*pl(Lr.L).s;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    ctx.drawImage(L.c,a[0],a[1],L.mw*c,L.mh*c);
    if(boxing){ctx.fillStyle=BOXC[Lr.L%BOXC.length]+"55";for(const i of byLayer.get(Lr.L)){const r2=rect(i%w,i/w|0,Lr);ctx.fillRect(r2[0],r2[1],r2[2],r2[3])}}}
  else for(const Lr of order){const P=pl(Lr.L),c=cell*P.s,bevel=st.textured&&S.bevel&&c>=4&&!boxing,t=Math.max(1,Math.round(c/11));
    for(const i of byLayer.get(Lr.L)){const[x0,y0,bw,bh]=rect(i%w,i/w|0,Lr);
      st.drawCell(ctx,cells[i],x0,y0,bw,bh,bevel,t);
      if(boxing){ctx.fillStyle=BOXC[Lr.L%BOXC.length]+"55";ctx.fillRect(x0,y0,bw,bh);continue}
      if(preview&&S.grid&&c>=6){ctx.fillStyle="rgba(0,0,0,.3)";ctx.fillRect(x0,y0,1,bh);ctx.fillRect(x0,y0,bw,1)}}}
  // emoji on top of everyone; on a cut-out sticker they get the people's white border
  drawDeco(ctx,Wpx,Hpx,!hasScene&&S.media==="sticker"?S.border*cell:0);
  S.layout.sel=null;S.layout.boxes=null;S.layout.deco=null;
  if(boxing)drawBoxes(ctx,ox,oy,cell,Wpx,Hpx);
  else if(preview&&S.tool==="move"&&S.decoSel>=0)drawDecoSel(ctx,Wpx,Hpx); // a selected emoji takes over the handles
  else if(preview&&movable&&layers.length&&S.tool==="move"){const Lr=layers.find(l=>l.L===S.sel)||layers[0];if(Lr){S.sel=Lr.L;
    // the selection frames everyone in group mode, otherwise the selected person
    const group=S.moveMode==="group";let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(const l of group?layers:[Lr]){const a=rect(l.e.x0,l.e.y0,l),b2=rect(l.e.x1,l.e.y1,l);x0=Math.min(x0,a[0]);y0=Math.min(y0,a[1]);x1=Math.max(x1,b2[0]+b2[2]);y1=Math.max(y1,b2[1]+b2[3])}
    const bx=[x0-3,y0-3,x1-x0+6,y1-y0+6],P=pl(Lr.L);
    ctx.save();ctx.setLineDash([8,6]);ctx.lineWidth=2;ctx.strokeStyle="rgba(255,255,255,.95)";
    ctx.strokeRect(...bx);ctx.strokeStyle="rgba(0,0,0,.6)";ctx.lineDashOffset=7;ctx.strokeRect(...bx);ctx.setLineDash([]);
    // corner handles for resizing
    const hs=handlePx(canvas,HANDLE_CSS),cxl=v=>Math.max(hs*.75,Math.min(Wpx-hs*.75,v)),cyl=v=>Math.max(hs*.75,Math.min(Hpx-hs*.75,v));
    const corners=[[bx[0],bx[1]],[bx[0]+bx[2],bx[1]],[bx[0],bx[1]+bx[3]],[bx[0]+bx[2],bx[1]+bx[3]]].map(([x,y])=>[cxl(x),cyl(y)]);
    for(const[cx,cy]of corners){ctx.fillStyle="#ffffff";ctx.fillRect(cx-hs/2,cy-hs/2,hs,hs);ctx.lineWidth=2;ctx.strokeStyle="rgba(0,0,0,.75)";ctx.strokeRect(cx-hs/2,cy-hs/2,hs,hs)}
    ctx.restore();
    S.layout.sel={L:Lr.L,corners,hs,anchor:group?[ox+GAx*cell+G.dx*Wpx,oy+GAy*cell+G.dy*Hpx]:[ox+Lr.ax*cell+P.dx*Wpx,oy+Lr.ay*cell+P.dy*Hpx]}}}
  if(hasScene&&S.media==="sticker"&&S.border){ // white frame around the scene sticker
    const bw=Math.round(Math.min(Wpx,Hpx)*(S.border===1?.025:.05));ctx.strokeStyle="#ffffff";ctx.lineWidth=bw*2;ctx.strokeRect(0,0,Wpx,Hpx)}
}
const BOXC=["#ff4d4d","#2f9bff","#ffc61a","#3ccf4e","#b86bff","#ff8a1f"];
function drawBoxes(ctx,ox,oy,cell,Wpx,Hpx){ // each person's box in their color; the selected one has edge handles
  const C=S.crop,p=S.view.pad,R=S.result,tx=g=>ox+(g-C.x0+p)*cell,ty=g=>oy+(g-C.y0+p)*cell;
  const hs=handlePx(ctx.canvas,HANDLE_CSS+2),cl=(v,m)=>Math.max(2,Math.min(m-2,v));
  // kept on the canvas, so an edge beyond the picture can still be grabbed
  const rects=S.layout.boxes=effBoxes().map(b=>[cl(tx(b.x*R.w),Wpx),cl(ty(b.y*R.h),Hpx),cl(tx((b.x+b.w)*R.w),Wpx),cl(ty((b.y+b.h)*R.h),Hpx)]);
  ctx.save();ctx.font="600 "+hs+"px "+getComputedStyle(document.body).fontFamily;ctx.textBaseline="top";
  rects.forEach((r,k)=>{if(k===S.boxSel)return;drawBox(ctx,r,k,false)});
  if(rects[S.boxSel])drawBox(ctx,rects[S.boxSel],S.boxSel,true);
  ctx.restore();
  function drawBox(ctx,[x0,y0,x1,y1],k,sel){const c=BOXC[k%BOXC.length],X0=cl(x0,Wpx),Y0=cl(y0,Hpx),X1=cl(x1,Wpx),Y1=cl(y1,Hpx);
    ctx.setLineDash(sel?[]:[8,6]);ctx.lineWidth=sel?4:2;ctx.strokeStyle="rgba(0,0,0,.6)";ctx.strokeRect(X0+1,Y0+1,X1-X0,Y1-Y0);
    ctx.strokeStyle=c;ctx.strokeRect(X0,Y0,X1-X0,Y1-Y0);ctx.setLineDash([]);
    const lw=hs*1.5;ctx.fillStyle=c;ctx.fillRect(X0,Y0,lw,lw);ctx.fillStyle="#000";ctx.fillText(String(k+1),X0+hs*.42,Y0+hs*.2);
    if(sel)for(const[cx,cy]of[[X0,(Y0+Y1)/2],[X1,(Y0+Y1)/2],[(X0+X1)/2,Y0],[(X0+X1)/2,Y1]]){
      ctx.fillStyle="#ffffff";ctx.fillRect(cx-hs/2,cy-hs/2,hs,hs);ctx.lineWidth=2;ctx.strokeStyle="rgba(0,0,0,.75)";ctx.strokeRect(cx-hs/2,cy-hs/2,hs,hs)}}
}
