// ================= Version picker =================
// Lists Latest and every published release (releases.json at the site root). Picking one moves to it and keeps
// the page's options (?kiosk=1, ?debug=1, ...). Offline or on a local build there is nothing to list, so it stays hidden.
async function loadVersions(){
  let list;try{const r=await fetch(SITE_ROOT+"releases.json",{cache:"no-store"});if(!r.ok)return;list=await r.json()}catch(e){return}
  const sel=$("versionPick"),add=(value,label,on)=>{const o=document.createElement("option");o.value=value;o.textContent=label;o.selected=on;sel.append(o)};
  add(SITE_ROOT,"Latest ("+list.latest.version+")",!PINNED);
  for(const r of list.releases||[])add(SITE_ROOT+r.path,r.version+" · "+r.date,PINNED===r.version);
  if(sel.options.length<2)return;
  $("vpick").hidden=false;mark("Build","channel",PINNED?"pinned release "+PINNED:"latest");
  sel.addEventListener("change",()=>{const u=new URL(sel.value,location.origin),q=new URLSearchParams(location.search);q.delete("v");u.search=q.toString();location.assign(u.toString())});
}
if(!BUILD.startsWith("__")){if(navigator.onLine)loadVersions();else addEventListener("online",loadVersions,{once:true})}
