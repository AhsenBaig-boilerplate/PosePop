// ================= Keyboard editing and announcements =================
// The preview takes focus (Tab), and then, with the Move tool: arrows move the group or the selected person by one
// block (Shift: five), + and − resize by 5 %, [ and ] pick the previous or next person in Move each. A burst of keys
// is one undo step, like one drag. Erasing stays pointer-only: it needs a position on the picture.
// With an emoji selected (one just added, or tapped), the keys act on it instead: arrows move, + and − resize,
// [ and ] turn it by 15°, Delete removes it and Escape goes back to the people.
// say() reads short updates to screen readers through a polite live region (#announce); people found and saves are
// announced by #srcNote and #saveMsg themselves (role="status").
const KEY_STEP=1,KEY_STEP_BIG=5,KEY_SCALE=1.05,KEY_IDLE=600; // blocks, blocks, factor, ms before the burst ends
let sayTimer=0;
function say(t){clearTimeout(sayTimer);const a=$("announce");a.textContent="";sayTimer=setTimeout(()=>{a.textContent=t},60)} // re-set so repeats are read
function describeOut(){const st=ST(),n=S.view?S.view.layers.length:0,sc=SCENES.find(s=>s.k===S.scene),who=n?n+(n===1?" person":" people"):"The picture";
  out.setAttribute("aria-label",(st.photo?who+" cut out of the photo":who+" made of "+(st.material||st.units))+(sc&&sc.k!=="none"?", on "+sc.label.toLowerCase():"")+
    (S.deco.length?", with "+S.deco.length+" emoji":""))}
const keyHelp=()=>S.tool==="move"&&S.moveMode!=="boxes"&&selDeco()?"Keys: arrows move the emoji (Shift for bigger steps), + and − resize, [ and ] turn, Delete removes, Escape goes back to the people.":
  S.tool!=="move"||S.moveMode==="boxes"||!canMove()?"":
  "Keys: arrows move "+(S.moveMode==="each"?"the selected person":"the group")+" (Shift for bigger steps), + and − resize"+(S.moveMode==="each"?", [ and ] choose a person":"")+".";
out.addEventListener("focus",()=>{const h=keyHelp();if(h)$("hover").textContent=h});
let keyBurst=null;
function endBurst(){if(!keyBurst)return;const b=keyBurst;keyBurst=null;restyle();
  if(b.moved)say(b.deco?"Emoji moved":S.moveMode==="each"?"Person "+(S.sel+1)+" moved":"Group moved")}
function burst(deco){if(!keyBurst){pushHist();keyBurst={moved:false,deco}}clearTimeout(keyBurst.t);keyBurst.t=setTimeout(endBurst,KEY_IDLE)}
function decoKey(e){const d=selDeco(),k=e.key,name=DECO_LIST[d.k][1],L=S.layout,m=Math.min(L.Wpx,L.Hpx);
  if(k==="Escape"){e.preventDefault();endBurst();S.decoSel=-1;decoUI();quick();say(name+" deselected");return}
  if(k==="Delete"||k==="Backspace"){e.preventDefault();endBurst();removeDeco(S.decoSel);return}
  const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},grow=k==="+"||k==="="?KEY_SCALE:k==="-"||k==="_"?1/KEY_SCALE:0,turn=k==="]"?1:k==="["?-1:0;
  if(!arrows[k]&&!grow&&!turn)return;
  e.preventDefault();burst(true);
  if(arrows[k]){const st=e.shiftKey?DECO_STEP_BIG:DECO_STEP;d.x+=arrows[k][0]*st*m/L.Wpx;d.y+=arrows[k][1]*st*m/L.Hpx;keyBurst.moved=true}
  else if(grow)d.s*=grow;else d.r+=turn*DECO_TURN;
  clampDeco(d);decoUI();quick();
  if(grow)say("Size "+Math.round(d.s*100)+" percent");else if(turn)say("Turned to "+Math.round(d.r*180/Math.PI)+" degrees")}
out.addEventListener("keydown",e=>{
  if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&S.tool==="move"&&S.moveMode!=="boxes"&&selDeco()&&S.layout){decoKey(e);return}
  if(e.ctrlKey||e.metaKey||e.altKey||S.tool!=="move"||S.moveMode==="boxes"||!canMove()||!S.view||!S.layout)return;
  const n=S.view.layers.length,k=e.key;
  if((k==="["||k==="]")&&S.moveMode==="each"&&n>1){e.preventDefault();S.sel=(S.sel+(k==="]"?1:n-1))%n;syncScale();quick();say("Person "+(S.sel+1)+" of "+n+" selected");return}
  const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},grow=k==="+"||k==="="?KEY_SCALE:k==="-"||k==="_"?1/KEY_SCALE:0;
  if(!arrows[k]&&!grow)return;
  e.preventDefault();
  burst(false);
  const p=cur(),L=S.layout;
  if(arrows[k]){const st=(e.shiftKey?KEY_STEP_BIG:KEY_STEP)*L.cell;p.dx+=arrows[k][0]*st/L.Wpx;p.dy+=arrows[k][1]*st/L.Hpx;keyBurst.moved=true}
  else{p.s=Math.max(.25,Math.min(2.5,p.s*grow));syncScale();say("Size "+Math.round(p.s*100)+" percent")}
  quick();
});
out.addEventListener("blur",endBurst);
