// ================= Zoom to the people =================
let workCache=null;
function work(){ // the source and alpha actually turned into blocks
  const f=S.zoom&&S.focus&&(S.focus.w<.92||S.focus.h<.92)?S.focus:null,k=S.src&&(f?JSON.stringify(f):"full");
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
