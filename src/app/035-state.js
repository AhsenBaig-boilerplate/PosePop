// ================= State =================
const S={width:64,style:"blocks",look:"clean",groups:Object.fromEntries(Object.entries(STYLES).map(([k,st])=>[k,new Set(st.on)])),dither:false,bevel:true,shadow:true,grid:false,
  scene:"plains",media:"sticker",inches:3,count:2,zoom:true,focus:null,border:1,tool:"move",brushSize:2,fixes:[],place:[],sel:0,boxes:[],boxesFull:[],
  moveMode:"group",gplace:{dx:0,dy:0,s:1},edges:[],boxSel:0,bgColor:"#ffffff",bgImage:null,
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
// CIEDE2000 colour difference (Sharma, Wu & Dalal 2005). Used to judge stray cells and for the colour-error
// figure in ?debug=1. Not for choosing blocks: there it pulled dark greys towards blue on real photos.
function deltaE00(x,y){
  const[L1,a1,b1]=x,[L2,a2,b2]=y,rad=Math.PI/180,C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),Cm=(C1+C2)/2,G=.5*(1-Math.sqrt(Cm**7/(Cm**7+25**7)));
  const p1=a1*(1+G),p2=a2*(1+G),C1p=Math.hypot(p1,b1),C2p=Math.hypot(p2,b2),hp=(b,a)=>{if(!b&&!a)return 0;const h=Math.atan2(b,a)/rad;return h<0?h+360:h};
  const h1=hp(b1,p1),h2=hp(b2,p2),dL=L2-L1,dC=C2p-C1p;let dh=0;if(C1p*C2p){dh=h2-h1;if(dh>180)dh-=360;else if(dh<-180)dh+=360}
  const dH=2*Math.sqrt(C1p*C2p)*Math.sin(dh*rad/2),Lm=(L1+L2)/2,Cmp=(C1p+C2p)/2;let hm=h1+h2;
  if(C1p*C2p){hm=Math.abs(h1-h2)>180?(h1+h2+(h1+h2<360?360:-360))/2:(h1+h2)/2}
  const T=1-.17*Math.cos((hm-30)*rad)+.24*Math.cos(2*hm*rad)+.32*Math.cos((3*hm+6)*rad)-.2*Math.cos((4*hm-63)*rad);
  const SL=1+.015*(Lm-50)**2/Math.sqrt(20+(Lm-50)**2),SC=1+.045*Cmp,SH=1+.015*Cmp*T;
  const RT=-2*Math.sqrt(Cmp**7/(Cmp**7+25**7))*Math.sin(60*Math.exp(-(((hm-275)/25)**2))*rad);
  return Math.sqrt((dL/SL)**2+(dC/SC)**2+(dH/SH)**2+RT*(dC/SC)*(dH/SH))}
