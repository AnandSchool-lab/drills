/* node verify-explain.js - every generated question gets a "Show me how"
   whose steps land on the right answer. Expect "ok N bad 0" and no GENERIC. */
/* Verify every generated problem has a correct answer, across all levels and many days. */
global.window = { addEventListener:function(){} };
global.document = undefined;
global.localStorage = { getItem:function(){return null;}, setItem:function(){} };
global.location = { hash:"" };

require("./content.js");
require("./app.js");
var G = window.__drills;
const X = require("./explain.js");
const norm = s => String(s).replace(/\s+/g," ").trim();
let ok=0, bad=0, generic={}, fails=[];
function test(block, q, want){
  const L = X.build({q, gave:"1", want:String(want), block, date:"2026-11-09"}, [], "");
  if(!L.steps.length || L.steps.some(s=>/undefined|NaN/.test(s.p+s.h+(s.pic||"")))) { bad++; fails.push("BROKEN "+q); return; }
  if(L.topic==="word problems" && /Read it twice/.test(L.steps[0].h)) { generic[q.replace(/\d+/g,"#").slice(0,60)]=1; return; }
  const fa=X.parseFrac(L.ans), fw=X.parseFrac(want); if((fa&&fw&&Math.abs(fa.w+fa.n/fa.d-fw.w-fw.n/fw.d)<1e-9) || norm(L.ans)===norm(want) || (+L.ans===+want && !isNaN(+want))) ok++; else { bad++; fails.push(q+" | want "+want+" | got "+L.ans); }
}
for(let L=1;L<=4;L++) for(let i=1;i<=40;i++){ const day="2027-01-"+String(i).padStart(2,"0");
  G.seedFor("math",day+"L"+L);
  G.genMultiply(L).items.forEach(it=>test("math",it.q,it.a));
  G.genDivide(L).items.forEach(it=>{ test("math",it.q,it.a); test("math",it.q+" (remainder)",it.r); });
  G.genFractions(L).items.forEach(it=>{ const tail=/=|simplest form|mixed number|\(simplify\)/.test(it.q)?"":" ="; test("math",it.q+tail,(it.w?it.w+" ":"")+(it.n?it.n+"/"+it.d:"")); });
  if(L>=2) G.genDecimals(L).items.forEach(it=>test("math",it.q,it.a));
  G.seedFor("think",day+"L"+L);
  G.genThinking(L).forEach(it=>test("think",it.q, it.o? it.o[it.a-1] : it.a));
}
console.log("ok",ok,"bad",bad); console.log(fails.slice(0,25).join("\n")); console.log("GENERIC:\n"+Object.keys(generic).join("\n"));
if(bad || Object.keys(generic).length) process.exit(1);
