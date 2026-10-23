// LEVELS BACKGROUND (LEVELS-2, owner: Levels): per-level sky/ground tint + parallax prop layer, crossfaded on level change.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// PURELY COSMETIC: reads lvl/lvPrev/lvFade() (06d-levels.js), scroll, state, K/OY/OB/XO/VW/GY (read only); writes nothing of the game.
// Hook: ONE typeof-guarded line at the end of 07-background.js calls lvBgInit(), which wraps drawWorld() (14-render.js, Mobile)
// so lvBg() runs right after the normal world (sky, day/night, stars, sun/moon, mountains, city, ground, lanes) and before
// ents/player/HUD. The original drawWorld() runs unchanged first, so L1 Foundry is exactly the current look.
// Phone-cheap: the tint is one cached offscreen canvas per level (rebuilt only when the view size changes) blitted per frame;
// props go through ONE shared offscreen canvas (allocated once, resized only on view change): clear, fillRects, one fade, one blit;
// props are a few dozen fillRects from data built once at load; embers are analytic (no pool, no state); no per-frame allocation.
// Readability (levels-fix-1): the lane band (0..LVB_LANE px above the ground line, where crates/bugs/pillars/flyers/drones/sparks
// live) keeps the L1 look: the tint is cut out of it and replaced by a dark veil, so obstacle/spark contrast stays >= 3:1 (tested).
// Props stand on a far ridge LVB_RIDGE px above the ground line (feet faded into haze, slow parallax, dimmed), clear of every gameplay
// sprite (crates/bugs 0-21, pillars 0-50, flyers 4-70, drones 60-75, spark arcs up to ~80 px above the ground line).
export default String.raw`
/* lvBg data: per level a prop row repeating every LVB_P units at parallax LVB_F[n]. Deterministic (no Math.random). */
var LVB_P=600,LVB_F=[0,0,.16,.16,.17,.18],LVB_X=[],LVB_W=[],LVB_H=[],LVC=[null,null,null,null,null,null],lvBgOn=false;
/* lane band height, far-ridge height (props' ground line, px above GY), tint cut-out fade start, prop dimming, lane veil per level */
var LVB_LANE=70,LVB_RIDGE=96,LVB_HAZE=34,LVP=null,LVB_CUT=118,LVB_DIM=.62,LVB_VEIL=[null,null,"rgba(8,4,6,.38)","rgba(8,3,8,.38)","rgba(3,7,12,.38)","rgba(8,3,14,.38)"];
(function(){
  var r=7,i,n;
  function q(){r=(r*16807)%2147483647;return r/2147483647}
  for(n=0;n<6;n++){LVB_X.push([]);LVB_W.push([]);LVB_H.push([])}
  for(n=2;n<6;n++){
    var cnt=n===2?6:n===3?7:5;
    for(i=0;i<cnt;i++){
      LVB_X[n].push(Math.round(i*LVB_P/cnt+q()*30));
      LVB_W[n].push(Math.round(n===2?60+q()*50:n===3?14+q()*10:n===4?44+q()*14:40+q()*12));
      LVB_H[n].push(Math.round(n===2?22+q()*26:n===3?30+q()*34:n===4?52+q()*16:54+q()*16));
    }
  }
})();
/* cached tint canvas for level n at the current view (key = K/OY/OB/XO/VW) */
function lvTint(n){
  var P=LV_PAL[n-1],k=K+"|"+OY+"|"+OB+"|"+XO+"|"+VW,e=LVC[n];
  if(e&&e.k===k)return e.c;
  if(!e)e=LVC[n]={c:document.createElement("canvas"),k:""};
  e.k=k;
  var w=VW+40,h=H+OY+OB+40,c=e.c;
  c.width=Math.max(1,Math.ceil(w*K));c.height=Math.max(1,Math.ceil(h*K));
  var o=c.getContext("2d");
  o.setTransform(K,0,0,K,0,0);o.clearRect(0,0,w,h);
  var gy=GY+OY+20,g=o.createLinearGradient(0,0,0,gy);
  g.addColorStop(0,P.sk0);g.addColorStop(1,P.sk1);
  o.fillStyle=g;o.fillRect(0,0,w,gy);
  /* horizon glow sits on the far ridge (props' ground), not in the lane band */
  var rg=gy-LVB_RIDGE,hz=o.createLinearGradient(0,rg-46,0,rg);hz.addColorStop(0,"rgba(0,0,0,0)");hz.addColorStop(1,P.hz);
  o.fillStyle=hz;o.fillRect(0,rg-46,w,46);
  /* lane band: cut the tint out (fade from LVB_CUT to LVB_LANE+4 px above the ground line, none below), then a dark veil */
  var cut=o.createLinearGradient(0,gy-LVB_CUT,0,gy-LVB_LANE-4);cut.addColorStop(0,"rgba(0,0,0,0)");cut.addColorStop(1,"rgba(0,0,0,1)");
  o.globalCompositeOperation="destination-out";
  o.fillStyle=cut;o.fillRect(0,gy-LVB_CUT,w,LVB_CUT-LVB_LANE-4);o.fillStyle="#000";o.fillRect(0,gy-LVB_LANE-4,w,LVB_LANE+4);
  o.globalCompositeOperation="source-over";
  var vl=o.createLinearGradient(0,gy-LVB_CUT,0,gy-LVB_LANE-4);vl.addColorStop(0,"rgba(0,0,0,0)");vl.addColorStop(1,LVB_VEIL[n]);
  o.fillStyle=vl;o.fillRect(0,gy-LVB_CUT,w,LVB_CUT-LVB_LANE-4);o.fillStyle=LVB_VEIL[n];o.fillRect(0,gy-LVB_LANE-4,w,LVB_LANE+4);
  o.fillStyle=P.gd;o.fillRect(0,gy+2,w,h-gy-2);
  return c;
}
/* shared prop canvas (view above the ridge) + its feet fade gradient; resized only when the view changes */
function lvProps(){
  var k=K+"|"+OY+"|"+XO+"|"+VW+"|"+GY;
  if(!LVP)LVP={c:document.createElement("canvas"),k:""};
  var c=LVP.c;
  if(LVP.k!==k){
    LVP.k=k;c.width=Math.max(1,Math.ceil((VW+40)*K));c.height=Math.max(1,Math.ceil((GY-LVB_RIDGE+OY+20)*K));
    var o=c.getContext("2d"),g=o.createLinearGradient(0,GY-LVB_RIDGE-LVB_HAZE,0,GY-LVB_RIDGE);
    g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,1)");c.fd=g;
  }
  return c;
}
function lvBgInit(){
  if(lvBgOn||typeof drawWorld!=="function")return;
  lvBgOn=true;
  var dw=drawWorld;
  drawWorld=function(){dw();lvBg()};
}
function lvBg(){
  if(state==="start")return;
  var f=lvFade(),a=lvPrev,b=lvl;
  if(f<1&&a!==b&&a>1)lvLayer(a,1-f);
  if(b>1)lvLayer(b,a===b?1:f);
  ctx.globalAlpha=1;
}
function lvLayer(n,al){
  if(!(al>0))return;
  var P=LV_PAL[n-1],t=rm()?0:performance.now()/1000,i,x,w,h,b0,off=(scroll*LVB_F[n])%LVB_P,X=LVB_X[n],Wd=LVB_W[n],Hd=LVB_H[n],y;
  ctx.globalAlpha=al;
  ctx.drawImage(lvTint(n),XO-20,-OY-20,VW+40,H+OY+OB+40);
  /* props: stand on the far ridge RG = GY-LVB_RIDGE, drawn into one shared offscreen canvas that only covers the view above
     the ridge, their feet faded out into haze (no hard base line, nothing that reads as a platform), blitted dimmed */
  var RG=GY-LVB_RIDGE,al0=al,pc=lvProps(),o=pc.getContext("2d");
  o.setTransform(K,0,0,K,-(XO-20)*K,(OY+20)*K);o.globalAlpha=1;o.globalCompositeOperation="source-over";
  o.clearRect(XO-20,-OY-20,VW+40,RG+OY+20);
  al=1;
  for(b0=-off;b0<W+80;b0+=LVB_P)for(i=0;i<X.length;i++){
    x=Math.round(b0+X[i]);w=Wd[i];h=Hd[i];
    if(x>XO+VW+10||x+w<XO-10)continue;
    if(n===2){
      /* SLAG PITS: stepped slag heaps with molten crests */
      o.fillStyle=P.pr;for(var s=0;s<4;s++){o.fillRect(Math.round(x+s*w/8),Math.round(RG-h*(s+1)/4),Math.round(w-s*w/4),Math.ceil(h/4))}
      o.fillStyle=P.pe;o.fillRect(Math.round(x+3*w/8),Math.round(RG-h),Math.round(w/4),2);
      o.globalAlpha=al*(.55+.45*Math.sin(t*2+i));o.fillStyle=P.hot;o.fillRect(Math.round(x+w/2-3),Math.round(RG-h-1),6,1);
      o.globalAlpha=al;
    }else if(n===3){
      /* EMBER VENTS: vent stacks with red-hot mouths and rising embers */
      o.fillStyle=P.pr;o.fillRect(x,RG-h,w,h);o.fillRect(x-3,RG-h,w+6,4);
      o.fillStyle=P.pe;o.fillRect(x-3,RG-h,w+6,2);
      o.fillStyle=P.gl;o.fillRect(x-8,RG-h-14,w+16,14);
      for(var e=0;e<4;e++){
        var ph=(t*.45+e*.25+i*.17)%1;
        o.globalAlpha=al*(1-ph);o.fillStyle=e&1?P.hot:P.pe;
        o.fillRect(Math.round(x+w/2+Math.sin(t*3+e*2+i)*5-ph*18),Math.round(RG-h-4-ph*70),2,2);
      }
      o.globalAlpha=al;
    }else if(n===4){
      /* HAMMER WORKS: gantries with steam hammers that slam, teal lamps */
      var top=RG-h,sl=Math.abs(Math.sin(t*1.6+i*1.3)),hy=top+12+Math.round((1-sl)*(h-32));
      o.fillStyle=P.pr;o.fillRect(x,top,4,h);o.fillRect(x+w-4,top,4,h);o.fillRect(x,top,w,5);
      o.fillRect(Math.round(x+w/2-2),top+5,4,hy-top-5);
      o.fillStyle=P.pr;o.fillRect(Math.round(x+w/2-12),hy,24,14);
      o.fillStyle=P.pe;o.fillRect(Math.round(x+w/2-12),hy+12,24,2);o.fillRect(x+1,top+1,2,2);o.fillRect(x+w-3,top+1,2,2);
      o.fillStyle=P.pr;o.fillRect(Math.round(x+w/2-14),RG-6,28,6);
    }else{
      /* CRUSHER: piston presses pumping, magenta warning lights */
      var top5=RG-h,pp=(Math.sin(t*2.2+i*1.7)+1)/2,ry=top5+18+Math.round(pp*(h-38));
      o.fillStyle=P.pr;o.fillRect(x,top5,w,18);o.fillRect(x+4,RG-10,w-8,10);
      o.fillStyle="#3b1764";o.fillRect(Math.round(x+w/2-4),top5+18,8,ry-top5-18);
      o.fillStyle=P.pr;o.fillRect(x-2,ry,w+4,10);
      o.fillStyle=P.pe;o.fillRect(x-2,ry+8,w+4,2);o.fillRect(x+2,top5+3,w-4,2);
      o.globalAlpha=al*(((t*3+i)|0)&1?1:.35);o.fillStyle=P.hot;o.fillRect(x+3,top5+8,3,3);o.fillRect(x+w-6,top5+8,3,3);
      o.globalAlpha=al;
    }
  }
  o.globalAlpha=1;o.globalCompositeOperation="destination-out";o.fillStyle=pc.fd;o.fillRect(XO-20,RG-LVB_HAZE,VW+40,LVB_HAZE);
  o.globalCompositeOperation="source-over";
  ctx.globalAlpha=al0*LVB_DIM;ctx.drawImage(pc,XO-20,-OY-20,VW+40,RG+OY+20);
  al=al0;ctx.globalAlpha=al;
  /* ground: level line over the cyan one, glow band, Slag Pits molten pools in the ground (below the line, dimmed) */
  ctx.fillStyle=P.gl;ctx.fillRect(XO-20,GY-3,VW+40,8);
  ctx.fillStyle=P.ln;ctx.fillRect(XO-20,GY,VW+40,2);
  if(n===2){
    var po=scroll%300;
    for(b0=-po;b0<W+40;b0+=300)for(i=0;i<2;i++){
      x=Math.round(b0+40+i*150);w=i?46:70;y=GY+14+i*20;
      ctx.globalAlpha=al*.2;ctx.fillStyle=P.pe;ctx.fillRect(x-6,y-3,w+12,8);
      ctx.globalAlpha=al*.5;ctx.fillStyle=P.pe;ctx.fillRect(x,y,w,3);ctx.fillRect(x+6,y-1,w-12,5);
      ctx.globalAlpha=al*(.3+.2*Math.sin(t*3+i*2));ctx.fillStyle=P.hot;ctx.fillRect(x+12,y,w-24,2);
      ctx.globalAlpha=al;
    }
  }
}

`;
