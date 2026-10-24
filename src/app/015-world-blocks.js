// ================= World blocks (3D) =================
const WB={
  grass:{top:"grass_top",side:"grass_side",bottom:"dirt"},
  snowy_grass:{top:"snow",side:"snowy_side",bottom:"dirt"},
  path:{top:"path_top",side:"path_side",bottom:"dirt"},
  dirt:{all:"dirt"},stone:{all:"stone"},cobblestone:{all:"cobblestone"},coal_ore:{all:"coal_ore"},gravel:{all:"gravel"},
  sand:{all:"sand"},red_sand:{all:"red_sand"},sandstone:{top:"sandstone_top",side:"sandstone_side",bottom:"sandstone_top"},
  oak_log:{top:"oak_log_top",side:"oak_log_side"},spruce_log:{top:"spruce_log_top",side:"spruce_log_side"},
  oak_leaves:{all:"oak_leaves",cut:true},spruce_leaves:{all:"spruce_leaves",cut:true},snowy_leaves:{top:"snow",side:"snowy_leaves",bottom:"spruce_leaves",cut:true},
  oak_planks:{all:"oak_planks"},spruce_planks:{all:"spruce_planks"},glass:{all:"glass",cut:true,clear:true},
  snow:{all:"snow"},ice:{all:"ice"},cactus:{top:"cactus_top",side:"cactus_side"},
  terracotta_orange:{all:"terracotta_orange"},terracotta_white:{all:"terracotta_white"},
  netherrack:{all:"netherrack"},nether_bricks:{all:"nether_bricks"},glowstone:{all:"glowstone",glow:true},soul_sand:{all:"soul_sand"},
  end_stone:{all:"end_stone"},obsidian:{all:"obsidian"},crystal:{all:"crystal",glow:true},
  hay:{top:"hay_top",side:"hay_side"},cloud:{all:"cloud",glow:true,cloud:true},
  crimson_nylium:{top:"crimson_nylium_top",side:"crimson_nylium_side",bottom:"netherrack"},crimson_stem:{top:"crimson_stem_top",side:"crimson_stem_side"},
  nether_wart:{all:"nether_wart"},shroomlight:{all:"shroomlight",glow:true},portal:{all:"portal",glow:true,cut:true,clear:true},lavafall:{all:"lava",glow:true},
  bedrock:{all:"bedrock"},end_portal:{all:"end_portal",glow:true},dragon_egg:{all:"dragon_egg"},purpur:{all:"purpur"},
  purpur_pillar:{top:"purpur_pillar_top",side:"purpur_pillar_side"},end_stone_bricks:{all:"end_stone_bricks"},
  chorus_plant:{all:"chorus_plant"},chorus_flower:{all:"chorus_flower",glow:true},iron_bars:{all:"iron_bars",cut:true},magenta_glass:{all:"magenta_glass",cut:true,clear:true}
};
const FACE_SHADE=[.8,.8,1,.55,.9,.7]; // +x -x +y -y +z(toward camera) -z

const X0=-130,X1=130,Z0=-170,Z1=10,WX=X1-X0+1,WZ=Z1-Z0+1,NONE=-999;
const key=(x,y,z)=>((x-X0)*WZ+(z-Z0))*256+(y+64);

const SCENES=[
 {k:"none",label:"Cut-out"},
 {k:"original",label:"Original photo"},
 {k:"color",label:"Color"},
 {k:"image",label:"Your image"},
 {k:"plains",label:"Plains"},
 {k:"village",label:"Village"},
 {k:"mountains",label:"Mountains"},
 {k:"taiga",label:"Snowy taiga"},
 {k:"desert",label:"Desert"},
 {k:"beach",label:"Beach sunset"},
 {k:"nether",label:"The Nether"},
 {k:"end",label:"The End"}
];

