// ================= Styles =================
// A style decides what the people are made of. Detection, masks, editing, worlds and print don't know
// which style is on. Each style has:
//   palette: [{name, avg:[r,g,b], lab, canvas (16×16 icon), group}]; groups {key: chip label}; on: groups on by default
//   toCells(pixels, w, h, dither, nearest): photo pixels (RGBA) → Int16Array of palette indices
//   drawCell(ctx, i, x, y, w, h, bevel, t): draws palette entry i into that rectangle
//   textured: cells carry a texture (offers 3D edges, warns when cells print too small)
//   unit/units/kinds/title/paletteLabel/listName: words for the labels; amount(n); csv(list) for the materials list
// Retro pixel colors: DawnBringer's 16-color palette (free to use), and a 4-green handheld palette
const PIXELS=[];
[["retro",[["Black",20,12,28],["Plum",68,36,52],["Navy",48,52,109],["Slate",78,74,78],["Brown",133,76,48],["Forest",52,101,36],["Red",208,70,72],["Stone",117,113,97],
  ["Blue",89,125,206],["Orange",210,125,44],["Steel",133,149,161],["Green",109,170,44],["Peach",210,170,153],["Sky",109,194,202],["Yellow",218,212,94],["Cream",222,238,214]]],
 ["handheld",[["Darkest Green",15,56,15],["Dark Green",48,98,48],["Light Green",139,172,15],["Pale Green",155,188,15]]]
].forEach(([group,cols])=>cols.forEach(([name,r,g,b])=>{const cv=document.createElement("canvas");cv.width=cv.height=16;const x=cv.getContext("2d");
  const hex="rgb("+r+","+g+","+b+")";x.fillStyle=hex;x.fillRect(0,0,16,16);PIXELS.push({name,group,avg:[r,g,b],lab:toLab(r,g,b),hex,canvas:cv})}));
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]; // 4×4 ordered dithering: the checkerboard look of old consoles
const STYLES={
  blocks:{name:"Blocks",palette:BLOCKS,groups:SETS,on:Object.keys(SETS),textured:true,
    unit:"block",units:"blocks",kinds:"block types",title:"Blocks in the people",paletteLabel:"Block palette",listName:"block list",
    toCells:(d,w,h,dither,near)=>errorDiffuse(d,w,h,dither,near,BLOCKS),
    drawCell(ctx,i,x0,y0,bw,bh,bevel,t){ctx.drawImage(BLOCKS[i].canvas,0,0,16,16,x0,y0,bw,bh);
      if(bevel){ctx.fillStyle="rgba(255,255,255,.2)";ctx.fillRect(x0,y0,bw,t);ctx.fillRect(x0,y0+t,t,bh-t);
        ctx.fillStyle="rgba(0,0,0,.26)";ctx.fillRect(x0+t,y0+bh-t,bw-t,t);ctx.fillRect(x0+bw-t,y0+t,t,bh-2*t)}},
    amount:n=>stacks(n),
    csv:list=>[["Block","Count","Stacks of 64","Remainder"],...list.map(([id,n])=>[BLOCKS[id].name,n,Math.floor(n/64),n%64])]},
  pixel:{name:"Retro pixel",palette:PIXELS,groups:{retro:"16 colors",handheld:"4 greens"},on:["retro"],textured:false,
    unit:"pixel",units:"pixels",kinds:"colors",title:"Colors in the people",paletteLabel:"Pixel palette",listName:"color list",
    toCells(d,w,h,dither,near){const g=new Int16Array(w*h);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,o=dither?(BAYER[(y&3)*4+(x&3)]/16-.47)*48:0;g[y*w+x]=near(d[i]+o,d[i+1]+o,d[i+2]+o)}return g},
    drawCell(ctx,i,x0,y0,bw,bh){ctx.fillStyle=PIXELS[i].hex;ctx.fillRect(x0,y0,bw,bh)},
    amount:n=>fmt(n)+(n===1?" pixel":" pixels"),
    csv:list=>[["Color","Count","RGB"],...list.map(([id,n])=>[PIXELS[id].name,n,PIXELS[id].avg.join(" ")])]},
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
