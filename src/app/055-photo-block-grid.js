// ================= Photo → block grid =================
function downsample(src,w,h){
  let cur=src,cw=src.naturalWidth||src.width,ch=src.naturalHeight||src.height;
  while(cw/2>=w*2&&ch/2>=h*2){const c=document.createElement("canvas");c.width=Math.round(cw/2);c.height=Math.round(ch/2);const x=c.getContext("2d");x.imageSmoothingQuality="high";x.drawImage(cur,0,0,c.width,c.height);cur=c;cw=c.width;ch=c.height}
  const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d",{willReadFrequently:true});x.imageSmoothingQuality="high";x.drawImage(cur,0,0,w,h);
  return x.getImageData(0,0,w,h).data;
}