function makeWorld(kind){
  const R=rng(hash(kind)),H=new Int16Array(WX*WZ).fill(NONE),blocks=new Map(),plants=[];
  const iH=(x,z)=>(x-X0)*WZ+(z-Z0);
  const hAt=(x,z)=>x<X0||x>X1||z<Z0||z>Z1?NONE:H[iH(x,z)];
  const put=(x,y,z,n)=>{if(n)blocks.set(key(x,y,z),n);else blocks.delete(key(x,y,z))};
  const has=(x,y,z)=>blocks.has(key(x,y,z));
  const S={sky:["#5f8fe8","#a9c8ff"],fog:"#b8d2ff",near:40,far:165,water:null,lava:null,clouds:true,sun:{x:.8,y:.12,s:.06,c:"#fff7c2"},stars:false,eye:1.62,surface:()=>"grass",sub:()=>"dirt",deep:"stone"};
  let height=()=>0;
  const d=z=>Math.max(0,-z); // distance ahead of the camera
  const seed=hash(kind)%1000;
  switch(kind){
    case"plains":height=(x,z)=>Math.round(fbm(x/26,z/26,seed)*5*ramp(d(z),8,30)-1.5*ramp(d(z),8,30)+Math.max(0,fbm(x/60,z/60,seed+3)*30-12)*ramp(d(z),45,100));
      S.water=0;break;
    case"village":height=(x,z)=>Math.round((fbm(x/30,z/30,seed)*3-1)*ramp(d(z),26,45)+Math.max(0,fbm(x/60,z/60,seed+3)*30-13)*ramp(d(z),55,110));S.water=-1;break;
    case"mountains":height=(x,z)=>{const r1=1-Math.abs(fbm(x/55,z/55,seed)*2-1);return Math.round(fbm(x/20,z/20,seed+1)*4*ramp(d(z),6,25)+Math.pow(r1,2.2)*70*ramp(d(z),30,95)+fbm(x/9,z/9,seed+2)*6*ramp(d(z),40,90))};
      S.surface=(x,y,z,slope)=>y>34?"snow":slope>2?"stone":"grass";S.sub=(x,y,z,dep,slope)=>slope>2||y>20?"stone":"dirt";S.water=-2;S.sky=["#4f86e6","#b3cff7"];S.fog="#bcd3f5";break;
    case"taiga":height=(x,z)=>Math.round(fbm(x/24,z/24,seed)*7*ramp(d(z),8,30)-2*ramp(d(z),8,26)+Math.max(0,fbm(x/50,z/50,seed+3)*34-14)*ramp(d(z),45,100));
      S.surface=()=>"snowy_grass";S.water=-1;S.ice=true;S.sky=["#8ea6c8","#d8e3ef"];S.fog="#d9e2ec";S.sun=null;S.snowfall=true;S.near=25;S.far=140;break;
    case"desert":height=(x,z)=>{const dn=(Math.sin(x/8+fbm(x/20,z/20,seed)*6)*.5+.5);return Math.round(dn*3*ramp(d(z),8,26)+fbm(x/40,z/40,seed+4)*10*ramp(d(z),30,80)-1)};
      S.surface=()=>"sand";S.sub=(x,y,z,dep)=>dep<3?"sand":"sandstone";S.deep="sandstone";S.sky=["#6aa0ee","#c9dcf4"];S.fog="#dfe4e6";S.sun={x:.2,y:.1,s:.07,c:"#fffbd8"};S.clouds=false;break;
    case"beach":height=(x,z)=>{const dz=d(z);if(dz<9)return 0;if(Math.hypot(x-34,z+92)<16)return Math.round(3-Math.hypot(x-34,z+92)/4);return Math.max(-7,Math.round(-(dz-9)*.45))};
      S.surface=(x,y)=>"sand";S.sub=()=>"sand";S.deep="sandstone";S.water=0;S.sky=["#3d2a6b","#ff9c5a"];S.fog="#f29a66";S.sun={x:.5,y:.36,s:.12,c:"#ffd35a",glow:"#ff7a3a"};S.near=30;S.far=170;break;
    case"nether":height=(x,z)=>{const dz=d(z),n=fbm(x/14,z/14,seed);
        if(dz<15+n*6)return Math.round(n*2.4-.6);                       // crimson ledge we stand on
        if(dz<92)return Math.round(-7+fbm(x/9,z/9,seed+2)*3);           // lava sea floor
        return Math.round(-6+Math.pow(ramp(dz,96,112),.7)*(18+fbm(x/22,z/22,seed+4)*16))}; // far cliffs
      S.surface=(x,y,z)=>-z<22&&y>-3?"crimson_nylium":"netherrack";S.sub=()=>"netherrack";S.deep="netherrack";S.lava=-3;S.eye=4.5;
      S.sky=["#1c0404","#8a2a12"];S.fog="#7a2410";S.near=40;S.far=230;S.sun=null;S.clouds=false;S.ash=true;break;
    case"end":height=(x,z)=>{const r=Math.hypot(x*.7,(z+6)*1.1);if(r>58+fbm(x/9,z/9,seed)*12)return NONE;return Math.round(1-Math.pow(r/60,3)*3+fbm(x/14,z/14,seed)*2.5)};
      S.surface=()=>"end_stone";S.sub=()=>"end_stone";S.deep="end_stone";S.eye=2.4;S.sky=["#040108","#2a1440"];S.fog="#24122f";S.near=45;S.far=210;S.sun=null;S.clouds=false;S.stars=true;S.nebula=true;break;
  }
  for(let x=X0;x<=X1;x++)for(let z=Z0;z<=Z1;z++)H[iH(x,z)]=height(x,z);

  // ---- terrain shaping for features ----
  const flatten=(x0,z0,x1,z1,y)=>{for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)if(hAt(x,z)!==NONE)H[iH(x,z)]=y};
  const near=[];const free=(x,z,r)=>near.every(p=>Math.hypot(p[0]-x,p[1]-z)>r+p[2]);
  if(kind==="plains"){for(let x=-22;x<=-6;x++)for(let z=-34;z<=-20;z++){const q=Math.hypot((x+14)/8,(z+27)/6.5);if(q<1)H[iH(x,z)]=Math.min(H[iH(x,z)],q<.6?-2:-1)}near.push([-14,-27,9])}
  if(kind==="village"){
    for(const h of[[-17,-26,7,6],[9,-30,8,6],[-6,-48,6,5],[18,-52,7,6]]){flatten(h[0]-2,h[1]-2,h[0]+h[2]+1,h[1]+h[3]+1,0);near.push([h[0]+h[2]/2,h[1]+h[3]/2,6])}
    for(let z=-60;z<=Z1;z++)for(let x=-1;x<=1;x++)H[iH(x,z)]=0;
  }
  if(kind==="desert"){flatten(10,-66,34,-42,0);near.push([22,-54,15])}
  if(kind==="taiga"){for(let x=-30;x<=4;x++)for(let z=-40;z<=-22;z++){const q=Math.hypot((x+13)/14,(z+31)/7);if(q<1)H[iH(x,z)]=-2}near.push([-13,-31,13])}

  // ---- materialize terrain columns ----
  const inView=(x,z)=>Math.abs(x+.5)<=14+(6.5-z)*.86;
  for(let x=X0;x<=X1;x++)for(let z=Z0;z<=Z1;z++){
    const h=H[iH(x,z)];if(h===NONE||!inView(x,z))continue;
    let mn=h,mx=h;for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=hAt(x+a,z+b);const v=n===NONE?-40:n;if(v<mn)mn=v;if(v>mx)mx=v}
    const slope=h-mn,low=Math.max(mn+1,h-24,kind==="end"?h-10:-40);
    for(let y=h;y>=Math.min(h,low);y--){const dep=h-y;
      let n=dep===0?S.surface(x,y,z,slope):dep<4?S.sub(x,y,z,dep,slope):S.deep;
      if(dep===0&&S.water!=null&&y<S.water&&n==="grass")n=R()<.5?"sand":"gravel";
      if(dep===0&&S.water!=null&&y<S.water&&n==="snowy_grass")n="dirt";
      if(kind==="mountains"&&dep>0&&n==="stone"&&R()<.04)n="coal_ore";
      put(x,y,z,n);
    }
    if(kind==="end"&&mn===-40)for(let y=low-1;y>=h-10;y--)put(x,y,z,"end_stone");
  }

  // ---- features ----
  const top=(x,z)=>hAt(x,z);
  function oak(x,z){const b=top(x,z)+1,t=4+(R()*3|0);for(let i=0;i<t;i++)put(x,b+i,z,"oak_log");
    for(let dy=t-2;dy<=t+1;dy++){const rr=dy<t?2:1;for(let dx=-rr;dx<=rr;dx++)for(let dz=-rr;dz<=rr;dz++){
      if(Math.abs(dx)===rr&&Math.abs(dz)===rr&&(dy===t+1||R()<.5))continue;if(!has(x+dx,b+dy,z+dz))put(x+dx,b+dy,z+dz,"oak_leaves")}}}
  function spruce(x,z,snowy){const b=top(x,z)+1,t=7+(R()*5|0);for(let i=0;i<t;i++)put(x,b+i,z,"spruce_log");
    const L=snowy?"snowy_leaves":"spruce_leaves";put(x,b+t,z,L);
    for(let k=1;k<=t-2;k++){const y=b+t-k;const rr=k===1?1:(k%2===0?Math.min(3,1+Math.floor(k/3)):Math.max(1,Math.floor(k/3)));
      for(let dx=-rr;dx<=rr;dx++)for(let dz=-rr;dz<=rr;dz++){if(dx===0&&dz===0)continue;if(Math.abs(dx)+Math.abs(dz)>rr+(rr>1?1:0))continue;if(!has(x+dx,y,z+dz))put(x+dx,y,z+dz,L)}}}
  function cactus(x,z){const b=top(x,z)+1,t=2+(R()*2|0);for(let i=0;i<t;i++)put(x,b+i,z,"cactus")}
  function scatter(n,minD,maxD,minX,fn,space){let tries=0;while(n>0&&tries++<n*60){
      const z=-(minD+R()*(maxD-minD))|0,x=Math.round((R()*2-1)*(30+(-z)*1.1));
      if(Math.abs(x)<minX+(-z)*.08)continue;const h=top(x,z);if(h===NONE||(S.water!=null&&h<S.water)||(S.lava!=null&&h<=S.lava))continue;if(!free(x,z,space))continue;
      near.push([x,z,space]);fn(x,z);n--}}
  function plant(x,z,type){const h=top(x,z);if(h===NONE||has(x,h+1,z))return;const tb=blocks.get(key(x,h,z));if(tb!=="grass")return;plants.push([x,h+1,z,type])}
  function house(x0,z0,w,dd){const b=0;
    for(let x=x0;x<x0+w;x++)for(let z=z0;z<z0+dd;z++)put(x,b,z,"cobblestone");
    for(let y=b+1;y<=b+4;y++)for(let x=x0;x<x0+w;x++)for(let z=z0;z<z0+dd;z++){
      const edgeX=x===x0||x===x0+w-1,edgeZ=z===z0||z===z0+dd-1;if(!edgeX&&!edgeZ)continue;
      const corner=edgeX&&edgeZ;let n=corner?"oak_log":"oak_planks";
      if(!corner&&y===b+2&&((edgeZ&&(x-x0)%3===1)||(edgeX&&(z-z0)%3===1)))n="glass";
      if(y===b+4&&!corner)n="oak_planks";
      const door=z===z0+dd-1&&x===x0+(w>>1)&&y<=b+2;if(door)continue;
      put(x,y,z,n)}
    for(let i=0;;i++){const za=z0-1+i,zb=z0+dd-i,y=b+5+i;if(za>zb)break;
      for(let x=x0-1;x<=x0+w;x++){put(x,y,za,"spruce_planks");put(x,y,zb,"spruce_planks")}
      for(let z=za+1;z<zb;z++){put(x0,y,z,"oak_planks");put(x0+w-1,y,z,"oak_planks")}}
    put(x0+(w>>1)-1,b+1,z0+dd,"hay");}

  if(kind==="plains"){scatter(26,14,90,4,oak,4);for(let i=0;i<500;i++){const z=-(7+R()*40)|0,x=Math.round((R()*2-1)*(8+(-z)*.9));const q=R();plant(x,z,q<.08?"poppy":q<.15?"dandelion":"short_grass")}}
  if(kind==="village"){house(-17,-26,7,6);house(9,-30,8,6);house(-6,-48,6,5);house(18,-52,7,6);
    for(let z=-60;z<=Z1;z++)for(let x=-1;x<=1;x++)if(blocks.get(key(x,0,z))==="grass")put(x,0,z,"path");
    scatter(18,20,95,6,oak,4);for(let i=0;i<300;i++){const z=-(7+R()*30)|0,x=Math.round((R()*2-1)*(8+(-z)*.9));if(Math.abs(x)<3)continue;const q=R();plant(x,z,q<.07?"poppy":q<.13?"dandelion":"short_grass")}}
  if(kind==="mountains"){scatter(30,12,75,4,(x,z)=>top(x,z)<22&&spruce(x,z,false),3);for(let i=0;i<300;i++){const z=-(7+R()*30)|0,x=Math.round((R()*2-1)*(8+(-z)*.9));plant(x,z,R()<.1?"dandelion":"short_grass")}}
  if(kind==="taiga")scatter(40,10,90,4,(x,z)=>spruce(x,z,true),3);
  if(kind==="desert"){scatter(22,10,80,4,cactus,4);
    const cx=22,cz=-54,b=0;for(let i=0;i<12;i++){const s=11-i,y=b+1+i,n=i%4===2?"terracotta_orange":i%4===3?"terracotta_white":"sandstone";
      for(let x=cx-s;x<=cx+s;x++)for(let z=cz-s;z<=cz+s;z++)if(Math.abs(x-cx)===s||Math.abs(z-cz)===s||i===11)put(x,y,z,n)}}
  if(kind==="beach"){const h0=top(34,-92);oak(33,-92);oak(37,-95);for(let i=0;i<5;i++)oak(-40-(i*9),-30-(i*13)%20)}
  if(kind==="nether"){
    // crimson fungi on the ledge, with shroomlights and weeping vines
    const fungus=(x,z)=>{const b=top(x,z)+1,t=4+(R()*4|0);for(let i=0;i<t;i++)put(x,b+i,z,"crimson_stem");
      const cy=b+t,rr=2+(R()<.5?1:0);for(let dy=0;dy<=2;dy++){const r2=dy===2?rr-1:rr;for(let dx=-r2;dx<=r2;dx++)for(let dz=-r2;dz<=r2;dz++){
        if(Math.abs(dx)===r2&&Math.abs(dz)===r2&&R()<.6)continue;put(x+dx,cy+dy-1,z+dz,R()<.07?"shroomlight":"nether_wart")}}
      for(let dx=-rr;dx<=rr;dx++)for(let dz=-rr;dz<=rr;dz++){if(Math.abs(dx)<rr&&Math.abs(dz)<rr||R()<.5)continue;const L=1+(R()*3|0);for(let k=0;k<L;k++)plants.push([x+dx,cy-2-k,z+dz,"weeping_vines"])}};
    scatter(16,3,21,6,(x,z)=>top(x,z)>=-1&&fungus(x,z),4);
    for(let i=0;i<260;i++){const z=-(4+R()*16)|0,x=Math.round((R()*2-1)*(8+(-z)*.9));const h=top(x,z);if(h<-1||Math.abs(x)<3)continue;if(blocks.get(key(x,h,z))==="crimson_nylium"&&!has(x,h+1,z))plants.push([x,h+1,z,"crimson_roots"])}
    // a lit nether portal on the left of the ledge
    const px=-11,pz=-15,pb=Math.max(top(px,pz),top(px+4,pz))+1;
    for(let x=px;x<=px+4;x++)put(x,pb-1,pz,"obsidian");
    for(let y=pb;y<pb+6;y++)for(let x=px;x<=px+4;x++){const edge=x===px||x===px+4||y===pb+5;put(x,y,pz,edge?"obsidian":"portal")}
    // fortress bridge across the sea
    const zb=-64,yb=7;for(let x=X0;x<=X1;x++){for(let z=zb-1;z<=zb+1;z++)put(x,yb,z,"nether_bricks");if(x%2===0){put(x,yb+1,zb-1,"nether_bricks");put(x,yb+1,zb+1,"nether_bricks")}
      if(((x%12)+12)%12===0){for(let y=yb-1;y>-8;y--)for(let z=zb-1;z<=zb+1;z++)put(x,y,z,"nether_bricks")}}
    // lavafalls pouring off the far cliffs
    for(const fx of[-46,-18,9,27,52]){let zc=null;for(let z=-92;z>-140;z--){if(top(fx,z)>8){zc=z;break}}if(zc===null)continue;
      for(let y=top(fx,zc);y>=-3;y--)for(let w2=0;w2<2;w2++)put(fx+w2,y,zc+1,"lavafall")}
    // glowstone hanging from the unseen roof
    for(let i=0;i<10;i++){const gx=Math.round((R()*2-1)*70),gz=-(30+R()*90)|0,gy=30+(R()*12|0);for(let j=0;j<26;j++)put(gx+(R()*5|0)-2,gy-(R()*6|0),gz+(R()*5|0)-2,"glowstone")}}
  if(kind==="end"){
    // floating islands, the big one carries an End city tower
    const island=(cx,cz,r,ty)=>{for(let x=Math.floor(cx-r);x<=cx+r;x++)for(let z=Math.floor(cz-r);z<=cz+r;z++){const d0=Math.hypot(x-cx,z-cz)/r;if(d0>1)continue;
      const t=Math.round(ty+fbm(x/6,z/6,seed+9)*1.5),bot=Math.round(ty-(1-d0)*r*1.1);for(let y=t;y>=bot;y--)put(x,y,z,"end_stone")}};
    island(34,-92,13,10);island(-46,-110,9,22);island(-20,-150,14,6);island(62,-140,8,30);island(-70,-70,6,14);
    const city=(cx,cz,b)=>{const box=(x0,y0,z0,w,h,d,n)=>{for(let x=x0;x<x0+w;x++)for(let y=y0;y<y0+h;y++)for(let z=z0;z<z0+d;z++){const sh=x===x0||x===x0+w-1||z===z0||z===z0+d-1||y===y0||y===y0+h-1;if(sh)put(x,y,z,n)}};
      box(cx-4,b,cz-4,9,8,9,"purpur");box(cx-3,b+8,cz-3,7,7,7,"purpur");box(cx-6,b+15,cz-6,13,2,13,"end_stone_bricks");box(cx-3,b+17,cz-3,7,9,7,"purpur");box(cx-5,b+26,cz-5,11,2,11,"end_stone_bricks");box(cx-2,b+28,cz-2,5,6,5,"purpur");
      for(const[dx,dz]of[[-4,-4],[4,-4],[-4,4],[4,4]])for(let y=b;y<b+8;y++)put(cx+dx,y,cz+dz,"purpur_pillar");
      for(let y=b+2;y<b+26;y+=4){put(cx,y,cz+(y<b+8?4:3),"magenta_glass");put(cx+(y<b+8?4:3),y,cz,"magenta_glass")}
      for(const[dx,dz]of[[-6,-6],[6,-6],[-6,6],[6,6],[-5,-5],[5,5],[-5,5],[5,-5]]){const y=dx*dx===36?b+17:b+28;plants.push([cx+dx,y,cz+dz,"end_rod"])}};
    city(34,-92,11);
    // obsidian pillars with crystals; two are caged
    const pillars=[[-30,-38,3,22],[-17,-52,2,17],[22,-50,2,19],[34,-34,3,24],[-38,-22,2,15],[8,-64,2,21]];
    pillars.forEach(([cx,cz,rr,ht],i)=>{const b=top(cx,cz);if(b===NONE)return;for(let y=b+1;y<=b+ht;y++)for(let dx=-rr;dx<=rr;dx++)for(let dz=-rr;dz<=rr;dz++)if(dx*dx+dz*dz<=rr*rr+1)put(cx+dx,y,cz+dz,"obsidian");
      put(cx,b+ht+1,cz,"bedrock");put(cx,b+ht+2,cz,"crystal");
      if(i%3===1)for(let y=b+ht+1;y<=b+ht+3;y++)for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(Math.abs(dx)===1||Math.abs(dz)===1){if(!has(cx+dx,y,cz+dz))put(cx+dx,y,cz+dz,"iron_bars")}if(i%3===1)for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)put(cx+dx,b+ht+4,cz+dz,"iron_bars")});
    // exit portal fountain on the right
    const ex=14,ez=-20,eb=top(ex,ez);
    for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){const r2=dx*dx+dz*dz;if(r2>10)continue;put(ex+dx,eb,ez+dz,r2>=6?"bedrock":"end_portal");if(r2>=6)put(ex+dx,eb+1,ez+dz,"bedrock")}
    for(let y=eb;y<=eb+4;y++)put(ex,y,ez,"bedrock");put(ex,eb+5,ez,"dragon_egg");
    // chorus plants close to the camera
    const chorus=(x,z)=>{const b=top(x,z)+1,t=3+(R()*4|0);for(let i=0;i<t;i++)put(x,b+i,z,"chorus_plant");put(x,b+t,z,"chorus_flower");
      for(let k=0;k<2;k++){const dir=[[1,0],[-1,0],[0,1],[0,-1]][R()*4|0],y=b+1+(R()*(t-1)|0),L=1+(R()*2|0);for(let j=1;j<=L;j++)put(x+dir[0]*j,y,z+dir[1]*j,"chorus_plant");
        const tx=x+dir[0]*L,tz=z+dir[1]*L;put(tx,y+1,tz,"chorus_plant");put(tx,y+2,tz,"chorus_flower")}};
    scatter(14,4,30,5,(x,z)=>top(x,z)!==NONE&&chorus(x,z),3);
  }
  if(S.clouds){for(let cx=-20;cx<20;cx++)for(let cz=-24;cz<2;cz++){if(fbm(cx/3.2,cz/3.2,seed+50)<.58||!inView(cx*6+3,cz*6+3))continue;for(let a=0;a<6;a++)for(let b2=0;b2<6;b2++)put(cx*6+a,44,cz*6+b2,"cloud")}}
  return{S,H,hAt,blocks,plants};
}
