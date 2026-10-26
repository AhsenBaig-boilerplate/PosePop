// ================= Sample (drawn figures with a known outline) =================
function sample(){
  const W=600,H=520,c=document.createElement("canvas"),m=document.createElement("canvas");c.width=m.width=W;c.height=m.height=H;
  const x=c.getContext("2d"),k=m.getContext("2d");
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"#cfd8dc");g.addColorStop(1,"#90a4ae");x.fillStyle=g;x.fillRect(0,0,W,H);
  k.fillStyle="#000";k.fillRect(0,0,W,H);
  const person=(cx,cy,s,skin,hair,shirt)=>{for(const[ctx,mask]of[[x,false],[k,true]]){
    const f=col=>ctx.fillStyle=mask?"#fff":col;
    f(shirt);ctx.beginPath();ctx.moveTo(cx-120*s,H);ctx.quadraticCurveTo(cx-115*s,cy+120*s,cx,cy+110*s);ctx.quadraticCurveTo(cx+115*s,cy+120*s,cx+120*s,H);ctx.fill();
    f(skin);ctx.fillRect(cx-22*s,cy+60*s,44*s,55*s);ctx.beginPath();ctx.ellipse(cx,cy,62*s,76*s,0,0,Math.PI*2);ctx.fill();
    f(hair);ctx.beginPath();ctx.ellipse(cx,cy-30*s,68*s,52*s,0,Math.PI,0);ctx.fill();ctx.fillRect(cx-68*s,cy-32*s,18*s,50*s);ctx.fillRect(cx+50*s,cy-32*s,18*s,50*s);
    if(!mask){ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(cx-22*s,cy+4*s,11*s,8*s,0,0,7);ctx.ellipse(cx+22*s,cy+4*s,11*s,8*s,0,0,7);ctx.fill();
      ctx.fillStyle="#2b4c7e";ctx.beginPath();ctx.arc(cx-22*s,cy+4*s,5*s,0,7);ctx.arc(cx+22*s,cy+4*s,5*s,0,7);ctx.fill();
      ctx.strokeStyle="#8a3b2c";ctx.lineWidth=5*s;ctx.lineCap="round";ctx.beginPath();ctx.arc(cx,cy+30*s,20*s,.2*Math.PI,.8*Math.PI);ctx.stroke()}}};
  person(205,250,1.0,"#e8b48f","#3b2618","#2e6db4");
  person(410,280,.92,"#9a6644","#16110d","#c9473a");
  // ?sample=photo: the same scene with a phone photo's flaws (uneven light, sensor noise, softness), always identical
  if(new URLSearchParams(location.search).get("sample")==="photo"){const img=x.getImageData(0,0,W,H),d=img.data,r=rng(7),n=()=>(r()+r()+r()-1.5)*26;
    for(let y=0;y<H;y++)for(let X=0;X<W;X++){const i=(y*W+X)*4,light=.72+.4*(1-X/W)*(1-.35*y/H)+.07*Math.sin(X/37+y/53);
      d[i]=d[i]*light+n();d[i+1]=d[i+1]*light+n();d[i+2]=d[i+2]*light+n()}
    const t=document.createElement("canvas");t.width=W;t.height=H;t.getContext("2d").putImageData(img,0,0);x.filter="blur(1.4px)";x.drawImage(t,0,0);x.filter="none"}
  S.src=c;S.alpha=m;S.srcRaw=null;S.alphaML=null;S.focus=null;S.boxesFull=[{x:.13,y:.2,w:.42,h:.8},{x:.5,y:.26,w:.4,h:.74}];
}
