// UPGRADES UI (owner: Mobile, sparks PR7/PR8 fill this in): the between-runs upgrade row #up (SPEC §3).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Placement (SPEC §3): web portrait = below #sh. On Poki (isPoki()) #sh is hidden, so anchor to the Retry button or the
// ground band instead (Mobile decides), never to #sh.
// PR0 SCAFFOLD: no DOM, no listeners; upShow()/upHide() are no-ops. Runs after 14-render.js.
export default String.raw`
/* upgrade row (scaffold, sparks PR0): no-ops until sparks PR7 */
function upShow(){}
function upHide(){}
`;
