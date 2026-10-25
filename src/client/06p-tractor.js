// DOZER BLADE (owner: Reece): the Tractor power-up + shop track. WEB ONLY: POKI_EXCLUDE (poki/script.mjs) drops this fragment,
// so every hook below is inert on Poki (each call site is one typeof-guarded line).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Spec: "Dozer Blade (Tractor) spec" doc, 25 Oct 2026. Runs after 06n (reads SKU/skTr/skLv/skEarn/isPoki from 06b, PU/SKI/BUG/... from
// 05, EN_BLOB/EN_BP/EN_VC from 06g, OC_W/OC_H/ocGY from 06i at run time).
//  - Pickup "t" (13 trPool + getPU): for trDur() s (5 + Power Cell 1/level + Tractor L1 1.5) a hazard-striped blade rides on the
//    buggy. Any ground-level enemy touching the buggy or the blade box (TR.reach px ahead, TR.top px tall) is ploughed: bug, slag
//    blob, roller, pillar, ember vent, low flyer / drone / slammed hammer drone (bot < TR.low), ore cart (06i trCart). Gaps,
//    Crusher plates, high flyers, chasers and arc strikes are not hooked, so they play as before. A plough costs no shield or core.
//  - Each wreck lands on a pile on the blade (TR.pile shown); at the end the pile is dumped: +1 spark a piece (Tractor L2: 2),
//    "SCRAP xN! +P", TR.end s of inv. A death with scrap on the blade still banks it (trDie). Tractor L3: 4 s blade at run start.
//  - Sim path (trGet/trStart/trTick/trHit/trCart/trDie): no Math.random, never writes speed/score/runS/spawnDist/nextGap.
//  - Draw path (trDraw/trHud): debris and particles on fixed angles with their own real-time clock (never touches the sim).
//    Reduced motion: no squash, tumble, shake or particles; wrecks appear on the pile, the dump just clears it.
// Tested by scripts/test-tractor.mjs.
export default String.raw`
/* DOZER BLADE (06p) */
var TR={dur:5,reach:12,top:24,low:26,end:.5,pile:5};
var trT=0,trMx=0,trN=0,trW=0;      /* blade s left, this blade's full s, wrecks on this blade, last step's trT (1 s warning) */
var trDb=[],trPl=[],trFx=[];       /* draw only: flying wrecks, the pile (kinds), particles */
var trIn=0,trDip=0,trDA=0,trCT=0;  /* draw only: blade lowering s, impact dip s, dump tip s, clock */
var PAL_TR={y:"#facc15",k:"#1e293b",m:"#94a3b8",o:OR};
var IC_T=[".....yy",".....ky",".mmm.yy","mmmmmky","mmmmmyy",".o.o.ky",".....yy"];   /* buggy + blade */
PU.t={i:IC_T,p:PAL_TR,c:"#facc15"};SKI.t={i:IC_T,p:PAL_TR};
var TR_TL=[-.25,.3,-.1,.4,-.35];   /* pile tilts per slot */

/* ---- sim path ---- */
function trOn(){return !isPoki()&&!demo}
function trDur(){return TR.dur+(SKON?SKU.c.e[1]*skLv("c"):0)+(skTr()>=1?SKU.t.e[0]:0)}
function trPool(ks){if(trOn())ks.push("t")}
function trGo(d){trT=trMx=trW=d;trN=0;trIn=.22;trSnd("go",0)}
function trGet(){
  trGo(trDur());
  typeof sfxPickup==="function"&&sfxPickup("g");
  trLbl("DOZER BLADE!");
  if(!demo)typeof msOn==="function"&&msOn("pu","t");
}
function trStart(){
  trT=trMx=trN=trW=0;trDb.length=0;trPl.length=0;trFx.length=0;trIn=trDip=trDA=0;
  if(tpu==="t"){bgT=0;trGo(trDur())}                         /* ?pu=t (start() just set the big cart for it) */
  else if(!tpu&&trOn()&&skTr()>=3)trGo(SKU.t.e[2]);           /* Tractor L3 Pit Start */
}
function trLbl(s){if(rm()){skLbS=s;skLbC="#fde047";skLbT=1.1}else if(typeof skLabel==="function")skLabel(s,"#fde047")}
function trCan(e){var t=e.t;return t==="b"||t==="r"||t==="p"||(t==="f"||t==="d"||t==="h")&&e.bot<TR.low}
/* the blade box: from the buggy's nose TR.reach px ahead, TR.top px up from the wheels (rides along in a jump) */
function trBox(x,y,w,h,pt,ph,pw){var x0=PX+pw-2,x1=PX+pw+TR.reach,y1=pt+ph,y0=y1-TR.top;return x<x1&&x+w>x0&&y<y1&&y+h>y0}
/* base ents loop (13), before hit(): true = ploughed (the caller removes it) */
function trHit(e,ey,pt,ph,pw){
  if(!(trT>0)||!trCan(e))return false;
  if(!(hit(PX,pt,pw,ph,e.x,ey,e.w,e.h)||trBox(e.x,ey,e.w,e.h,pt,ph,pw)))return false;
  trPlough(e.sk==="l"?"l":e.sk==="v"?"v":e.t,e.x+e.w/2,ey+e.h/2,e.v|0);
  return true;
}
/* ore cart (06i ocTick, before its hit): shoved, then flipped over the buggy; its ore spills as 3 real sparks just ahead */
function trCart(c,pw,ph,pt){
  if(!(trT>0))return false;
  var cy=ocGY(c.x+OC_W/2)-OC_H;
  if(!(hit(PX,pt,pw,ph,c.x,cy,OC_W,OC_H)||trBox(c.x,cy,OC_W,OC_H,pt,ph,pw)))return false;
  c.a=0;trPlough("c",c.x+OC_W/2,cy+OC_H/2,0);
  for(var i=0;i<3;i++)ents.push({x:PX+pw+26+i*18,w:12,h:12,bot:8+i*8,t:"k"});
  return true;
}
function trPlough(k,cx,cy,v){
  trN++;trDip=.08;
  if(!rm())shake=Math.max(shake,.1);
  trSnd("hit",trN);
  trWreck(k,cx,cy,v);
}
function trPay(){return trN*(skTr()>=2?SKU.t.e[1]:1)}
function trTick(dt){
  if(!(trT>0))return;
  trT-=dt;
  if(trW>1&&trT<=1&&trT>0&&typeof sfxExpireWarn==="function")sfxExpireWarn("g");
  trW=trT;
  if(trT<=0){trT=0;trDump()}
}
function trDump(){
  var n=trN,p=trPay();trN=0;
  if(p>0&&typeof skEarn==="function")skEarn(p);
  inv=Math.max(inv,TR.end);
  typeof endPU==="function"&&endPU();
  if(n>0){trLbl("SCRAP ×"+n+"! +"+p);trSnd("dump",n)}
  trDA=.45;trTip();
}
function trDie(){var p=trPay();trN=0;if(p>0&&typeof skEarn==="function")skEarn(p)}
function trSnd(ev,n){
  if(ev==="go"){if(snd&&AU)noise(AU,ac.currentTime,.18,1.2,.07);sfx(110,240,.18,2,.06)}
  else if(ev==="hit"){if(snd&&AU)noise(AU,ac.currentTime,.09,.5,.16);sfx(150+30*Math.min(n,8),55,.14,2,.09)}
  else{if(snd&&AU)noise(AU,ac.currentTime,.3,.4,.12);for(var i=0;i<Math.min(n,6);i++)sfx(mf(84+i*2),0,.06,0,.06,.12+i*.07)}
}

/* ---- draw path (no sim state is written below) ---- */
/* buggy-local blade/pile anchor in screen units (rb* from 14-render drawPlayer, this frame) */
function trSX(lx){return rbGX+lx*rbM}
function trSY(ly){return rbGY+ly*rbM}
function trSlot(i){return {x:40+(i&1?4:-1),y:-(7+i*8)}}
/* a new wreck: squash + white flash at the impact spot, then its reaction (SPEC "What happens to enemy sprites") */
function trWreck(k,cx,cy,v){
  var mo=!rm(),i;
  if(k==="p"){  /* pillar: the top half topples back over the cab, the stump's bricks go on the pile */
    if(mo)trDb.push({k:"pt",v:v,x:cx,y:cy-12,vx:-240,vy:-430,a:0,va:-7,g:1400,age:0,m:"fly",fl:.08});
    trToPile("p",v,cx,cy+12);return;
  }
  if(k==="f"){  /* low flyer: batted up and right off the screen, a twinkle where it leaves */
    if(mo)trDb.push({k:"f",v:v,x:cx,y:cy,vx:300,vy:-520,a:0,va:14,g:500,age:0,m:"fly",fl:.08,tw:1});
    return;
  }
  if(k==="c"){  /* ore cart: shoved ahead with skidding sparks for .3 s, then flipped over the buggy */
    if(mo)trDb.push({k:"c",v:v,x:cx,y:cy,vx:0,vy:0,a:0,va:0,g:0,age:0,m:"push",fl:.08});
    return;
  }
  if(mo){
    if(k==="v")for(i=0;i<8;i++)trFx.push({x:cx,y:cy-16,vx:Math.cos(4.2+i*.13)*40,vy:-60-i*9,g:-20,age:0,life:.7,c:"#94a3b8",s:3+(i&1)});  /* vent snuffed: grey smoke */
    if(k==="d"||k==="h")for(i=0;i<2;i++)trFx.push({x:cx+(i?9:-9),y:cy-6,vx:i?140:-60,vy:-260,g:900,age:0,life:.6,c:"#67e8f9",s:3});  /* props clipped off */
  }
  trToPile(k,v,cx,cy);
}
function trToPile(k,v,x,y){
  if(rm()){if(trPl.length<TR.pile)trPl.push({k:k,v:v});return}
  trDb.push({k:k,v:v,x:x,y:y,x0:x,y0:y,vx:0,vy:0,a:0,va:k==="r"?-25:0,g:0,age:0,m:"go",fl:.08});
}
/* dump: every pile piece flies back off the left edge and pops into a spark */
function trTip(){
  if(rm()){trPl.length=0;return}
  for(var i=0;i<trPl.length;i++){var s=trSlot(i);
    trDb.push({k:trPl[i].k,v:trPl[i].v,x:trSX(s.x),y:trSY(s.y),vx:-(240+i*50),vy:-(260+i*40),a:TR_TL[i],va:-(6+i),g:1300,age:0,m:"fly",pop:.45})}
  trPl.length=0;
}
function trBurst(x,y,n,sp,c,g,life){for(var i=0;i<n;i++){var a=i*6.283/n+.3;trFx.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,g:g,age:0,life:life,c:c,s:2})}}
var trWP=new Map();
function trWhite(p){var w=trWP.get(p);if(!w){w={};for(var c in p)w[c]="#ffffff";trWP.set(p,w)}return w}
/* sprite rows drawn centred on the current origin, sx/sy in game units per sprite cell/3 (1 = as in the game) */
function trBlit(rows,pal,sx,sy){var im=sprImg(rows,3,pal,3);ctx.save();ctx.scale(sx/K,sy/K);ctx.drawImage(im,-im.width/2,-im.height/2);ctx.restore()}
function trRect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
/* one wreck, centred on the origin. wf = white flash frame, s = scale */
function trPiece(k,v,s,wf,age){
  var W1="#ffffff";
  if(k==="b"){var pb=wf?trWhite(PAL_B[v&1]):PAL_B[v&1];ctx.save();ctx.scale(1,-1);trBlit(BUG,pb,s,s);ctx.translate(0,10.5*s);trBlit(LEGS[((age*16)|0)&1],pb,s,s);ctx.restore();return}  /* belly up, legs pedalling */
  if(k==="l"){var pl=typeof EN_BP!=="undefined"?EN_BP[v&1]:{o:OR,y:"#fde047",k:"#431407",r:"#ef4444"};trBlit(typeof EN_BLOB!=="undefined"?EN_BLOB[0]:BUG,wf?trWhite(pl):pl,s*1.3,s*.45);return}  /* splat */
  if(k==="f"){trBlit(FUP,wf?trWhite(PAL_F):PAL_F,s,s);return}
  if(k==="d"||k==="h"){trBlit(DR1.slice(1),wf?trWhite(PAL_D[0]):PAL_D[0],s,s);return}  /* no props */
  ctx.save();ctx.scale(s,s);
  if(k==="r"){ctx.fillStyle=wf?W1:"#1e293b";ctx.beginPath();ctx.arc(0,0,11,0,6.283);ctx.fill();ctx.strokeStyle=wf?W1:OR;ctx.lineWidth=2;ctx.stroke();
    ctx.strokeStyle=wf?W1:"#94a3b8";ctx.beginPath();for(var q=0;q<3;q++){ctx.moveTo(0,0);ctx.lineTo(Math.cos(q*2.094)*9,Math.sin(q*2.094)*9)}ctx.stroke()}
  else if(k==="p"){for(var j=0;j<3;j++){var bx=-13+j*9-(j===1?0:1),by=j===1?-10:-4;trRect(bx,by,8,6,wf?W1:"#1e1b4b");ctx.strokeStyle=wf?W1:VI;ctx.lineWidth=1;ctx.strokeRect(bx+.5,by+.5,7,5)}}  /* stump bricks */
  else if(k==="pt"){trRect(-13,-12,26,24,wf?W1:"#1e1b4b");ctx.strokeStyle=wf?W1:VI;ctx.lineWidth=2;ctx.strokeRect(-12,-11,24,22);
    ctx.strokeStyle="rgba(168,85,247,.55)";ctx.beginPath();ctx.moveTo(-10,-9);ctx.lineTo(10,9);ctx.moveTo(10,-9);ctx.lineTo(-10,9);ctx.stroke();trRect(-3,-17,6,5,OR)}
  else if(k==="v"){var vc=typeof EN_VC!=="undefined"?EN_VC:{body:"#64748b",rim:"#cbd5e1",slat:"#94a3b8"};trRect(-12,-5,24,10,wf?W1:vc.body);ctx.strokeStyle=wf?W1:vc.rim;ctx.lineWidth=1;ctx.strokeRect(-11.5,-4.5,23,9);
    for(var g2=0;g2<4;g2++)trRect(-9+g2*5,-3,2,6,wf?W1:vc.slat)}  /* scraped-off grate */
  else if(k==="c"){trRect(-16,-9,32,13,wf?W1:"#7c2d12");trRect(-14,-11,28,3,wf?W1:OR);trRect(-12,-15,8,5,wf?W1:"#fde047");trRect(2,-14,7,4,wf?W1:"#fdba74");
    ctx.fillStyle=wf?W1:"#334155";ctx.beginPath();ctx.arc(-9,5,4,0,6.283);ctx.arc(9,5,4,0,6.283);ctx.fill()}
  ctx.restore();
}
function trClock(){var now=performance.now()/1000,d=now-trCT;trCT=now;return d>0&&d<=.1?d:0}
/* 14 draw(), right after drawPlayer(): debris, then the blade + pile in the buggy's frame */
function trDraw(){
  var d=trClock(),mo=!rm(),i,b;
  if(trIn>0)trIn=Math.max(0,trIn-d);if(trDip>0)trDip=Math.max(0,trDip-d);if(trDA>0)trDA=Math.max(0,trDA-d);
  if(!(trT>0)&&!(trDA>0)&&!trDb.length&&!trFx.length)return;
  base();
  /* flying wrecks */
  for(i=trDb.length-1;i>=0;i--){
    b=trDb[i];b.age+=d;if(b.fl>0)b.fl-=d;
    if(b.m==="go"){  /* to the next pile slot over .32 s on a small arc */
      var q=Math.min(1,Math.max(0,(b.age-.08)/.32)),sl=trSlot(Math.min(trPl.length,TR.pile-1)),tx=trSX(sl.x),ty=trSY(sl.y);
      b.x=b.x0+(tx-b.x0)*q;b.y=b.y0+(ty-b.y0)*q-Math.sin(q*3.1416)*18;b.a+=b.va*d;
      if(b.k==="r"&&b.age<.3&&((b.age*30)|0)!==(((b.age-d)*30)|0))trFx.push({x:b.x+8,y:b.y+6,vx:120,vy:-90,g:700,age:0,life:.3,c:"#fde047",s:2});  /* rim sparks */
      if(q>=1){trDb.splice(i,1);if(trPl.length<TR.pile)trPl.push({k:b.k,v:b.v});else trDb.push({k:b.k,v:b.v,x:b.x,y:b.y,vx:-180,vy:-360,a:0,va:-9,g:1300,age:0,m:"fly",pop:.5});continue}  /* full: flung over the top */
    }else if(b.m==="push"){  /* ore cart pinned to the blade, skidding */
      b.x=trSX(36+OC_W/2);b.y=trSY(-OC_H/2);
      if(((b.age*40)|0)&1)trFx.push({x:b.x-12,y:trSY(0)-1,vx:-160,vy:-60,g:600,age:0,life:.25,c:OR,s:2});
      if(b.age>=.3){b.m="fly";b.vx=-260;b.vy=-520;b.va=-8;b.g=1500;b.land=1}
    }else{
      b.vy+=b.g*d;b.x+=b.vx*d;b.y+=b.vy*d;b.a+=b.va*d;
      if(b.pop&&b.age>=b.pop){trBurst(b.x,b.y,6,90,"#fde047",0,.35);trFx.push({x:b.x,y:b.y,vx:0,vy:-40,g:0,age:0,life:.5,c:"",s:0,k:1});trDb.splice(i,1);continue}  /* pops into a spark */
      if((b.k==="pt"||b.land)&&b.vy>0&&b.y>GY-10){trBurst(b.x,GY-3,8,110,"#94a3b8",300,.4);trDb.splice(i,1);continue}  /* lands behind in dust */
      if(b.tw&&b.y<-OY-10){trFx.push({x:Math.min(b.x,XO+VW-12),y:8-OY,vx:0,vy:0,g:0,age:0,life:.5,c:"",s:0,k:1});trDb.splice(i,1);continue}  /* twinkle where it leaves */
      if(b.age>3||b.x<XO-80||b.x>XO+VW+80||b.y>H+OB+60){trDb.splice(i,1);continue}
    }
    var sq=b.age<.08?1:0;
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);if(sq)ctx.scale(1.3,.7);
    trPiece(b.k,b.v,b.m==="go"?1-.3*Math.min(1,b.age/.4):1,b.fl>0&&b.age<.05,b.age);
    ctx.restore();
  }
  /* particles (a twinkle is a spark sprite) */
  for(i=trFx.length-1;i>=0;i--){
    var p=trFx[i];p.age+=d;if(p.age>=p.life){trFx[i]=trFx[trFx.length-1];trFx.pop();continue}
    p.vy+=p.g*d;p.x+=p.vx*d;p.y+=p.vy*d;ctx.globalAlpha=Math.max(0,1-p.age/p.life);
    if(p.k){ctx.save();ctx.translate(p.x,p.y);trBlit(IC_K,PAL_K[((p.age*10)|0)&1],.7,.7);ctx.restore()}else trRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s,p.c);
  }
  ctx.globalAlpha=1;
  if(trT>0||trDA>0){
    base();ctx.translate(rbGX,rbGY);ctx.scale(rbM,rbM);if(rbA){ctx.translate(0,-15);ctx.rotate(rbA);ctx.translate(0,15)}
    /* pile, wobbling with the buggy */
    for(i=0;i<trPl.length;i++){var s=trSlot(i);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(TR_TL[i]+(mo?Math.sin(tt*9+i)*.05*(i+1):0));trPiece(trPl[i].k,trPl[i].v,.7,false,tt);ctx.restore()}
    var blink=trT>0&&trT<1.5&&((trT*8)|0)&1&&mo;
    if(!blink)trBlade(mo);
  }
  base();
}
/* blade on two arms + a hydraulic ram, in the buggy frame (+x forward, y up is negative, ground at 0) */
function trBlade(mo){
  var up=0,tip=0;
  if(mo&&trIn>0)up=trIn/.22;
  if(mo&&trDA>0){var ph=1-trDA/.45;up=Math.max(up,Math.sin(ph*3.1416));tip=Math.sin(ph*3.1416)}
  var dy=-up*9+(mo&&trDip>0?3*trDip/.08:0);
  ctx.save();ctx.translate(0,dy);
  ctx.strokeStyle="#64748b";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(9,-12);ctx.lineTo(28,-9);ctx.moveTo(9,-6);ctx.lineTo(28,-3);ctx.stroke();  /* arms */
  trRect(5,-17,12,3,"#475569");trRect(16,-16.5,11,2,"#e2e8f0");  /* hydraulic ram */
  ctx.translate(29,-1);ctx.rotate(-tip*.7);
  trRect(-2,-24,6,25,"#0b1020");
  for(var j=0;j<6;j++)trRect(-1,-23+j*4,4,2,j&1?"#1e293b":"#facc15");  /* hazard stripes */
  trRect(-1,-25,6,2,"#facc15");trRect(-1,-1,6,1.5,"#e2e8f0");  /* top lip, cutting edge */
  ctx.restore();
}
/* 14 drawHud(), after the power-up boxes: the blade's timer box and the SCRAP count; returns the next box's right edge */
function trHud(xr,hy){
  if(!(trT>0))return xr;
  if(trT<1.5&&((trT*8)|0)&1&&!rm())return xr-30;
  ctx.fillStyle="rgba(5,7,13,.6)";ctx.fillRect(xr-22,40+hy,22,26);
  ctx.strokeStyle=PU.t.c;ctx.lineWidth=1;ctx.strokeRect(xr-22,40+hy,22,26);
  spr(IC_T,xr-18,43+hy,2,PAL_TR);
  R(xr-20,60+hy,18*Math.max(0,Math.min(1,trT/(trMx||1))),3,PU.t.c);
  if(trN>0)txt("SCRAP ×"+trN,xr-11,80+hy,Math.round(10*HS),PU.t.c,"center",true,true,true,"","trs",1);  /* 1: clamp into XO..XO+VW */
  return xr-30;
}
`;
