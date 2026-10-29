// ================= Styles =================
// A style decides what the people are made of. Detection, masks, editing, worlds and print don't know
// which style is on. Each style has:
//   palette: [{name, avg:[r,g,b], lab, canvas (16×16 icon), group}]; groups {key: chip label}; on: groups on by default
//   toCells(pixels, w, h, dither, nearest): photo pixels (RGBA) → Int16Array of palette indices
//   drawCell(ctx, i, x, y, w, h, bevel, t): draws palette entry i into that rectangle
//   textured: cells carry a texture (offers 3D edges); minPx: warns when cells print smaller than this
//   unit/units/kinds/title/paletteLabel/listName: words for the labels; material: what the people are "made of" when
//   that isn't units (also the CSV's file name); amount(n); extra(total): more in the summary;
//   csv(list) for the materials list
// Retro pixel colors: DawnBringer's 16-color palette (free to use), and a 4-green handheld palette
const PIXELS=[];
[["retro",[["Black",20,12,28],["Plum",68,36,52],["Navy",48,52,109],["Slate",78,74,78],["Brown",133,76,48],["Forest",52,101,36],["Red",208,70,72],["Stone",117,113,97],
  ["Blue",89,125,206],["Orange",210,125,44],["Steel",133,149,161],["Green",109,170,44],["Peach",210,170,153],["Sky",109,194,202],["Yellow",218,212,94],["Cream",222,238,214]]],
 ["handheld",[["Darkest Green",15,56,15],["Dark Green",48,98,48],["Light Green",139,172,15],["Pale Green",155,188,15]]]
].forEach(([group,cols])=>cols.forEach(([name,r,g,b])=>{const cv=document.createElement("canvas");cv.width=cv.height=16;const x=cv.getContext("2d");
  const hex="rgb("+r+","+g+","+b+")";x.fillStyle=hex;x.fillRect(0,0,16,16);PIXELS.push({name,group,avg:[r,g,b],lab:toLab(r,g,b),hex,canvas:cv})}));
// Fuse beads: generic bead colours (no maker's names), with the skin and hair shades photos of people need.
// Each bead is drawn as a ring with its hole, on a darker shade of its own colour, so the people still read as colour.
const BEADS=[],PEG=29; // the usual large square pegboard
const beadShade=([r,g,b],f)=>"rgb("+[r,g,b].map(v=>Math.round(v*f)).join(",")+")";
function drawBead(ctx,e,x0,y0,bw,bh){ctx.fillStyle=e.gap;ctx.fillRect(x0,y0,bw,bh);
  if(bw<5){ctx.fillStyle=e.hex;ctx.fillRect(x0,y0,bw,bh);return} // too small to show the ring
  const cx=x0+bw/2,cy=y0+bh/2,r=Math.min(bw,bh)*.49,hr=r*.4,mid=(r+hr)/2,lw=(r-hr)*.38;
  ctx.beginPath();ctx.arc(cx,cy,r,0,2*Math.PI);ctx.arc(cx,cy,hr,0,2*Math.PI,true);ctx.fillStyle=e.hex;ctx.fill();
  ctx.lineWidth=lw;ctx.lineCap="round";
  ctx.beginPath();ctx.arc(cx,cy,mid,3.5,4.6);ctx.strokeStyle="rgba(255,255,255,.4)";ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,mid,.3,1.4);ctx.strokeStyle="rgba(0,0,0,.16)";ctx.stroke()}
[["basic",[["White",241,241,239],["Light grey",190,192,194],["Grey",138,141,145],["Dark grey",84,86,90],["Black",34,34,36],
  ["Red",191,38,48],["Dark red",125,30,38],["Orange",237,108,40],["Gold",240,166,50],["Yellow",247,210,40],["Light green",120,190,80],["Green",30,140,70],
  ["Dark green",30,85,55],["Light blue",110,170,225],["Blue",30,90,180],["Navy",35,45,95],["Purple",110,60,145],["Pink",230,110,160],["Magenta",200,45,120]]],
 ["skin",[["Cream",238,225,190],["Light peach",245,205,175],["Peach",230,170,135],["Tan",200,145,100],["Light brown",160,105,70],["Brown",110,70,45],["Dark brown",70,45,30]]],
 ["pastel",[["Pastel pink",245,190,205],["Pastel yellow",250,235,160],["Mint",170,225,195],["Pastel blue",175,210,240],["Lavender",195,175,225],["Pastel orange",250,200,150]]],
 ["neon",[["Neon yellow",225,240,50],["Neon orange",255,120,50],["Neon pink",255,70,150],["Neon green",80,230,90]]]
].forEach(([group,cols])=>cols.forEach(([name,r,g,b])=>{const avg=[r,g,b],e={name,group,avg,lab:toLab(r,g,b),hex:beadShade(avg,1),gap:beadShade(avg,.55)};
  e.canvas=document.createElement("canvas");e.canvas.width=e.canvas.height=16;drawBead(e.canvas.getContext("2d"),e,0,0,16,16);BEADS.push(e)}));
