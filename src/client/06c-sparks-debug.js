// SPARKS debug switch (owner: Dev, sparks PR2 fills this in): ?sk=<bank>[.<m><c><d><p><r>] with an in-memory save (SPEC §6).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// WEB BUILD ONLY: the Poki build (src/client/poki/script.mjs, POKI_EXCLUDE) drops this fragment, and its guard
// fails the Poki build if dist/poki contains the debug marker. PR2 puts the marker in this fragment's code.
// PR0 SCAFFOLD: empty. Runs after 06b-sparks.js.
export default String.raw`
/* sparks debug (scaffold, sparks PR0): empty until sparks PR2; web build only */
`;
