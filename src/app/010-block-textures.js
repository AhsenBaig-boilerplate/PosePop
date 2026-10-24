// ================= Block textures (16×16, drawn in code) =================
const TEXC={};
function tex(name){
  if(TEXC[name])return TEXC[name];
  const r=rng(hash(name)),c=document.createElement("canvas");c.width=c.height=16;
  const ctx=c.getContext("2d"),img=ctx.createImageData(16,16),d=img.data;
  const set=(x,y,col,k=1,a=255)=>{const o=(y*16+x)*4;d[o]=col[0]*k;d[o+1]=col[1]*k;d[o+2]=col[2]*k;d[o+3]=a};
  const each=f=>{for(let y=0;y<16;y++)for(let x=0;x<16;x++)f(x,y)};
  const noisy=(col,lo,hi)=>each((x,y)=>set(x,y,col,lo+r()*(hi-lo)));
  const voronoi=(n)=>{const p=[];for(let i=0;i<n;i++)p.push([r()*16,r()*16,.78+r()*.34]);
    return(x,y)=>{let d1=1e9,d2=1e9,k=1;for(const q of p)for(let ox=-16;ox<=16;ox+=16)for(let oy=-16;oy<=16;oy+=16){const dd=Math.hypot(x+.5-q[0]-ox,y+.5-q[1]-oy);if(dd<d1){d2=d1;d1=dd;k=q[2]}else if(dd<d2)d2=dd}return[d2-d1,k]}};
  const GRASS=[106,168,58],DIRT=[134,96,67],SNOW=[244,251,253],STONE=[127,127,127];
  switch(name){
    case"grass_top":each((x,y)=>{const k=.8+r()*.3+(vnoise(x/3,y/3,7)-.5)*.2;set(x,y,GRASS,k)});break;
    case"dirt":each((x,y)=>{const q=r();set(x,y,q<.12?[96,68,46]:q>.92?[165,124,88]:DIRT,.9+r()*.18)});break;
    case"grass_side":case"snowy_side":case"path_side":{
      const top=name==="grass_side"?GRASS:name==="snowy_side"?SNOW:[148,122,65];
      const depth=[];for(let x=0;x<16;x++)depth.push(name==="path_side"?2:3+(r()<.55?1:0)+(r()<.3?1:0)+(r()<.12?2:0));
      each((x,y)=>{if(y<depth[x])set(x,y,top,(name==="snowy_side"?.95:.8)+r()*(name==="snowy_side"?.06:.3));else{const q=r();set(x,y,q<.12?[96,68,46]:q>.92?[165,124,88]:DIRT,.9+r()*.18)}});break}
    case"path_top":each((x,y)=>set(x,y,[148,122,65],.85+r()*.22));break;
    case"stone":each((x,y)=>{const s=vnoise(x/4,y/1.6,3);set(x,y,STONE,.86+r()*.12+(s>.7?-.12:0)+(s<.2?.06:0))});break;
    case"cobblestone":{const v=voronoi(9);each((x,y)=>{const[e,k]=v(x,y);set(x,y,e<1.1?[72,72,72]:[124,124,124],e<1.1?.9+r()*.15:k*(.92+r()*.14)*(e<2?.9:1))});break}
    case"coal_ore":{each((x,y)=>{const s=vnoise(x/4,y/1.6,3);set(x,y,STONE,.86+r()*.12+(s>.7?-.12:0))});for(let i=0;i<4;i++){const cx=2+r()*11|0,cy=2+r()*11|0;for(let j=0;j<6;j++)set(Math.min(15,cx+(r()*3|0)),Math.min(15,cy+(r()*3|0)),[38,38,38],.8+r()*.4)}break}
    case"gravel":each((x,y)=>{const q=r();set(x,y,q<.3?[104,98,97]:q<.6?[136,129,128]:q<.85?[160,152,150]:[86,80,80],.95+r()*.1)});break;
    case"sand":each((x,y)=>set(x,y,[219,207,163],.92+r()*.12));break;
    case"red_sand":each((x,y)=>set(x,y,[190,102,33],.9+r()*.14));break;
    case"sandstone_top":each((x,y)=>set(x,y,[218,206,160],.95+r()*.08));break;
    case"sandstone_side":each((x,y)=>{let k=.94+r()*.08;if(y<3)k+=.04;if(y===3||y===12)k=.82;if(y>12)k-=.04;set(x,y,[216,203,155],k)});break;
    case"oak_log_side":case"spruce_log_side":{const col=name[0]==="o"?[109,85,50]:[58,37,16];const ck=[];for(let x=0;x<16;x++)ck.push(.72+r()*.4);each((x,y)=>set(x,y,col,ck[x]*(.9+r()*.16)));break}
    case"oak_log_top":case"spruce_log_top":{const inner=name[0]==="o"?[177,144,86]:[115,86,52],bark=name[0]==="o"?[109,85,50]:[58,37,16];
      each((x,y)=>{const ring=Math.max(Math.abs(x-7.5),Math.abs(y-7.5))|0;if(ring>=7)set(x,y,bark,.85+r()*.2);else set(x,y,inner,(ring%2?.88:1)*(.94+r()*.08))});break}
    case"oak_leaves":case"spruce_leaves":case"snowy_leaves":{const col=name==="oak_leaves"?[60,122,34]:[46,88,52];
      each((x,y)=>{if(r()<.2){set(x,y,[0,0,0],1,0);return}
        if(name==="snowy_leaves"&&y<4+(r()*3|0))set(x,y,SNOW,.92+r()*.08);else set(x,y,col,.62+r()*.55)});break}
    case"oak_planks":case"spruce_planks":{const col=name[0]==="o"?[162,130,78]:[114,84,48],rowk=[1,.94,1.03,.97];
      each((x,y)=>{const row=y>>2;let k=rowk[row]*(.9+r()*.14)+Math.sin(x*1.3+row*4)*.03;if((y&3)===3)k=.62;const j=(row*5+(row&1?9:3))&15;if(x===j&&(y&3)!==3)k=.68;set(x,y,col,k)});break}
    case"glass":each((x,y)=>{if(x===0||y===0||x===15||y===15)set(x,y,[214,232,236],.9+r()*.1);else if((x-y===5||x-y===6)&&x<12||(x-y===-6&&x>3))set(x,y,[255,255,255],1,150);else set(x,y,[200,225,235],1,26)});break;
    case"snow":each((x,y)=>set(x,y,SNOW,.95+r()*.05));break;
    case"ice":each((x,y)=>set(x,y,[150,186,250],.9+r()*.12+((x+y*2)%11===0?.12:0)));break;
    case"water":each((x,y)=>set(x,y,[48,96,204],.86+r()*.1+Math.sin((x+y*2)/2.6)*.06));break;
    case"lava":each((x,y)=>{const n=vnoise(x/3,y/3,5);set(x,y,n>.62?[252,196,60]:n>.4?[228,118,22]:[196,72,12],.9+r()*.12)});break;
    case"cactus_side":each((x,y)=>{if(x%4===2&&r()<.25)set(x,y,[214,224,170]);else set(x,y,[85,127,43],(x%4===0?.72:1)*(.92+r()*.12))});break;
    case"cactus_top":each((x,y)=>{const ring=Math.max(Math.abs(x-7.5),Math.abs(y-7.5))|0;set(x,y,[100,148,52],(ring%3===0?.82:1)*(.94+r()*.1))});break;
    case"terracotta_orange":noisy([161,83,37],.92,1.06);break;
    case"terracotta_white":noisy([209,178,161],.94,1.04);break;
    case"netherrack":each((x,y)=>{const n=vnoise(x/2.5,y/2.5,9);set(x,y,[111,52,50],.62+r()*.42+(n>.65?-.15:0))});break;
    case"nether_bricks":each((x,y)=>{const off=(y>>2)&1?4:0;if((y&3)===3||((x+off)&7)===7)set(x,y,[24,11,14],.9+r()*.2);else set(x,y,[48,23,28],.85+r()*.25)});break;
    case"glowstone":each((x,y)=>{const q=vnoise(x/2,y/2,4)+r()*.25;set(x,y,q>.85?[255,236,170]:q>.6?[232,180,100]:q>.4?[170,120,64]:[120,82,46],1)});break;
    case"soul_sand":each((x,y)=>set(x,y,[84,64,51],.75+r()*.35));break;
    case"end_stone":each((x,y)=>set(x,y,r()<.08?[186,188,134]:[221,223,165],.93+r()*.08));break;
    case"obsidian":each((x,y)=>set(x,y,r()<.07?[70,44,110]:[20,15,32],.85+r()*.3));break;
    case"crystal":each((x,y)=>set(x,y,(x+y)%5===0?[255,230,255]:[236,132,226],.9+r()*.1));break;
    case"hay_side":each((x,y)=>set(x,y,[180,148,38],(y%6===2?.7:1)*(.88+r()*.18)));break;
    case"hay_top":each((x,y)=>set(x,y,[170,138,40],.82+r()*.3));break;
    case"cloud":noisy([255,255,255],.98,1);break;
    case"crimson_nylium_top":each((x,y)=>{const n=vnoise(x/2.5,y/2.5,11);set(x,y,n>.62?[178,40,40]:[130,22,22],.8+r()*.35)});break;
    case"crimson_nylium_side":{const dp=[];for(let x=0;x<16;x++)dp.push(2+(r()*3|0)+(r()<.2?2:0));each((x,y)=>{if(y<dp[x])set(x,y,[150,28,28],.8+r()*.35);else set(x,y,[111,52,50],.62+r()*.42)});break}
    case"crimson_stem_side":{const ck=[];for(let x=0;x<16;x++)ck.push(.7+r()*.45);each((x,y)=>{const glow=r()<.05;set(x,y,glow?[60,200,190]:[110,34,52],glow?1:ck[x]*(.85+r()*.2))});break}
    case"crimson_stem_top":each((x,y)=>{const ring=Math.max(Math.abs(x-7.5),Math.abs(y-7.5))|0;set(x,y,ring>=7?[110,34,52]:[150,58,80],(ring%2?.85:1)*(.92+r()*.12))});break;
    case"nether_wart":each((x,y)=>{const n=vnoise(x/2,y/2,13);set(x,y,n>.7?[170,24,24]:[118,12,12],.78+r()*.38)});break;
    case"shroomlight":each((x,y)=>{const n=vnoise(x/2.2,y/2.2,17);set(x,y,n>.6?[255,214,130]:n>.35?[240,148,72]:[214,98,44],.95+r()*.08)});break;
    case"portal":each((x,y)=>{const n=Math.sin((x+y*.6)/2.2+vnoise(x/3,y/3,19)*5);set(x,y,n>.5?[200,120,255]:n>-.2?[132,52,226]:[84,18,170],.92+r()*.12,205)});break;
    case"weeping_vines":each((x,y)=>{if((x===6||x===9)&&r()<.85||(x===7||x===8)&&y%5===2)set(x,y,[150,20,24],.8+r()*.4);else set(x,y,[0,0,0],1,0)});break;
    case"crimson_roots":{const hgt=[];for(let x=0;x<16;x++)hgt.push(r()<.55?4+(r()*9|0):0);each((x,y)=>{if(16-y<=hgt[x])set(x,y,[160,20,40],.75+r()*.35);else set(x,y,[0,0,0],1,0)});break}
    case"bedrock":each((x,y)=>{const q=r();set(x,y,q<.3?[40,40,40]:q<.7?[85,85,85]:[130,130,130],.9+r()*.15)});break;
    case"end_portal":each((x,y)=>{const q=r();set(x,y,q<.06?[190,255,240]:q<.12?[60,150,140]:q<.18?[120,90,200]:[12,16,24],1)});break;
    case"dragon_egg":each((x,y)=>set(x,y,r()<.12?[120,40,160]:[14,10,20],.9+r()*.2));break;
    case"purpur":each((x,y)=>{const e=x%8===0||y%8===0;set(x,y,[169,125,169],(e?.82:1)*(.92+r()*.1))});break;
    case"purpur_pillar_side":each((x,y)=>set(x,y,[171,129,171],(x%4===0?.8:1)*(.92+r()*.1)));break;
    case"purpur_pillar_top":each((x,y)=>{const ring=Math.max(Math.abs(x-7.5),Math.abs(y-7.5))|0;set(x,y,[171,129,171],(ring%3===0?.8:1)*(.94+r()*.08))});break;
    case"end_stone_bricks":each((x,y)=>{const off=(y>>3)&1?8:0;const e=y%8===7||(x+off)%16===15;set(x,y,e?[160,162,118]:[219,224,162],.94+r()*.08)});break;
    case"chorus_plant":each((x,y)=>{const n=vnoise(x/2,y/2,23);set(x,y,n>.6?[150,110,150]:[94,58,94],.85+r()*.25)});break;
    case"chorus_flower":each((x,y)=>{const e=x===0||y===0||x===15||y===15;set(x,y,e?[120,80,130]:[196,156,200],.9+r()*.15)});break;
    case"end_rod":each((x,y)=>{if(x>=7&&x<=8&&y>=2)set(x,y,[250,250,240],.92+r()*.08);else if(y<2&&x>=6&&x<=9)set(x,y,[150,130,170]);else set(x,y,[0,0,0],1,0)});break;
    case"iron_bars":each((x,y)=>{if(x%5===1||y===0||y===15)set(x,y,[150,152,150],.85+r()*.2);else set(x,y,[0,0,0],1,0)});break;
    case"magenta_glass":each((x,y)=>{if(x===0||y===0||x===15||y===15)set(x,y,[180,70,190],.9+r()*.1,230);else set(x,y,[190,80,200],1,120)});break;
    case"short_grass":{const hgt=[];for(let x=0;x<16;x++)hgt.push(r()<.65?5+(r()*10|0):0);each((x,y)=>{if(16-y<=hgt[x])set(x,y,GRASS,.75+r()*.35);else set(x,y,[0,0,0],1,0)});break}
    case"poppy":case"dandelion":{const pc=name==="poppy"?[214,34,30]:[250,214,40];each((x,y)=>{
      if(y>=7&&(x===7||x===8)||y===10&&x===6||y===12&&x===9)set(x,y,[60,120,30]);else if(y>=3&&y<=7&&x>=5&&x<=10&&!((y===3||y===7)&&(x===5||x===10)))set(x,y,pc,.85+r()*.25);else set(x,y,[0,0,0],1,0)});break}
    default:noisy([255,0,255],1,1);
  }
  ctx.putImageData(img,0,0);TEXC[name]=c;return c;
}
