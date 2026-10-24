// ================= Saving (PNG tagged 300 dpi) =================
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc(bytes){let c=0xFFFFFFFF;for(const b of bytes)c=CRC[(c^b)&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
async function pngAt300(canvas){const blob=await new Promise(r=>canvas.toBlob(r,"image/png")),src=new Uint8Array(await blob.arrayBuffer());
  const ppm=Math.round(DPI/.0254),ch=new Uint8Array(21),dv=new DataView(ch.buffer);dv.setUint32(0,9);ch.set([0x70,0x48,0x59,0x73],4);dv.setUint32(8,ppm);dv.setUint32(12,ppm);ch[16]=1;dv.setUint32(17,crc(ch.subarray(4,17)));
  const o=new Uint8Array(src.length+21);o.set(src.subarray(0,33));o.set(ch,33);o.set(src.subarray(33),54);return new Blob([o],{type:"image/png"})}
let downloads=null;const msg=t=>$("saveMsg").textContent=t;
async function save(filename,data){if(!downloads){ // standalone hosting: a normal browser download
    const blob=data instanceof Blob?data:new Blob([data],{type:"text/csv"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);msg("Saved "+filename+".");afterSave();return}
  try{await downloads.save({filename,data});msg("Saved "+filename+".");afterSave()}catch(e){msg(e&&e.code==="declined"?"Save cancelled.":e&&e.code==="rate_limited"?"A save prompt is already open.":"Couldn't save the file here.")}}
function printCanvas(){const P=frameSize(),c=document.createElement("canvas");compose(c,Math.round(P.win*DPI),Math.round(P.hin*DPI),false);compose($("out"),...previewSize(P),true);return{P,c}}
$("saveSticker").addEventListener("click",async()=>{if(!S.view)return;msg("Rendering at 300 dpi…");const{P,c}=printCanvas();
  save(P.media==="photo"?"posepop-photo-4x6.png":"posepop-"+S.scene+"-"+P.win.toFixed(2)+"in.png",await pngAt300(c))});
$("saveSheet").addEventListener("click",async()=>{if(!S.view)return;msg("Rendering at 300 dpi…");const{P,c}=printCanvas(),s=document.createElement("canvas"),n=renderSheet(P,s,DPI,c,false);
  save("posepop-sheet-"+n+"-up.png",await pngAt300(s))});
$("saveCsv").addEventListener("click",()=>{if(!S.view)return;const st=ST();
  save("posepop-"+st.units+".csv",st.csv(counts()).map(r=>r.join(",")).join("\n"))});
(async()=>{try{downloads=window.claude?.use?await window.claude.use("downloads"):null}catch(e){downloads=null}})();
