// ================= Clean look =================
// Phone photos have shading, noise and texture, so neighbouring cells land on different blocks and the
// people look like confetti until the detail is very high. The Clean look (default) fixes that before
// cells are chosen: a gentle contrast and saturation lift on the people, and a short palette of the LOOK_K
// colors that best describe this photo, matched to smooth blocks first. Shrinking the photo to cell size
// already averages away sensor noise; an edge-preserving smoothing pass was tried and dropped because it
// erased eyes and mouths. Dithering is off by default in Clean. "Detailed" is the original behaviour.
// LOOK_K colors per photo; LOOK_KEEP: a color further than this (ΔE) from every cluster, on at least
// LOOK_KEEP_N cells, keeps its own block, so eyes and mouths survive the short palette
// LOOK_SPECK: a lone cell joins its neighbours' block when that block is this close (ΔE2000), so shading
// flips disappear but genuinely different 1-cell features (pupils) stay
const LOOK_K=14,LOOK_SMOOTH=30,LOOK_STRETCH=.6,LOOK_SAT=1.18,LOOK_KEEP=12,LOOK_KEEP_N=2,LOOK_SPECK=15;
function cleanCells(data,w,h,alpha){ // data: the photo shrunk to one RGBA pixel per cell
  const d=new Uint8ClampedArray(data);
  // contrast and saturation from the people's own range (phone photos are often flat)
  const ppl=[];for(let i=0;i<w*h;i++)if(!alpha||alpha[i]>=.42)ppl.push(i);
  const lum=i=>d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114,ls=ppl.map(lum).sort((a,b)=>a-b);
  if(ls.length>8){const lo=ls[Math.floor(ls.length*.02)],hi=ls[Math.floor(ls.length*.98)],sc=Math.min(1.6,Math.max(1,(235-20)/Math.max(1,hi-lo)));
    for(let i=0;i<w*h;i++){const o=i*4,l=lum(i),l2=l+((l-lo)*sc+20-l)*LOOK_STRETCH;for(let c=0;c<3;c++){const v=d[o+c]+(l2-l);d[o+c]=l2+(v-l2)*LOOK_SAT}}}
  // this photo's own short palette: cluster the people's colors, snap each cluster to the closest smooth block
  const pts=new Float32Array(ppl.length*3);ppl.forEach((i,j)=>{const L=toLab(d[i*4],d[i*4+1],d[i*4+2]);pts[j*3]=L[0];pts[j*3+1]=L[1];pts[j*3+2]=L[2]});
  const C=kmeans(pts,LOOK_K,10),far=new Map();
  // small, strongly different features (eyes, mouths, logos) would be absorbed by big clusters: keep their colors
  for(let j=0;j<ppl.length;j++){let bd=1e18;for(const c of C){const a=pts[j*3]-c[0],b=pts[j*3+1]-c[1],e=pts[j*3+2]-c[2];bd=Math.min(bd,a*a+b*b+e*e)}
    if(bd>LOOK_KEEP*LOOK_KEEP){const id=closest([pts[j*3],pts[j*3+1],pts[j*3+2]],palette,palEntries,LOOK_SMOOTH);far.set(id,(far.get(id)||0)+1)}}
  const ids=[...new Set([...C.map(c=>closest(c,palette,palEntries,LOOK_SMOOTH)),...[...far].filter(([,n])=>n>=LOOK_KEEP_N).map(([id])=>id)])].filter(i=>i>=0);
  const near=makeNearest(ids.length?ids:palette,LOOK_SMOOTH),grid=ST().toCells(d,w,h,S.dither,near);
  if(S.dither)return grid; // dithering means to mix neighbours; don't undo it
  // lone cells: join the neighbours' block if it is a close colour (shading flips), keep them otherwise (pupils)
  const pal=ST().palette,isP=new Uint8Array(w*h);for(const i of ppl)isP[i]=1;
  for(let pass=0;pass<2;pass++){const src=grid.slice();
    for(const i of ppl){const ns=N4(i,w,h).filter(n=>n>=0&&isP[n]);if(ns.length<3||ns.some(n=>src[n]===src[i]))continue;
      const cnt=new Map();for(const n of ns)cnt.set(src[n],(cnt.get(src[n])||0)+1);
      const[x,c]=[...cnt].sort((a,b)=>b[1]-a[1])[0];if(c<3)continue;
      if(deltaE00(toLab(d[i*4],d[i*4+1],d[i*4+2]),pal[x].lab)<LOOK_SPECK)grid[i]=x}}
  return grid;
}

