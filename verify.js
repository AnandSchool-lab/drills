/* Verify every generated problem has a correct answer, across all levels and many days. */
global.window = { addEventListener:function(){} };
global.document = undefined;
global.localStorage = { getItem:function(){return null;}, setItem:function(){} };
global.location = { hash:"" };

require("./content.js");
require("./app.js");
var G = window.__drills;

var fails = [];
function fail(msg){ fails.push(msg); }

function gcd(a,b){ return b ? gcd(b, a%b) : a; }

/* --- parse "a × b", "a ÷ b", decimals --- */
function checkArith(q, a, tag){
  var m;
  if((m = q.match(/^([\d.]+)\s*×\s*([\d.]+)$/))){
    var want = parseFloat(m[1]) * parseFloat(m[2]);
    if(Math.abs(want - parseFloat(a)) > 0.005) fail(tag+" MUL "+q+" -> "+a+" (want "+want+")");
    return;
  }
  if((m = q.match(/^([\d.]+)\s*\+\s*([\d.]+)$/))){
    var w2 = parseFloat(m[1]) + parseFloat(m[2]);
    if(Math.abs(w2 - parseFloat(a)) > 0.005) fail(tag+" ADD "+q+" -> "+a+" (want "+w2+")");
    return;
  }
  if((m = q.match(/^([\d.]+)\s*−\s*([\d.]+)$/))){
    var w3 = parseFloat(m[1]) - parseFloat(m[2]);
    if(Math.abs(w3 - parseFloat(a)) > 0.005) fail(tag+" SUB "+q+" -> "+a+" (want "+w3+")");
    return;
  }
  if((m = q.match(/^([\d.]+)\s*÷\s*([\d.]+)$/))){
    var w4 = parseFloat(m[1]) / parseFloat(m[2]);
    if(Math.abs(w4 - parseFloat(a)) > 0.005) fail(tag+" DIV "+q+" -> "+a+" (want "+w4+")");
    return;
  }
  if(/^Round /.test(q)){
    var n = parseFloat(q.match(/Round ([\d.]+)/)[1]);
    if(Math.round(n) !== parseFloat(a)) fail(tag+" ROUND "+q+" -> "+a);
    return;
  }
  fail(tag+" UNPARSED: "+q);
}

function checkDiv(it, tag){
  var m = it.q.match(/^(\d+)\s*÷\s*(\d+)$/);
  if(!m){ fail(tag+" divr unparsed "+it.q); return; }
  var n = +m[1], d = +m[2];
  var q = Math.floor(n/d), r = n % d;
  if(q !== it.a || r !== it.r) fail(tag+" DIVR "+it.q+" -> "+it.a+" R"+it.r+" (want "+q+" R"+r+")");
}

