// SPRITES (owner: Mobile): pixel sprites + palettes, power-up icons, sprite cache sprImg()/spr(), base(), R().
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
/* sprites */
var ANVIL=["cccccccccccccc.","lllllllllllllgg",".gggggggggggggg","..ggggggggggg..","....gggggg.....","....ggoogg.....","...gggggggg....","..dddddddddd..."];
var PAL_A={c:CY,l:"#cbd5e1",g:"#64748b",o:OR,d:"#475569"};
var BUG=["..n....n..","...mmmm...","..mmmmmm..",".emmnnmmm.",".mmmmmmmm.","..mmmmmm.."];
var LEGS=[[".l.l..l.l."],["l.l....l.l"]];
var PAL_B=[{m:VI,n:CY,e:OR,l:"#94a3b8"},{m:CY,n:VI,e:OR,l:"#94a3b8"}];
var FUP=["ww.......ww",".ww.....ww.","..wwmmmww..","....mem....","....mmm....",".....n....."];
var FDN=["...........","....mmm....","....mem....","..wwmmmww..",".ww.....ww.","ww.......ww"];
var PAL_F={w:"#67e8f9",m:VI,e:OR,n:CY};
var DR1=["www....www","..mmmmmm..",".mmmeemmm.","mmmmmmmmmm",".r..ll..r."];
var DR2=[".ww....ww.","..mmmmmm..",".mmmeemmm.","mmmmmmmmmm",".r..ll..r."];
/* power-up icons (7x7): shield, spring boots, big cart */
var IC_S=[".ccccc.","cwwwwwc","cwcccwc","cwcccwc",".cwcwc.","..cwc..","...c..."];
var IC_J=["ooooooo","..y.y..",".y.y...","..y.y..",".y.y...","..y.y..","ooooooo"];
var IC_G=["lllllll","ccccccc",".ggggg.","..ggg..","..ggg..",".ggggg.","ddddddd"];
var PAL_IS={c:CY,w:"#e0f2fe"},PAL_IJ={o:OR,y:"#fde047"},PAL_IG={c:"#fde047",l:"#fdba74",g:OR,d:"#9a3412"};
var PU={s:{i:IC_S,p:PAL_IS,c:CY},j:{i:IC_J,p:PAL_IJ,c:"#fde047"},g:{i:IC_G,p:PAL_IG,c:OR}};
var PAL_BIG={c:"#fde047",l:"#fdba74",g:OR,o:"#fef3c7",d:"#9a3412"};
/* sparks (SPEC §5): spark pickup IC_K (5x5, two twinkle palettes) + the five 7x7 upgrade icons, keyed by upgrade id in SKI
   (m magnet, c power cell, d supply drop, p forge plate, r spare core). Drawn with spr(); PR7's upgrade row reuses SKI. */
var IC_K=["..a..",".aba.","abwba",".aba.","..a.."];
var PAL_K=[{a:CY,b:OR,w:"#fef3c7"},{a:OR,b:CY,w:"#ffffff"}];
var IC_UM=["ww...ww","rr...rr","rr...rr","rr...rr","rrr.rrr",".rrrrr.","..rrr.."];
var IC_UC=["..www..",".wwwww.",".w...w.",".wyyyw.",".wyyyw.",".wyyyw.",".wwwww."];
var IC_UD=["bbbbbbb","bdbbbdb","bbdbdbb","bbbdbbb","bbdbdbb","bdbbbdb","bbbbbbb"];
var IC_UP=[".lllll.","lgggggl","lgooogl","lgooogl",".lgogl.","..lgl..","...l..."];
var IC_UR=[".rr.rr.","rrrrrrr","rrrcrrr","rrcccrr",".rrcrr.","..rrr..","...r..."];
var SKI={m:{i:IC_UM,p:{w:"#e2e8f0",r:"#ef4444"}},c:{i:IC_UC,p:{w:"#94a3b8",y:"#fde047"}},d:{i:IC_UD,p:{b:"#b45309",d:"#78350f"}},
  p:{i:IC_UP,p:{l:"#cbd5e1",g:"#64748b",o:OR}},r:{i:IC_UR,p:{r:"#ef4444",c:"#fde047"}}};
