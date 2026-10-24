// ================= Styles =================
// A style decides what the people are made of. Detection, masks, editing, worlds and print don't know
// which style is on. Each style has:
//   palette: [{name, avg:[r,g,b], lab, canvas (16×16 icon), group}]; groups {key: chip label}; on: groups on by default
//   toCells(pixels, w, h, dither, nearest): photo pixels (RGBA) → Int16Array of palette indices
//   drawCell(ctx, i, x, y, w, h, bevel, t): draws palette entry i into that rectangle
//   textured: cells carry a texture (offers 3D edges, warns when cells print too small)
//   unit/units/kinds/title/paletteLabel/listName: words for the labels; amount(n); csv(list) for the materials list
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
const ST=()=>STYLES[S.style];
