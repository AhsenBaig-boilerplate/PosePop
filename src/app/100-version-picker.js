// ================= Version picker and release notes =================
// Lists Latest and every published release (releases.json at the site root), each with its headline, and shows
// what changed in each version (from CHANGELOG.md, put into releases.json by the build). Picking one moves to it and
// keeps the page's options (?kiosk=1, ?debug=1, ...). Offline or on a local build there is nothing to list, so it
// stays hidden. Notes are drawn as text with **bold** and `code` marks only, never as HTML.
function richText(el,s){for(const part of String(s).split(/(\*\*[^*]+\*\*|`[^`]+`)/)){if(!part)continue;
  const m=part.match(/^\*\*(.+)\*\*$/)||part.match(/^`(.+)`$/),n=m?document.createElement(part[0]==="*"?"strong":"code"):document.createTextNode(part);
  if(m)n.textContent=m[1];el.append(n)}}
function renderNotes(list){const box=$("notes");box.textContent="";
  // the latest build only gets its own entry when it carries unreleased changes; otherwise it's the newest release
  const entries=[...(list.latest.version.includes("+")&&list.latest.notes?.length?[{...list.latest,label:"Latest ("+list.latest.version+")",here:!PINNED}]:[]),
    ...(list.releases||[]).map(r=>({...r,label:r.version+(r.date?" · "+r.date:""),here:PINNED?PINNED===r.version:VERSION===r.version}))];
  for(const e of entries){const h=document.createElement("h4");h.textContent=e.label+(e.here?" (this version)":"");if(e.here)h.className="cur";
    const ul=document.createElement("ul");for(const n of e.notes||[]){const li=document.createElement("li");richText(li,n);ul.append(li)}
    box.append(h,ul)}
  return entries.length}
async function loadVersions(){
  let list;try{const r=await fetch(SITE_ROOT+"releases.json",{cache:"no-store"});if(!r.ok)return;list=await r.json()}catch(e){return}
  const sel=$("versionPick"),add=(value,label,on)=>{const o=document.createElement("option");o.value=value;o.textContent=label;o.selected=on;sel.append(o)};
  const head=h=>h?" — "+h:"";
  add(SITE_ROOT,"Latest ("+list.latest.version+")"+head(list.latest.headline),!PINNED);
  for(const r of list.releases||[])add(SITE_ROOT+r.path,r.version+" · "+r.date+head(r.headline),PINNED===r.version);
  if(renderNotes(list))$("notesBtn").hidden=false;
  if(sel.options.length<2)return;
  $("vpick").hidden=false;mark("Build","channel",PINNED?"pinned release "+PINNED:"latest");
  sel.addEventListener("change",()=>{const u=new URL(sel.value,location.origin),q=new URLSearchParams(location.search);q.delete("v");u.search=q.toString();location.assign(u.toString())});
}
$("notesBtn").addEventListener("click",()=>{const open=$("notes").hidden;$("notes").hidden=!open;$("notesBtn").setAttribute("aria-expanded",String(open))});
if(!BUILD.startsWith("__")){if(navigator.onLine)loadVersions();else addEventListener("online",loadVersions,{once:true})}
