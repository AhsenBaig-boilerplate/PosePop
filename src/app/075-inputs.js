// ================= Inputs =================
function note(t){$("srcNote").textContent=t}
async function decodeFile(file){
  // createImageBitmap honours the phone's rotation and handles most formats; <img> is the fallback
  let im=null;
  if(window.createImageBitmap){try{im=await createImageBitmap(file,{imageOrientation:"from-image"})}catch(e){try{im=await createImageBitmap(file)}catch(e2){}}}
  if(!im)im=await new Promise((res,rej)=>{const url=URL.createObjectURL(file),i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error("decode"));i.src=url});
  const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;if(!iw||!ih)throw new Error("empty");
  // phones take 12+ MP photos; shrink right away to stay inside mobile memory limits
  const sc=Math.min(1,2200/Math.max(iw,ih)),c=document.createElement("canvas");c.width=Math.round(iw*sc);c.height=Math.round(ih*sc);
  mark("Photo","size",iw+" × "+ih+(sc<1?" → "+c.width+" × "+c.height:""));
  const x=c.getContext("2d");x.imageSmoothingQuality="high";x.drawImage(im,0,0,c.width,c.height);if(im.close)im.close();return c;
}
const timeout=(p,ms)=>Promise.race([p,new Promise(r=>setTimeout(()=>r(false),ms))]);
let loading=0;
async function loadFile(file,label){
  if(!file){note("No photo came through. Try again, or use Choose image.");return}
  const job=++loading,name=label+": "+(file.name||"photo");
  note("Reading "+(file.name||"the photo")+"…");$("busy").hidden=false;$("busy").textContent="Reading photo…";
  let img;DIAG.get("Photo").clear();mark("Photo","file",(file.type||"unknown type")+" · "+mb(file.size||0)+" · "+label);
  try{img=await timed("Photo","decode",decodeFile(file))}catch(e){
    mark("Errors","decode",e.message||e);$("busy").hidden=true;
    const heic=/hei[cf]/i.test(file.type||"")||/\.hei[cf]$/i.test(file.name||"");
    note(heic?"This phone saved the photo as HEIC, which this browser can't open. In Camera settings choose Most Compatible (JPEG), or share the photo as a JPEG.":"That file couldn't be opened as a picture. Try a JPG or PNG.");return}
  if(job!==loading)return;
  S.src=img;userWork=true;resetEdits();S.alpha=null;S.focus=null;S.boxes=[];S.boxesFull=[];note(name);
  $("busy").textContent=S.segMode==="loading"?"Loading person detection…":"Finding people…";
  const ok=await timeout(segReady,30000);
  if(job!==loading)return;
  if(ok){$("busy").textContent="Finding people…";
    try{const r=await segment(img,{progress:t=>{if(job===loading)$("busy").textContent=t},cancelled:()=>job!==loading});if(job!==loading)return;S.alpha=r.alpha;S.focus=r.focus;S.boxesFull=r.boxes;note(name+" · "+(r.people?r.people+(r.people===1?" person":" people")+" found":"no people found, cut-out by shape"))}
    catch(e){if(job!==loading)return; // replaced by a newer photo
      S.alpha=null;mark("Errors","detection",e.message||e);setSeg("fallback","Person detection failed on this photo, so the cut-out uses color. Fix stray areas with Erase and Restore.")}}
  else if(S.segMode==="loading"){mark("Photo","cut out","by color: detection still loading after 30 s");note(name+" · person detection is still loading, so this cut-out uses color. Choose the photo again in a moment for a better cut-out.")}
  if(job!==loading)return;
  $("busy").textContent="Placing blocks…";run();
}
function drawOrig(){const im=work().img,o=$("orig"),iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,s=Math.min(1,900/Math.max(iw,ih));o.width=Math.round(iw*s);o.height=Math.round(ih*s);o.getContext("2d").drawImage(im,0,0,o.width,o.height)}
for(const[id,label]of[["cam","Camera"],["pick","Image"]]){const el=$(id);
  el.addEventListener("change",()=>{const f=el.files&&el.files[0];loadFile(f,label);setTimeout(()=>{try{el.value=""}catch(e){}},0)})}