// Bricks: a mosaic of studded brick tops, seen from above, in generic plastic brick colours (no maker's names).
// Each cell is one stud; the build list cuts each row into 1 × n bricks and counts the baseplates.
const BRICKS=[],PLATE=32,BRICK_SIZES=[8,6,4,3,2,1];
function drawBrick(ctx,e,x0,y0,bw,bh){ctx.fillStyle=e.hex;ctx.fillRect(x0,y0,bw,bh);
  if(bw<6)return; // too small to show the stud
  const cx=x0+bw/2,cy=y0+bh/2,r=Math.min(bw,bh)*.3,lw=Math.max(1,bw*.04);
  ctx.fillStyle="rgba(0,0,0,.12)";ctx.fillRect(x0,y0+bh-lw,bw,lw);ctx.fillRect(x0+bw-lw,y0,lw,bh-lw); // the seam to the next stud
  ctx.beginPath();ctx.arc(cx+r*.14,cy+r*.2,r,0,2*Math.PI);ctx.fillStyle=e.shade;ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,r,0,2*Math.PI);ctx.fillStyle=e.hex;ctx.fill();
  ctx.lineWidth=r*.22;ctx.lineCap="round";ctx.beginPath();ctx.arc(cx,cy,r*.72,3.4,4.9);ctx.strokeStyle="rgba(255,255,255,.45)";ctx.stroke()}
[["basic",[["White",244,244,242],["Light grey",160,165,169],["Dark grey",99,95,98],["Black",33,37,41],["Red",196,30,30],["Dark red",120,25,25],
  ["Orange",245,130,30],["Yellow",245,205,50],["Lime",165,200,40],["Green",40,125,65],["Dark green",25,70,45],["Light blue",100,160,220],["Blue",20,85,180],
  ["Navy",20,45,90],["Purple",115,40,125],["Pink",230,165,195],["Sand",220,200,155],["Olive",135,130,85]]],
 ["skin",[["Light peach",246,215,180],["Peach",225,170,130],["Caramel",200,140,100],["Medium brown",165,115,80],["Reddish brown",105,62,40],["Dark brown",60,38,20]]],
 ["bright",[["Hot pink",235,80,150],["Magenta",180,45,130],["Turquoise",40,170,185],["Bright green",80,190,70],["Coral",250,115,100],["Lavender",190,160,220],["Gold",230,165,40],
  ["Sky blue",140,205,240],["Lemon",250,240,120]]]
].forEach(([group,cols])=>cols.forEach(([name,r,g,b])=>{const avg=[r,g,b],e={name,group,avg,lab:toLab(r,g,b),hex:beadShade(avg,1),shade:beadShade(avg,.68)};
  e.canvas=document.createElement("canvas");e.canvas.width=e.canvas.height=16;drawBrick(e.canvas.getContext("2d"),e,0,0,16,16);BRICKS.push(e)}));
