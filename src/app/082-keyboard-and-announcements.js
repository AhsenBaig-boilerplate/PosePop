// ================= Keyboard editing and announcements =================
// The preview takes focus (Tab), and then, with the Move tool: arrows move the group or the selected person by one
// block (Shift: five), + and − resize by 5 %, [ and ] pick the previous or next person in Move each. A burst of keys
// is one undo step, like one drag. Erasing stays pointer-only: it needs a position on the picture.
// say() reads short updates to screen readers through a polite live region (#announce); people found and saves are
// announced by #srcNote and #saveMsg themselves (role="status").
const KEY_STEP=1,KEY_STEP_BIG=5,KEY_SCALE=1.05,KEY_IDLE=600; // blocks, blocks, factor, ms before the burst ends
let sayTimer=0;
function say(t){clearTimeout(sayTimer);const a=$("announce");a.textContent="";sayTimer=setTimeout(()=>{a.textContent=t},60)} // re-set so repeats are read
function describeOut(){const st=ST(),n=S.view?S.view.layers.length:0,sc=SCENES.find(s=>s.k===S.scene),who=n?n+(n===1?" person":" people"):"The picture";
  out.setAttribute("aria-label",(st.photo?who+" cut out of the photo":who+" made of "+st.units)+(sc&&sc.k!=="none"?", on "+sc.label.toLowerCase():""))}
const keyHelp=()=>S.tool!=="move"||S.moveMode==="boxes"||!canMove()?"":
  "Keys: arrows move "+(S.moveMode==="each"?"the selected person":"the group")+" (Shift for bigger steps), + and − resize"+(S.moveMode==="each"?", [ and ] choose a person":"")+".";
out.addEventListener("focus",()=>{const h=keyHelp();if(h)$("hover").textContent=h});
let keyBurst=null;
function endBurst(){if(!keyBurst)return;const b=keyBurst;keyBurst=null;restyle();
  if(b.moved)say(S.moveMode==="each"?"Person "+(S.sel+1)+" moved":"Group moved")}
out.addEventListener("keydown",e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||S.tool!=="move"||S.moveMode==="boxes"||!canMove()||!S.view||!S.layout)return;
  const n=S.view.layers.length,k=e.key;
  if((k==="["||k==="]")&&S.moveMode==="each"&&n>1){e.preventDefault();S.sel=(S.sel+(k==="]"?1:n-1))%n;syncScale();quick();say("Person "+(S.sel+1)+" of "+n+" selected");return}
  const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},grow=k==="+"||k==="="?KEY_SCALE:k==="-"||k==="_"?1/KEY_SCALE:0;
  if(!arrows[k]&&!grow)return;
  e.preventDefault();
  if(!keyBurst){pushHist();keyBurst={moved:false}}
  clearTimeout(keyBurst.t);keyBurst.t=setTimeout(endBurst,KEY_IDLE);
  const p=cur(),L=S.layout;
  if(arrows[k]){const st=(e.shiftKey?KEY_STEP_BIG:KEY_STEP)*L.cell;p.dx+=arrows[k][0]*st/L.Wpx;p.dy+=arrows[k][1]*st/L.Hpx;keyBurst.moved=true}
  else{p.s=Math.max(.25,Math.min(2.5,p.s*grow));syncScale();say("Size "+Math.round(p.s*100)+" percent")}
  quick();
});
out.addEventListener("blur",endBurst);