document.addEventListener("paste",e=>{const f=[...(e.clipboardData?.files||[])][0];if(f)loadFile(f,"Pasted")});
const frame=$("frame");
document.addEventListener("dragover",e=>{e.preventDefault();frame.classList.add("drag")});
document.addEventListener("dragleave",e=>{if(!e.relatedTarget)frame.classList.remove("drag")});
document.addEventListener("drop",e=>{e.preventDefault();frame.classList.remove("drag");loadFile(e.dataTransfer.files[0],"Dropped")});

$("width").addEventListener("input",e=>{S.width=+e.target.value;$("wRead").textContent=S.width+" "+ST().units+" wide";run()});
$("dither").addEventListener("change",e=>{S.dither=e.target.checked;run()});
// Clean starts without dithering, Detailed with it (the original behaviour); the checkbox can still change either
seg("look",v=>{S.look=v;S.dither=v==="detailed";$("dither").checked=S.dither;
  $("lookHint").textContent=v==="clean"?"A short palette chosen for this photo, without speckle. Best for phone photos.":"Every color in the palette and dithering, as before. Needs more detail for photos.";run()});
$("zoom").addEventListener("change",e=>{S.zoom=e.target.checked;resetEdits();run()});
for(const k of["bevel","shadow","grid"])$(k).addEventListener("change",e=>{S[k]=e.target.checked;restyle()});
$("inches").addEventListener("input",e=>{S.inches=+e.target.value;restyle()});
[1,2,3,4,6,8,10,12,"Custom"].forEach(v=>{const b=document.createElement("button");b.className="chip";b.textContent=v;b.setAttribute("aria-pressed",String(v===S.count));
  b.addEventListener("click",()=>{S.count=v==="Custom"?0:v;if(!S.count){const P=frameSize();S.inches=+P.win.toFixed(2);$("inches").value=S.inches}
    $("widthGroup").hidden=!!S.count;$("counts").querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));restyle()});$("counts").append(b)});
function seg(id,fn){const el=$(id);el.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;el.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b));fn(b.dataset.v)})}
seg("media",v=>{S.media=v;$("stickerOpts").hidden=v!=="sticker";setTool(S.tool);restyle()});
seg("border",v=>{S.border=+v;restyle()});


// palette chips for the current style; at least one group stays on
function renderGroups(){const sets=$("sets"),on=S.groups[S.style];sets.textContent="";
  Object.entries(ST().groups).forEach(([k,label])=>{const b=document.createElement("button");b.className="chip";b.textContent=label;b.setAttribute("aria-pressed",String(on.has(k)));
    b.addEventListener("click",()=>{if(on.has(k)){if(on.size===1)return;on.delete(k)}else on.add(k);b.setAttribute("aria-pressed",String(on.has(k)));buildPalette();run()});sets.append(b)})}
// the style picker sits above the worlds; every label that names the cells follows the style
function setStyle(k){
  // the emoji images load the first time their style is picked
  if(STYLES[k]===STYLES.emoji&&!STYLES.emoji.palette.length){$("busy").hidden=false;$("busy").textContent="Loading emoji…";
    loadEmoji().then(()=>setStyle(k)).catch(e=>{$("busy").hidden=true;mark("Errors","emoji",e.message);note("The emoji couldn't load. Try again when online.");
      $("style").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===S.style)))});return}
  S.style=k;const st=ST();buildPalette();renderGroups();
  // block-only controls step aside for the Photo style
  for(const el of[$("sets").closest(".group"),$("look").closest(".group"),$("dither").closest("label"),$("saveCsv"),document.querySelector(".materials")])el.hidden=!!st.photo;
  $("setsLabel").textContent=st.paletteLabel;$("wRead").textContent=S.width+" "+st.units+" wide";$("saveCsv").textContent="Save "+st.listName+" (CSV)";
  $("bevel").closest("label").hidden=!st.textured;$("hover").textContent="Hover a person to name "+(st.unit==="block"?"a block":st.unit==="emoji"?"an emoji":"a color");run()}
