/* ============================================================
   Daily Drills — engine
   Everything is seeded from the date, so both iPads get the
   same problems on the same day, and a new set appears each day.
   ============================================================ */
(function(){
"use strict";

/* ---------- configuration you may want to change ---------- */
var START_DATE = "2026-10-27";   // Monday the programme begins. Week 1 starts here.

/* Google Apps Script web-app URL. Blank = results stay on the iPad only.
   Paste the /exec URL from Deploy → New deployment → Web app. */
var SYNC_URL = "https://script.google.com/macros/s/AKfycbycGuMQvp88y6-akTuhlSIgdoSCLU9QRn2qWJ2HyHLzWdm_dPjbtlHvJQNZcZCseno/exec";
var BLOCKS = {
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
  var items = [], dens;
  if(L === 1){
    dens = [2,3,4,5,6,8];
    collect(3, function(){ var d=pick(dens), w=ri(1,6), n=ri(1,d-1);
      return {q:w+" + "+n+"/"+d, w:w, n:n, d:d, kind:"frac"}; }, items);
    collect(3, function(){ var d=pick(dens), a=ri(1,4), b=ri(1,4), x=ri(1,d-1), y=ri(1,d-1);
      var t=x+y;
      return {q:a+" "+x+"/"+d+"  +  "+b+" "+y+"/"+d, w:a+b+Math.floor(t/d), n:t%d, d:d, kind:"frac"}; }, items);
  } else if(L === 2){
    dens = [3,4,5,6,8,10];
    collect(3, function(){ var d=pick(dens), a=ri(1,5), b=ri(1,4), x=ri(1,d-1), y=ri(1,d-1);
      var t=x+y;
      return {q:a+" "+x+"/"+d+"  +  "+b+" "+y+"/"+d, w:a+b+Math.floor(t/d), n:t%d, d:d, kind:"frac"}; }, items);
    collect(3, function(){ var d=pick(dens), bigW=ri(3,8), smW=ri(1,2), x=ri(1,d-1), y=ri(1,d-1);
      var tot = bigW*d + x - (smW*d + y);
      if(tot <= 0){ bigW += 2; tot = bigW*d + x - (smW*d + y); }
      return {q:bigW+" "+x+"/"+d+"  −  "+smW+" "+y+"/"+d, w:Math.floor(tot/d), n:tot%d, d:d, kind:"frac"}; }, items);
  } else if(L === 3){
    collect(3, function(){
      var base = pick([2,3,4,5,6,8]), num = ri(1, base-1), guard = 0;
      while(gcd(num, base) !== 1 && guard++ < 20){ num = ri(1, base-1); }
      if(gcd(num, base) !== 1){ base = 5; num = ri(1,4); }
      var mult = ri(2,6);
      return {q:(num*mult)+"/"+(base*mult)+"  in simplest form", w:0, n:num, d:base, kind:"frac", simplify:true};
    }, items);
    collect(3, function(){
      var d = pick([4,6,8,10,12]), a=ri(1,4), b=ri(1,4), x=ri(1,d-1), y=ri(1,d-1);
      var t=x+y, W=a+b+Math.floor(t/d), N=t%d, g=N?gcd(N,d):1;
      return {q:a+" "+x+"/"+d+"  +  "+b+" "+y+"/"+d+"  (simplify)", w:W, n:N/g, d:d/g, kind:"frac"};
    }, items);
  } else {
    var pairs = [[2,3],[3,4],[2,5],[4,6],[3,8],[5,10],[2,6],[4,10]];
    collect(4, function(){
      var pr = pick(pairs), dA = pr[0], dB = pr[1];
      var wA = ri(1,4), wB = ri(1,4), nA = ri(1,dA-1), nB = ri(1,dB-1);
      var LC = dA*dB/gcd(dA,dB);
      var tot = nA*(LC/dA) + nB*(LC/dB);
      var W = wA + wB + Math.floor(tot/LC), N = tot % LC;
      var g = N ? gcd(N, LC) : 1;
      return {q:wA+" "+nA+"/"+dA+"  +  "+wB+" "+nB+"/"+dB, w:W, n:N/g, d:N?LC/g:LC, kind:"frac"};
    }, items);
    collect(2, function(){
      var dC = pick([2,3,4,5,6,8]), nC = ri(1,dC-1), wholeC = ri(2,9);
      var totC = nC * wholeC, gC = gcd(totC, dC);
      return {q:nC+"/"+dC+"  ×  "+wholeC, w:Math.floor((totC/gC)/(dC/gC)), n:(totC/gC)%(dC/gC), d:dC/gC, kind:"frac"};
    }, items);
  }
  var notes = {
    1:"Same bottom number each time. Add the tops, then trade 4/4 or 5/5 for a whole.",
    2:"Adding and subtracting. For subtraction you may need to borrow a whole first.",
    3:"Simplify every answer. Divide top and bottom by the biggest number that fits both.",
    4:"Different bottom numbers. Find a common denominator first, then add."
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
   Everything here fails silently; the app works with SYNC_URL blank.
   ============================================================ */
function syncUrl(){ return store.get("syncUrl", "") || SYNC_URL; }

function queueAdd(payload){
  var q = store.get("queue", []);
  q.push(payload);
  store.set("queue", q.slice(-60));
}

/* text/plain keeps the browser from sending a CORS preflight Apps Script can't answer */
function postOne(payload){
  return fetch(syncUrl(), {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
}

function flushQueue(){
  if(!syncUrl()) return;
  var q = store.get("queue", []);
  if(!q.length) return;
  var next = q[0];
  postOne(next).then(function(){
    var cur = store.get("queue", []);
    cur.shift();
    store.set("queue", cur);
    if(cur.length) setTimeout(flushQueue, 400);
  }).catch(function(){ /* stays queued for next time */ });
}

function sendResult(block, got, total, secs, misses){
  var r = records()[todayKey()] || {};
  var payload = {
    kid: who(), day: todayKey(), block: block,
    got: got, total: total, secs: secs, level: levelNow(),
    misses: (misses || []).slice(0, 60),
    writePrompt: r.writePrompt || "", writeAns: r.writeAns || "",
    openAns: r.openAns || "", vocabUse: r.vocabUse || ""
  };
  if(!syncUrl()) return;
  queueAdd(payload);
  flushQueue();
}

/* ask the sheet which days the parent has marked for a retake */
function checkRetakes(done){
  if(!syncUrl() || !who()){ if(done) done(0); return; }
  var url = syncUrl() + (syncUrl().indexOf("?") > -1 ? "&" : "?") + "kid=" + encodeURIComponent(who());
  fetch(url).then(function(r){ return r.json(); }).then(function(d){
    var list = (d && d.retake) || [], cleared = 0;
    if(!list.length){ if(done) done(0); return; }
    var all = records();
    list.forEach(function(item){
      if(!all[item.day]) return;
      if(item.block && item.block !== "ALL"){
        var b = item.block.toLowerCase();
        delete all[item.day][b];
        delete all[item.day]["miss:"+b];
      } else {
        delete all[item.day];
      }
      cleared++;
    });
    if(cleared){
      store.set("rec:" + who(), all);
      list.forEach(function(item){ queueAdd({ ack: true, kid: who(), day: item.day }); });
      flushQueue();
    }
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
  var h = $("#home"); if(h) h.addEventListener("click", function(){ stopTimer(); screenCalendar(); });
  var b = $("#back"); if(b) b.addEventListener("click", function(){ stopTimer(); (onBack || screenCalendar)(); });
}

/* ---------- calendar (home) ---------- */
function monthLabel(d){ return d.toLocaleDateString(undefined, { month:"long", year:"numeric" }); }

function screenCalendar(){
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
      var done = ["math","think","eng"].filter(function(b){ return r[b]; }).length;
      var cls = "day";
      if(other) cls += " other";
      if(k === today) cls += " today";
      if(k > today) cls += " ahead";
      if(done === 3) cls += " full";
      else if(done > 0) cls += " part";
      var dots = ["math","think","eng"].map(function(b){
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
      '<button class="ghost" id="switch">Switch</button></div>' +
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
  $("#report").addEventListener("click", screenReport);
  $("#parent").addEventListener("click", screenParent);
}

/* ---------- the three blocks for one day ---------- */
function blockCard(key){
  var b = BLOCKS[key], r = resultFor(key);
  var right = r ? '<span class="chip '+(r.got/r.total >= 0.8 ? "good" : "work")+'">'+r.got+" / "+r.total+'</span>'
                : '<span class="chip">'+b.mins+' min</span>';
  return '<button class="block '+(r ? "done" : "todo")+'" data-block="'+key+'">' +
    '<span class="glyph">'+b.icon+'</span>' +
    '<span class="btext"><strong>'+b.label+'</strong><small>' +
    (r ? "Finished in "+fmt(r.secs).replace("+","")+" — tap to open" : b.mins+" minutes") +
    '</small></span>' + right + '</button>';
}

function screenDay(){
  stopTimer();
  var L = levelNow(), day = daysSinceStart()+1, k = todayKey();
  var ahead = k > realTodayKey();
  app.innerHTML =
    topBar(prettyDate(k)) +
    '<div class="sheet">' +
      '<p class="dayline">Day '+(day>0?day:1)+' · Level '+L +
        (ahead ? ' · <span class="aheadtag">this day is still ahead</span>' : '') + '</p>' +
      '<div class="blocks">' + blockCard("math") + blockCard("think") + blockCard("eng") + '</div>' +
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

/* ---------- sheet shell ---------- */
function shell(title, mins, bodyHTML, onMount){
  app.innerHTML = topBar(title, { back:true, clock:true }) + '<div class="sheet">' + bodyHTML + '</div>';
  wireBar(screenDay);
  startTimer(mins, function(s){
    var c = $("#clock"); if(!c) return;
    c.textContent = fmt(s);
    c.className = "clock" + (s <= 0 ? " over" : (s <= 300 ? " soon" : ""));
  });
  if(onMount) onMount();
  wireLiveClear();
}

/* typing in a marked box clears its own mark */
function wireLiveClear(){
  app.addEventListener("input", function(e){
    var t = e.target;
    if(t && t.tagName === "INPUT"){ t.classList.remove("ok","no"); }
  });
  app.addEventListener("change", function(e){
    var t = e.target;
    if(t && t.type === "radio"){
      var box = t.closest(".opts");
      if(box) box.querySelectorAll(".opt").forEach(function(l){ l.classList.remove("ok","no"); });
    }
  });
}

/* ---------- renderers ---------- */
function numInput(ans, label){
  return '<input class="ans" type="text" inputmode="numeric" autocomplete="off" data-a="'+esc(ans)+'" aria-label="'+esc(label)+'">';
}
function clearBar(target){
  return '<div class="clearrow"><button class="ghost sm" data-clear="'+target+'">Clear this section</button></div>';
}
function sectionHTML(sec, idPrefix){
  var rows = sec.items.map(function(it, i){
    var q = esc(it.q);
    if(it.kind === "divr"){
      return '<div class="tile"><span class="q">'+q+' =</span>' +
        '<span class="slot">'+numInput(it.a, it.q)+'</span>' +
        '<span class="rlab">R</span><span class="slot sm">' +
        '<input class="ans" type="text" inputmode="numeric" data-a="'+it.r+'" data-opt="1" aria-label="remainder"></span></div>';
    }
    if(it.kind === "frac"){
      return '<div class="tile col"><span class="q">'+q+' =</span>' +
        '<span class="fracbox" data-w="'+it.w+'" data-n="'+it.n+'" data-d="'+it.d+'"' +
          (/simplif|simplest/i.test(it.q) ? ' data-simp="1"' : '') + '>' +
          (it.simplify ? "" : '<input class="fw" type="text" inputmode="numeric" placeholder="whole" aria-label="whole number">') +
          '<span class="stack"><input class="fn" type="text" inputmode="numeric" aria-label="numerator">' +
          '<span class="bar2"></span><input class="fd" type="text" inputmode="numeric" aria-label="denominator"></span>' +
        '</span></div>';
    }
    return '<div class="tile"><span class="q">'+q+' =</span><span class="slot">'+numInput(it.a, it.q)+'</span></div>';
  }).join("");
  return '<section class="card" data-sec="'+idPrefix+'"><div class="chead"><h2>'+esc(sec.title)+'</h2></div>' +
    '<p class="note">'+esc(sec.note)+'</p>' +
    '<div class="grid'+(sec.items.some(function(it){ return it.kind==="divr"||it.kind==="frac"; }) ? " wide" : "")+'">'+rows+'</div>' +
    clearBar(idPrefix) + '</section>';
}

function openBlock(key){
  if(key === "math") return blockMath();
  if(key === "think") return blockThink();
  return blockEnglish();
}
function endBar(){
  return '<div class="endbar">' +
    '<button class="primary" id="check">Check my answers</button>' +
    '<button class="ghost" id="reveal">Show answers</button>' +
    '<button class="ghost" id="clearAll">Clear everything</button>' +
    '<span class="score" id="score">—</span></div>';
}

/* ---------- MATH ---------- */
function blockMath(){
  var L = levelNow();
  seedFor("math");
  var secs = [genMultiply(L), genDivide(L), genFractions(L)];
  if(L >= 2) secs.push(genDecimals(L));
  var html = secs.map(function(s,i){ return sectionHTML(s, "m"+i); }).join("") + endBar();
  shell("Math", BLOCKS.math.mins, html, function(){ wireSheet("math"); });
}

/* ---------- THINKING ---------- */
function blockThink(){
  var L = levelNow();
  seedFor("think");
  var items = genThinking(L);
  var rows = items.map(function(it,i){
    return '<div class="prob"><p class="pq"><b>'+(i+1)+'.</b> '+esc(it.q)+'</p>' +
      '<div class="prow">'+numInput(it.a, "Answer "+(i+1))+
      '<button class="ghost sm" data-hint="'+i+'">Hint</button></div>' +
      '<p class="hint" id="h'+i+'" hidden>'+esc(it.hint)+(it.aNote ? " " + esc(it.aNote) : "")+'</p></div>';
  }).join("");
  var html = '<section class="card" data-sec="t0"><div class="chead"><h2>Thinking problems</h2></div>' +
    '<p class="note">Read each one twice. Work it on paper, then type the number only. Use a hint if you are stuck for more than two minutes.</p>' +
    rows + clearBar("t0") + '</section>' + endBar();
  shell("Thinking", BLOCKS.think.mins, html, function(){
    app.querySelectorAll("[data-hint]").forEach(function(b){
      b.addEventListener("click", function(){
        var h = $("#h"+b.dataset.hint); h.hidden = !h.hidden;
        b.textContent = h.hidden ? "Hint" : "Hide";
      });
    });
    wireSheet("think");
  });
}

/* ---------- ENGLISH ---------- */
function blockEnglish(){
  var L = levelNow();
  var E = pickEnglish(L);
  var saved = records()[todayKey()] || {};

  var spellRows = E.spelling.map(function(pair, i){
    var blanked = pair[1].replace(new RegExp(pair[0], "ig"), "______");
    return '<div class="srow"><span class="idx">'+(i+1)+'</span>' +
      '<button class="speak" data-say="'+esc(pair[0]+". "+pair[1])+'" aria-label="Hear word '+(i+1)+'">🔊</button>' +
      '<input class="ans word" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" data-a="'+esc(pair[0])+'" aria-label="Spelling '+(i+1)+'">' +
      '<span class="clue">'+esc(blanked)+'</span></div>';
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
    '<p class="note">Tap the speaker, listen to the word and the sentence, then type it. Do not look at the clue first.</p>' +
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
    p.body.map(function(t){ return "<p>"+esc(t)+"</p>"; }).join("") + '</article>' +
    mcRows(p.qs, "r") +
    '<div class="prob"><p class="pq"><b>5.</b> '+esc(p.open.q)+'</p>' +
    '<textarea id="openAns" rows="4" placeholder="Answer in two or three sentences...">'+esc(saved.openAns||"")+'</textarea>' +
    '<div class="model" id="openModel" hidden><strong>A good answer says:</strong> '+esc(p.open.model)+'</div></div>' +
    clearBar("e3") + '</section>' +

    '<section class="card" data-sec="e4"><div class="chead"><h2>Writing</h2><span class="chip">10 min</span></div>' +
    '<p class="note">'+esc(E.writing.p)+'</p>' +
    '<textarea id="writeAns" rows="10" placeholder="Start writing here. Aim for at least six sentences.">'+esc(saved.writeAns||"")+'</textarea>' +
    '<p class="count" id="wcount">0 words</p>' + clearBar("e4") + '</section>' + endBar();

  shell("English", BLOCKS.eng.mins, html, function(){
    app.querySelectorAll(".speak").forEach(function(b){
      b.addEventListener("click", function(){ say(b.dataset.say); });
    });
    var wa = $("#writeAns"), wc = $("#wcount");
    function count(){
      var n = wa.value.trim() ? wa.value.trim().split(/\s+/).length : 0;
      wc.textContent = n + " word" + (n===1?"":"s");
    }
    wa.addEventListener("input", count); count();
    wireSheet("eng", function(){
      saveDetail("writeAns", wa.value);
      saveDetail("openAns", $("#openAns").value);
      saveDetail("vocabUse", $("#vocabUse").value);
      saveDetail("writePrompt", E.writing.p);
      saveDetail("readTitle", p.title);
      var m = $("#openModel"); if(m) m.hidden = false;
    });
  });
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
  });
  $("#clearAll").addEventListener("click", function(){
    clearScope(app, true);
    var el = $("#score"); el.textContent = "—"; el.className = "score";
  });
  app.querySelectorAll("[data-clear]").forEach(function(b){
    b.addEventListener("click", function(){
      clearScope(app.querySelector('[data-sec="'+b.dataset.clear+'"]'), false);
    });
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
    else misses.push({ q: inp.getAttribute("aria-label") || "", gave: inp.value, want: want });
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
    [fw, fn, fd].forEach(function(el){ if(el){ el.classList.toggle("ok", right); el.classList.toggle("no", !right); } });
    if(right) got++;
    else {
      var qt = box.parentNode.querySelector(".q");
      misses.push({ q: qt ? qt.textContent : "fraction",
                    gave: (fw ? fw.value+" " : "") + fn.value + "/" + fd.value,
                    want: (W ? W+" " : "") + (N ? N+"/"+D : "") });
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
                       want: labels[+want].textContent.trim() });
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
    fn.value = n === "0" ? "" : n;
    fd.value = n === "0" ? "" : box.dataset.d;
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
    ["math","think","eng"].forEach(function(b){
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
      ["math","think","eng"].forEach(function(b){
        if(r[b]) bits.push(BLOCKS[b].label+" "+r[b].got+"/"+r[b].total+" ("+Math.round(r[b].secs/60)+"m)");
      });
      lines.push(d + " — " + (bits.join(", ") || "nothing recorded"));
      ["math","think","eng"].forEach(function(b){
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
    var bits = ["math","think","eng"].filter(function(b){ return r[b]; })
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
    '<span class="chip '+(syncUrl() ? "good" : "")+'">'+(syncUrl() ? "connected" : "not set up")+'</span></div>' +
    '<p class="note">Paste the web-app URL from Google Apps Script. Once set, every finished block is sent to your Drill Results sheet. Leave it blank to keep everything on this iPad.</p>' +
    '<input id="syncIn" type="url" placeholder="https://script.google.com/macros/s/..../exec" value="'+esc(store.get("syncUrl",""))+'">' +
    '<div class="endbar"><button class="primary" id="saveSync">Save</button>' +
    '<button class="ghost" id="testSync">Send a test</button>' +
    '<button class="ghost" id="pullRetake">Check for retakes</button>' +
    '<span class="chip" id="qchip">'+store.get("queue",[]).length+' waiting to send</span></div>' +
    '</section></div>';

  wireBar();
  $("#saveSync").addEventListener("click", function(){
    var v = $("#syncIn").value.trim();
    store.set("syncUrl", v);
    toast(v ? "Saved — results will be sent from now on" : "Sync turned off");
    screenParent();
  });
  $("#testSync").addEventListener("click", function(){
    if(!syncUrl()){ toast("Paste the URL and press Save first"); return; }
    queueAdd({ kid: who(), day: todayKey(), block: "test", got: 1, total: 1, secs: 0, level: levelNow(), misses: [] });
    flushQueue();
    toast("Test sent — look for a new row in the sheet");
  });
  $("#pullRetake").addEventListener("click", function(){
    if(!syncUrl()){ toast("Set the URL first"); return; }
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
  seedFor:function(t,dayKey){ R = mulberry(hash((dayKey||"test") + "|" + t)); }
};
if(hasDOM && document.getElementById("app")){
  window.addEventListener("beforeunload", stopTimer);
  window.addEventListener("online", flushQueue);
  if(who()){
    screenCalendar();
    flushQueue();
    checkRetakes(function(n){ if(n){ toast(n + " day(s) cleared — ready to retake"); screenCalendar(); } });
  } else {
    screenProfile();
  }
}

})();
