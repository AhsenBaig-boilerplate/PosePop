// ================= Test snapshot (?debug=1) =================
// The app runs in one closed scope, so the end-to-end tests can't see its state. With ?debug=1 only, this gives
// them a read-only copy of what they check: people found, blocks placed, where each person sits, the edits, boxes, and grid:
// which cells are kept and where the cells sit on the preview (true while nobody is moved or resized).
// It returns plain data; nothing in it can change the app.
function personCentre(Lr){const L=S.layout,{w,h,lay}=S.view,P=L.pl(Lr.L);let sx=0,sy=0,n=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(lay[y*w+x]===Lr.L){sx+=x+.5;sy+=y+.5;n++}
  if(!n)return null;const gx=sx/n,gy=sy/n; // the inverse of toGrid, as fractions of the preview canvas
  return[(L.ox+P.dx*L.Wpx+(Lr.ax+(gx-Lr.ax)*P.s)*L.cell)/out.width,(L.oy+P.dy*L.Hpx+(Lr.ay+(gy-Lr.ay)*P.s)*L.cell)/out.height]}
if(DEBUG)Object.defineProperty(window,"posepopState",{value:()=>{const v=S.view,people=[];
  if(v&&S.layout)for(const Lr of S.layout.order)people[Lr.L]=personCentre(Lr);
  return JSON.parse(JSON.stringify({boxes:(S.boxes||[]).length,layers:v?v.layers.length:0,filled:v?v.cells.reduce((n,c)=>n+(c>=0),0):0,
    people,grid:v&&S.layout?{w:v.w,h:v.h,ox:S.layout.ox,oy:S.layout.oy,cell:S.layout.cell,kept:Array.from(v.cells,c=>c>=0?1:0).join("")}:null,group:S.gplace,place:S.place,fixes:S.fixes.length,keyed:!!S.srcRaw&&S.src!==S.srcRaw,
    deco:S.deco.map(({k,x,y,s,r})=>({name:DECO_LIST[k][0],x,y,s,r})),decoSel:S.decoSel,
    // Adjust boxes: each box on the preview as [x0,y0,x1,y1] fractions of the canvas (while shown), and in photo fractions
    boxRects:S.layout&&S.layout.boxes?S.layout.boxes.map(([a,b,c,d])=>[a/out.width,b/out.height,c/out.width,d/out.height]):null,
    boxesPhoto:effBoxes().map(boxToPhoto),adjusted:S.edges.map(e=>!!e)}))}});