Object.entries(STYLES).forEach(([k,st])=>{const b=document.createElement("button");b.dataset.v=k;b.textContent=st.name;b.setAttribute("aria-pressed",String(k===S.style));$("style").append(b)});
seg("style",setStyle);renderGroups();

function worldFail(){$("worldNote").textContent="3D worlds need WebGL, which isn't available in this browser. Cut-out still works.";}
const sceneBtns={};
SCENES.forEach(({k,label})=>{const b=document.createElement("button");b.className="scene";b.dataset.k=k;b.setAttribute("aria-pressed",String(k===S.scene));
  const c=document.createElement("canvas");c.width=160;c.height=120;const t=document.createElement("span");t.textContent=label;b.append(c,t);sceneBtns[k]=c;
  if(k==="image")b.classList.add("op"); // operators choose the backdrop; guests in kiosk mode just pick from the rest
  b.addEventListener("click",()=>{if(isWorld(k)&&!THREE_OK)return;
    if(k==="image"&&(!S.bgImage||S.scene==="image")){$("bgFile").click();return} // choose (or change) the image first
    pickScene(k)});
  $("scenes").append(b)});
function pickScene(k){S.scene=k;document.querySelectorAll(".scene").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.k===k)));
  $("bgColorRow").hidden=k!=="color";setTool(S.tool);restyle()}
// backdrop thumbnails follow the current photo, color and image
function backdropThumbs(){const t=(k,f)=>{const x=sceneBtns[k].getContext("2d");x.clearRect(0,0,160,120);f(x)};
  t("original",x=>{if(S.src)cover(x,S.src,160,120)});t("color",x=>{x.fillStyle=S.bgColor;x.fillRect(0,0,160,120);x.strokeStyle="rgba(0,0,0,.15)";x.strokeRect(.5,.5,159,119)});
  t("image",x=>{if(S.bgImage)cover(x,S.bgImage,160,120);else{x.fillStyle="#d9ddd4";x.fillRect(0,0,160,120);x.fillStyle="#5b6457";x.font="600 40px sans-serif";x.textAlign="center";x.textBaseline="middle";x.fillText("+",80,60)}})}
["#ffffff","#111111","#8fd3ff","#ffd1e8","#fff3a6","#b9f6ca","#c9b8ff","#ff8a65"].forEach(c=>{const b=document.createElement("button");b.className="chip swatch";b.style.background=c;b.setAttribute("aria-label","Background "+c);
  b.addEventListener("click",()=>{S.bgColor=c;$("bgColor").value=c;backdropThumbs();restyle()});$("bgSwatches").append(b)});
$("bgColor").addEventListener("input",e=>{S.bgColor=e.target.value;backdropThumbs();restyle()});
$("bgFile").addEventListener("change",async e=>{const f=e.target.files&&e.target.files[0];e.target.value="";if(!f)return;
  try{S.bgImage=await decodeFile(f);backdropThumbs();pickScene("image")}catch(err){note("That background image couldn't be opened. Try a JPG or PNG.")}});
// world picker thumbnails: hashed files, so they stay cached between deploys
const THUMBS={"plains":"__ASSET:thumbs/plains.jpg__","village":"__ASSET:thumbs/village.jpg__","mountains":"__ASSET:thumbs/mountains.jpg__","taiga":"__ASSET:thumbs/taiga.jpg__","desert":"__ASSET:thumbs/desert.jpg__","beach":"__ASSET:thumbs/beach.jpg__","nether":"__ASSET:thumbs/nether.jpg__","end":"__ASSET:thumbs/end.jpg__"};
function thumbs(){backdropThumbs();
  const cut=sceneBtns.none.getContext("2d");cut.fillStyle="#d9ddd4";for(let y=0;y<120;y+=12)for(let x=(y/12%2)*12;x<160;x+=24)cut.fillRect(x,y,12,12);cut.fillStyle="#b07a4f";cut.fillRect(62,30,36,40);cut.fillStyle="#3a6fb0";cut.fillRect(50,72,60,48);
  if(!THREE_OK){worldFail();return}
  for(const k in THUMBS){const im=new Image();im.onload=()=>sceneBtns[k].getContext("2d").drawImage(im,0,0,160,120);im.src=THUMBS[k]}
}