var PAL_D=[{w:"#f1f5f9",m:"#a3b1c6",e:CY,r:"#ef4444",l:VI},{w:"#f1f5f9",m:"#a3b1c6",e:CY,r:"#7f1d1d",l:VI}];

function base(){ctx.setTransform(K,0,0,K,Math.round((SX-XO)*K),Math.round((SY+OY)*K))}
/* pixel sprites are snapped to device pixels so they stay crisp at any scale */
/* perf: each (sprite, palette, scale) is rendered once per backing-store scale into a small canvas, then blitted */
var SPC=new Map();
function sprImg(rows,s,pal,sy){
  var m=SPC.get(rows);if(!m){m=new Map();SPC.set(rows,m)}
  var pm=m.get(pal);if(!pm){pm={};m.set(pal,pm)}
  var key=s*1000+sy,im=pm[key];
  if(im)return im;
  var cols=0;for(var r=0;r<rows.length;r++)cols=Math.max(cols,rows[r].length);
  im=document.createElement("canvas");
  im.width=Math.max(1,Math.round(cols*s*K));im.height=Math.max(1,Math.round(rows.length*sy*K));
  var o=im.getContext("2d");
  for(r=0;r<rows.length;r++){
    var row=rows[r],y0=Math.round(r*sy*K),y1=Math.round((r+1)*sy*K),c=0;
    while(c<row.length){
      var ch=row.charAt(c);
      if(ch==="."||!pal[ch]){c++;continue}
      var c2=c+1;while(c2<row.length&&row.charAt(c2)===ch)c2++;
      var x0=Math.round(c*s*K),x1=Math.round(c2*s*K);
      o.fillStyle=pal[ch];o.fillRect(x0,y0,x1-x0,y1-y0);
      c=c2;
    }
  }
  pm[key]=im;return im;
}
function spr(rows,x,y,s,pal,sy){
  sy=sy||s;
  var im=sprImg(rows,s,pal,sy);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(im,Math.round(x*K)+Math.round((SX-XO)*K),Math.round(y*K)+Math.round((SY+OY)*K));
  base();
}
/* dark outline for a sprite (Playtest PR-59: the purple bug sat at 3.0:1 on L1 at dusk): the silhouette of the cached sprite
   image, grown by about 1 logical px (round(K) device px, >= 1) and filled with BG; cached per sprite image, so it is built
   once per (sprite, palette, scale) like the sprite itself and dropped with SPC on fit(). Draw it under the sprite. */
var SPO=new WeakMap();
function sprO(rows,x,y,s,pal,sy){
  sy=sy||s;
  var im=sprImg(rows,s,pal,sy),o=SPO.get(im),d=Math.max(1,Math.round(K));
  if(!o||o.d!==d){
    var c=document.createElement("canvas");c.width=im.width+2*d;c.height=im.height+2*d;
    var g=c.getContext("2d");
    for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++)if(dx||dy)g.drawImage(im,d+dx*d,d+dy*d);
    g.globalCompositeOperation="source-in";g.fillStyle=BG;g.fillRect(0,0,c.width,c.height);
    o={c:c,d:d};SPO.set(im,o);
  }
  ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(o.c,Math.round(x*K)+Math.round((SX-XO)*K)-d,Math.round(y*K)+Math.round((SY+OY)*K)-d);
  base();
}
function R(x,y,w,h,col){
  var ox=Math.round((SX-XO)*K),oy=Math.round((SY+OY)*K),x0=Math.round(x*K)+ox,y0=Math.round(y*K)+oy;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle=col;ctx.fillRect(x0,y0,Math.round((x+w)*K)+ox-x0,Math.round((y+h)*K)+oy-y0);
  base();
}

`;