const brickCount=()=>Object.values(brickRuns(S.view.cells,S.view.w,S.view.h,BRICK_SIZES)).reduce((a,k)=>a+k.reduce((x,y)=>x+y,0),0);
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]; // 4×4 ordered dithering: the checkerboard look of old consoles
const STYLES={
  blocks:{name:"Blocks",palette:BLOCKS,groups:SETS,on:Object.keys(SETS),textured:true,
    unit:"block",units:"blocks",kinds:"block types",title:"Blocks in the people",paletteLabel:"Block palette",listName:"block list",minPx:6,
    toCells:(d,w,h,dither,near)=>errorDiffuse(d,w,h,dither,near,BLOCKS),
    drawCell(ctx,i,x0,y0,bw,bh,bevel,t){ctx.drawImage(BLOCKS[i].canvas,0,0,16,16,x0,y0,bw,bh);
      if(bevel){ctx.fillStyle="rgba(255,255,255,.2)";ctx.fillRect(x0,y0,bw,t);ctx.fillRect(x0,y0+t,t,bh-t);
        ctx.fillStyle="rgba(0,0,0,.26)";ctx.fillRect(x0+t,y0+bh-t,bw-t,t);ctx.fillRect(x0+bw-t,y0+t,t,bh-2*t)}},
    amount:n=>stacks(n),extra:total=>stacks(total),
    csv:list=>[["Block","Count","Stacks of 64","Remainder"],...list.map(([id,n])=>[BLOCKS[id].name,n,Math.floor(n/64),n%64])]},
  pixel:{name:"Retro pixel",palette:PIXELS,groups:{retro:"16 colors",handheld:"4 greens"},on:["retro"],textured:false,
    unit:"pixel",units:"pixels",kinds:"colors",title:"Colors in the people",paletteLabel:"Pixel palette",listName:"color list",
    toCells(d,w,h,dither,near){const g=new Int16Array(w*h);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,o=dither?(BAYER[(y&3)*4+(x&3)]/16-.47)*48:0;g[y*w+x]=near(d[i]+o,d[i+1]+o,d[i+2]+o)}return g},
    drawCell(ctx,i,x0,y0,bw,bh){ctx.fillStyle=PIXELS[i].hex;ctx.fillRect(x0,y0,bw,bh)},
    amount:n=>fmt(n)+(n===1?" pixel":" pixels"),
    csv:list=>[["Color","Count","RGB"],...list.map(([id,n])=>[PIXELS[id].name,n,PIXELS[id].avg.join(" ")])]},
  beads:{name:"Fuse beads",palette:BEADS,groups:{basic:"Basics",skin:"Skin & hair",pastel:"Pastels",neon:"Neons"},on:["basic","skin","pastel"],textured:false,
    unit:"bead",units:"beads",kinds:"colors",title:"Beads in the people",paletteLabel:"Bead colors",listName:"bead list",minPx:8,
    toCells:(d,w,h,dither,near)=>errorDiffuse(d,w,h,dither,near,BEADS),
    drawCell(ctx,i,x0,y0,bw,bh){drawBead(ctx,BEADS[i],x0,y0,bw,bh)},
    amount:n=>fmt(n)+(n===1?" bead":" beads"),
    extra:()=>{const b=pegboards(S.view.cells,S.view.w,S.view.h,PEG).boards;return b+(b===1?" pegboard":" pegboards")+" ("+PEG+" × "+PEG+")"},
    csv:list=>{const p=pegboards(S.view.cells,S.view.w,S.view.h,PEG);
      return[["Bead color","Count","RGB"],...list.map(([id,n])=>[BEADS[id].name,n,BEADS[id].avg.join(" ")]),[],
        ["Pegboards "+PEG+" × "+PEG,p.boards,p.cols+" across × "+p.rows+" down"]]}},
  bricks:{name:"Bricks",palette:BRICKS,groups:{basic:"Basics",skin:"Skin & hair",bright:"Brights"},on:["basic","skin"],textured:false,
    unit:"stud",units:"studs",kinds:"colors",title:"Studs in the people",paletteLabel:"Brick colors",listName:"brick list",material:"bricks",minPx:8,
    toCells:(d,w,h,dither,near)=>errorDiffuse(d,w,h,dither,near,BRICKS),
    drawCell(ctx,i,x0,y0,bw,bh){drawBrick(ctx,BRICKS[i],x0,y0,bw,bh)},
    amount:n=>fmt(n)+(n===1?" stud":" studs"),
    extra:()=>{const n=brickCount(),b=pegboards(S.view.cells,S.view.w,S.view.h,PLATE).boards;
      return fmt(n)+(n===1?" brick":" bricks")+" · "+b+(b===1?" baseplate":" baseplates")+" ("+PLATE+" × "+PLATE+")"},
    // one row per colour: its studs, and the 1 × n bricks that build its rows
    csv:list=>{const runs=brickRuns(S.view.cells,S.view.w,S.view.h,BRICK_SIZES),p=pegboards(S.view.cells,S.view.w,S.view.h,PLATE);
      return[["Brick color","Studs","RGB",...BRICK_SIZES.map(n=>"1 × "+n)],...list.map(([id,n])=>[BRICKS[id].name,n,BRICKS[id].avg.join(" "),...runs[id]]),[],
        ["Baseplates "+PLATE+" × "+PLATE,p.boards,p.cols+" across × "+p.rows+" down"]]}},
};
// Photo: no cells drawn at all. compose() draws each person as the real photo, cut out (see photoLayer);
// the cells still exist, so moving, resizing, boxes, erasing and print work exactly as for the other styles.
STYLES.photo={name:"Photo",photo:true,palette:[(()=>{const cv=document.createElement("canvas");cv.width=cv.height=16;const x=cv.getContext("2d");
    x.fillStyle="#c58f6d";x.fillRect(0,0,16,16);x.fillStyle="#3a6fb0";x.fillRect(0,9,16,7);return{name:"Photo",group:"photo",avg:[0,0,0],lab:[0,0,0],canvas:cv}})()],
  groups:{photo:"Photo"},on:["photo"],textured:false,unit:"cell",units:"cells",kinds:"",title:"",paletteLabel:"",listName:"",
  toCells:(d,w,h)=>new Int16Array(w*h),drawCell(){},amount:()=>"",csv:()=>[]};
