/* ============================================================
   Daily Drills — engine
   Everything is seeded from the date, so both iPads get the
   same problems on the same day, and a new set appears each day.
   ============================================================ */
(function(){
"use strict";

/* ---------- configuration you may want to change ---------- */
var START_DATE = "2026-10-27";   // Monday the programme begins. Week 1 starts here.
var APP_VERSION = "20";          // shown on the home screen; keep in step with CACHE in sw.js

/* Google Apps Script web-app URL. Blank = results stay on the iPad only.
   Paste the /exec URL from Deploy → New deployment → Web app. */
var API_URL = "https://drills-api.anandm401-amazon.workers.dev";
var BLOCKS = {
  recap:{ label:"Recap", mins:15, icon:"↻" },
  math:  { label:"Math",       mins:30, icon:"×" },
  think: { label:"Thinking",   mins:20, icon:"?" },
  eng:   { label:"English",    mins:40, icon:"A" }
};

/* ---------- seeded random ---------- */
function hash(str){
  var h = 2166136261 >>> 0;
  for(var i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function mulberry(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var R = mulberry(1);
function seedFor(tag){ R = mulberry(hash(todayKey() + "|" + tag)); }
function ri(a,b){ return a + Math.floor(R()*(b-a+1)); }
function pick(arr){ return arr[Math.floor(R()*arr.length)]; }
function shuffle(a){ a = a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(R()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

/* ---------- dates & level ---------- */
var selectedDate = null;           // the day being worked on; null means today
function keyOf(d){
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function realTodayKey(){ return keyOf(new Date()); }
function todayKey(){ return selectedDate || realTodayKey(); }
function dateFromKey(k){ var p = k.split("-"); return new Date(+p[0], +p[1]-1, +p[2]); }
function daysSinceStart(){
  var a = new Date(START_DATE + "T00:00:00");
  return Math.floor((dateFromKey(todayKey()) - a) / 86400000);
}
function weekNumber(){ return Math.max(0, Math.floor(daysSinceStart()/7)); }
function levelNow(){
  var manual = store.get("levelOverride", 0);
  if(manual) return manual;
  return Math.min(4, 1 + Math.floor(weekNumber()/4));
}
function prettyDate(k){
  return dateFromKey(k || todayKey())
    .toLocaleDateString(undefined, { weekday:"long", month:"long", day:"numeric" });
}

/* ---------- storage ---------- */
var store = {
  get:function(k, dflt){
    try{ var v = localStorage.getItem("dd:"+k); return v === null ? dflt : JSON.parse(v); }
    catch(e){ return dflt; }
  },
  set:function(k, v){ try{ localStorage.setItem("dd:"+k, JSON.stringify(v)); }catch(e){} }
};
function who(){ return store.get("profile", null); }
function records(){ return store.get("rec:" + who(), {}); }
function saveResult(block, got, total, secs){
  var all = records(), d = todayKey();
  all[d] = all[d] || {};
  all[d][block] = { got:got, total:total, secs:secs };
  store.set("rec:" + who(), all);
}
function saveDetail(key, value){
  var all = records(), d = todayKey();
  all[d] = all[d] || {};
  all[d][key] = value;
  store.set("rec:" + who(), all);
}
function resultFor(block){
  var all = records(), d = todayKey();
  return (all[d] && all[d][block]) || null;
}

/* ============================================================
   MATH GENERATORS
   Each returns { title, note, items:[{q, a, kind}] }
   kind: "num" single box, "divr" quotient+remainder, "frac" w/n/d
   ============================================================ */
/* Build n distinct items — no problem appears twice on one sheet. */
function collect(n, make, into){
  var out = into || [], seen = {}, guard = 0;
  out.forEach(function(it){ seen[it.q] = 1; });
  var target = out.length + n;
  while(out.length < target && guard++ < n*60){
    var it = make();
    if(seen[it.q]) continue;
    seen[it.q] = 1; out.push(it);
  }
  return out;
}

function genMultiply(L){
  var items = [];
  if(L === 1){
    var facts = shuffle([2,3,4,5,6,7,8,9,10,11,12]).slice(0,8);
    facts.forEach(function(n){
      items.push(R()<0.5 ? {q:"4 × "+n, a:4*n, kind:"num"} : {q:n+" × 4", a:4*n, kind:"num"});
    });
    collect(4, function(){ var n1 = ri(13,49); return {q:n1+" × 4", a:n1*4, kind:"num"}; }, items);
  } else if(L === 2){
    collect(6, function(){ var a=ri(3,12), b=ri(6,12); return {q:a+" × "+b, a:a*b, kind:"num"}; }, items);
    collect(6, function(){ var c=ri(102,899), d=ri(3,9); return {q:c+" × "+d, a:c*d, kind:"num"}; }, items);
  } else if(L === 3){
    collect(8, function(){ var a=ri(12,89), b=ri(12,49); return {q:a+" × "+b, a:a*b, kind:"num"}; }, items);
    collect(4, function(){ var c=ri(203,899), d=ri(4,9); return {q:c+" × "+d, a:c*d, kind:"num"}; }, items);
  } else {
    collect(6, function(){ var a=ri(112,899), b=ri(13,59); return {q:a+" × "+b, a:a*b, kind:"num"}; }, items);
    collect(6, function(){
      var whole = ri(2,39), dec = ri(1,99), m = ri(3,9);
      var val = Math.round((whole + dec/100) * m * 100) / 100;
      return {q:(whole + dec/100).toFixed(2)+" × "+m, a:val.toFixed(2), kind:"num"};
    }, items);
  }
  var notes = {
    1:"Facts first, then two digits times four. Say each answer out loud as you write it.",
    2:"All the tables mixed, then three digits times one. Line up your place values.",
    3:"Two digits times two digits. Multiply by the ones, then the tens, then add.",
    4:"Three by two digits, and decimals. Count decimal places in your answer."
  };
  return { title:"Multiplication", note:notes[L], items:shuffle(items) };
}

function genDivide(L){
  var items = [];
  if(L === 1){
    collect(9, function(){ var q=ri(2,25); return {q:(q*4)+" ÷ 4", a:q, r:0, kind:"divr"}; }, items);
    collect(3, function(){ var q=ri(3,22), r=ri(1,3); return {q:(q*4+r)+" ÷ 4", a:q, r:r, kind:"divr"}; }, items);
  } else if(L === 2){
    collect(7, function(){ var d=ri(2,9), q=ri(4,12); return {q:(q*d)+" ÷ "+d, a:q, r:0, kind:"divr"}; }, items);
    collect(5, function(){ var d=ri(3,9), q=ri(5,20), r=ri(1,d-1); return {q:(q*d+r)+" ÷ "+d, a:q, r:r, kind:"divr"}; }, items);
  } else if(L === 3){
    collect(6, function(){ var d=ri(3,9), q=ri(30,120); return {q:(q*d)+" ÷ "+d, a:q, r:0, kind:"divr"}; }, items);
    collect(6, function(){ var d=ri(3,9), q=ri(40,140), r=ri(1,d-1); return {q:(q*d+r)+" ÷ "+d, a:q, r:r, kind:"divr"}; }, items);
  } else {
    collect(6, function(){ var d=ri(4,9), q=ri(150,999), r=ri(0,d-1); return {q:(q*d+r)+" ÷ "+d, a:q, r:r, kind:"divr"}; }, items);
    collect(6, function(){ var d=ri(12,35), q=ri(8,40), r=ri(0,d-1); return {q:(q*d+r)+" ÷ "+d, a:q, r:r, kind:"divr"}; }, items);
  }
  var notes = {
    1:"Divide by four. Leave the R box empty when it divides evenly.",
    2:"All the divisors now. Check by multiplying your answer back.",
    3:"Long division. Write the steps on paper, then type the answer.",
    4:"Bigger dividends and two-digit divisors. Estimate first, then divide."
  };
  return { title:"Division", note:notes[L], items:shuffle(items) };
}

function gcd(a,b){ return b ? gcd(b, a%b) : a; }
function genFractions(L){
  var items = [];
  var smallDens = [2,3,4,5,6,8];

  /* a numerator that shares no factor with the denominator */
  function coprimeNumer(base){
    var n = ri(1, base-1), guard = 0;
    while(gcd(n, base) !== 1 && guard++ < 25){ n = ri(1, base-1); }
    return gcd(n, base) === 1 ? n : 1;
  }

  /* n/d = ?/(d*m) — the school's "multiply top and bottom" exercise */
  function equivalent(maxMult){
    var d = pick(smallDens), n = coprimeNumer(d), m = ri(2, maxMult);
    return { q:n+"/"+d+"  =  ?/"+(d*m), w:0, n:n*m, d:d*m, kind:"frac", exact:true };
  }

  /* (n*m)/(d*m) back down to n/d */
  function simplify(maxMult){
    var d = pick(smallDens), n = coprimeNumer(d), m = ri(2, maxMult);
    return { q:(n*m)+"/"+(d*m)+"  in simplest form", w:0, n:n, d:d, kind:"frac", simplify:true, noWhole:true };
  }

  function likeAdd(maxWhole, alsoSimplify){
    var d = pick(smallDens), a = ri(1,maxWhole), b = ri(1,maxWhole);
    var x = ri(1,d-1), y = ri(1,d-1), t = x + y;
    var W = a + b + Math.floor(t/d), N = t % d;
    var g = (alsoSimplify && N) ? gcd(N, d) : 1;
    return { q:a+" "+x+"/"+d+"  +  "+b+" "+y+"/"+d+(alsoSimplify ? "  (simplify)" : ""),
             w:W, n:N/g, d:d/g, kind:"frac" };
  }

  function likeSub(){
    var d = pick(smallDens), bigW = ri(3,8), smW = ri(1,2);
    var x = ri(1,d-1), y = ri(1,d-1);
    var tot = bigW*d + x - (smW*d + y);
    if(tot <= 0){ bigW += 2; tot = bigW*d + x - (smW*d + y); }
    return { q:bigW+" "+x+"/"+d+"  \u2212  "+smW+" "+y+"/"+d,
             w:Math.floor(tot/d), n:tot%d, d:d, kind:"frac" };
  }

  function unlike(pairs){
    var pr = pick(pairs), dA = pr[0], dB = pr[1];
    var wA = ri(1,4), wB = ri(1,4), nA = ri(1,dA-1), nB = ri(1,dB-1);
    var LC = dA*dB/gcd(dA,dB);
    var tot = nA*(LC/dA) + nB*(LC/dB);
    var W = wA + wB + Math.floor(tot/LC), N = tot % LC;
    var g = N ? gcd(N, LC) : 1;
    return { q:wA+" "+nA+"/"+dA+"  +  "+wB+" "+nB+"/"+dB, w:W, n:N/g, d:N?LC/g:LC, kind:"frac" };
  }

  /* Mixed - mixed, like denominators, no borrowing, answer must simplify.
     Mirrors "Subtracting Mixed Numbers with Like Denominators, Requires Simplifying". */
  function subMixedSimplify(){
    var dens = [4,6,8,9,10,12,14];
    var d = pick(dens), diff, guard = 0;
    do { diff = ri(1, d-2); } while(gcd(diff, d) === 1 && guard++ < 40);
    if(gcd(diff, d) === 1){ d = 6; diff = 2; }
    var y = ri(1, d-1-diff), x = y + diff;
    var B = ri(0,4), A = B + ri(1,4);
    var g = gcd(diff, d);
    return { q:A+" "+x+"/"+d+"  \u2212  "+(B ? B+" " : "")+y+"/"+d+"  (simplify)",
             w:A-B, n:diff/g, d:d/g, kind:"frac" };
  }

  function improper(){
    var d = pick(smallDens), W = ri(2,5), n = coprimeNumer(d);
    return { q:(W*d + n)+"/"+d+"  as a mixed number", w:W, n:n, d:d, kind:"frac", exact:true };
  }

  function fracTimesWhole(){
    var d = pick(smallDens), n = coprimeNumer(d), w = ri(2,9);
    var tot = n*w, g = gcd(tot, d), num = tot/g, den = d/g;
    return { q:n+"/"+d+"  \u00d7  "+w, w:Math.floor(num/den), n:num%den, d:den, kind:"frac" };
  }

  if(L === 1){
    collect(1, function(){ return likeAdd(4, false); }, items);
    collect(2, function(){ return subMixedSimplify(); }, items);
    collect(1, function(){ return equivalent(3); }, items);
    collect(1, function(){ return simplify(3); }, items);
    collect(1, function(){ var d=pick(smallDens), w=ri(1,6), n=ri(1,d-1);
      return {q:w+" + "+n+"/"+d, w:w, n:n, d:d, kind:"frac"}; }, items);
  } else if(L === 2){
    collect(1, function(){ return likeAdd(5, true); }, items);
    collect(2, function(){ return subMixedSimplify(); }, items);
    collect(1, function(){ return likeSub(); }, items);
    collect(1, function(){ return equivalent(4); }, items);
    collect(1, function(){ return simplify(4); }, items);
  } else if(L === 3){
    collect(2, function(){ return unlike([[2,4],[2,6],[3,6],[2,8],[4,8],[3,9],[5,10],[2,10]]); }, items);
    collect(1, function(){ return subMixedSimplify(); }, items);
    collect(1, function(){ return simplify(5); }, items);
    collect(1, function(){ return likeAdd(4, true); }, items);
    collect(1, function(){ return improper(); }, items);
  } else {
    collect(3, function(){ return unlike([[2,3],[3,4],[2,5],[3,8],[4,6],[5,10],[4,10],[3,5]]); }, items);
    collect(1, function(){ return improper(); }, items);
    collect(2, function(){ return fracTimesWhole(); }, items);
  }
  var notes = {
    1:"Same bottom number \u2014 add or take away the tops only. Where it says simplify, divide top and bottom by the same number.",
    2:"Subtract the wholes, then the tops. Always simplify the answer at the end.",
    3:"Different bottom numbers now \u2014 but one divides into the other, so only one needs changing.",
    4:"Find a common denominator first. Simplify every answer."
  };
  return { title:"Fractions", note:notes[L], items:shuffle(items) };
}

function genDecimals(L){
  var items = [];
  if(L <= 2){
    collect(4, function(){ var a=ri(100,999)/100, b=ri(100,999)/100;
      return {q:a.toFixed(2)+" + "+b.toFixed(2), a:(a+b).toFixed(2), kind:"num"}; }, items);
    collect(4, function(){ var c=ri(400,999)/100, d=ri(100,399)/100;
      return {q:c.toFixed(2)+" − "+d.toFixed(2), a:(c-d).toFixed(2), kind:"num"}; }, items);
    collect(2, function(){ var e=ri(1000,9999)/100;
      return {q:"Round "+e.toFixed(2)+" to the nearest whole number", a:String(Math.round(e)), kind:"num"}; }, items);
  } else {
    collect(3, function(){ var f=ri(1000,9999)/100, g=ri(100,999)/100;
      return {q:f.toFixed(2)+" + "+g.toFixed(2), a:(f+g).toFixed(2), kind:"num"}; }, items);
    collect(3, function(){ var h=ri(5000,9999)/100, k=ri(100,4999)/100;
      return {q:h.toFixed(2)+" − "+k.toFixed(2), a:(h-k).toFixed(2), kind:"num"}; }, items);
    collect(2, function(){ var m=ri(100,999)/10, n=ri(2,9);
      return {q:m.toFixed(1)+" × "+n, a:(m*n).toFixed(1), kind:"num"}; }, items);
    collect(2, function(){ var p=ri(2,9), q=ri(10,60);
      return {q:(p*q/10).toFixed(1)+" ÷ "+p, a:(q/10).toFixed(1), kind:"num"}; }, items);
  }
  return { title:"Decimals", note:"Line up the decimal points before you add or subtract.", items:shuffle(items) };
}

/* ============================================================
   ANALYTICAL GENERATORS
   ============================================================ */
var NAMES = ["Maya","Dev","Priya","Noah","Aisha","Leo","Sara","Arjun","Ella","Kabir","Zoe","Rohan"];
var THINGS = ["stickers","marbles","pencils","cookies","beads","cards","shells","stamps"];

function wordProblem(L){
  var n1 = pick(NAMES), n2 = pick(NAMES.filter(function(x){return x!==n1;}));
  var thing = pick(THINGS);
  var type = ri(1, L >= 3 ? 7 : 5);
  var a,b,c,d;
  if(type === 1){
    a = ri(L>2?12:4, L>2?40:12); b = ri(3,9); c = ri(2,6);
    return { q:n1+" has "+(a*b)+" "+thing+". "+n1+" shares them equally among "+b+" friends, then gives away "+c+" of their own share. How many does each friend keep?",
             a:a, hint:"Divide first, then subtract — but read carefully whose share changes." , aNote:"Each friend gets "+a+". The "+c+" given away came from "+n1+"'s share, not the friends'." };
  }
  if(type === 2){
    a = ri(5,15); b = ri(3,8);
    var saved = a*b;
    c = ri(Math.max(5, Math.floor(saved*0.2)), Math.max(6, saved - 4));
    return { q:n1+" saves $"+a+" every week for "+b+" weeks, then spends $"+c+" on a gift. How much money is left?",
             a:saved-c, hint:"Multiply to find the total saved, then subtract." };
  }
  if(type === 3){
    a = ri(28,55); b = ri(4,8);
    var buses = Math.ceil(a/b);
    return { q:"A van holds "+b+" people. "+a+" people need a ride to the match. How many vans are needed?",
             a:buses, hint:"Divide — then think about the people left over. They still need a van." };
  }
  if(type === 4){
    a = ri(3,9); b = ri(4,12); c = ri(2,5);
    return { q:"A shelf holds "+b+" books. There are "+a+" shelves. "+c+" books are taken out. How many books are on the shelves now?",
             a:a*b-c, hint:"Find the full total first." };
  }
  if(type === 5){
    a = ri(6,15); b = ri(2,5);
    return { q:n1+" is "+a+" years old. "+n2+" is "+b+" times as old. How much older is "+n2+"?",
             a:a*b-a, hint:"Find "+n2+"'s age, then find the difference — not the total." };
  }
  if(type === 6){
    a = ri(120,480); b = ri(4,8); c = ri(15,45);
    return { q:"A factory makes "+a+" bottles an hour. It runs for "+b+" hours, then "+c+" bottles are found cracked and thrown away. How many good bottles are left?",
             a:a*b-c, hint:"Multiply for the run, then subtract the cracked ones." };
  }
  a = ri(15,40); b = ri(3,6); c = ri(2,5); d = ri(20,60);
  return { q:n1+" buys "+b+" packs of "+thing+" with "+a+" in each pack, and "+c+" extra loose ones. "+n2+" has "+d+". How many more does "+n1+" have than "+n2+"?",
           a:a*b+c-d, hint:"Build "+n1+"'s total in two steps, then compare." };
}

function patternProblem(L){
  var kind = ri(1, L>=3 ? 4 : 3);
  var start, step, seq = [], i;
  if(kind === 1){
    start = ri(3,20); step = ri(3,12);
    for(i=0;i<5;i++) seq.push(start + i*step);
    return { q:"What comes next?  "+seq.join(", ")+", ___", a:start+5*step, hint:"How much is added each time?" };
  }
  if(kind === 2){
    start = ri(2,5); step = ri(2,3);
    for(i=0;i<4;i++) seq.push(start * Math.pow(step,i));
    return { q:"What comes next?  "+seq.join(", ")+", ___", a:start*Math.pow(step,4), hint:"This one multiplies each time, it does not add." };
  }
  if(kind === 3){
    start = ri(80,150); step = ri(4,13);
    for(i=0;i<5;i++) seq.push(start - i*step);
    return { q:"What comes next?  "+seq.join(", ")+", ___", a:start-5*step, hint:"The numbers are going down. By how much?" };
  }
  start = ri(2,6); var add = ri(2,6);
  for(i=0;i<5;i++) seq.push(start + i*add + i*i);
  return { q:"What comes next?  "+seq.join(", ")+", ___", a:start + 5*add + 25, hint:"The gap between the numbers grows each step. Look at the gaps." };
}

function missingNumber(L){
  var kind = ri(1,4), a, b, res;
  if(kind === 1){ a = ri(3,12); b = ri(4,12); return { q:a+" × ___ = "+(a*b), a:b, hint:"Divide to undo multiplying." }; }
  if(kind === 2){ a = ri(L>2?40:12, L>2?200:60); b = ri(3,9); return { q:"___ ÷ "+b+" = "+a, a:a*b, hint:"Multiply to undo dividing." }; }
  if(kind === 3){ a = ri(3,9); b = ri(4,15); res = a*b + ri(3,20);
    return { q:"("+a+" × "+b+") + ___ = "+res, a:res-a*b, hint:"Work out the bracket first." }; }
  a = ri(3,9); b = ri(5,20); var out = a*b - ri(2,10);
  return { q:"I think of a number, multiply it by "+a+", then subtract "+(a*b-out)+". The answer is "+out+". What was my number?",
           a:b, hint:"Work backwards: add first, then divide." };
}

function measureProblem(L){
  var kind = ri(1, L>=2 ? 5 : 3), l, w, h, m, cost, qty;
  if(kind === 1){ l = ri(4,18); w = ri(3,15);
    return { q:"A rectangle is "+l+" cm long and "+w+" cm wide. What is its perimeter in cm?", a:2*(l+w), hint:"All four sides added together." }; }
  if(kind === 2){ l = ri(4,16); w = ri(3,14);
    return { q:"A rectangle is "+l+" cm long and "+w+" cm wide. What is its area in square cm?", a:l*w, hint:"Length times width." }; }
  if(kind === 3){ h = ri(1,4); m = ri(1,11)*5;
    return { q:"A film starts at 2:15 pm and lasts "+h+" hours and "+m+" minutes. What time does it end? Answer in minutes past 2:15.", a:h*60+m, hint:"Turn the hours into minutes and add." }; }
  if(kind === 4){ qty = ri(3,9); cost = ri(125,495);
    return { q:"One notebook costs $"+(cost/100).toFixed(2)+". What do "+qty+" notebooks cost, in cents?", a:qty*cost, hint:"Work in cents to avoid the decimal point." }; }
  l = ri(2,9); w = ri(3,12);
  return { q:"A box is "+l+" cm by "+w+" cm by "+(l+1)+" cm. What is its volume in cubic cm?", a:l*w*(l+1), hint:"Multiply all three measurements." };
}

function compareProblem(L){
  var kind = ri(1,3);
  if(kind === 1){
    var a = ri(2,9), b = ri(2,9), c = ri(2,6);
    return { q:"A is "+c+" more than B. B is "+a+" times C. C is "+b+". What is A?", a:a*b+c, hint:"Start at C and work upward." };
  }
  if(kind === 2){
    var d1 = pick([3,4,5,6,8]), d2 = pick([3,4,5,6,8].filter(function(x){return x!==d1;}));
    var n1 = ri(1,d1-1), n2 = ri(1,d2-1);
    var v1 = n1/d1, v2 = n2/d2;
    var ans = Math.abs(v1-v2) < 1e-9 ? 3 : (v1 > v2 ? 1 : 2);
    return { q:"Which is larger: (1) "+n1+"/"+d1+"   or   (2) "+n2+"/"+d2+" ?   Type 1, 2, or 3 if they are equal.",
             a:ans, hint:"Give them the same bottom number, or compare each to one half." };
  }
  var t = ri(180,900), per = ri(3,9);
  return { q:"Estimate: about how many groups of "+per+" fit into "+t+"? Round your answer to the nearest ten.",
           a:Math.round(t/per/10)*10, hint:"Divide, then round the answer to the nearest ten." };
}

function genThinking(L){
  var items = [], makers = [wordProblem, patternProblem, missingNumber, measureProblem, compareProblem];
  collect(2, function(){ return wordProblem(L); }, items);
  collect(1, function(){ return patternProblem(L); }, items);
  collect(2, function(){ return missingNumber(L); }, items);
  collect(1, function(){ return measureProblem(L); }, items);
  collect(1, function(){ return compareProblem(L); }, items);
  collect(1, function(){ return makers[ri(0,4)](L); }, items);
  return shuffle(items).map(function(it){ it.kind = "num"; return it; });
}

/* ============================================================
   CHALLENGE PROBLEMS — two a day, harder than the thinking set.
   Each type has a minimum level and a family; the two picked on
   one day always come from different families.
   Each returns { q, a, hint, sol }.
   ============================================================ */
function lcm(a,b){ return a/gcd(a,b)*b; }
function choose(n,k){ var r=1; for(var i=1;i<=k;i++){ r = r*(n-k+i)/i; } return Math.round(r); }

var CHALLENGES = [
  { fam:"swap", min:1, make:function(L){
    var cows = ri(3, L>2?18:9), hens = ri(4, L>2?20:10);
    var heads = cows+hens, legs = 4*cows + 2*hens, extra = legs - 2*heads;
    return { q:"A farm has only chickens and cows. Altogether there are "+heads+" heads and "+legs+" legs. How many cows are there?",
      a:cows, hint:"Pretend every animal is a chicken. How many legs would that be? Each cow adds 2 extra legs.",
      sol:"If all "+heads+" animals were chickens there would be "+(2*heads)+" legs. There are "+extra+" more than that, and each cow brings 2 extra legs, so "+extra+" ÷ 2 = "+cows+" cows." };
  }},
  { fam:"swap", min:1, make:function(L){
    var n = ri(3,12), d = ri(3,12), coins = n+d, cents = 5*n + 10*d;
    return { q:"A jar has only nickels and dimes — "+coins+" coins worth "+cents+" cents. How many dimes are in the jar?",
      a:d, hint:"If every coin were a nickel, how much would the jar be worth? Each dime is worth 5 cents more than a nickel.",
      sol:"All nickels would be "+(5*coins)+" cents. The jar has "+(cents-5*coins)+" cents more, and each dime adds 5, so "+(cents-5*coins)+" ÷ 5 = "+d+" dimes." };
  }},
  { fam:"triangle", min:1, make:function(L){
    var n = ri(5, L>2?14:9), a = n*(n-1)/2;
    return { q:n+" friends meet at a party. Each person shakes hands with every other person exactly once. How many handshakes happen?",
      a:a, hint:"Start small: how many with 3 people? With 4? Or: each person shakes "+(n-1)+" hands — but is each handshake counted twice?",
      sol:"Each of the "+n+" people shakes "+(n-1)+" hands, giving "+(n*(n-1))+". But every handshake has two people, so it was counted twice: "+(n*(n-1))+" ÷ 2 = "+a+"." };
  }},
  { fam:"triangle", min:1, make:function(L){
    var n = ri(5, L>2?20:10), a = n*(n+1)/2;
    return { q:"A shop stacks cans in a triangle: 1 can on the top row, 2 on the next, 3 on the next, and so on. The bottom row has "+n+" cans. How many cans are in the stack?",
      a:a, hint:"Pair the top row with the bottom row, the second row with the second-to-last row… what does each pair add up to?",
      sol:"1 + "+n+" = "+(n+1)+", 2 + "+(n-1)+" = "+(n+1)+", and so on. "+n+" rows make "+n+" × "+(n+1)+" = "+(n*(n+1))+" counted twice, so "+(n*(n+1))+" ÷ 2 = "+a+"." };
  }},
  { fam:"sumdiff", min:1, make:function(L){
    var n1 = pick(NAMES), n2 = pick(NAMES.filter(function(x){return x!==n1;}));
    var small = ri(8, L>2?60:30), diff = ri(4, L>2?30:14), big = small+diff, sum = big+small;
    return { q:n1+" and "+n2+" have "+sum+" stickers together. "+n1+" has "+diff+" more than "+n2+". How many stickers does "+n1+" have?",
      a:big, hint:"Take away the extra "+diff+" first. Then the two piles are equal.",
      sol:"Remove "+n1+"'s extra "+diff+": "+sum+" − "+diff+" = "+(2*small)+". Split equally: "+small+" each. "+n1+" has "+small+" + "+diff+" = "+big+"." };
  }},
  { fam:"parts", min:2, make:function(L){
    var c = ri(4,11), k = ri(3,5), mom = c*k, s = c+mom;
    return { q:"Mom is "+k+" times as old as Ria. Their ages add up to "+s+". How old is Ria?",
      a:c, hint:"Draw it: Ria is 1 box, Mom is "+k+" boxes the same size. How many boxes altogether?",
      sol:"1 box for Ria + "+k+" boxes for Mom = "+(k+1)+" equal boxes = "+s+". One box = "+s+" ÷ "+(k+1)+" = "+c+"." };
  }},
  { fam:"parts", min:2, make:function(L){
    var w = ri(2,9), k = ri(2,4), l = k*w, P = 2*(l+w);
    return { q:"A rectangle's length is "+k+" times its width. Its perimeter is "+P+" cm. What is its area in square cm?",
      a:l*w, hint:"Call the width 1 part. The length is "+k+" parts. How many parts go all the way round?",
      sol:"Going round: width + length + width + length = 1 + "+k+" + 1 + "+k+" = "+(2*(k+1))+" parts = "+P+" cm, so the width is "+w+" cm and the length "+l+" cm. Area = "+l+" × "+w+" = "+(l*w)+"." };
  }},
  { fam:"fence", min:1, make:function(L){
    var k = ri(2,6), seg = ri(5,15), len = k*seg;
    return { q:"A straight fence is "+len+" metres long. There is a post at each end and a post every "+k+" metres. How many posts are there?",
      a:seg+1, hint:"Draw a short fence with 2 or 3 gaps. Count the gaps, then count the posts.",
      sol:len+" ÷ "+k+" = "+seg+" gaps between posts. There is always one more post than gaps, so "+(seg+1)+" posts." };
  }},
  { fam:"fence", min:1, make:function(L){
    var u = ri(3,6), dn = ri(1,u-1), H = ri(u+6, L>2?40:24), pos = 0, day = 0;
    while(true){ day++; pos += u; if(pos >= H) break; pos -= dn; }
    var gain = u-dn;
    return { q:"A snail is at the bottom of a well "+H+" feet deep. Each day it climbs up "+u+" feet, and each night it slides back "+dn+" feet. On which day does it get out?",
      a:day, hint:"It gains "+gain+" foot"+(gain>1?"s":"")+" per day and night — but on the last day it climbs out before it can slide back.",
      sol:"After "+(day-1)+" full day"+(day-1===1?"":"s")+" and night"+(day-1===1?"":"s")+" it is "+((day-1)*gain)+" feet up. On day "+day+" it climbs "+u+" more to "+((day-1)*gain+u)+" feet — out of the "+H+"-foot well." };
  }},
  { fam:"backward", min:1, make:function(L){
    var n1 = pick(NAMES), y = ri(3, L>2?20:12), c = ri(2,9), start = 2*(2*y + c);
    return { q:n1+" had some money. "+n1+" spent half of it on a book, then $"+c+" on lunch, then gave half of what was left to a friend. Now "+n1+" has $"+y+". How much did "+n1+" start with?",
      a:start, hint:"Work backwards from $"+y+". Undo each step: halving is undone by doubling, spending is undone by adding.",
      sol:"Before giving half away: $"+y+" × 2 = $"+(2*y)+". Before lunch: $"+(2*y)+" + $"+c+" = $"+(2*y+c)+". Before the book: $"+(2*y+c)+" × 2 = $"+start+"." };
  }},
  { fam:"consec", min:1, make:function(L){
    var n = L>2 ? pick([3,4,5]) : 3, first = ri(10, L>2?80:40), S = 0, extras = n*(n-1)/2;
    for(var i=0;i<n;i++) S += first+i;
    return { q:"The sum of "+n+" numbers in a row (like 7, 8, 9…) is "+S+". What is the largest of the "+n+" numbers?",
      a:first+n-1, hint:"If all "+n+" numbers were the smallest one, how much less would the sum be?",
      sol:"The numbers are smallest, +1, +2"+(n>3?", …":"")+", so the extras add to "+extras+". "+S+" − "+extras+" = "+(S-extras)+", ÷ "+n+" = "+first+" is the smallest. The largest is "+(first+n-1)+"." };
  }},
  { fam:"count", min:1, make:function(L){
    var three = L>=3, S, list = [], i, s;
    if(three){
      S = ri(3,8);
      var byH = {};
      for(i=100;i<=999;i++){ s = Math.floor(i/100) + Math.floor(i/10)%10 + i%10; if(s===S){ list.push(i); byH[Math.floor(i/100)] = (byH[Math.floor(i/100)]||0)+1; } }
      var parts = Object.keys(byH).map(function(h){ return "starting with "+h+": "+byH[h]; });
      return { q:"How many three-digit numbers have digits that add up to "+S+"? (For example, "+(100+S-1)+" counts, because 1 + 0 + "+(S-1)+" = "+S+".)",
        a:list.length, hint:"Be organised. Fix the hundreds digit first, then count the ways to finish the other two digits.",
        sol:"Count by the first digit — "+parts.join(", ")+". Total: "+list.length+"." };
    }
    S = ri(4,14);
    for(i=10;i<=99;i++){ s = Math.floor(i/10) + i%10; if(s===S) list.push(i); }
    return { q:"How many two-digit numbers have digits that add up to "+S+"?",
      a:list.length, hint:"List them in order, starting with the smallest tens digit that works.",
      sol:"They are "+list.join(", ")+" — that is "+list.length+" numbers." };
  }},
  { fam:"count", min:1, make:function(L){
    var n = ri(3, L>2?6:4), a = 0, parts = [];
    for(var k=1;k<=n;k++){ var c = (n-k+1)*(n-k+1); a += c; parts.push(k+"×"+k+": "+c); }
    return { q:"A square board is divided into a "+n+" by "+n+" grid of small squares. How many squares of any size can you find on it?",
      a:a, hint:"Don't just count the small ones. Count 1×1 squares, then 2×2 squares, and so on up to "+n+"×"+n+".",
      sol:parts.join(", ")+". Add them: "+a+"." };
  }},
  { fam:"digits", min:1, make:function(L){
    var N = ri(30, L>2?260:99), d = 0, i;
    for(i=1;i<=N;i++) d += String(i).length;
    var one = Math.min(N,9), two = Math.max(0, Math.min(N,99)-9), thr = Math.max(0, N-99);
    var sol = "Pages 1–9 use "+one+" digits. Pages 10–"+Math.min(N,99)+" are "+two+" pages × 2 = "+(two*2)+" digits.";
    if(thr) sol += " Pages 100–"+N+" are "+thr+" pages × 3 = "+(thr*3)+" digits.";
    sol += " Total: "+d+".";
    return { q:"A book has "+N+" pages, numbered 1 to "+N+". How many digits does the printer use to number all the pages?",
      a:d, hint:"Split the pages into groups: one-digit page numbers, two-digit page numbers"+(N>99?", three-digit page numbers":"")+".",
      sol:sol };
  }},
  { fam:"balance", min:2, make:function(L){
    var k1 = ri(2,4), P = ri(1,6)*10, apple = 3*k1*P/2;
    return { q:k1+" plums weigh the same as 1 pear. 2 apples weigh the same as 3 pears. A plum weighs "+P+" g. How many grams does one apple weigh?",
      a:apple, hint:"Find the pear first, then 3 pears, then split between 2 apples.",
      sol:"A pear = "+k1+" × "+P+" = "+(k1*P)+" g. 3 pears = "+(3*k1*P)+" g, which equals 2 apples, so one apple = "+(3*k1*P)+" ÷ 2 = "+apple+" g." };
  }},
  { fam:"remainder", min:2, make:function(L){
    var sets = L>=3 ? [[2,3,4,5],[3,4,5],[2,3,4,5,6],[4,5,6]] : [[2,3,4],[2,3,5],[3,4],[2,5]];
    var ds = pick(sets), m = ds.reduce(lcm), r = 1;
    return { q:"What is the smallest number bigger than 1 that leaves a remainder of 1 when you divide it by "+ds.slice(0,-1).join(", ")+" or "+ds[ds.length-1]+"?",
      a:m+r, hint:"If you take 1 away from the number, it divides exactly by all of them. What is the smallest number every one of them goes into?",
      sol:"The smallest number that "+ds.join(", ")+" all divide into is "+m+". Add the remainder: "+m+" + 1 = "+(m+1)+"." };
  }},
  { fam:"coins", min:2, make:function(L){
    var N = pick(L>2 ? [40,45,50,55,60] : [25,30,35,40]), q, total = 0, parts = [];
    for(q=0;q*25<=N;q++){ var w = Math.floor((N-25*q)/10)+1; total += w; parts.push(q+" quarter"+(q===1?"":"s")+": "+w+" way"+(w===1?"":"s")); }
    return { q:"How many different ways can you make "+N+" cents using nickels, dimes and quarters? (The order of the coins doesn't matter.)",
      a:total, hint:"Be organised: first count the ways with no quarters, then with one quarter, and so on. For each, try 0 dimes, 1 dime, 2 dimes…",
      sol:parts.join("; ")+". Once quarters and dimes are chosen, nickels fill the rest. Total: "+total+"." };
  }},
  { fam:"paths", min:3, make:function(L){
    var w = ri(2,4), h = ri(2,4), a = choose(w+h, w);
    return { q:"A street map is a grid "+w+" blocks wide and "+h+" blocks tall. You walk from the bottom-left corner to the top-right corner, moving only right or up along the streets. How many different routes are there?",
      a:a, hint:"Write a number at each corner: the ways to reach it. A corner's number is the corner to its left plus the corner below it.",
      sol:"Every corner on the bottom edge and left edge has 1 way. Fill in the rest by adding left + below. The top-right corner ends up with "+a+"." };
  }},
  { fam:"cube", min:3, make:function(L){
    var n = ri(3,6), two = ri(0,1) === 1;
    var a = two ? 12*(n-2) : 6*(n-2)*(n-2);
    return { q:"A "+n+"×"+n+"×"+n+" cube is painted red on the outside, then cut into small 1×1×1 cubes. How many small cubes have paint on exactly "+(two?"two faces":"one face")+"?",
      a:a, hint: two ? "Two painted faces means the cube sits on an edge, but not a corner. How many edges does a cube have?"
                     : "One painted face means the cube is in the middle of a face, not on an edge. What size is that middle square?",
      sol: two ? "Each of the 12 edges has "+n+" cubes; drop the 2 corners, leaving "+(n-2)+". 12 × "+(n-2)+" = "+a+"."
               : "Each face has a "+(n-2)+"×"+(n-2)+" middle = "+((n-2)*(n-2))+" cubes. 6 faces × "+((n-2)*(n-2))+" = "+a+"." };
  }},
  { fam:"multiples", min:3, make:function(L){
    var pr = pick([[2,3],[3,5],[2,5],[4,6],[3,4]]), x = pr[0], y = pr[1], N = ri(30,100), m = lcm(x,y);
    var cx = Math.floor(N/x), cy = Math.floor(N/y), cb = Math.floor(N/m);
    return { q:"How many whole numbers from 1 to "+N+" are multiples of "+x+" or "+y+" (or both)?",
      a:cx+cy-cb, hint:"Count the multiples of "+x+", count the multiples of "+y+" — but some numbers got counted twice. Which ones?",
      sol:"Multiples of "+x+": "+cx+". Multiples of "+y+": "+cy+". Multiples of both (of "+m+"): "+cb+", counted twice. "+cx+" + "+cy+" − "+cb+" = "+(cx+cy-cb)+"." };
  }}
];

function genChallenge(L){
  var pool = shuffle(CHALLENGES.filter(function(c){ return c.min <= L; }));
  var first = pool[0], second = null;
  for(var i=1;i<pool.length;i++){ if(pool[i].fam !== first.fam){ second = pool[i]; break; } }
  return [first, second].map(function(c){ var it = c.make(L); it.kind = "num"; return it; });
}

/* ============================================================
   ENGLISH SELECTION
   ============================================================ */
function atLevel(arr, L){
  var exact = arr.filter(function(x){ return x.level === L; });
  var below = arr.filter(function(x){ return x.level === L-1; });
  return exact.concat(below).length ? exact.concat(below) : arr;
}
function pickEnglish(L){
  var C = window.CONTENT;
  seedFor("eng");
  var spellPool = atLevel(C.spelling, L);
  var vocabPool = atLevel(C.vocab, L);
  var gramPool  = atLevel(C.grammar, L);
  var readPool  = atLevel(C.reading, L);
  var writePool = atLevel(C.writing, L);
  return {
    spelling: shuffle(pick(spellPool).words),
    vocab: shuffle(vocabPool).slice(0,5),
    grammar: shuffle(gramPool).slice(0,10),
    reading: pick(readPool),
    writing: pick(writePool)
  };
}

/* ============================================================
   SYNC — send results to the Google Sheet, read back retakes
   Everything here fails quietly; the app works with API_URL blank.
   ============================================================ */
function apiUrl(){ return (store.get("apiUrl", "") || API_URL).replace(/\/+$/, ""); }

/* Each queued item carries the route it belongs to, so one queue serves
   results, pings, pencil work and writing alike.

   A pad writes itself every half second while a child draws, so without
   the dedupe key below one problem's working would fill the queue with
   dozens of copies of itself. Only the latest version of a pad matters,
   so a new one replaces the one waiting rather than queueing behind it. */
function queueAdd(route, payload, dedupe){
  var q = store.get("queue", []);
  if(dedupe){
    q = q.filter(function(it){ return it.dedupe !== dedupe; });
  }
  q.push({ route: route, body: payload, tries: 0, dedupe: dedupe || null });
  store.set("queue", q.slice(-80));
}

function postOne(route, body){
  return fetch(apiUrl() + route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function syncNote(state){
  var el = (typeof document !== "undefined") && document.getElementById("syncState");
  if(!el) return;
  var txt = { sending:"sending…", sent:"sent to Dad ✓", wait:"saved — will send when online",
              failed:"saved here, but could not send" };
  el.textContent = txt[state] || "";
  el.className = "chip" + (state === "sent" ? " good" : (state === "failed" ? " work" : ""));
  el.hidden = !txt[state];
}

/* The old bridge was posted to blind, so a failed save looked like a good
   one. This one answers, so the queue can tell the two apart:
     2xx  done
     4xx  the request itself was wrong - it will never work, so drop it
          rather than let it block everything behind it
     5xx  our end faltered, or we are offline - keep it and try later  */
var flushing = false;
function flushQueue(){
  if(flushing || !apiUrl()) return;
  var q = store.get("queue", []);
  if(!q.length) return;
  flushing = true;
  syncNote("sending");

  var next = q[0];
  postOne(next.route, next.body).then(function(res){
    var cur = store.get("queue", []);
    if(res.ok || (res.status >= 400 && res.status < 500)){
      cur.shift();                       // sent, or never sendable
      store.set("queue", cur);
      flushing = false;
      if(cur.length) setTimeout(flushQueue, 300);
      else syncNote("sent");
      return;
    }
    throw new Error("server " + res.status);
  }).catch(function(){
    var cur = store.get("queue", []);
    if(cur[0]){
      cur[0].tries = (cur[0].tries || 0) + 1;
      /* After a dozen tries this one is poison. Drop it rather than let it
         sit at the head of the queue blocking every later sheet. */
      if(cur[0].tries > 12) cur.shift();
      store.set("queue", cur);
    }
    flushing = false;
    syncNote(navigator.onLine === false ? "wait" : "failed");
  });
}

function sendResult(block, got, total, secs, misses){
  if(!apiUrl() || !who()) return;
  var r = records()[todayKey()] || {};
  queueAdd("/result", {
    kid: who(), date: todayKey(), block: block,
    got: got, total: total, secs: secs,
    misses: (misses || []).slice(0, 60)
  });
  if(r.writeAns || r.writePrompt){
    queueAdd("/writing", { kid: who(), date: todayKey(),
                           prompt: r.writePrompt || "", text: r.writeAns || "" });
  }
  flushQueue();
}

/* ---------- progress pings ----------
   A minute apart while a sheet is open, so a parent at work can see
   movement rather than only a score at the end. Being stuck is not a
   wrong answer: it is a box left blank while later ones get filled, or
   one answer rewritten over and over. Both are visible from here. */
var pingTimer = null, pingSeen = {}, pingStart = 0;

function padSnapshot(){
  var out = { answered:0, total:0, stuck:[] };
  if(!app) return out;
  var items = app.querySelectorAll("input.ans, .fracbox");
  items.forEach(function(el, i){
    out.total++;
    var val = el.classList && el.classList.contains("fracbox")
      ? Array.prototype.map.call(el.querySelectorAll("input"), function(x){ return x.value; }).join("/")
      : el.value;
    var filled = String(val).replace(/\//g, "").trim() !== "";
    if(filled) out.answered++;
    var key = "q" + i, prev = pingSeen[key];
    if(!prev){ pingSeen[key] = { val: val, changes: 0, since: Date.now() }; }
    else if(prev.val !== val){ prev.val = val; prev.changes++; prev.since = Date.now(); }
  });
  /* Only report what a parent could act on. */
  Object.keys(pingSeen).forEach(function(k){
    var s = pingSeen[k], idx = +k.slice(1) + 1;
    var mins = Math.round((Date.now() - s.since) / 60000);
    if(s.val === "" && mins >= 4) out.stuck.push({ q: idx, why: "blank " + mins + " min" });
    else if(s.changes >= 4) out.stuck.push({ q: idx, why: "changed " + s.changes + "x" });
  });
  out.stuck = out.stuck.slice(0, 6);
  return out;
}

function sendPing(block){
  if(!apiUrl() || !who() || !block) return;
  var s = padSnapshot();
  if(!s.total) return;
  postOne("/ping", {
    kid: who(), date: todayKey(), block: block,
    answered: s.answered, total: s.total,
    mins: Math.round((Date.now() - pingStart) / 60000),
    stuck: s.stuck
  }).catch(function(){});   /* a missed ping is not worth queueing - the next one carries the same news */
}

function startPings(block){
  stopPings();
  pingSeen = {}; pingStart = Date.now();
  sendPing(block);
  pingTimer = setInterval(function(){ sendPing(block); }, 60000);
}
function stopPings(){ if(pingTimer){ clearInterval(pingTimer); pingTimer = null; } }

/* ---------- pencil work ---------- */
var inkTimer = {};
function sendInk(block, pad, data){
  if(!apiUrl() || !who()) return;
  var tag = "ink:" + block + ":" + pad;
  /* Wait until the pen has been still for a few seconds. Mid-stroke
     working is not worth a round trip; the finished thought is. */
  if(inkTimer[tag]) clearTimeout(inkTimer[tag]);
  inkTimer[tag] = setTimeout(function(){
    delete inkTimer[tag];
    queueAdd("/ink", { kid: who(), date: todayKey(), block: block, pad: pad, data: data }, tag);
    flushQueue();
  }, 4000);
}

/* ask the server which days a parent has cleared for a retake */
function checkRetakes(done){
  if(!apiUrl() || !who()){ if(done) done(0); return; }
  fetch(apiUrl() + "/retake?kid=" + encodeURIComponent(who()))
    .then(function(r){ return r.json(); })
    .then(function(d){
      var list = (d && d.dates) || [], cleared = 0;
      if(!list.length){ if(done) done(0); return; }
      var all = records();
      list.forEach(function(day){
        if(!all[day]) return;
        delete all[day];
        cleared++;
      });
      store.set("rec:" + who(), all);
      list.forEach(function(day){
        queueAdd("/retake-done", { kid: who(), date: day });
      });
      flushQueue();
      if(done) done(cleared);
    }).catch(function(){ if(done) done(0); });
}

/* ============================================================
   UI
   ============================================================ */
var hasDOM = (typeof document !== "undefined" && document && document.querySelector);
var $ = function(sel, root){ return (root || document).querySelector(sel); };
var app = hasDOM ? $("#app") : null;
var timer = { secs:0, id:null, target:0 };
var calMonth = null;   // Date pinned to the 1st of the month being shown

function fmt(s){
  var neg = s < 0; s = Math.abs(s);
  var m = Math.floor(s/60), r = s % 60;
  return (neg?"+":"") + m + ":" + (r<10?"0":"") + r;
}
function stopTimer(){ if(timer.id){ clearInterval(timer.id); timer.id = null; } }
function startTimer(mins, onTick){
  stopTimer();
  timer.target = mins*60; timer.secs = mins*60;
  onTick(timer.secs);
  timer.id = setInterval(function(){ timer.secs--; onTick(timer.secs); }, 1000);
}
function elapsed(){ return timer.target - timer.secs; }
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

/* ---------- profile ---------- */
function screenProfile(){
  stopTimer();
  var names = store.get("names", ["", ""]);
  app.innerHTML =
    '<div class="center-card">' +
      '<h1>Who is practising?</h1>' +
      '<p class="sub">Tap your name. The iPad will remember it.</p>' +
      '<div class="pick" id="pick"></div>' +
      '<details class="setup"><summary>Set up names</summary>' +
        '<label>First name <input id="n0" type="text" value="'+esc(names[0])+'"></label>' +
        '<label>Second name <input id="n1" type="text" value="'+esc(names[1])+'"></label>' +
        '<button class="primary" id="saveNames">Save names</button>' +
      '</details>' +
    '</div>';
  var pick = $("#pick");
  if(!names[0] && !names[1]){
    pick.innerHTML = '<p class="muted">Open “Set up names” below to add the two names.</p>';
  } else {
    names.forEach(function(n){
      if(!n) return;
      var b = document.createElement("button");
      b.className = "bigpick"; b.textContent = n;
      b.addEventListener("click", function(){ store.set("profile", n); selectedDate = null; screenCalendar(); });
      pick.appendChild(b);
    });
  }
  $("#saveNames").addEventListener("click", function(){
    store.set("names", [$("#n0").value.trim(), $("#n1").value.trim()]);
    screenProfile();
  });
}

/* ---------- top bar used by every screen ---------- */
function topBar(title, opts){
  opts = opts || {};
  return '<div class="bar">' +
    (opts.back ? '<button class="ghost" id="back">‹ Back</button>' : "") +
    '<button class="ghost" id="home">⌂ Home</button>' +
    '<strong>'+esc(title)+'</strong>' +
    (opts.clock ? '<span class="clock" id="clock">--:--</span>' : '<span class="spacer"></span>') +
    '</div>';
}
function wireBar(onBack){
  var h = $("#home");
  if(h) h.addEventListener("click", function(){ flushPads(); saveDraft(); stopTimer(); stopPings(); activeBlock = null; screenCalendar(); });
  var b = $("#back");
  if(b) b.addEventListener("click", function(){ flushPads(); saveDraft(); stopTimer(); stopPings(); activeBlock = null; (onBack || screenCalendar)(); });
}

/* ---------- calendar (home) ---------- */
function monthLabel(d){ return d.toLocaleDateString(undefined, { month:"long", year:"numeric" }); }

function screenCalendar(){
  var ghc = document.getElementById("goHome"); if(ghc) ghc.remove();
  stopTimer();
  if(!calMonth){
    var t = dateFromKey(selectedDate || realTodayKey());
    calMonth = new Date(t.getFullYear(), t.getMonth(), 1);
  }
  var rec = records(), today = realTodayKey();
  var first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
  var last  = new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 0);

  /* build week rows of Mon-Fri only */
  var rows = [], cur = new Date(first);
  var back = (cur.getDay() + 6) % 7;            // Monday = 0
  cur.setDate(cur.getDate() - back);
  while(cur <= last || ((cur.getDay()+6)%7) !== 0){
    var week = [];
    for(var i=0;i<5;i++){                        // Mon..Fri
      var d = new Date(cur); d.setDate(cur.getDate() + i);
      week.push(d);
    }
    rows.push(week);
    cur.setDate(cur.getDate() + 7);
    if(rows.length > 6) break;
  }

  var weekNo = 0;
  var body = rows.map(function(week){
    var inMonth = week.some(function(d){ return d.getMonth() === calMonth.getMonth(); });
    if(!inMonth) return "";
    weekNo++;
    var cells = week.map(function(d){
      var k = keyOf(d);
      var other = d.getMonth() !== calMonth.getMonth();
      var r = rec[k] || {};
      var done = ["recap","math","think","eng"].filter(function(b){ return r[b]; }).length;
      var cls = "day";
      if(other) cls += " other";
      if(k === today) cls += " today";
      if(k > today) cls += " ahead";
      if(done === 3) cls += " full";
      else if(done > 0) cls += " part";
      var dots = ["recap","math","think","eng"].map(function(b){
        return '<i class="dot '+(r[b] ? (r[b].got/r[b].total >= 0.8 ? "g" : "a") : "")+'"></i>';
      }).join("");
      return '<button class="'+cls+'" data-date="'+k+'">' +
        '<span class="dnum">'+d.getDate()+'</span>' +
        '<span class="dots">'+dots+'</span>' +
        (k === today ? '<span class="tlabel">today</span>' : "") +
        '</button>';
    }).join("");
    return '<div class="weekrow"><span class="wlabel">Week '+weekNo+'</span><div class="days">'+cells+'</div></div>';
  }).join("");

  app.innerHTML =
    '<header class="hero">' +
      '<div class="row"><div><h1>'+esc(who())+'</h1>' +
      '<p class="sub">Pick a day to practise</p></div>' +
      '<div class="hbtns"><button class="ghost" id="refresh">⟳ Update</button>' +
      '<button class="ghost" id="switch">Switch</button></div></div>' +
      '<p class="ver">Version '+APP_VERSION+'</p>' +
    '</header>' +
    '<div class="sheet">' +
      '<div class="calhead">' +
        '<button class="ghost sq" id="prev" aria-label="Previous month">‹</button>' +
        '<h2>'+monthLabel(calMonth)+'</h2>' +
        '<button class="ghost sq" id="next" aria-label="Next month">›</button>' +
        '<button class="ghost" id="todayBtn">Today</button>' +
      '</div>' +
      '<div class="dowrow"><span></span><div class="dows"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div></div>' +
      body +
      '<p class="legend"><i class="dot g"></i> 80% or better &nbsp; <i class="dot a"></i> needs another look &nbsp; <i class="dot"></i> not done</p>' +
      '<div class="foot"><button class="ghost" id="report">Progress report</button>' +
      '<button class="ghost" id="parent">For parents</button></div>' +
    '</div>';

  app.querySelectorAll(".day").forEach(function(el){
    el.addEventListener("click", function(){ selectedDate = el.dataset.date; screenDay(); });
  });
  $("#prev").addEventListener("click", function(){ calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth()-1, 1); screenCalendar(); });
  $("#next").addEventListener("click", function(){ calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 1); screenCalendar(); });
  $("#todayBtn").addEventListener("click", function(){ selectedDate = null; calMonth = null; screenDay(); });
  $("#switch").addEventListener("click", function(){ store.set("profile", null); screenProfile(); });
  $("#refresh").addEventListener("click", getLatest);
  $("#report").addEventListener("click", screenReport);
  $("#parent").addEventListener("click", screenParent);
}

/* ---------- the three blocks for one day ---------- */
function blockCard(key){
  var b = BLOCKS[key], r = resultFor(key);
  var sub = r ? "Finished in "+fmt(r.secs).replace("+","")+" — tap to open" : b.mins+" minutes";
  var right = r ? '<span class="chip '+(r.got/r.total >= 0.8 ? "good" : "work")+'">'+r.got+" / "+r.total+'</span>'
                : '<span class="chip">'+b.mins+' min</span>';
  var extra = "";

  if(key === "recap"){
    extra = " recap";
    if(!r){
      var n = recapParts().total;
      sub = n ? n + " thing" + (n===1?"":"s") + " you got wrong before"
              : "nothing to go back over yet";
      if(!n){ extra += " quiet"; right = '<span class="chip">clear</span>'; }
    }
  }

  return '<button class="block '+(r ? "done" : "todo")+extra+'" data-block="'+key+'">' +
    '<span class="glyph">'+b.icon+'</span>' +
    '<span class="btext"><strong>'+b.label+'</strong><small>'+sub+'</small></span>' +
    right + '</button>';
}

function screenDay(){
  stopTimer();
  stopPings();
  var gh = document.getElementById("goHome"); if(gh) gh.remove();
  var L = levelNow(), day = daysSinceStart()+1, k = todayKey();
  var ahead = k > realTodayKey();
  app.innerHTML =
    topBar(prettyDate(k)) +
    '<div class="sheet">' +
      '<p class="dayline">Day '+(day>0?day:1)+' · Level '+L +
        (ahead ? ' · <span class="aheadtag">this day is still ahead</span>' : '') + '</p>' +
      '<div class="blocks">' + blockCard("recap") + blockCard("math") + blockCard("think") + blockCard("eng") + '</div>' +
      '<div class="foot"><button class="ghost" id="report">Progress report</button>' +
      '<button class="ghost" id="parent">For parents</button></div>' +
    '</div>';
  wireBar();
  app.querySelectorAll(".block").forEach(function(el){
    el.addEventListener("click", function(){ openBlock(el.dataset.block); });
  });
  $("#report").addEventListener("click", screenReport);
  $("#parent").addEventListener("click", screenParent);
}

/* ============================================================
   DRAFTS - keep half-finished work when they navigate away
   ============================================================ */
var activeBlock = null, draftTimer = null;

function draftKey(block){ return "draft:" + who() + ":" + todayKey() + ":" + block; }

function saveDraft(){
  if(!activeBlock || !app) return;
  try{
    var d = { ans:[], frac:[], opts:[], text:{} };
    app.querySelectorAll("input.ans").forEach(function(i){ d.ans.push(i.value); });
    app.querySelectorAll(".fracbox").forEach(function(b){
      var fw = b.querySelector(".fw"), fn = b.querySelector(".fn"), fd = b.querySelector(".fd");
      d.frac.push([fw ? fw.value : "", fn ? fn.value : "", fd ? fd.value : ""]);
    });
    app.querySelectorAll(".opts").forEach(function(o){
      var sel = o.querySelector("input:checked");
      d.opts.push(sel ? sel.value : "");
    });
    app.querySelectorAll("textarea").forEach(function(t){ if(t.id) d.text[t.id] = t.value; });
    store.set(draftKey(activeBlock), d);
  }catch(e){}
}

function saveDraftSoon(){
  if(draftTimer) clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 400);
}

function loadDraft(block){
  var d = store.get(draftKey(block), null);
  if(!d) return false;
  var filled = 0;
  var a = app.querySelectorAll("input.ans");
  (d.ans || []).forEach(function(v, i){ if(a[i] && v){ a[i].value = v; filled++; } });
  var f = app.querySelectorAll(".fracbox");
  (d.frac || []).forEach(function(v, i){
    var b = f[i]; if(!b) return;
    var fw = b.querySelector(".fw"), fn = b.querySelector(".fn"), fd = b.querySelector(".fd");
    if(fw && v[0]){ fw.value = v[0]; filled++; }
    if(fn && v[1]){ fn.value = v[1]; filled++; }
    if(fd && v[2]){ fd.value = v[2]; filled++; }
  });
  var o = app.querySelectorAll(".opts");
  (d.opts || []).forEach(function(v, i){
    if(!o[i] || v === "") return;
    var inp = o[i].querySelectorAll(".opt input")[+v];
    if(inp){ inp.checked = true; filled++; }
  });
  Object.keys(d.text || {}).forEach(function(id){
    var t = document.getElementById(id);
    if(t && d.text[id]){ t.value = d.text[id]; t.dispatchEvent(new Event("input")); filled++; }
  });
  return filled > 0;
}

function clearDraft(block){
  try{ localStorage.removeItem("dd:" + draftKey(block)); }catch(e){}
}

/* drop drafts older than three weeks so storage cannot creep up */
function pruneDrafts(){
  try{
    var cutoff = keyOf(new Date(Date.now() - 21*86400000));
    for(var i = localStorage.length - 1; i >= 0; i--){
      var k = localStorage.key(i);
      if(k && k.indexOf("dd:draft:") === 0){
        var m = k.match(/:(\d{4}-\d{2}-\d{2}):/);
        if(m && m[1] < cutoff) localStorage.removeItem(k);
      }
    }
  }catch(e){}
  /* their pencil work is kept far longer - the nightly export needs time to
     pick it up, and it is the thing we least want to lose */
  try{
    if(window.Ink && Ink.available()){
      Ink.pruneBefore(keyOf(new Date(Date.now() - 120*86400000)));
    }
  }catch(e){}
}

/* ============================================================
   RECAP - the first 15 minutes, built from what they personally
   got wrong. Not a fresh sheet: the same questions again, after
   enough time has passed that the answer is not still in mind.
   ============================================================ */

/* A miss only stored the question and the two answers. Work out from the
   expected answer whether it wants a number or a word. */
function missKind(m){
  if(m.kind) return m.kind;
  return /^[\d\s./-]+$/.test(String(m.want || "")) ? "num" : "word";
}

/* Walk back through the record, newest first, gathering what they missed.
   Each entry remembers which day it came from so the sheet can say so. */
function pastMisses(fromDaysAgo, toDaysAgo, limit){
  var all = records(), today = todayKey(), out = [], seen = {};
  var dates = Object.keys(all).filter(function(d){ return d < today; }).sort().reverse();
  var now = dateFromKey(today).getTime();
  for(var i = 0; i < dates.length && out.length < limit; i++){
    var age = Math.round((now - dateFromKey(dates[i]).getTime()) / 86400000);
    if(age < fromDaysAgo || age > toDaysAgo) continue;
    var r = all[dates[i]];
    ["math","think","eng"].forEach(function(b){
      (r["miss:" + b] || []).forEach(function(m){
        if(out.length >= limit) return;
        if(!m.q || !String(m.want || "").trim()) return;
        var sig = b + "|" + m.q;
        if(seen[sig]) return;
        seen[sig] = 1;
        out.push({ q:m.q, want:m.want, gave:m.gave, block:b, date:dates[i], age:age, kind:missKind(m) });
      });
    });
  }
  return out;
}

function recapParts(){
  var fresh = pastMisses(1, 2, 6);        // the last day or two they worked
  var older = pastMisses(3, 10, 4);       // far enough back to have faded
  return { fresh:fresh, older:older, total:fresh.length + older.length };
}

function recapRow(m, i){
  var label = "Recap " + (i+1);
  var input = m.kind === "word"
    ? '<input class="ans word" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"' +
        ' data-a="'+esc(m.want)+'" data-q="'+esc(m.q)+'" aria-label="'+esc(label)+'">'
    : numInput(m.want, label, m.q);
  var ago = m.age === 1 ? "yesterday" : m.age + " days ago";
  return '<div class="prob"><p class="pq"><b>'+(i+1)+'.</b> '+esc(m.q)+'</p>' +
    '<p class="recall">You wrote <b>'+esc(m.gave || "nothing")+'</b> '+ago+'.</p>' +
    '<div class="prow">'+input+'</div></div>';
}

function blockRecap(){
  var parts = recapParts(), n = 0;
  var html = "";

  if(!parts.total){
    html = '<section class="card"><div class="chead"><h2>Nothing to go back over</h2></div>' +
      '<p class="note">You have not missed anything in the last few days, or this iPad has no history yet. ' +
      'Go straight to Math &mdash; the Recap will fill itself in as you go.</p></section>';
    shell("Recap", BLOCKS.recap.mins, html + endBar(), function(){ wireSheet("recap"); }, "recap");
    return;
  }

  if(parts.fresh.length){
    html += '<section class="card" data-sec="k0"><div class="chead"><h2>From last time</h2>' +
      '<span class="chip work">'+parts.fresh.length+'</span></div>' +
      '<p class="note">Same questions, one more go. Work them out again rather than trying to remember.</p>' +
      parts.fresh.map(function(m){ return recapRow(m, n++); }).join("") +
      clearBar("k0") + '</section>';
  }
  if(parts.older.length){
    html += '<section class="card" data-sec="k1"><div class="chead"><h2>From earlier</h2>' +
      '<span class="chip work">'+parts.older.length+'</span></div>' +
      '<p class="note">Long enough ago that it is worth checking it stuck.</p>' +
      parts.older.map(function(m){ return recapRow(m, n++); }).join("") +
      clearBar("k1") + '</section>';
  }

  shell("Recap", BLOCKS.recap.mins, html + endBar(), function(){ wireSheet("recap"); }, "recap");
}

/* ---------- sheet shell ---------- */
function shell(title, mins, bodyHTML, onMount, block){
  activeBlock = block || null;
  app.innerHTML = topBar(title, { back:true, clock:true }) + '<div class="sheet">' + bodyHTML + '</div>';
  wireBar(screenDay);
  startTimer(mins, function(s){
    var c = $("#clock"); if(!c) return;
    c.textContent = fmt(s);
    c.className = "clock" + (s <= 0 ? " over" : (s <= 300 ? " soon" : ""));
  });
  if(onMount) onMount();
  wireLiveClear();
  addGoHome();
  if(block && loadDraft(block)) toast("Your answers from before are still here");
  /* Only now, with the sheet built and any saved answers restored, is there
     anything worth telling a parent. Started earlier it counts an empty page. */
  if(block) startPings(block);
}

/* The bar at the top is sticky, but sticky means the top of the page, not
   the top of what you can see - so on a pinch-zoomed iPad it can sit off
   screen and leave no way back from the bottom of a long sheet. This one
   is always where they can reach it. */
function addGoHome(){
  var old = document.getElementById("goHome");
  if(old) old.remove();
  var b = document.createElement("button");
  b.id = "goHome"; b.className = "gohome"; b.type = "button";
  b.innerHTML = "&#8962; Home";
  b.hidden = true;
  b.addEventListener("click", function(){
    flushPads(); saveDraft(); stopTimer(); stopPings(); activeBlock = null;
    b.remove(); screenCalendar();
  });
  document.body.appendChild(b);
  function onScroll(){
    if(!document.body.contains(b)){ window.removeEventListener("scroll", onScroll); return; }
    b.hidden = window.scrollY < 400;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* typing in a marked box clears its own mark, and saves the draft */
function wireLiveClear(){
  app.addEventListener("input", function(e){
    var t = e.target;
    if(t && t.tagName === "INPUT"){ t.classList.remove("ok","no"); }
    saveDraftSoon();
  });
  app.addEventListener("change", function(e){
    var t = e.target;
    if(t && t.type === "radio"){
      var box = t.closest(".opts");
      if(box) box.querySelectorAll(".opt").forEach(function(l){ l.classList.remove("ok","no"); });
    }
    saveDraftSoon();
  });
}

/* ---------- renderers ---------- */
function numInput(ans, label, qtext){
  return '<input class="ans" type="text" inputmode="numeric" autocomplete="off" data-a="'+esc(ans)+'"' +
    (qtext ? ' data-q="'+esc(qtext)+'"' : "") + ' aria-label="'+esc(label)+'">';
}
function clearBar(target){
  return '<div class="clearrow"><button class="ghost sm" data-clear="'+target+'">Clear this section</button></div>';
}
/* Write every pad on screen to disk now, and let go of the old ones so a
   new sheet does not keep flushing the last sheet's pads. */
function flushPads(){
  if(!window.Ink || !Ink.available()) return;
  try{ Ink.flushAll(); Ink.forget(); }catch(e){}
}

/* Working lives behind a button, not in a strip under the question.
   A fraction needs room to work out; a times-table fact needs none at
   all. So the sheet stays short, and tapping opens most of the screen. */
function padHost(idPrefix, i, q){
  return '<div class="workrow" data-pad="' + idPrefix + '-' + i + '" data-q="' + esc(q || "") + '">' +
    '<button type="button" class="workbtn">&#9998; Show your working</button>' +
    '<div class="workprev" hidden></div></div>';
}

/* Draw the small reminder of what is already on a pad, so they can see at
   a glance which problems they have worked and which they have not. */
function paintPreview(row, data){
  var btn = row.querySelector(".workbtn"), prev = row.querySelector(".workprev");
  var strokes = (data && data.s) || [], shots = (data && data.imgs) || [];
  var text = (data && data.text || "").trim();
  var has = strokes.length || shots.length || text;
  btn.classList.toggle("has", !!has);
  btn.innerHTML = has
    ? (strokes.length ? "&#9998; Working"
      : shots.length ? "&#128247; " + shots.length + (shots.length === 1 ? " page" : " pages")
      : "&#9000; Typed")
    : "&#9998; " + (row.dataset.label || "Show your working");
  prev.hidden = !has;
  prev.className = "workprev" + (!strokes.length && !shots.length ? " txt" : "");
  if(!has){ prev.innerHTML = ""; return; }
  if(strokes.length){
    try{ prev.innerHTML = '<img alt="your working" src="' + Ink.toImage(data, 1) + '">'; return; }
    catch(e){ /* fall through */ }
  }
  if(shots.length){ prev.innerHTML = '<img alt="your working" src="' + shots[0] + '">'; return; }
  prev.textContent = text;
}

function mountPads(block){
  if(!window.Ink || !Ink.available()) return;
  var base = "ink:" + who() + ":" + todayKey() + ":" + block + ":";
  app.querySelectorAll(".workrow").forEach(function(row){
    if(row.dataset.wired) return;
    row.dataset.wired = "1";
    var pad = row.dataset.pad, key = base + pad;

    Ink.load(key).then(function(saved){ if(saved) paintPreview(row, saved); });

    row.querySelector(".workbtn").addEventListener("click", function(){
      Ink.openSheet(key, {
        title: row.dataset.q || "Your working",
        placeholder: "write your working here",
        onClose: function(data){
          paintPreview(row, data);
          if(data) sendInk(block, pad, data);
        }
      });
    });
  });
}

/* Which problems deserve a working space. A times-table fact does not -
   giving it one just buries the sheet in empty boxes. Anything with a
   two-digit number, a fraction or a remainder does. */
function needsWork(it){
  if(it.kind === "frac" || it.kind === "divr") return true;
  return /\d{2}/.test(String(it.q));
}

function sectionHTML(sec, idPrefix){
  var pad = !!sec.pad;
  var anyPad = pad && sec.items.some(needsWork);
  var rows = sec.items.map(function(it, i){
    var q = esc(it.q);
    var mine = pad && needsWork(it);
    var work = mine ? padHost(idPrefix, i, it.q) : "";
    var pc = mine ? " haspad" : "";
    if(it.kind === "divr"){
      return '<div class="tile'+pc+'"><span class="q">'+q+' =</span>' +
        '<span class="slot">'+numInput(it.a, it.q)+'</span>' +
        '<span class="rlab">R</span><span class="slot sm">' +
        '<input class="ans" type="text" inputmode="numeric" data-a="'+it.r+'" data-opt="1" aria-label="remainder"></span>' +
        work + '</div>';
    }
    if(it.kind === "frac"){
      var tail = /=|simplest form|mixed number|\(simplify\)/.test(it.q) ? "" : " =";
      return '<div class="tile col'+pc+'"><span class="q">'+q+tail+'</span>' +
        '<span class="fracbox" data-w="'+it.w+'" data-n="'+it.n+'" data-d="'+it.d+'"' +
          (/simplif|simplest/i.test(it.q) ? ' data-simp="1"' : '') +
          (it.exact ? ' data-exact="1"' : '') + '>' +
          ((it.noWhole || (it.exact && !it.w)) ? "" : '<input class="fw" type="text" inputmode="numeric" placeholder="whole" aria-label="whole number">') +
          '<span class="stack"><input class="fn" type="text" inputmode="numeric" aria-label="numerator">' +
          '<span class="bar2"></span><input class="fd" type="text" inputmode="numeric" aria-label="denominator"></span>' +
        '</span>' + work + '</div>';
    }
    return '<div class="tile'+pc+'"><span class="q">'+q+' =</span>' +
      '<span class="slot">'+numInput(it.a, it.q)+'</span>' + work + '</div>';
  }).join("");
  var wide = sec.items.some(function(it){ return it.kind==="divr"||it.kind==="frac"; });
  return '<section class="card" data-sec="'+idPrefix+'"><div class="chead"><h2>'+esc(sec.title)+'</h2></div>' +
    '<p class="note">'+esc(sec.note)+'</p>' +
    '<div class="grid'+(wide ? " wide" : "")+(anyPad ? " padded" : "")+'">'+rows+'</div>' +
    clearBar(idPrefix) + '</section>';
}

function openBlock(key){
  if(key === "recap") return blockRecap();
  if(key === "math") return blockMath();
  if(key === "think") return blockThink();
  return blockEnglish();
}
function endBar(){
  return '<div class="endbar">' +
    '<button class="primary" id="check">Check &amp; send my answers</button>' +
    '<button class="ghost" id="reveal">Show answers</button>' +
    '<button class="ghost" id="clearAll">Clear everything</button>' +
    '<span class="score" id="score">—</span>' +
    '<span class="chip" id="syncState" hidden></span></div>';
}

/* ---------- MATH ---------- */
function blockMath(){
  var L = levelNow();
  seedFor("math");
  var secs = [genMultiply(L), genDivide(L), genFractions(L)];
  if(L >= 2) secs.push(genDecimals(L));
  secs.forEach(function(s){ s.pad = true; });   // every problem gets room to work
  var html = secs.map(function(s,i){ return sectionHTML(s, "m"+i); }).join("") + endBar();
  shell("Math", BLOCKS.math.mins, html, function(){ wireSheet("math"); mountPads("math"); }, "math");
}

/* ---------- THINKING ---------- */
function blockThink(){
  var L = levelNow();
  seedFor("think");
  var items = genThinking(L);
  seedFor("challenge");
  var chal = genChallenge(L);
  var chalRows = chal.map(function(it,i){
    return '<div class="prob"><p class="pq"><b>★'+(i+1)+'.</b> '+esc(it.q)+'</p>' +
      '<div class="prow">'+numInput(it.a, "Challenge "+(i+1), "★ "+it.q)+
      '<button class="ghost sm" data-hint="c'+i+'">Hint</button></div>' +
      '<p class="hint" id="hc'+i+'" hidden>'+esc(it.hint)+'</p>' +
      '<div class="model" data-sol hidden><strong>How to solve it:</strong> '+esc(it.sol)+'</div></div>';
  }).join("");
  var chalHTML = '<section class="card challenge" data-sec="c0"><div class="chead"><h2>★ Challenge of the day</h2><span class="chip work">2 puzzles</span></div>' +
    '<p class="note">These are meant to be hard. Draw a picture, try small numbers, look for a pattern. Give each one at least 5 minutes before you open the hint. The full solution appears after you check.</p>' +
    chalRows + clearBar("c0") + '</section>';
  var rows = items.map(function(it,i){
    return '<div class="prob"><p class="pq"><b>'+(i+1)+'.</b> '+esc(it.q)+'</p>' +
      '<div class="prow">'+numInput(it.a, "Answer "+(i+1), it.q)+
      '<button class="ghost sm" data-hint="'+i+'">Hint</button></div>' +
      '<p class="hint" id="h'+i+'" hidden>'+esc(it.hint)+(it.aNote ? " " + esc(it.aNote) : "")+'</p></div>';
  }).join("");
  var html = chalHTML + '<section class="card" data-sec="t0"><div class="chead"><h2>Thinking problems</h2></div>' +
    '<p class="note">Read each one twice. Work it on paper, then type the number only. Use a hint if you are stuck for more than two minutes.</p>' +
    rows + clearBar("t0") + '</section>' + endBar();
  shell("Thinking", BLOCKS.think.mins, html, function(){
    app.querySelectorAll("[data-hint]").forEach(function(b){
      b.addEventListener("click", function(){
        var h = $("#h"+b.dataset.hint); h.hidden = !h.hidden;
        b.textContent = h.hidden ? "Hint" : "Hide";
      });
    });
    wireSheet("think", function(){
      app.querySelectorAll("[data-sol]").forEach(function(s){ s.hidden = false; });
    });
  }, "think");
}

/* ---------- ENGLISH ---------- */
function blockEnglish(){
  var L = levelNow();
  var E = pickEnglish(L);
  var saved = records()[todayKey()] || {};

  /* Spelling is written by hand, not typed.
     iPadOS Scribble turns handwriting in a text box into text it
     recognises - so "importent" comes back as "important" and the one
     thing a spelling test exists to capture is quietly repaired before
     anyone sees it. A canvas is not a text box, so nothing is corrected
     and the word survives exactly as she formed it.
     The keyboard is still there for anyone without a Pencil. */
  var spellRows = E.spelling.map(function(pair, i){
    var blanked = pair[1].replace(new RegExp(pair[0], "ig"), "______");
    return '<div class="srow spell"><span class="idx">'+(i+1)+'</span>' +
      '<button class="speak" data-say="'+esc(pair[0]+". "+pair[1])+'" aria-label="Hear word '+(i+1)+'">🔊</button>' +
      '<div class="wordpad" data-pad="sp'+i+'" data-a="'+esc(pair[0])+'"></div>' +
      '<span class="clue">'+esc(blanked)+'</span>' +
      '<span class="answer" hidden>'+esc(pair[0])+'</span></div>';
  }).join("");

  var vocabRows = E.vocab.map(function(v){
    return '<div class="vcard"><div class="vhead"><strong>'+esc(v.w)+'</strong><span class="say">'+esc(v.say)+'</span>' +
      '<button class="speak" data-say="'+esc(v.w)+'" aria-label="Hear '+esc(v.w)+'">🔊</button></div>' +
      '<p class="vm">'+esc(v.m)+'</p><p class="vu">'+esc(v.u)+'</p><p class="vs">'+esc(v.s)+'</p></div>';
  }).join("");

  function mcRows(list, name){
    return list.map(function(g, i){
      var opts = g.o.map(function(t, oi){
        return '<label class="opt"><input type="radio" name="'+name+i+'" value="'+oi+'"><span>'+esc(t)+'</span></label>';
      }).join("");
      return '<div class="prob"><p class="pq"><b>'+(i+1)+'.</b> '+esc(g.q)+'</p>' +
        '<div class="opts" data-ans="'+g.a+'" data-q="'+esc(g.q)+'">'+opts+'</div></div>';
    }).join("");
  }

  var p = E.reading;
  var html =
    '<section class="card" data-sec="e0"><div class="chead"><h2>Spelling</h2><span class="chip">10 words</span></div>' +
    '<p class="note">Tap the speaker, listen to the word and the sentence, then write it with your Pencil. Do not look at the clue first.</p>' +
    spellRows +
    '<details class="setup"><summary>Word list (for the adult reading them out)</summary><ol class="wordlist">' +
    E.spelling.map(function(w){ return "<li>"+esc(w[0])+"</li>"; }).join("") + '</ol></details>' +
    clearBar("e0") + '</section>' +

    '<section class="card" data-sec="e1"><div class="chead"><h2>Vocabulary</h2><span class="chip">5 words</span></div>' +
    '<p class="note">Read each one aloud. Then close your eyes and say the meaning in your own words.</p>' +
    '<div class="vgrid">'+vocabRows+'</div>' +
    '<p class="note">Now use two of them in sentences about your own day:</p>' +
    '<textarea id="vocabUse" rows="3" placeholder="Write two sentences here...">'+esc(saved.vocabUse||"")+'</textarea>' +
    clearBar("e1") + '</section>' +

    '<section class="card" data-sec="e2"><div class="chead"><h2>Grammar</h2><span class="chip">10 questions</span></div>' +
    mcRows(E.grammar, "g") + clearBar("e2") + '</section>' +

    '<section class="card" data-sec="e3"><div class="chead"><h2>Reading</h2></div>' +
    '<p class="note">Read it twice — once for the story, once for the details.</p>' +
    '<article class="passage"><h3>'+esc(p.title)+'</h3>' +
    p.body.map(function(t,i){ return '<p><span class="pnum">'+(i+1)+'</span>'+esc(t)+'</p>'; }).join("") + '</article>' +
    mcRows(p.qs, "r") +
    '<div class="prob"><p class="pq"><b>5.</b> '+esc(p.open.q)+'</p>' +
    '<textarea id="openAns" rows="4" placeholder="Answer in two or three sentences...">'+esc(saved.openAns||"")+'</textarea>' +
    '<div class="model" id="openModel" hidden><strong>A good answer says:</strong> '+esc(p.open.model)+'</div></div>' +
    clearBar("e3") + '</section>' +

    '<section class="card" data-sec="e4"><div class="chead"><h2>Writing</h2><span class="chip">10 min</span></div>' +
    '<p class="note">'+esc(E.writing.p)+'</p>' +
    '<div class="workrow big" data-pad="write" data-label="Open the writing page" ' +
      'data-done="Your writing"><button type="button" class="workbtn">' +
      '&#9998; Open the writing page</button><div class="workprev" hidden></div></div>' +
    '<textarea id="writeAns" hidden aria-hidden="true"></textarea>' +
    clearBar("e4") + '</section>' + endBar();

  shell("English", BLOCKS.eng.mins, html, function(){
    app.querySelectorAll(".speak").forEach(function(b){
      b.addEventListener("click", function(){ say(b.dataset.say); });
    });

    /* one small writing strip per spelling word */
    if(window.Ink && Ink.available()){
      var sbase = "ink:" + who() + ":" + todayKey() + ":eng:";
      app.querySelectorAll(".wordpad").forEach(function(w){
        var id = w.dataset.pad;
        Ink.mount(w, sbase + id, { height: 56, compact: true,
          placeholder: " ", label: "write word " + (id.slice(2) * 1 + 1),
          onChange: function(d){ sendInk("eng", id, d); } });
      });
    }

    /* Writing opens on nearly the whole screen rather than a box on the
       sheet - a page of handwriting needs a page. The hidden #writeAns
       keeps whatever was typed, so drafts, grading and the upload carry
       on working exactly as before. */
    var wa = $("#writeAns");
    if(wa && saved.writeAns) wa.value = saved.writeAns;

    var wrow = app.querySelector('.workrow[data-pad="write"]');
    if(wrow && window.Ink && Ink.available()){
      var wkey = "ink:" + who() + ":" + todayKey() + ":eng:write";
      wrow.dataset.wired = "1";
      Ink.load(wkey).then(function(d){ if(d) paintPreview(wrow, d); });
      wrow.querySelector(".workbtn").addEventListener("click", function(){
        Ink.openSheet(wkey, {
          title: E.writing.p,
          maxShots: 6,
          placeholder: "start writing here",
          onClose: function(data){
            paintPreview(wrow, data);
            /* typed writing still reaches the sheet; handwriting goes up as ink */
            if(wa) wa.value = (data && data.mode === "type") ? (data.text || "") : "";
            if(data) sendInk("eng", "write", data);
          }
        });
      });
    }
    wireSheet("eng", function(){
      saveDetail("writeAns", wa ? wa.value : "");
      saveDetail("openAns", $("#openAns").value);
      saveDetail("vocabUse", $("#vocabUse").value);
      saveDetail("writePrompt", E.writing.p);
      saveDetail("readTitle", p.title);
      var m = $("#openModel"); if(m) m.hidden = false;
      /* handwriting cannot be marked by the app - show the right spelling
         beside each one so she can compare, and Claude reads the writing
         itself overnight to find what actually went wrong */
      app.querySelectorAll(".srow.spell .answer").forEach(function(a){ a.hidden = false; });
    });
  }, "eng");
}

function say(text){
  try{
    if(!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.8; u.lang = "en-US";
    window.speechSynthesis.speak(u);
  }catch(e){}
}

/* ---------- wiring shared by all three sheets ---------- */
function wireSheet(block, beforeGrade){
  $("#check").addEventListener("click", function(){
    if(beforeGrade) beforeGrade();
    gradeSheet(block);
  });
  $("#reveal").addEventListener("click", function(){
    revealSheet();
    var m = $("#openModel"); if(m) m.hidden = false;
    app.querySelectorAll("[data-sol]").forEach(function(s){ s.hidden = false; });
  });
  armClear($("#clearAll"), "Clear everything", function(){
    clearScope(app, true);
    clearDraft(block);
    var el = $("#score"); el.textContent = "—"; el.className = "score";
  }, true);
  app.querySelectorAll("[data-clear]").forEach(function(b){
    armClear(b, "Clear this section", function(){
      clearScope(app.querySelector('[data-sec="'+b.dataset.clear+'"]'), false);
      saveDraft();
    }, false);
  });
}

/* Only the button that wipes a whole sheet asks twice, and it waits ten
   seconds for the answer - three was short enough that reading the words
   ran the clock out, so a second tap started over and it never cleared.
   The smaller clears just clear; the palm shield is what stops stray
   presses now, and Undo covers the rest. */
function armClear(btn, label, action, confirm){
  if(!btn) return;
  if(!confirm){ btn.addEventListener("click", action); return; }
  var armed = null;
  function reset(){
    if(armed) clearTimeout(armed);
    armed = null; btn.textContent = label; btn.classList.remove("armed");
  }
  btn.addEventListener("click", function(){
    if(!armed){
      btn.textContent = "Yes, clear it all";
      btn.classList.add("armed");
      armed = setTimeout(reset, 10000);
      return;
    }
    reset();
    action();
  });
}

function clearScope(root, alsoText){
  if(!root) return;
  root.querySelectorAll("input.ans, .fracbox input").forEach(function(i){
    i.value = ""; i.classList.remove("ok","no");
  });
  root.querySelectorAll(".opts input").forEach(function(i){ i.checked = false; });
  root.querySelectorAll(".opt").forEach(function(l){ l.classList.remove("ok","no"); });
  root.querySelectorAll("textarea").forEach(function(t){
    if(alsoText || root.dataset.sec){ t.value = ""; t.dispatchEvent(new Event("input")); }
  });
  var m = root.querySelector ? root.querySelector("#openModel") : null;
  if(m) m.hidden = true;
  root.querySelectorAll("[data-sol]").forEach(function(s){ s.hidden = true; });
}

/* ---------- grading ---------- */
function norm(v){ return String(v==null?"":v).trim().toLowerCase().replace(/,/g,""); }
function sameNum(a,b){
  var x = parseFloat(a), y = parseFloat(b);
  if(isNaN(x) || isNaN(y)) return norm(a) === norm(b);
  return Math.abs(x-y) < 1e-6;
}
function gradeSheet(block){
  var got = 0, total = 0, misses = [];

  app.querySelectorAll("input.ans").forEach(function(inp){
    var want = inp.dataset.a, have = inp.value;
    if(inp.dataset.opt === "1" && want === "0" && norm(have) === "") have = "0";
    total++;
    var right = inp.classList.contains("word") ? norm(have) === norm(want) : sameNum(have, want);
    inp.classList.toggle("ok", right); inp.classList.toggle("no", !right);
    if(right) got++;
    else misses.push({ q: inp.dataset.q || inp.getAttribute("aria-label") || "", gave: inp.value, want: want,
                       kind: inp.classList.contains("word") ? "word" : "num" });
  });

  app.querySelectorAll(".fracbox").forEach(function(box){
    total++;
    var W = +box.dataset.w, N = +box.dataset.n, D = +box.dataset.d;
    var fw = box.querySelector(".fw"), fn = box.querySelector(".fn"), fd = box.querySelector(".fd");
    var vw = fw ? (parseInt(fw.value,10) || 0) : 0;
    var vn = parseInt(fn.value,10) || 0, vd = parseInt(fd.value,10) || 0;
    var want = W + (D ? N/D : 0);
    var have = vw + (vd ? vn/vd : 0);
    var touched = (fw && fw.value.trim()) || fn.value.trim() || fd.value.trim();
    var right = !!touched && Math.abs(have - want) < 1e-9 && (N === 0 || vd > 0);
    if(right && box.dataset.simp === "1" && vn > 0 && gcd(vn, vd) !== 1) right = false;
    if(box.dataset.exact === "1"){
      right = !!touched && vn === N && vd === D && vw === W;
    }
    [fw, fn, fd].forEach(function(el){ if(el){ el.classList.toggle("ok", right); el.classList.toggle("no", !right); } });
    if(right) got++;
    else {
      var qt = box.parentNode.querySelector(".q");
      misses.push({ q: qt ? qt.textContent : "fraction",
                    gave: (fw ? fw.value+" " : "") + fn.value + "/" + fd.value,
                    want: (W ? W+" " : "") + (N ? N+"/"+D : ""), kind:"num" });
    }
  });

  app.querySelectorAll(".opts").forEach(function(opts){
    total++;
    var want = opts.dataset.ans;
    var labels = opts.querySelectorAll(".opt");
    labels.forEach(function(lab, i){
      var picked = lab.querySelector("input").checked;
      lab.classList.remove("ok","no");
      if(String(i) === want && picked) lab.classList.add("ok");
      if(picked && String(i) !== want) lab.classList.add("no");
    });
    var sel = opts.querySelector("input:checked");
    if(sel && sel.value === want) got++;
    else misses.push({ q: opts.dataset.q || "",
                       gave: sel ? labels[+sel.value].textContent.trim() : "(blank)",
                       want: labels[+want].textContent.trim(), kind:"word" });
  });

  saveResult(block, got, total, elapsed());
  saveDetail("miss:"+block, misses.slice(0, 40));
  sendResult(block, got, total, elapsed(), misses);

  var el = $("#score");
  if(el){
    var pct = total ? Math.round(got/total*100) : 0;
    el.textContent = got + " / " + total + "  ·  " + pct + "%";
    el.className = "score " + (pct >= 80 ? "good" : "work");
  }
  var first = app.querySelector("input.no, .opt.no");
  if(first) first.scrollIntoView({ behavior:"smooth", block:"center" });
}

function revealSheet(){
  app.querySelectorAll("input.ans").forEach(function(inp){
    inp.value = inp.dataset.a; inp.classList.remove("no"); inp.classList.add("ok");
  });
  app.querySelectorAll(".fracbox").forEach(function(box){
    var fw = box.querySelector(".fw"), fn = box.querySelector(".fn"), fd = box.querySelector(".fd");
    if(fw) fw.value = box.dataset.w;
    var n = box.dataset.n;
    var exact = box.dataset.exact === "1";
    fn.value = (n === "0" && !exact) ? "" : n;
    fd.value = (n === "0" && !exact) ? "" : box.dataset.d;
    [fw,fn,fd].forEach(function(el){ if(el){ el.classList.remove("no"); el.classList.add("ok"); } });
  });
  app.querySelectorAll(".opts").forEach(function(opts){
    var want = opts.dataset.ans;
    opts.querySelectorAll(".opt").forEach(function(lab, i){
      lab.classList.remove("no");
      if(String(i) === want){ lab.classList.add("ok"); lab.querySelector("input").checked = true; }
    });
  });
}

/* ---------- report ---------- */
function screenReport(){
  stopTimer();
  var rec = records();
  var days = Object.keys(rec).sort().reverse().slice(0,30);
  var tot = { math:[0,0], think:[0,0], eng:[0,0] };
  days.forEach(function(d){
    ["recap","math","think","eng"].forEach(function(b){
      if(rec[d][b]){ tot[b][0] += rec[d][b].got; tot[b][1] += rec[d][b].total; }
    });
  });
  function pct(b){ return tot[b][1] ? Math.round(tot[b][0]/tot[b][1]*100) : null; }
  function barRow(b){
    var p = pct(b);
    return '<div class="brow"><span class="blabel">'+BLOCKS[b].label+'</span>' +
      '<span class="track"><span class="fillbar" style="width:'+(p||0)+'%"></span></span>' +
      '<span class="bval">'+(p===null?"—":p+"%")+'</span></div>';
  }
  var rows = days.map(function(d){
    var r = rec[d];
    function cell(b){ return r[b] ? r[b].got+"/"+r[b].total : "—"; }
    return "<tr><td>"+d+"</td><td>"+cell("math")+"</td><td>"+cell("think")+"</td><td>"+cell("eng")+"</td></tr>";
  }).join("");
  app.innerHTML = topBar("Progress") + '<div class="sheet"><section class="card">' +
    '<div class="chead"><h2>'+esc(who())+' — last 30 days</h2></div>' +
    barRow("math") + barRow("think") + barRow("eng") +
    (days.length ? '<div class="tablewrap"><table><thead><tr><th>Day</th><th>Math</th><th>Thinking</th><th>English</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
                 : '<p class="note">No sessions recorded yet. Finish a block and it will appear here.</p>') +
    '</section></div>';
  wireBar();
}

/* ---------- parent ---------- */
function screenParent(){
  stopTimer();
  var names = store.get("names", []);
  var lines = [];
  names.forEach(function(n){
    if(!n) return;
    var rec = store.get("rec:"+n, {});
    var days = Object.keys(rec).sort().reverse().slice(0,14);
    lines.push("### " + n);
    if(!days.length) lines.push("(nothing recorded on this iPad)");
    days.forEach(function(d){
      var r = rec[d], bits = [];
      ["recap","math","think","eng"].forEach(function(b){
        if(r[b]) bits.push(BLOCKS[b].label+" "+r[b].got+"/"+r[b].total+" ("+Math.round(r[b].secs/60)+"m)");
      });
      lines.push(d + " — " + (bits.join(", ") || "nothing recorded"));
      ["recap","math","think","eng"].forEach(function(b){
        var m = r["miss:"+b];
        if(m && m.length){
          lines.push("  Got wrong in " + BLOCKS[b].label + ":");
          m.forEach(function(x){ lines.push("    " + x.q + "  → wrote: " + (x.gave||"(blank)") + " | correct: " + x.want); });
        }
      });
      if(r.writePrompt) lines.push("  Writing prompt: " + r.writePrompt);
      if(r.writeAns) lines.push("  Writing: " + r.writeAns);
      if(r.openAns) lines.push("  Reading answer: " + r.openAns);
      if(r.vocabUse) lines.push("  Vocabulary sentences: " + r.vocabUse);
    });
    lines.push("");
  });
  var text = "Daily Drills report — " + prettyDate(realTodayKey()) +
    "\nLevel " + levelNow() + ", week " + (weekNumber()+1) + "\n\n" + lines.join("\n");

  var rec = records();
  var recent = Object.keys(rec).sort().reverse().slice(0,20);
  var retakeRows = recent.length ? recent.map(function(d){
    var r = rec[d];
    var bits = ["recap","math","think","eng"].filter(function(b){ return r[b]; })
      .map(function(b){ return BLOCKS[b].label+" "+r[b].got+"/"+r[b].total; }).join(", ");
    return '<tr><td>'+d+'</td><td>'+(bits||"—")+'</td>' +
      '<td><button class="ghost sm" data-retake="'+d+'">Clear</button></td></tr>';
  }).join("") : '<tr><td colspan="3">Nothing recorded yet.</td></tr>';

  app.innerHTML = topBar("For parents") + '<div class="sheet">' +
    '<section class="card"><div class="chead"><h2>Send to Dad</h2></div>' +
    '<p class="note">Copy this and paste it into Claude. It lists both girls, the last two weeks, every question they got wrong with what they wrote, and everything they typed.</p>' +
    '<div class="endbar"><button class="primary" id="copy">Copy report</button>' +
    '<button class="ghost" id="print">Print</button>' +
    '<button class="ghost" id="lvl">Change level</button></div>' +
    '<pre class="report" id="rep">'+esc(text)+'</pre></section>' +

    '<section class="card"><div class="chead"><h2>Make them retake a day</h2></div>' +
    '<p class="note">Clearing a day wipes '+esc(who())+'’s scores and answers for it. The problems stay the same, so they sit the identical sheet again.</p>' +
    '<div class="tablewrap"><table><thead><tr><th>Day</th><th>Result</th><th></th></tr></thead>' +
    '<tbody>'+retakeRows+'</tbody></table></div></section>' +

    '<section class="card"><div class="chead"><h2>Sending results to the Sheet</h2>' +
    '<span class="chip '+(apiUrl() ? "good" : "")+'">'+(apiUrl() ? "connected" : "not set up")+'</span></div>' +
    '<p class="note">Paste the web-app URL from Google Apps Script. Once set, every finished block is sent to your Drill Results sheet. Leave it blank to keep everything on this iPad.</p>' +
    '<input id="syncIn" type="url" placeholder="https://drills-api.....workers.dev" value="'+esc(store.get("apiUrl",""))+'">' +
    '<div class="endbar"><button class="primary" id="saveSync">Save</button>' +
    '<button class="ghost" id="testSync">Send a test</button>' +
    '<button class="ghost" id="pullRetake">Check for retakes</button>' +
    '<span class="chip" id="qchip">'+store.get("queue",[]).length+' waiting to send</span></div>' +
    '</section></div>';

  wireBar();
  $("#saveSync").addEventListener("click", function(){
    var v = $("#syncIn").value.trim();
    store.set("apiUrl", v);
    toast(v ? "Saved — results will be sent from now on" : "Sync turned off");
    screenParent();
  });
  $("#testSync").addEventListener("click", function(){
    if(!apiUrl()){ toast("Paste the URL and press Save first"); return; }
    queueAdd({ kid: who(), day: todayKey(), block: "test", got: 1, total: 1, secs: 0, level: levelNow(), misses: [] });
    flushQueue();
    toast("Test sent — look for a new row in the sheet");
  });
  $("#pullRetake").addEventListener("click", function(){
    if(!apiUrl()){ toast("Set the URL first"); return; }
    checkRetakes(function(n){
      toast(n ? n + " day(s) cleared for a retake" : "Nothing marked for a retake");
      if(n) screenParent();
    });
  });
  $("#print").addEventListener("click", function(){ window.print(); });
  $("#copy").addEventListener("click", function(){
    var btn = $("#copy");
    function done(){ btn.textContent = "Copied"; setTimeout(function(){ btn.textContent = "Copy report"; }, 1800); }
    function fallback(){
      var r = document.createRange(); r.selectNodeContents($("#rep"));
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = "Selected — press Copy";
    }
    try{ navigator.clipboard.writeText(text).then(done, fallback); }catch(e){ fallback(); }
  });
  $("#lvl").addEventListener("click", function(){
    var cur = store.get("levelOverride", 0);
    var next = cur >= 4 ? 0 : cur + 1;
    store.set("levelOverride", next);
    toast(next ? "Level locked to " + next : "Back to the automatic level (" + levelNow() + ")");
  });
  app.querySelectorAll("[data-retake]").forEach(function(b){
    b.addEventListener("click", function(){
      var d = b.dataset.retake;
      if(b.dataset.armed === "1"){
        var all = records(); delete all[d]; store.set("rec:" + who(), all);
        toast(d + " cleared — ready to retake");
        screenParent();
      } else {
        b.dataset.armed = "1"; b.textContent = "Tap again";
        setTimeout(function(){ if(b.dataset.armed){ b.dataset.armed = ""; b.textContent = "Clear"; } }, 4000);
      }
    });
  });
}

/* ---------- update button ----------
   Re-downloads every app file past the browser cache, refreshes the
   offline copy, then reloads. Offline, it leaves the saved copy alone. */
function getLatest(){
  var btn = $("#refresh");
  if(!navigator.onLine){ toast("No internet — connect to Wi-Fi and try again"); return; }
  if(btn){ btn.disabled = true; btn.textContent = "Updating…"; }
  var files = ["./", "./index.html", "./app.js", "./content.js", "./sw.js", "./manifest.webmanifest"];
  var swUpdate = ("serviceWorker" in navigator)
    ? navigator.serviceWorker.getRegistration().then(function(r){ return r ? r.update() : null; }).catch(function(){})
    : Promise.resolve();
  var pulls = Promise.all(files.map(function(f){
    return fetch(f + (f.indexOf("?") > -1 ? "&" : "?") + "t=" + Date.now(), { cache:"reload" })
      .then(function(res){
        if(!res.ok || !window.caches) return;
        return caches.keys().then(function(keys){
          return Promise.all(keys.map(function(k){
            return caches.open(k).then(function(c){ return c.put(f, res.clone()); });
          }));
        });
      }).catch(function(){});
  }));
  var done = false;
  function reload(){ if(done) return; done = true; location.reload(); }
  Promise.all([swUpdate, pulls]).then(reload, reload);
  setTimeout(reload, 8000);
}

function toast(msg){
  var d = document.createElement("div");
  d.className = "toast"; d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(function(){ d.remove(); }, 2600);
}

/* ---------- boot ---------- */
window.__drills = {
  genMultiply:genMultiply, genDivide:genDivide, genFractions:genFractions,
  genDecimals:genDecimals, genThinking:genThinking, pickEnglish:pickEnglish,
  genChallenge:genChallenge, CHALLENGES:CHALLENGES,
  seedFor:function(t,dayKey){ R = mulberry(hash((dayKey||"test") + "|" + t)); }
};
if(hasDOM && document.getElementById("app")){
  window.addEventListener("beforeunload", function(){ saveDraft(); stopTimer(); });
  window.addEventListener("pagehide", saveDraft);
  document.addEventListener("visibilitychange", function(){ if(document.hidden) saveDraft(); });
  window.addEventListener("online", flushQueue);
  pruneDrafts();
  if(who()){
    screenCalendar();
    flushQueue();
    checkRetakes(function(n){ if(n){ toast(n + " day(s) cleared — ready to retake"); screenCalendar(); } });
  } else {
    screenProfile();
  }
}

})();