/* parse fraction questions and verify w/n/d */
function checkFrac(it, tag){
  var q = it.q, val = null;
  var m;
  // "W + n/d"
  if((m = q.match(/^(\d+) \+ (\d+)\/(\d+)$/))) val = +m[1] + (+m[2])/(+m[3]);
  // "a x/d  +  b y/d" (possibly with "(simplify)")
  else if((m = q.match(/^(\d+) (\d+)\/(\d+)\s+\+\s+(\d+) (\d+)\/(\d+)/)))
    val = +m[1] + (+m[2])/(+m[3]) + (+m[4]) + (+m[5])/(+m[6]);
  else if((m = q.match(/^(\d+) (\d+)\/(\d+)\s+−\s+(\d+) (\d+)\/(\d+)/)))
    val = +m[1] + (+m[2])/(+m[3]) - (+m[4]) - (+m[5])/(+m[6]);
  // "A x/d  −  y/d  (simplify)"  — subtrahend with no whole part
  else if((m = q.match(/^(\d+) (\d+)\/(\d+)\s+−\s+(\d+)\/(\d+)\s+\(simplify\)$/)))
    val = +m[1] + (+m[2])/(+m[3]) - (+m[4])/(+m[5]);
  else if((m = q.match(/^(\d+)\/(\d+)\s+in simplest form$/)))
    val = (+m[1])/(+m[2]);
  // "n/d  =  ?/D"  — equivalent fraction, exact form required
  else if((m = q.match(/^(\d+)\/(\d+)\s+=\s+\?\/(\d+)$/))){
    val = (+m[1])/(+m[2]);
    if(it.d !== +m[3]) fail(tag+" EQUIV wrong target denominator: "+q+" -> /"+it.d);
    if(!it.exact) fail(tag+" EQUIV missing exact flag: "+q);
  }
  // "T/d  as a mixed number"
  else if((m = q.match(/^(\d+)\/(\d+)\s+as a mixed number$/))){
    val = (+m[1])/(+m[2]);
    if(it.w < 1) fail(tag+" IMPROPER has no whole part: "+q);
    if(!it.exact) fail(tag+" IMPROPER missing exact flag: "+q);
    if(gcd(it.n, it.d) !== 1) fail(tag+" IMPROPER fraction not reduced: "+q);
  }
  else if((m = q.match(/^(\d+)\/(\d+)\s+×\s+(\d+)$/)))
    val = (+m[1])/(+m[2]) * (+m[3]);
  if(val === null){ fail(tag+" frac unparsed: "+q); return; }

  var have = it.w + (it.d ? it.n/it.d : 0);
  if(Math.abs(have - val) > 1e-9) fail(tag+" FRAC "+q+" -> "+it.w+" "+it.n+"/"+it.d+" (want "+val.toFixed(4)+", got "+have.toFixed(4)+")");
  if(val < 0) fail(tag+" FRAC negative: "+q);
  if(it.n < 0 || it.d <= 0) fail(tag+" FRAC bad parts: "+q+" -> "+it.w+" "+it.n+"/"+it.d);
  if(it.n >= it.d && it.n !== 0) fail(tag+" FRAC improper left: "+q+" -> "+it.w+" "+it.n+"/"+it.d);
  if(/simplify|simplest/.test(q) && it.n > 0 && gcd(it.n, it.d) !== 1)
    fail(tag+" FRAC not simplified: "+q+" -> "+it.n+"/"+it.d);
  if(/=\s+\?\//.test(q) && gcd(it.n, it.d) === 1)
    fail(tag+" EQUIV answer was reduced away: "+q+" -> "+it.n+"/"+it.d);
}

var DAYS = [];
for(var i=0;i<60;i++){
  var d = new Date(2026, 9, 21 + i);
  DAYS.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"));
}

var counts = { mul:0, div:0, frac:0, dec:0, think:0 };
[1,2,3,4].forEach(function(L){
  DAYS.forEach(function(day){
    G.seedFor("math", day+"L"+L);
    G.genMultiply(L).items.forEach(function(it){ counts.mul++; checkArith(it.q, it.a, "L"+L+" mul"); });
    G.genDivide(L).items.forEach(function(it){ counts.div++; checkDiv(it, "L"+L); });
    G.genFractions(L).items.forEach(function(it){ counts.frac++; checkFrac(it, "L"+L); });
    if(L>=2) G.genDecimals(L).items.forEach(function(it){ counts.dec++; checkArith(it.q, it.a, "L"+L+" dec"); });
    G.seedFor("think", day+"L"+L);
    G.genThinking(L).forEach(function(it){
      counts.think++;
      if(it.a === undefined || it.a === null || (typeof it.a === "number" && !isFinite(it.a)))
        fail("L"+L+" think bad answer: "+it.q);
      if(typeof it.a === "number" && it.a < 0) fail("L"+L+" think negative answer: "+it.q+" -> "+it.a);
      if(!it.q || !it.hint) fail("L"+L+" think missing text");
      if(/undefined|NaN/.test(it.q)) fail("L"+L+" think broken text: "+it.q);
      if(it.kind === "clock"){
        var fm = it.q.match(/lasts (\d+) hours? and (\d+) minutes/);
        if(!fm) fail("L"+L+" clock question unreadable: "+it.q);
        else {
          var end = 14*60 + 15 + (+fm[1])*60 + (+fm[2]);
          var eh = Math.floor(end/60) % 24, em = end % 60;
          var want = ((eh % 12) || 12) + ":" + String(em).padStart(2,"0") + " " + (eh >= 12 ? "pm" : "am");
          if(it.a !== want) fail("L"+L+" clock answer "+it.a+" should be "+want+" for: "+it.q);
        }
      }
    });
  });
});

/* English selection */
[1,2,3,4].forEach(function(L){
  DAYS.slice(0,20).forEach(function(day){
    G.seedFor("eng", day);
    var E = G.pickEnglish(L);
    if(E.spelling.length !== 10) fail("eng spelling count "+E.spelling.length);
    if(E.vocab.length !== 5) fail("eng vocab count "+E.vocab.length);
    if(E.grammar.length !== 10) fail("eng grammar count "+E.grammar.length);
    if(!E.reading || !E.reading.qs) fail("eng reading missing");
    if(!E.writing || !E.writing.p) fail("eng writing missing");
    var seen = {};
    E.grammar.forEach(function(g){ if(seen[g.q]) fail("duplicate grammar question"); seen[g.q]=1; });
  });
});

console.log("checked:", JSON.stringify(counts));
if(fails.length){
  console.log("FAILURES:", fails.length);
  fails.slice(0,25).forEach(function(f){ console.log("  " + f); });
  process.exit(1);
} else {
  console.log("ALL PASS");
}