// Emoji: Google's Noto Emoji (Apache-2.0), a curated set the build lists here. Each cell is a tile of the emoji's
// own average colour with the emoji on top, so the mosaic still reads as colour from a distance. The images load the
// first time the style is picked (loadEmoji) and are cached offline like every other file.
const EMOJI_LIST=__EMOJI__; // [[name, group, label, file]]
let emojiReady=null;
STYLES.emoji={name:"Emoji",palette:[],groups:{colors:"Colors",food:"Food & nature",faces:"Faces & animals"},on:["colors","food","faces"],textured:false,
  unit:"emoji",units:"emoji",kinds:"kinds",title:"Emoji in the people",paletteLabel:"Emoji",listName:"emoji list",
  toCells:(d,w,h,dither,near)=>errorDiffuse(d,w,h,dither,near,STYLES.emoji.palette),
  drawCell(ctx,i,x0,y0,bw,bh){const e=STYLES.emoji.palette[i],m=Math.max(0,Math.round(bw*.06));ctx.fillStyle=e.hex;ctx.fillRect(x0,y0,bw,bh);
    ctx.imageSmoothingEnabled=true;ctx.drawImage(e.img,x0+m,y0+m,bw-2*m,bh-2*m);ctx.imageSmoothingEnabled=false},
  amount:n=>fmt(n)+(n===1?" cell":" cells"),csv:list=>[["Emoji","Count"],...list.map(([id,n])=>[STYLES.emoji.palette[id].label,n])]};
function loadEmoji(){return emojiReady||(emojiReady=Promise.all(EMOJI_LIST.map(([name,group,label,file])=>new Promise((res,rej)=>{const img=new Image();
  img.onload=()=>{const c=document.createElement("canvas");c.width=c.height=16;const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(img,0,0,16,16);
    // colour of the emoji itself: transparent pixels don't count
    const d=x.getImageData(0,0,16,16).data;let r=0,g=0,b=0,a=0;for(let i=0;i<d.length;i+=4){const w=d[i+3]/255;r+=d[i]*w;g+=d[i+1]*w;b+=d[i+2]*w;a+=w}
    const avg=a?[r/a,g/a,b/a]:[255,255,255],hex="rgb("+avg.map(Math.round).join(",")+")",icon=document.createElement("canvas");icon.width=icon.height=16;
    const ix=icon.getContext("2d");ix.fillStyle=hex;ix.fillRect(0,0,16,16);ix.drawImage(img,1,1,14,14);
    res({name:label,key:name,group,label,img,avg,lab:toLab(...avg),hex,canvas:icon})};img.onerror=()=>rej(new Error("emoji "+name+" didn't load"));img.src=file})))
  .then(p=>{STYLES.emoji.palette=p;return p}).catch(e=>{emojiReady=null;throw e}))}
const ST=()=>STYLES[S.style];
