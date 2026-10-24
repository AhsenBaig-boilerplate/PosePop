// ================= Three.js renderer =================
let THREE_OK=!!window.THREE,renderer=null;
const worlds={},meshes={};
function getRenderer(){
  if(renderer)return renderer;
  const cv=document.createElement("canvas");
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);renderer.setClearColor(0x000000,0);return renderer;
}
const TT={};
function ttex(name){if(TT[name])return TT[name];const t=new THREE.CanvasTexture(tex(name));t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=getRenderer().capabilities.getMaxAnisotropy();TT[name]=t;return t}
function matsFor(name){
  const b=WB[name],faces=[b.side||b.all,b.side||b.all,b.top||b.all,b.bottom||b.top||b.all,b.side||b.all,b.side||b.all];
  return faces.map((f,i)=>{const k=b.glow?1:FACE_SHADE[i];const m=new THREE.MeshBasicMaterial({map:ttex(f),color:new THREE.Color(k,k,k)});
    if(b.cut){m.alphaTest=.5;m.transparent=!!b.clear;m.side=THREE.DoubleSide}
    if(b.cloud){m.transparent=true;m.opacity=.82;m.depthWrite=false;m.color=new THREE.Color(k,k,k)}
    return m});
}
function buildScene(kind){
  if(meshes[kind])return meshes[kind];
  const W=worlds[kind]||(worlds[kind]=makeWorld(kind)),S=W.S,scene=new THREE.Scene();
  scene.fog=new THREE.Fog(new THREE.Color(S.fog),S.near,S.far);
  const groups={},CLEAR=n=>!WB[n]||WB[n].cut||WB[n].cloud;
  for(const[k,n]of W.blocks){
    const y=(k%256)-64,rest=(k-(y+64))/256,z=rest%WZ+Z0,x=Math.floor(rest/WZ)+X0;
    let exposed=false;for(const o of[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const nn=W.blocks.get(key(x+o[0],y+o[1],z+o[2]));if(!nn||(CLEAR(nn)&&nn!==n)){exposed=true;break}}
    if(!exposed)continue;(groups[n]||(groups[n]=[])).push(x,y,z);
  }
  const box=new THREE.BoxGeometry(1,1,1),m4=new THREE.Matrix4();
  for(const n in groups){const p=groups[n],c=p.length/3,mesh=new THREE.InstancedMesh(box,matsFor(n),c);
    for(let i=0;i<c;i++){m4.makeTranslation(p[i*3]+.5,p[i*3+1]+.5,p[i*3+2]+.5);mesh.setMatrixAt(i,m4)}
    if(WB[n].cloud)mesh.renderOrder=2;scene.add(mesh)}
  // fluids
  const fluid=(level,texName,opacity,isIce)=>{
    const cells=[];for(let x=X0;x<=X1;x++)for(let z=Z0;z<=Z1;z++){const h=W.hAt(x,z);if(h!==NONE&&h<level&&Math.abs(x+.5)<=14+(6.5-z)*.86)cells.push(x,z)}
    if(!cells.length)return;const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);
    const m=new THREE.MeshBasicMaterial({map:ttex(texName),transparent:opacity<1,opacity,depthWrite:opacity>=1,side:THREE.DoubleSide});
    const mesh=new THREE.InstancedMesh(g,m,cells.length/2);const yy=level+(isIce?1:.88);
    for(let i=0;i<cells.length/2;i++){m4.makeTranslation(cells[i*2]+.5,yy,cells[i*2+1]+.5);mesh.setMatrixAt(i,m4)}scene.add(mesh)};
  if(S.water!=null)fluid(S.water,S.ice?"ice":"water",S.ice?.92:.8,S.ice);
  if(S.lava!=null)fluid(S.lava,"lava",1);
  // plants (crossed quads)
  if(W.plants.length){const by={};for(const p of W.plants)(by[p[3]]||(by[p[3]]=[])).push(p);
    for(const t in by){const list=by[t];for(const rot of[Math.PI/4,-Math.PI/4]){const g=new THREE.PlaneGeometry(1,1);g.rotateY(rot);
      const m=new THREE.MeshBasicMaterial({map:ttex(t),alphaTest:.5,side:THREE.DoubleSide,color:new THREE.Color(.92,.92,.92)});
      const mesh=new THREE.InstancedMesh(g,m,list.length);list.forEach((p,i)=>{m4.makeTranslation(p[0]+.5,p[1]+.5,p[2]+.5);mesh.setMatrixAt(i,m4)});scene.add(mesh)}}}
  scene.traverse(o=>{o.frustumCulled=false});
  return(meshes[kind]={scene,W});
}

