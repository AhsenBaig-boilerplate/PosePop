// ================= Person block palette (2D) =================
const SETS={wool:"Wool",concrete:"Concrete",terracotta:"Terracotta",natural:"Natural & ores"};
const DYES=["White","Orange","Magenta","Light Blue","Yellow","Lime","Pink","Gray","Light Gray","Cyan","Purple","Blue","Brown","Green","Red","Black"];
const WOOL=[[233,236,236],[240,118,19],[189,68,179],[58,175,217],[248,197,39],[112,185,25],[237,141,172],[62,68,71],[142,142,134],[21,137,145],[121,42,172],[53,57,157],[114,71,40],[84,109,27],[160,39,34],[20,21,25]];
const CONC=[[207,213,214],[224,97,0],[169,48,159],[35,137,198],[240,175,21],[94,168,24],[213,101,142],[54,57,61],[125,125,115],[21,119,136],[100,31,156],[44,46,143],[96,59,31],[73,91,36],[142,32,32],[8,10,15]];
const TERR=[[209,178,161],[161,83,37],[149,88,108],[113,108,137],[186,133,35],[103,117,52],[161,78,78],[57,42,35],[135,106,97],[86,91,91],[118,70,86],[74,59,91],[77,51,35],[76,83,42],[143,61,46],[37,22,16]];
const BLOCKS=[];
DYES.forEach((d,i)=>{BLOCKS.push({name:d+" Wool",set:"wool",c:WOOL[i],t:"wool"});BLOCKS.push({name:d+" Concrete",set:"concrete",c:CONC[i],t:"flat"});BLOCKS.push({name:d+" Terracotta",set:"terracotta",c:TERR[i],t:"clay"})});
BLOCKS.push({name:"Terracotta",set:"terracotta",c:[152,94,67],t:"clay"});
[["Stone",[125,125,125],"noise"],["Cobblestone",[122,122,122],"cobble"],["Andesite",[136,136,137],"speckle"],["Granite",[149,103,85],"speckle"],["Diorite",[188,188,188],"speckle"],
 ["Deepslate",[80,80,82],"noise"],["Dirt",[134,96,67],"speckle"],["Sand",[219,207,163],"noise"],["Red Sand",[190,102,33],"noise"],["Sandstone",[216,203,155],"layers"],
 ["Clay",[160,166,179],"noise"],["Snow Block",[249,254,254],"flat"],["Packed Ice",[141,180,250],"noise"],
 ["Oak Planks",[162,130,78],"planks"],["Spruce Planks",[114,84,48],"planks"],["Birch Planks",[192,175,121],"planks"],["Dark Oak Planks",[66,43,20],"planks"],["Acacia Planks",[168,90,50],"planks"],
 ["Bricks",[150,97,83],"bricks"],["Nether Bricks",[44,21,26],"bricks"],["Netherrack",[97,38,38],"speckle"],["End Stone",[219,222,158],"speckle"],["Obsidian",[15,10,24],"speckle"],
 ["Block of Gold",[246,208,61],"metal"],["Block of Iron",[220,220,220],"metal"],["Block of Diamond",[98,237,228],"metal"],["Block of Emerald",[42,203,87],"metal"],
 ["Lapis Lazuli Block",[30,67,140],"speckle"],["Block of Redstone",[175,24,5],"speckle"],["Block of Coal",[16,15,15],"speckle"],["Block of Quartz",[235,229,222],"flat"],
 ["Hay Bale",[166,136,38],"layers"],["Pumpkin",[198,118,24],"layers"],["Melon",[111,145,30],"layers"]
].forEach(([name,c,t])=>BLOCKS.push({name,set:"natural",c,t}));
function makeTexture(b){
  const r=rng(hash(b.name)),d=new Uint8ClampedArray(1024),[R,G,B]=b.c,cell=[];for(let i=0;i<16;i++)cell.push(r());
  const put=(x,y,k,mix)=>{const o=(y*16+x)*4;if(mix){d[o]=mix[0];d[o+1]=mix[1];d[o+2]=mix[2]}else{d[o]=R*k;d[o+1]=G*k;d[o+2]=B*k}d[o+3]=255};
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const n=r()-.5;let k=1;
    switch(b.t){case"flat":k=1+n*.05;break;case"noise":k=1+n*.16;break;case"clay":k=1+n*.1;break;
      case"wool":k=1+n*.1+(((x+(y>>1))&3)<2?.045:-.045);break;case"speckle":k=1+n*.22+(r()<.08?-.18:0)+(r()<.05?.15:0);break;
      case"cobble":{const c=cell[((x>>2)+(y>>2)*4)&15];k=.84+c*.32+n*.08;if((x&3)===0&&(y&1))k*=.8;break}
      case"planks":{const band=y>>2;k=1+n*.06+Math.sin((x+band*5)*.9)*.05;if((y&3)===3)k=.7;const seam=(band*7+3)&15;if(x===seam&&(y&3)!==3)k=.78;break}
      case"bricks":{const off=(y>>2)&1?4:0;if((y&3)===3||((x+off)&7)===7){put(x,y,1,[R*.55+90,G*.55+88,B*.55+84]);continue}k=1+n*.12;break}
      case"layers":k=1+n*.08+((y%5)===0?-.12:0);break;
      case"metal":k=1+n*.04;if(x===0||y===0)k+=.14;if(x===15||y===15)k-=.2;break}
    put(x,y,k)}
  const cv=document.createElement("canvas");cv.width=cv.height=16;cv.getContext("2d").putImageData(new ImageData(d,16,16),0,0);
  const s=[0,0,0];for(let i=0;i<1024;i+=4){s[0]+=d[i];s[1]+=d[i+1];s[2]+=d[i+2]}
  b.avg=s.map(v=>v/256);b.tex=d;b.canvas=cv;b.lab=toLab(...b.avg);
  // how grainy the texture is (luminance spread relative to brightness); the Clean look prefers smooth blocks
  const mL=b.avg[0]*.299+b.avg[1]*.587+b.avg[2]*.114;let v=0;for(let i=0;i<1024;i+=4){const L=d[i]*.299+d[i+1]*.587+d[i+2]*.114;v+=(L-mL)**2}
  b.busy=Math.sqrt(v/256)/Math.max(20,mL);
}
function lin(v){v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}
function toLab(r,g,b){r=lin(r);g=lin(g);b=lin(b);let X=(r*.4124+g*.3576+b*.1805)/.95047,Y=r*.2126+g*.7152+b*.0722,Z=(r*.0193+g*.1192+b*.9505)/1.08883;
  const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;X=f(X);Y=f(Y);Z=f(Z);return[116*Y-16,500*(X-Y),200*(Y-Z)]}
BLOCKS.forEach(makeTexture);BLOCKS.forEach(b=>b.group=b.set);
