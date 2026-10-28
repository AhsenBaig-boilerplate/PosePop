// ================= Settings tabs =================
// Style, World, Edit and Print share one card, so only one group of settings is open at a time and the picture stays
// in view beside (or, on phones, above) it. The WAI-ARIA tabs pattern: one tab stop for the row, arrows, Home and End
// move between tabs and open them. In kiosk mode the guest panels (style and world) show without the tab row (CSS).
const settingTabs=[...document.querySelectorAll('.tablist [role="tab"]')];
function openTab(t,focus){
  for(const b of settingTabs){const on=b===t;b.setAttribute("aria-selected",String(on));b.tabIndex=on?0:-1;$(b.getAttribute("aria-controls")).hidden=!on}
  if(focus)t.focus()}
for(const b of settingTabs){b.addEventListener("click",()=>openTab(b));
  b.addEventListener("keydown",e=>{const i=settingTabs.indexOf(b),n=settingTabs.length,j={ArrowRight:(i+1)%n,ArrowLeft:(i+n-1)%n,Home:0,End:n-1}[e.key];
    if(j===undefined)return;e.preventDefault();openTab(settingTabs[j],true)})}