function drawSky(ctx,W,H,S,horizonY){
  const g=ctx.createLinearGradient(0,0,0,horizonY);g.addColorStop(0,S.sky[0]);g.addColorStop(1,S.sky[1]);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=S.fog;ctx.fillRect(0,horizonY,W,H-horizonY);
  if(S.nebula){for(const[nx,ny,nr,col]of[[.22,.25,.45,"rgba(150,60,200,.35)"],[.78,.15,.4,"rgba(60,90,200,.28)"],[.6,.4,.3,"rgba(220,90,200,.2)"]]){
      const g2=ctx.createRadialGradient(W*nx,horizonY*ny,0,W*nx,horizonY*ny,Math.max(W,H)*nr);g2.addColorStop(0,col);g2.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g2;ctx.fillRect(0,0,W,horizonY)}}
  if(S.stars){const r=rng(7);for(let i=0;i<W*H/900;i++){ctx.fillStyle=r()<.8?"rgba(255,255,255,.85)":"rgba(200,150,255,.9)";const s=Math.max(1,Math.round(W/500))*(r()<.15?2:1);ctx.fillRect(r()*W|0,r()*horizonY|0,s,s)}}
  if(S.sun){const s=Math.round(Math.min(W,H)*S.sun.s),x=W*S.sun.x,y=S.sun.y>.3?horizonY-s*.35:H*S.sun.y;
    if(S.sun.glow){const rg=ctx.createRadialGradient(x,y,s*.3,x,y,s*3.2);rg.addColorStop(0,S.sun.glow);rg.addColorStop(1,"rgba(255,120,60,0)");ctx.fillStyle=rg;ctx.fillRect(x-s*4,y-s*4,s*8,s*8)}
    ctx.fillStyle=S.sun.c;ctx.fillRect(Math.round(x-s/2),Math.round(y-s/2),s,s);ctx.fillStyle="rgba(255,255,255,.35)";const q=Math.round(s*.18);ctx.fillRect(Math.round(x-s/2)+q,Math.round(y-s/2)+q,s-2*q,s-2*q)}
}
const sceneCache=new Map();
function renderScene(kind,W,H){
  const ck=kind+"|"+W+"|"+H;if(sceneCache.has(ck))return sceneCache.get(ck);
  const{scene,W:world}=buildScene(kind),S=world.S,rd=getRenderer();
  const aspect=W/H,fov=aspect>=1?52:64,cam=new THREE.PerspectiveCamera(fov,aspect,.1,400);
  const g0=world.hAt(0,6),gy=(g0===NONE?0:g0)+1,ey=gy+S.eye+ (kind==="end"?1.5:0);
  cam.position.set(.5,ey,6.5);cam.lookAt(.5,ey-1.4,-24);cam.updateMatrixWorld();cam.updateProjectionMatrix();
  // horizon height on screen
  const hv=new THREE.Vector3(.5,ey,-2000).project(cam),horizonY=Math.max(0,Math.min(H,(1-(hv.y+1)/2)*H));
  rd.setSize(W,H,false);rd.render(scene,cam);
  const c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");
  drawSky(ctx,W,H,S,horizonY);ctx.drawImage(rd.domElement,0,0);
  if(S.ash){const r=rng(5);const s=Math.max(1,Math.round(W/400));for(let i=0;i<W*H/1800;i++){ctx.fillStyle=r()<.7?"rgba(255,170,120,.55)":"rgba(255,230,190,.7)";ctx.fillRect(r()*W|0,r()*H|0,s,s)}}
  if(S.snowfall){const r=rng(3);ctx.fillStyle="rgba(255,255,255,.9)";const s=Math.max(2,Math.round(W/260));for(let i=0;i<W*H/2600;i++)ctx.fillRect(r()*W|0,r()*H|0,s,s)}
  if(sceneCache.size>12)sceneCache.delete(sceneCache.keys().next().value);
  sceneCache.set(ck,c);return c;
}
