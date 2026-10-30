// ================= Zoom to the people =================
let workCache=null;
// the part of the photo that is turned into blocks (null: all of it)
const workFocus=()=>S.zoom&&S.focus&&(S.focus.w<.92||S.focus.h<.92)?S.focus:null;
// Edits (strokes, Erase area, box edges) are stored as fractions of the whole photo, so they stay put when Zoom or
// Detail changes; these convert to and from fractions of the work image.
function toWork(x,y){const f=workFocus();return f?[(x-f.x)/f.w,(y-f.y)/f.h]:[x,y]}
function toPhoto(u,v){const f=workFocus();return f?[f.x+u*f.w,f.y+v*f.h]:[u,v]}
const workScale=()=>{const f=workFocus();return f?f.w:1}; // the work image's width as a fraction of the photo's
function boxToWork(b){const f=workFocus(),[x,y]=toWork(b.x,b.y);return f?{x,y,w:b.w/f.w,h:b.h/f.h}:b}
function boxToPhoto(b){const f=workFocus(),[x,y]=toPhoto(b.x,b.y);return f?{x,y,w:b.w*f.w,h:b.h*f.h}:b}
function work(){ // the source and alpha actually turned into blocks
  const f=workFocus(),k=S.src&&(f?JSON.stringify(f):"full");
  if(workCache&&workCache.src===S.src&&workCache.k===k&&workCache.bf===S.boxesFull)return workCache;
  const bx=S.boxesFull||[];
  if(!f){S.boxes=bx;workCache={src:S.src,k,img:S.src,alpha:S.alpha,bf:S.boxesFull};return workCache}
  S.boxes=bx.map(b=>({x:(b.x-f.x)/f.w,y:(b.y-f.y)/f.h,w:b.w/f.w,h:b.h/f.h}));
  const iw=S.src.naturalWidth||S.src.width,ih=S.src.naturalHeight||S.src.height,sc=Math.min(1,1600/Math.max(f.w*iw,f.h*ih));
  const c=document.createElement("canvas");c.width=Math.round(f.w*iw*sc);c.height=Math.round(f.h*ih*sc);
  const x=c.getContext("2d");x.imageSmoothingQuality="high";x.drawImage(S.src,f.x*iw,f.y*ih,f.w*iw,f.h*ih,0,0,c.width,c.height);
  let a=null;if(S.alpha){a=document.createElement("canvas");a.width=c.width;a.height=c.height;const aw=S.alpha.width,ah=S.alpha.height;
    a.getContext("2d").drawImage(S.alpha,f.x*aw,f.y*ah,f.w*aw,f.h*ah,0,0,c.width,c.height)}
  workCache={src:S.src,k,img:c,alpha:a,bf:S.boxesFull};return workCache;
}
