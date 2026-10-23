// CHALLENGE LINK: PUBLIC_URL (from the server constant) and ?c=&n= parsing -> chal, cname.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
import { PUBLIC_URL } from "../server/config.mjs";
export default String.raw`
/* public base URL for share / challenge links (server constant PUBLIC_URL) */
var PUBLIC_URL="${PUBLIC_URL}";
/* challenge link: ?c=742&n=Reece */
var chal=0,cname="";
var cq=Q.get("c");
if(/^\d{1,5}$/.test(cq||"")){chal=parseInt(cq,10);if(chal<1||chal>99999)chal=0}
if(chal)cname=nm(Q.get("n"));
`;
