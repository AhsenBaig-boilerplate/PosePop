// ================= State =================
const S={width:64,style:"blocks",look:"clean",groups:Object.fromEntries(Object.entries(STYLES).map(([k,st])=>[k,new Set(st.on)])),dither:false,bevel:true,shadow:true,grid:false,
  scene:"plains",media:"sticker",inches:3,count:2,zoom:true,focus:null,border:1,tool:"move",brushSize:2,fixes:[],place:[],sel:0,boxes:[],boxesFull:[],
  moveMode:"group",gplace:{dx:0,dy:0,s:1},edges:[],boxSel:0,deco:[],decoSel:-1,bgColor:"#ffffff",bgImage:null,
  src:null,alpha:null,segMode:"loading",result:null,view:null,layout:null};
let palette=[],palEntries=BLOCKS,nearest=()=>0;
function buildPalette(){const st=ST(),on=S.groups[S.style];palEntries=st.palette;palette=st.palette.map((b,i)=>i).filter(i=>on.has(st.palette[i].group));nearest=makeNearest(palette,0)}
// nearest palette entry in CIELAB among ids, with a 64³ cache; smooth > 0 adds a cost for grainy textures
function makeNearest(ids,smooth){const pal=palEntries,cache=new Int16Array(262144).fill(-1);
  return(r,g,b)=>{r=r<0?0:r>255?255:r;g=g<0?0:g>255?255:g;b=b<0?0:b>255?255:b;
    const k=((r>>2)<<12)|((g>>2)<<6)|(b>>2),hit=cache[k];if(hit>=0)return hit;
    const L=toLab((r&252)+2,(g&252)+2,(b&252)+2);cache[k]=closest(L,ids,pal,smooth);return cache[k]}}
function closest(L,ids,pal,smooth){let best=-1,bd=1e18;
  for(const i of ids){const q=pal[i].lab,a=L[0]-q[0],c=L[1]-q[1],e=L[2]-q[2],t=smooth*(pal[i].busy||0),dd=a*a+c*c+e*e+t*t;if(dd<bd){bd=dd;best=i}}return best}
