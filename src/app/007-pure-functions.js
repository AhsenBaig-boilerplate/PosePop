// ================= Pure functions =================
// Colour maths, clustering, dithering, screen-colour detection and world-render sizing. Nothing here touches the
// page, the DOM or the app's state: tests/unit/ loads this file (with 005-random-noise.js) on its own in a bare
// Node vm and checks it. Keep it that way; anything that needs the page belongs in its section's file.
// sRGB (0–255) → CIELAB, D65 white
function lin(v){v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}
function toLab(r,g,b){r=lin(r);g=lin(g);b=lin(b);let X=(r*.4124+g*.3576+b*.1805)/.95047,Y=r*.2126+g*.7152+b*.0722,Z=(r*.0193+g*.1192+b*.9505)/1.08883;
  const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;X=f(X);Y=f(Y);Z=f(Z);return[116*Y-16,500*(X-Y),200*(Y-Z)]}
// CIEDE2000 colour difference (Sharma, Wu & Dalal 2005). Used to judge stray cells and for the colour-error
// figure in ?debug=1. Not for choosing blocks: there it pulled dark greys towards blue on real photos.
function deltaE00(x,y){
  const[L1,a1,b1]=x,[L2,a2,b2]=y,rad=Math.PI/180,C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),Cm=(C1+C2)/2,G=.5*(1-Math.sqrt(Cm**7/(Cm**7+25**7)));
  const p1=a1*(1+G),p2=a2*(1+G),C1p=Math.hypot(p1,b1),C2p=Math.hypot(p2,b2),hp=(b,a)=>{if(!b&&!a)return 0;const h=Math.atan2(b,a)/rad;return h<0?h+360:h};
  const h1=hp(b1,p1),h2=hp(b2,p2),dL=L2-L1,dC=C2p-C1p;let dh=0;if(C1p*C2p){dh=h2-h1;if(dh>180)dh-=360;else if(dh<-180)dh+=360}
  const dH=2*Math.sqrt(C1p*C2p)*Math.sin(dh*rad/2),Lm=(L1+L2)/2,Cmp=(C1p+C2p)/2;let hm=h1+h2;
  if(C1p*C2p){hm=Math.abs(h1-h2)>180?(h1+h2+(h1+h2<360?360:-360))/2:(h1+h2)/2}
  const T=1-.17*Math.cos((hm-30)*rad)+.24*Math.cos(2*hm*rad)+.32*Math.cos((3*hm+6)*rad)-.2*Math.cos((4*hm-63)*rad);
  const SL=1+.015*(Lm-50)**2/Math.sqrt(20+(Lm-50)**2),SC=1+.045*Cmp,SH=1+.015*Cmp*T;
  const RT=-2*Math.sqrt(Cmp**7/(Cmp**7+25**7))*Math.sin(60*Math.exp(-(((hm-275)/25)**2))*rad);
  return Math.sqrt((dL/SL)**2+(dC/SC)**2+(dH/SH)**2+RT*(dC/SC)*(dH/SH))}
function kmeans(pts,k,iters){ // pts: n×3 Lab; deterministic k-means++ start
  const n=pts.length/3;if(!n)return[];const r=rng(1),C=[],d2=new Float32Array(n).fill(1e18),j0=Math.floor(r()*n);C.push([pts[j0*3],pts[j0*3+1],pts[j0*3+2]]);
  while(C.length<Math.min(k,n)){const c=C[C.length-1];let tot=0;
    for(let i=0;i<n;i++){const a=pts[i*3]-c[0],b=pts[i*3+1]-c[1],e=pts[i*3+2]-c[2],d=a*a+b*b+e*e;if(d<d2[i])d2[i]=d;tot+=d2[i]}
    if(!tot)break;let t=r()*tot,i=0;for(;i<n-1;i++){t-=d2[i];if(t<=0)break}C.push([pts[i*3],pts[i*3+1],pts[i*3+2]])}
  for(let it=0;it<iters;it++){const acc=C.map(()=>[0,0,0,0]);
    for(let i=0;i<n;i++){let bi=0,bd=1e18;for(let j=0;j<C.length;j++){const a=pts[i*3]-C[j][0],b=pts[i*3+1]-C[j][1],e=pts[i*3+2]-C[j][2],d=a*a+b*b+e*e;if(d<bd){bd=d;bi=j}}
      const s=acc[bi];s[0]+=pts[i*3];s[1]+=pts[i*3+1];s[2]+=pts[i*3+2];s[3]++}
    for(let j=0;j<C.length;j++)if(acc[j][3])C[j]=[acc[j][0]/acc[j][3],acc[j][1]/acc[j][3],acc[j][2]/acc[j][3]]}
  return C}
