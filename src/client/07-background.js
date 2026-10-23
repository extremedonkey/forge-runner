// BACKGROUND: rnd(), parallax layers / stars / city data.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
/* background */
var T=640,lanes=[],stars=[],MT=[],CITY=[];
function rnd(a,b){return a+Math.random()*(b-a)}
(function(){
  for(var i=0;i<3;i++){
    var segs=[],x=0;
    while(x<T){
      var len=Math.round(rnd(40,120)),dy=Math.random()<.5?8:-8;
      segs.push({x:x,len:len,dy:dy,c:Math.random()<.6?CY:VI});
      x+=len+Math.round(rnd(20,70));
    }
    lanes.push(segs);
  }
  for(var j=0;j<40;j++)stars.push({x:rnd(0,960),y:rnd(6,150),b:Math.random()});
  for(var m=0;m<=12;m++)MT.push(m%12===0?40:Math.round(rnd(25,85)));
  var cx=0;
  while(cx<720){
    var bw=Math.round(rnd(22,48)),bh=Math.round(rnd(18,70)),wins=[];
    for(var q=0;q<6;q++)if(Math.random()<.6)wins.push([Math.round(rnd(3,bw-6)),Math.round(rnd(4,bh-6)),Math.random()<.7?CY:OR]);
    CITY.push({x:cx,w:bw,h:bh,wins:wins});
    cx+=bw+Math.round(rnd(2,14));
  }
})();
var LANE_F=[1,.6,.35],LANE_A=[.5,.34,.2];

`;
