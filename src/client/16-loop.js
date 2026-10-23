// LOOP/BOOT: rAF loop with <=1/240 s physics sub-steps, visibility pause, boot (fit, visit beacon, demo autostart).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
/* loop */
function frame(ts){
  raf=requestAnimationFrame(frame);
  if(!last)last=ts;
  var dt=Math.min((ts-last)/1000,.05);
  last=ts;
  /* <=1/240 s sub-steps: same jump arc and spawn spacing at any refresh rate (no judder, no 30fps-floaty jumps) */
  var n=Math.max(1,Math.ceil(dt*240-1e-6));
  /* paused (POKI-7, 12-input.js): the simulation is frozen; the frame is still drawn (resize, overlay) */
  if(!paused)for(var i=0;i<n;i++)update(dt/n);
  draw();pzSync();
}
document.addEventListener("visibilitychange",function(){
  if(document.hidden){
    if(raf){cancelAnimationFrame(raf);raf=0}
    release();duck=false;
  }else if(!raf){
    last=0;raf=requestAnimationFrame(frame);
  }
});

fit();
track("visit");
if(demo)start();
raf=requestAnimationFrame(frame);
`;