function convert(){
  const Wk=work(),img=Wk.img,iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  let w=S.width,h=Math.max(1,Math.round(w*ih/iw));if(h>240){h=240;w=Math.max(1,Math.round(h*iw/ih))}
  const data=downsample(img,w,h),lab=new Float32Array(w*h*3);
  for(let i=0,p=0;i<data.length;i+=4,p++){const L=toLab(data[i],data[i+1],data[i+2]);lab[p*3]=L[0];lab[p*3+1]=L[1];lab[p*3+2]=L[2]}
  const alpha=new Float32Array(w*h);
  if(Wk.alpha){const a=downsample(Wk.alpha,w,h);for(let i=0;i<w*h;i++)alpha[i]=a[i*4]/255}
  const grid=ST().photo?new Int16Array(w*h):S.look==="clean"?cleanCells(data,w,h,Wk.alpha?alpha:null):ST().toCells(data,w,h,S.dither,nearest);
  S.result={w,h,grid,lab,alpha,hasAlpha:!!Wk.alpha};drawOrig();
}

const effBoxes=()=>(S.boxes||[]).map((b,k)=>S.edges[k]||b); // detector boxes with the user's edge adjustments
const N4=(i,w,h)=>{const x=i%w,y=(i/w)|0;return[x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1]};
function personMask(){
  const{w,h,lab,alpha,hasAlpha}=S.result,keep=new Uint8Array(w*h);
  if(hasAlpha){for(let i=0;i<w*h;i++)keep[i]=alpha[i]>=.42?1:0}
  else{ // color flood from the top and upper sides
    keep.fill(1);const tol=14,de=(a,b)=>Math.hypot(lab[a*3]-lab[b*3],lab[a*3+1]-lab[b*3+1],lab[a*3+2]-lab[b*3+2]);
    const seen=new Uint8Array(w*h),org=new Int32Array(w*h),q=[];const seed=i=>{if(!seen[i]){seen[i]=1;org[i]=i;keep[i]=0;q.push(i)}};
    for(let x=0;x<w;x++)seed(x);for(let y=0;y<h*.7;y++){seed(y*w);seed(y*w+w-1)}
    while(q.length){const i=q.pop();for(const n of N4(i,w,h)){if(n<0||seen[n])continue;if(de(n,i)<tol&&de(n,org[i])<tol*2.5){seen[n]=1;keep[n]=0;org[n]=org[i];q.push(n)}}}
  }
  // keep every sizeable person (groups), drop specks
  const comp=new Int32Array(w*h).fill(-1),sizes=[];
  for(let s=0;s<w*h;s++){if(!keep[s]||comp[s]>=0)continue;const id=sizes.length;let n=0;const st=[s];comp[s]=id;
    while(st.length){const i=st.pop();n++;for(const m of N4(i,w,h))if(m>=0&&keep[m]&&comp[m]<0){comp[m]=id;st.push(m)}}sizes.push(n)}
  const big=Math.max(0,...sizes);for(let i=0;i<w*h;i++)if(keep[i]&&sizes[comp[i]]<Math.max(4,big*.04))keep[i]=0;
  // fill enclosed holes
  const outside=new Uint8Array(w*h),st=[];const s2=i=>{if(!keep[i]&&!outside[i]){outside[i]=1;st.push(i)}};
  for(let x=0;x<w;x++){s2(x);s2((h-1)*w+x)}for(let y=0;y<h;y++){s2(y*w);s2(y*w+w-1)}
  while(st.length){const i=st.pop();for(const m of N4(i,w,h))if(m>=0)s2(m)}
  for(let i=0;i<w*h;i++)if(!keep[i]&&!outside[i])keep[i]=1;
  // one layer per person: detector boxes when we have them, otherwise connected shapes
  const layer=new Int8Array(w*h).fill(-1);
  const boxes=effBoxes().map((b,k)=>({cx:(b.x+b.w/2)*w,cy:(b.y+b.h/2)*h,bw:b.w*w,bh:b.h*h,x0:b.x*w,y0:b.y*h,x1:(b.x+b.w)*w,y1:(b.y+b.h)*h,set:!!S.edges[k]}));
  const dist=(b,x,y)=>Math.abs(x-b.cx)/b.bw+Math.abs(y-b.cy)/b.bh*.35;
  if(S.edges.some(Boolean)){
    // once a box is adjusted the boxes are claims: an adjusted box owns everything inside it, untouched
    // boxes share the rest (within a block of their edge), and blocks outside every box are cropped away
    const best=(x,y,set,tol)=>{let k=-1,bd=1e9;boxes.forEach((b,j)=>{if(b.set===set&&x>=b.x0-tol&&x<=b.x1+tol&&y>=b.y0-tol&&y<=b.y1+tol){const d=dist(b,x,y);if(d<bd){bd=d;k=j}}});return k};
    for(let i=0;i<w*h;i++)if(keep[i]){const x=i%w+.5,y=(i/w|0)+.5;let k=best(x,y,true,0);if(k<0)k=best(x,y,false,1);if(k<0)keep[i]=0;layer[i]=k}}
  else if(boxes.length>1){for(let i=0;i<w*h;i++)if(keep[i]){const x=i%w+.5,y=(i/w|0)+.5;let best=0,bd=1e9;
    boxes.forEach((b,k)=>{const d=dist(b,x,y);if(d<bd){bd=d;best=k}});layer[i]=best}}
  else if(boxes.length===1){for(let i=0;i<w*h;i++)if(keep[i])layer[i]=0}
  else{const comp2=new Int32Array(w*h).fill(-1),sz=[];
    for(let s0=0;s0<w*h;s0++){if(!keep[s0]||comp2[s0]>=0)continue;const id=sz.length;let n=0;const st2=[s0];comp2[s0]=id;
      while(st2.length){const i=st2.pop();n++;for(const m of N4(i,w,h))if(m>=0&&keep[m]&&comp2[m]<0){comp2[m]=id;st2.push(m)}}sz.push(n)}
    const order=sz.map((n,i)=>[n,i]).sort((a,b)=>b[0]-a[0]).slice(0,6).map(x=>x[1]),map=new Map(order.map((c,k)=>[c,k]));
    for(let i=0;i<w*h;i++)if(keep[i])layer[i]=map.has(comp2[i])?map.get(comp2[i]):0}
  // edit strokes, in the order they were made
  const de=(a,b)=>Math.hypot(lab[a*3]-lab[b*3],lab[a*3+1]-lab[b*3+1],lab[a*3+2]-lab[b*3+2]);
  for(const f of S.fixes){
    if(f.t==="area"){const sx=Math.floor(f.x*w),sy=Math.floor(f.y*h),s0=sy*w+sx;if(sx<0||sy<0||sx>=w||sy>=h||!keep[s0])continue;
      const L=layer[s0],st3=[s0],seen=new Uint8Array(w*h);seen[s0]=1;
      while(st3.length){const i=st3.pop();keep[i]=0;layer[i]=-1;for(const m of N4(i,w,h))if(m>=0&&!seen[m]&&keep[m]&&layer[m]===L&&de(m,s0)<26){seen[m]=1;st3.push(m)}}
      continue}
    for(const pt of f.pts){const cx=pt[0]*w,cy=pt[1]*h,rr=f.r;
      for(let y=Math.floor(cy-rr);y<=Math.ceil(cy+rr);y++)for(let x=Math.floor(cx-rr);x<=Math.ceil(cx+rr);x++){
        if(x<0||y<0||x>=w||y>=h)continue;if(Math.hypot(x+.5-cx,y+.5-cy)>rr)continue;const i=y*w+x;
        if(f.t==="erase"){keep[i]=0;layer[i]=-1}else if(!keep[i]){keep[i]=1;layer[i]=f.L}}}
  }
  return{keep,layer};
}
// view cells: -1 empty, -2 white border, >=0 block id
function buildView(fresh){
  const{w:gw,h:gh,grid}=S.result,{keep,layer}=personMask(),cut=S.scene==="none";
  // trim to the people so they stand on the bottom edge and fill the sticker
  if(fresh||!S.crop){let x0=gw,y0=gh,x1=-1,y1=-1;for(let i=0;i<gw*gh;i++)if(keep[i]){const x=i%gw,y=i/gw|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
    if(x1<0){x0=0;y0=0;x1=gw-1;y1=gh-1}const m=Math.max(1,Math.round((x1-x0)*.04));
    S.crop={x0:Math.max(0,x0-m),y0:Math.max(0,y0-m),x1:Math.min(gw-1,x1+m),y1:y1}}
  const C=S.crop,w=C.x1-C.x0+1,h=C.y1-C.y0+1;
  const b=cut&&S.media==="sticker"?S.border:0,W=w+2*b,H=h+2*b,cells=new Int16Array(W*H).fill(-1);
  const lay=new Int8Array(W*H).fill(-1);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y+C.y0)*gw+x+C.x0;if(keep[i]){cells[(y+b)*W+x+b]=grid[i];lay[(y+b)*W+x+b]=Math.max(0,layer[i])}}
  if(b){const src=cells.slice();for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(src[y*W+x]!==-1)continue;
    let near=false;for(let dy=-b;dy<=b&&!near;dy++)for(let dx=-b;dx<=b;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&src[yy*W+xx]>=0&&dx*dx+dy*dy<=b*b+1){near=true;break}}
    if(near)cells[y*W+x]=-2}}
  const ext=[];for(let i=0;i<W*H;i++){const L=lay[i];if(L<0)continue;const x=i%W,y=i/W|0;const e=ext[L]||(ext[L]={x0:x,x1:x,y0:y,y1:y});
    if(x<e.x0)e.x0=x;if(x>e.x1)e.x1=x;if(y<e.y0)e.y0=y;if(y>e.y1)e.y1=y}
  const layers=[];ext.forEach((e,L)=>{if(e)layers.push({L,ax:(e.x0+e.x1+1)/2,ay:e.y1+1,e})});
  S.view={w:W,h:H,cells,lay,layers,pad:b};
}
