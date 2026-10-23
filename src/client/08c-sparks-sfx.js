// AUDIO (sparks SFX, owner: Forge Runner Audio, sparks PR3 fills this in): SPEC §5.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Every function must stay silent when !snd||!AU. PR0 SCAFFOLD: all no-ops. Runs after 08b-leaderboard-sfx.js.
export default String.raw`
/* sparks SFX (scaffold, sparks PR0): no-ops until sparks PR3 */
function sfxSpark(){}
function sfxBuy(k,lv){}
function sfxNoBuy(){}
function sfxAfford(){}
function sfxReboot(){}
function sfxReforge(){}
function sfxAllMax(){}
`;