// the backdrop key's screen colour (green or blue); KEY_MIN_COVER: share of the photo it must cover
const KEY_MIN_COVER=.08;
const ycc=(r,g,b)=>[128-.168736*r-.331264*g+.5*b,128+.5*r-.418688*g-.081312*b];
function keyColor(d){ // d: RGBA pixels → {cb, cr, rgb, main channel} or null when there's no green or blue screen
  const bins=new Uint32Array(1024),sum=new Float64Array(3072);let seen=0;
  for(let i=0;i<d.length;i+=16){const r=d[i],g=d[i+1],b=d[i+2],[cb,cr]=ycc(r,g,b);seen++;
    if(Math.hypot(cb-128,cr-128)<24)continue; // greys, whites and other weak colours can't be a screen
    const k=(Math.min(255,cb)>>3)*32+(Math.min(255,cr)>>3);bins[k]++;sum[k*3]+=r;sum[k*3+1]+=g;sum[k*3+2]+=b}
  const order=[...bins.keys()].filter(k=>bins[k]).sort((a,b)=>bins[b]-bins[a]);
  for(const k of order){const n=bins[k];if(n<seen*KEY_MIN_COVER)break;
    const r=sum[k*3]/n,g=sum[k*3+1]/n,b=sum[k*3+2]/n;
    // only clear greens and blues: a red or skin-coloured "screen" would cut into people
    if((g>r*1.15&&g>b*1.05)||(b>r*1.15&&b>g*1.05)){const[cb,cr]=ycc(r,g,b);return{cb,cr,rgb:[r,g,b].map(Math.round),main:g>=b?1:2}}}
  return null;
}
function errorDiffuse(data,w,h,dither,near,pal){ // Floyd–Steinberg towards each cell's average colour
  const grid=new Int16Array(w*h);
  if(!dither){for(let i=0,p=0;i<data.length;i+=4,p++)grid[p]=near(data[i],data[i+1],data[i+2]);return grid}
  const buf=new Float32Array(w*h*3);for(let i=0,j=0;i<data.length;i+=4,j+=3){buf[j]=data[i];buf[j+1]=data[i+1];buf[j+2]=data[i+2]}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=(y*w+x)*3,r=buf[j],g=buf[j+1],b=buf[j+2];
    const id=near(Math.round(r),Math.round(g),Math.round(b));grid[y*w+x]=id;
    const a=pal[id].avg,er=(r-a[0])*.75,eg=(g-a[1])*.75,eb=(b-a[2])*.75;
    const add=(dx,dy,f)=>{const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy>=h)return;const o=(yy*w+xx)*3;buf[o]+=er*f;buf[o+1]+=eg*f;buf[o+2]+=eb*f};
    add(1,0,7/16);add(-1,1,3/16);add(0,1,5/16);add(1,1,1/16)}
  return grid;
}
// The world render for an exact W×H preview or print: the bucket size Wb×Hb to render (long side rounded up to
// SCENE_BUCKET px, aspect rounded to SCENE_ASPECT_STEP), and the source rectangle to crop from it. Wider than the
// bucket → trim the sky; taller → trim both sides; always bottom aligned and never stretched.
const SCENE_BUCKET=256,SCENE_ASPECT_STEP=.08;
function sceneBucket(W,H){
  const a=W/H,ab=Math.max(SCENE_ASPECT_STEP,Math.round(a/SCENE_ASPECT_STEP)*SCENE_ASPECT_STEP),L=Math.ceil(Math.max(W,H)/SCENE_BUCKET)*SCENE_BUCKET;
  const Wb=ab>=1?L:Math.round(L*ab),Hb=ab>=1?Math.round(L/ab):L;
  const sw=a>Wb/Hb?Wb:Hb*a,sh=a>Wb/Hb?Wb/a:Hb;
  return{Wb,Hb,sx:(Wb-sw)/2,sy:Hb-sh,sw,sh}}
// Fuse beads: the n×n pegboards it takes to make the people, tiled from the top-left of the beads' bounding box.
// cells: palette index per cell, -1 where there's no bead. Boards with no bead on them aren't counted.
function pegboards(cells,w,h,n){let x0=w,y0=h,x1=-1,y1=-1;
  for(let i=0;i<w*h;i++)if(cells[i]>=0){const x=i%w,y=i/w|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<0)return{cols:0,rows:0,boards:0};
  const cols=Math.ceil((x1-x0+1)/n),rows=Math.ceil((y1-y0+1)/n),used=new Uint8Array(cols*rows);
  for(let i=0;i<w*h;i++)if(cells[i]>=0)used[Math.floor((((i/w|0)-y0))/n)*cols+Math.floor(((i%w)-x0)/n)]=1;
  return{cols,rows,boards:used.reduce((a,b)=>a+b,0)}}
