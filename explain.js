/* ============================================================
   Explain - "Show me how" for a question she got wrong.

   Explain.build(miss, history, tip) turns one miss into a short
   lesson: a few steps, each with a picture where a picture helps,
   and - when she has made the same kind of mistake before - a note
   from a teacher that names the earlier tries by date.

   miss    { q, gave, want, block, date, sol? }
   history [ { q, gave, want, block, date } ]  every miss we know of
   tip     a line the overnight review wrote about this question, or ""

   Everything is worked out from the question text, so it works for
   days from before this file existed. Nothing here touches storage.
   ============================================================ */
(function(root){
"use strict";

/* ---------- small helpers ---------- */
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
  return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]; }); }
function sp(s){ return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
function gcd(a, b){ a = Math.abs(a); b = Math.abs(b); while(b){ var t = b; b = a % b; a = t; } return a || 1; }
var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function day(d){ var p = String(d || "").split("-"); return p.length === 3 ? MONTHS[+p[1]-1] + " " + (+p[2]) : String(d || ""); }
function fr(w, n, d){ return (w ? w + (n ? " " : "") : "") + (n ? n + "/" + d : (w ? "" : "0")); }
function b(x){ return "<b>" + esc(x) + "</b>"; }
function ord(n){ return n === 2 ? "2nd" : n === 3 ? "3rd" : n + "th"; }

/* "5 3/4", "3/12", " 21/2", "6", "4/4;" -> {w,n,d,blankWhole} or null */
function parseFrac(s){
  var raw = String(s == null ? "" : s), t = sp(raw).replace(/[;.,]+$/, "");
  var m = t.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if(m) return { w: +(m[1] || 0), n: +m[2], d: +m[3], blankWhole: !m[1] && /^\s/.test(raw) };
  m = t.match(/^(\d+)$/);
  return m ? { w: +m[1], n: 0, d: 1, blankWhole: false } : null;
}
function val(f){ return f ? f.w + (f.d ? f.n / f.d : 0) : NaN; }

/* ---------- pictures (inline SVG, coloured from the page's own theme) ---------- */
var C = { ink:"var(--ink)", acc:"var(--accent)", soft:"var(--accent-soft)", good:"var(--good)",
          bad:"var(--bad)", amber:"var(--amber)", paper:"var(--surface)", muted:"var(--muted)" };
function svg(w, h, inner){
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" style="max-width:100%;height:auto">' + inner + '</svg>';
}
function rect(x, y, w, h, fill, stroke){
  return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="2" style="fill:'+fill+';stroke:'+(stroke||C.ink)+';stroke-width:1.5"/>';
}
function line(x1, y1, x2, y2, col, wd){
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" style="stroke:'+(col||C.ink)+';stroke-width:'+(wd||2)+'"/>';
}
function txt(x, y, t, size, col, anchor){
  return '<text x="'+x+'" y="'+y+'" text-anchor="'+(anchor||"middle")+'" style="font:700 '+(size||15)+'px Nunito,system-ui,sans-serif;fill:'+(col||C.ink)+'">'+esc(t)+'</text>';
}
function circle(x, y, r, fill, stroke){
  return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" style="fill:'+fill+';stroke:'+(stroke||C.acc)+';stroke-width:2"/>';
}
/* one bar cut into `parts`, the first `shade` coloured, the last `cross` of those crossed out */
function bar(x, y, w, parts, shade, opt){
  opt = opt || {}; var h = opt.h || 30, cw = w / parts, s = "";
  for(var i = 0; i < parts; i++){
    var on = i < shade, xx = x + i * cw;
    s += rect(xx, y, cw, h, on ? (opt.col || C.acc) : C.paper);
    if(opt.cross && on && i >= shade - opt.cross) s += line(xx + 3, y + 3, xx + cw - 3, y + h - 3, C.bad, 3);
  }
  return s;
}
/* a mixed number as whole bars plus one cut bar. Too many wholes are drawn as a labelled block. */
function mixedPic(w, n, d, opt){
  opt = opt || {}; var s = "", x = 0, bw = 54, crossW = opt.crossW || 0, crossN = opt.crossN || 0;
  var shown = Math.min(w, 6);
  for(var i = 0; i < shown; i++){
    s += rect(x, 6, bw - 8, 30, C.acc);
    if(i >= shown - crossW) s += line(x + 3, 9, x + bw - 11, 33, C.bad, 3);
    x += bw;
  }
  if(w > shown){ s += txt(x + 10, 27, "… " + w + " wholes", 13, C.muted, "start"); x += 90; }
  if(n || d > 1){ s += bar(x, 6, Math.min(30 * d, 200), d, n, { cross: crossN }); x += Math.min(30 * d, 200); }
  if(opt.label) s += txt(0, 56, opt.label, 13, C.muted, "start");
  return svg(Math.max(x, 200) + 4, opt.label ? 62 : 42, s);
}
/* answer boxes the way the app shows them: whole box in front, fraction stacked */
function boxes(w, n, d, bad){
  var s = rect(4, 4, 46, 58, C.paper, bad ? C.bad : C.good) + txt(27, 41, w === "" ? "" : w, 22, bad ? C.bad : C.ink) +
    txt(27, 78, bad ? "empty!" : "whole", 11, bad ? C.bad : C.muted) +
    rect(60, 4, 44, 26, C.paper) + txt(82, 23, n, 15) + rect(60, 36, 44, 26, C.paper) + txt(82, 55, d, 15);
  return svg(110, 84, s);
}
function twoBoxes(right, wrong){
  return '<div style="display:flex;gap:22px;align-items:center;justify-content:center;flex-wrap:wrap">' +
    '<div style="text-align:center">' + right + '<div style="font-size:.8rem;color:var(--good);font-weight:700">✓ like this</div></div>' +
    (wrong ? '<div style="text-align:center">' + wrong + '<div style="font-size:.8rem;color:var(--bad);font-weight:700">✗ not this</div></div>' : "") +
    '</div>';
}
/* `groups` circles, each holding `each` (as dots when small, else a number) */
function groupsPic(groups, each, extra){
  var shown = Math.min(groups, 8), r = 30, gap = 78, s = "";
  for(var i = 0; i < shown; i++){
    var cx = 40 + i * gap;
    s += circle(cx, 40, r, C.soft);
    if(each <= 9){
      for(var k = 0; k < each; k++){
        var a = (k / each) * Math.PI * 2, rr = each === 1 ? 0 : 16;
        s += '<circle cx="'+(cx + rr * Math.cos(a))+'" cy="'+(40 + rr * Math.sin(a))+'" r="5" style="fill:'+C.acc+'"/>';
      }
    } else s += txt(cx, 46, each, 17, C.acc);
  }
  var w = 40 + (shown - 1) * gap + 40;
  if(groups > shown){ s += txt(w + 6, 46, "… " + groups + " groups", 13, C.muted, "start"); w += 100; }
  if(extra){
    for(var e = 0; e < extra; e++) s += '<circle cx="'+(w + 14 + e * 16)+'" cy="40" r="6" style="fill:'+C.amber+'"/>';
    s += txt(w + 8, 82, "left over", 12, C.amber, "start"); w += 30 + extra * 16;
  }
  return svg(w + 10, 90, s);
}
/* a rows × cols array of dots */
function arrayPic(rows, cols){
  var s = "", g = 18;
  for(var r = 0; r < rows; r++) for(var c = 0; c < cols; c++)
    s += '<circle cx="'+(14 + c * g)+'" cy="'+(14 + r * g)+'" r="6" style="fill:'+(c < 5 ? C.acc : C.amber)+'"/>';
  return svg(28 + (cols - 1) * g, 28 + (rows - 1) * g, s);
}
function sum(t, col){ return svg(Math.max(160, t.length * 13), 44, txt(Math.max(160, t.length * 13) / 2, 30, t, 22, col || C.good)); }
function rectPic(l, w, mode){
  var W = Math.min(260, 40 + l * 12), H = Math.min(140, 30 + w * 9), s = rect(30, 14, W, H, "var(--accent-soft)", C.acc);
  s += txt(30 + W / 2, 10, l + " cm", 13, C.acc) + txt(20, 14 + H / 2, w + " cm", 13, C.acc, "end");
  if(mode === "perim") s += txt(30 + W / 2, 14 + H / 2 + 5, "walk all the way round", 13, C.muted);
  else s += txt(30 + W / 2, 14 + H / 2 + 5, l + " rows of " + w + " squares", 13, C.muted);
  return svg(W + 60, H + 30, s);
}

/* ---------- the explainers, one per kind of question ---------- */
var R = [];   /* [ test(q) -> match, make(match, miss) -> lesson ] */
function rule(re, fn){ R.push([re, fn]); }

/* mixed numbers: 5 3/4 − 1 1/4 (simplify) */
rule(/^(?:(\d+) )?(\d+)\/(\d+) ([+−-]) (?:(\d+) )?(\d+)\/(\d+)(?: \(simplify\))?(?: =)?$/, function(m, miss){
  var w1 = +(m[1]||0), n1 = +m[2], d1 = +m[3], op = m[4] === "+" ? "+" : "−", w2 = +(m[5]||0), n2 = +m[6], d2 = +m[7];
  var steps = [], W, N, d = d1;
  if(d1 !== d2){
    d = d1 * d2 / gcd(d1, d2);
    var o1 = n1, o2 = n2; n1 = n1 * d / d1; n2 = n2 * d / d2;
    steps.push({ h:"Make the pieces the same size", p:"You can only add or take away pieces of the same size. "+d1+"ths and "+d2+"ths both fit into "+b(d+"ths")+": "+
      o1+"/"+d1+" = "+b(n1+"/"+d)+", and "+o2+"/"+d2+" = "+b(n2+"/"+d)+".",
      pic: svg(320, 84, bar(50,4,240,d1,o1) + bar(50,46,240,d,n1) + txt(22,24,o1+"/"+d1,13) + txt(22,66,n1+"/"+d,13)) });
  }
  if(op === "+"){
    W = w1 + w2; N = n1 + n2;
    steps.push({ h:"Wholes with wholes, pieces with pieces",
      p:"A mixed number is two things: whole bars, and some pieces of one more bar. Add the wholes: " + b(w1+" + "+w2+" = "+W) +
        ". Add the pieces: " + b(n1+"/"+d+" + "+n2+"/"+d+" = "+N+"/"+d) + ". Only the top number changes - the pieces are still "+d+"ths.",
      pic: mixedPic(w1, n1, d, { label: fr(w1,n1,d) }) + mixedPic(w2, n2, d, { label: "+ " + fr(w2,n2,d) }) });
    if(N >= d){
      steps.push({ h:"Too many pieces? Make a whole", p:N+"/"+d+" is more than one whole bar, because "+d+"/"+d+" is a whole. So "+N+"/"+d+" = "+b("1 and "+(N-d)+"/"+d)+". Move that 1 over to the wholes: "+W+" + 1 = "+(W+1)+".",
        pic: svg(Math.min(30*d,200)*2+30, 42, bar(0,6,Math.min(30*d,200),d,d) + bar(Math.min(30*d,200)+20,6,Math.min(30*d,200),d,N-d)) });
      W += 1; N -= d;
    }
  } else {
    W = w1 - w2; N = n1 - n2;
    if(N < 0){
      steps.push({ h:"Not enough pieces? Break a whole", p:"You cannot take "+n2+" pieces from "+n1+". Break one of the "+w1+" wholes into "+d+" pieces: "+fr(w1,n1,d)+" is the same as "+b(fr(w1-1,n1+d,d))+".",
        pic: mixedPic(w1-1, n1+d > d ? d : n1+d, d, { label: "one whole broken into "+d+" pieces" }) });
      W = w1 - 1 - w2; N = n1 + d - n2;
    }
    steps.push({ h:"Wholes from wholes, pieces from pieces",
      p:"Take away the wholes: "+b((W+w2)+" − "+w2+" = "+W)+". Take away the pieces: "+b((N+n2)+"/"+d+" − "+n2+"/"+d+" = "+N+"/"+d)+".",
      pic: mixedPic(W + w2, Math.min(N + n2, d), d, { crossW: w2, crossN: n2, label: "cross out "+fr(w2,n2,d) }) });
  }
  var g = gcd(N, d), mustSimp = /simplify/.test(miss.q);
  if(N && g > 1 && !mustSimp){
    steps.push({ h:"You could make it simpler", p:N+"/"+d+" is the same as "+(N/g)+"/"+(d/g)+". Either one is right here.", pic:"" });
  } else if(N && g > 1){
    steps.push({ h:"Make the pieces as simple as you can",
      p:"Can the top and bottom both be shared by the same number? "+N+" and "+d+" can both be divided by "+g+": "+b(N+"/"+d+" = "+(N/g)+"/"+(d/g))+". Same amount, bigger pieces.",
      pic: svg(Math.min(30*d,240)+40, 84, bar(30,4,Math.min(30*d,240),d,N) + bar(30,46,Math.min(30*d,240),d/g,N/g) + txt(14,24,N+"/"+d,13,C.ink) + txt(14,66,(N/g)+"/"+(d/g),13,C.ink)) });
    N /= g; d /= g;
  }
  steps.push({ h:"Each number in its own box", p:"The whole number goes in the "+b("big box in front")+". Only the pieces go in the fraction. Answer: "+b(fr(W,N,d))+".",
    pic: twoBoxes(boxes(W, N || "", N ? d : ""), wholeInTop(miss) ? boxes("", (parseFrac(miss.gave)||{}).n, (parseFrac(miss.gave)||{}).d, true) : "") });
  return { title: sp(miss.q).replace(/ =$/, ""), steps: steps, topic: "mixed numbers", ans: fr(W, N, d) };
});

/* 1/4 = ?/8 */
rule(/^(\d+)\/(\d+) = \?\/(\d+)$/, function(m, miss){
  var n = +m[1], d = +m[2], D = +m[3], k = D / d, N = n * k;
  if(k !== Math.round(k)) return null;
  return { title: sp(miss.q), topic: "equivalent fractions", ans: N + "/" + D, steps: [
    { h:"Draw it", p:n+"/"+d+" means: cut a bar into "+d+" and colour "+n+".", pic: svg(280, 42, bar(20, 6, 240, d, n)) },
    { h:"Cut every piece into "+k, p:"Now there are "+D+" pieces. The coloured part is "+b("the same size")+", but it is now "+b(N)+" pieces.",
      pic: svg(300, 84, bar(40, 4, 240, d, n) + bar(40, 46, 240, D, N) + txt(18, 24, n+"/"+d, 13) + txt(18, 66, N+"/"+D, 13)) },
    { h:"The quick way", p:"The bottom went from "+d+" to "+D+" - that is "+b("× "+k)+". Do the same to the top: "+n+" × "+k+" = "+b(N)+". The top is how many pieces are coloured, so it can only be "+D+" if the whole bar is coloured.",
      pic: svg(260, 90, txt(60,35,n,26) + txt(60,75,d,26) + line(40,45,80,45) + txt(200,35,N,26,C.good) + txt(200,75,D,26) + line(180,45,220,45) + txt(130,30,"× "+k+" →",16,C.acc) + txt(130,72,"× "+k+" →",16,C.acc)) }
  ]};
});

/* 4/10 in simplest form */
rule(/^(\d+)\/(\d+) in simplest form$/, function(m, miss){
  var n = +m[1], d = +m[2], g = gcd(n, d);
  return { title: sp(miss.q), topic: "simplifying fractions", ans: (n/g)+"/"+(d/g), steps: [
    { h:"Find a number that goes into both", p:"Which numbers divide "+n+" and "+d+" exactly? The biggest one is "+b(g)+".", pic:"" },
    { h:"Divide top and bottom by it", p:n+" ÷ "+g+" = "+(n/g)+", and "+d+" ÷ "+g+" = "+(d/g)+". So "+b(n+"/"+d+" = "+(n/g)+"/"+(d/g))+".",
      pic: svg(Math.min(24*d,280)+50, 84, bar(40,4,Math.min(24*d,280),d,n) + bar(40,46,Math.min(24*d,280),d/g,n/g) + txt(18,24,n+"/"+d,13) + txt(18,66,(n/g)+"/"+(d/g),13)) },
    { h:"Check", p:"Can "+(n/g)+" and "+(d/g)+" both be divided by anything except 1? No - so it is as simple as it gets.", pic:"" }
  ]};
});

/* 13/3 as a mixed number */
rule(/^(\d+)\/(\d+) as a mixed number$/, function(m, miss){
  var n = +m[1], d = +m[2], W = Math.floor(n / d), N = n % d;
  return { title: sp(miss.q), topic: "improper fractions", ans: fr(W, N, d), steps: [
    { h:"How many wholes?", p:"Every "+d+" pieces make one whole. How many groups of "+d+" fit in "+n+"? "+d+" × "+W+" = "+(d*W)+", so "+b(W+" wholes")+".", pic: groupsPic(W, d, N) },
    { h:"What is left?", p:n+" − "+(d*W)+" = "+b(N)+" pieces left over, so "+b(N+"/"+d)+".", pic:"" },
    { h:"Write it", p:"Whole number in the front box, the left-over pieces in the fraction: "+b(fr(W,N,d))+".", pic: boxes(W, N, d) }
  ]};
});

/* 6 + 1/2 */
rule(/^(\d+) \+ (\d+)\/(\d+)(?: =)?$/, function(m, miss){
  return { title: sp(miss.q).replace(/ =$/, ""), topic: "mixed numbers", ans: fr(+m[1], +m[2], +m[3]), steps: [
    { h:"Nothing to work out", p:m[1]+" whole bars and "+m[2]+"/"+m[3]+" of another one. Just write them side by side.", pic: mixedPic(+m[1], +m[2], +m[3]) },
    { h:"Each number in its own box", p:"Whole number in front, fraction after: "+b(fr(+m[1],+m[2],+m[3]))+".", pic: boxes(+m[1], m[2], m[3]) }
  ]};
});

/* 5/6 × 9 */
rule(/^(\d+)\/(\d+) × (\d+)(?: =)?$/, function(m, miss){
  var n = +m[1], d = +m[2], k = +m[3], T = n * k, W = Math.floor(T / d), N = T % d, g = gcd(N, d);
  return { title: sp(miss.q).replace(/ =$/, ""), topic: "fraction × whole number", ans: fr(W, N/g, d/g), steps: [
    { h:"Times the top only", p:k+" lots of "+n+"/"+d+" is "+n+" × "+k+" = "+b(T+"/"+d)+". The size of the pieces does not change.", pic:"" },
    { h:"Make wholes", p:"Every "+d+" pieces is a whole: "+T+" ÷ "+d+" = "+W+" remainder "+N+", so "+b(fr(W,N,d))+".", pic: groupsPic(W, d, N) },
    { h:"Simplify", p: g > 1 ? N+"/"+d+" = "+(N/g)+"/"+(d/g)+", so the answer is "+b(fr(W,N/g,d/g))+"." : "Nothing to simplify: "+b(fr(W,N,d))+".", pic:"" }
  ]};
});

/* 60 ÷ 4  and  60 ÷ 4 (remainder) */
rule(/^(\d+) ÷ (\d+)(?: \(remainder\))?(?: =)?$/, function(m, miss){
  var A = +m[1], d = +m[2], q = Math.floor(A / d), r = A % d, steps = [];
  if(A <= 60 && d <= 9){
    steps.push({ h:"Share into groups of "+d, p:"How many groups of "+d+" can you make from "+A+"? Count up in "+d+"s: "+
      Array.apply(null, Array(Math.min(q, 12))).map(function(_, i){ return d * (i + 1); }).join(", ")+(q > 12 ? "…" : "")+".", pic: groupsPic(q, d, r) });
  } else {
    var left = A, parts = [];
    [100, 10, 1].forEach(function(u){
      var k = Math.floor(left / (d * u)) * u;
      if(k){ parts.push(d+" × "+k+" = "+(d*k)); left -= d * k; }
    });
    steps.push({ h:"Take away big easy chunks", p:"Use facts you know, biggest first: "+parts.map(b).join(", then ")+". Add up how many "+d+"s you took: "+b(q)+".", pic:"" });
  }
  steps.push({ h: r ? "What is left over?" : "Nothing left over", p: r ? d+" × "+q+" = "+(d*q)+". "+A+" − "+(d*q)+" = "+b(r)+". That is the remainder - it must be smaller than "+d+"." :
    d+" × "+q+" = "+A+" exactly, so the remainder is "+b(0)+".", pic:"" });
  steps.push({ h:"Check it", p:"Multiply back: "+q+" × "+d+(r ? " + "+r : "")+" = "+b(A)+" ✓", pic:"" });
  return { title: A+" ÷ "+d, topic: "division", ans: /remainder/.test(miss.q) ? String(r) : String(q), steps: steps };
});

/* 7 × 8, 46 × 7, 30.44 × 4 */
rule(/^([\d.]+) × ([\d.]+)(?: =)?$/, function(m, miss){
  var a = m[1], c = m[2];
  if(/\./.test(a + c)) return decimalTimes(a, c, miss);
  var x = +a, y = +c, steps = [];
  if(x <= 12 && y <= 12){
    var big = Math.max(x, y), small = Math.min(x, y), h = Math.min(5, big);
    steps.push({ h:"See it as rows", p:small+" rows of "+big+" dots.", pic: arrayPic(small, big) });
    steps.push({ h:"Split it into easy parts", p: big > 5 ? small+" × 5 = "+(small*5)+", and "+small+" × "+(big-5)+" = "+(small*(big-5))+". Together: "+b((small*5)+" + "+(small*(big-5))+" = "+(x*y))+"." :
      "Count up in "+big+"s, "+small+" times: "+Array.apply(null, Array(small)).map(function(_, i){ return big*(i+1); }).join(", ")+".", pic:"" });
  } else {
    var bigN = Math.max(x, y), sm = Math.min(x, y), parts = String(bigN).split("").map(function(dg, i, arr){ return +dg * Math.pow(10, arr.length - 1 - i); }).filter(Boolean);
    steps.push({ h:"Split the big number by place value", p:bigN+" = "+parts.join(" + ")+". Multiply each part by "+sm+": "+parts.map(function(p){ return b(p+" × "+sm+" = "+(p*sm)); }).join(", ")+".", pic:"" });
    steps.push({ h:"Add the parts", p:parts.map(function(p){ return p*sm; }).join(" + ")+" = "+b(x*y)+".", pic:"" });
  }
  steps.push({ h:"Check it", p:"Does it look the right size? "+x+" × "+y+" is a bit more or less than "+(Math.round(x/10)*10||x)+" × "+y+" = "+((Math.round(x/10)*10||x)*y)+". Answer: "+b(x*y)+".", pic:"" });
  return { title: x+" × "+y, topic: "multiplication", ans: String(x*y), steps: steps };
});
function places(s){ var i = String(s).indexOf("."); return i < 0 ? 0 : String(s).length - i - 1; }
function decimalTimes(a, c, miss){
  var pa = places(a), pc = places(c), A = Math.round(+a * Math.pow(10, pa)), Cc = Math.round(+c * Math.pow(10, pc)), P = A * Cc, k = pa + pc;
  var ans = (P / Math.pow(10, k)).toFixed(k);
  return { title: a+" × "+c, topic: "decimals", ans: ans, steps: [
    { h:"Hide the point", p:"Work it as whole numbers first: "+b(A+" × "+Cc+" = "+P)+".", pic:"" },
    { h:"Put the point back", p:"There "+(k===1?"is ":"are ")+b(k)+" digit"+(k===1?"":"s")+" after the point in the question, so there are "+k+" after the point in the answer: "+b(ans)+".", pic:"" },
    { h:"Check the size", p:a+" is about "+Math.round(+a)+", and "+Math.round(+a)+" × "+c+" ≈ "+Math.round(+a * +c)+". Your answer should be close to that.", pic:"" }
  ]};
}
/* 6.00 − 2.88, 8.15 + 5.77 */
rule(/^([\d.]+) ([+−-]) ([\d.]+)(?: =)?$/, function(m, miss){
  var a = m[1], c = m[3], k = Math.max(places(a), places(c)), op = m[2] === "+" ? "+" : "−";
  var ans = (op === "+" ? +a + +c : +a - +c).toFixed(k);
  return { title: a+" "+op+" "+c, topic: "decimals", ans: ans, steps: [
    { h:"Line up the points", p:"Write one under the other with the decimal points in a straight line. Fill gaps with 0s so both have "+k+" digits after the point.",
      pic: svg(200, 96, txt(150,30,(+a).toFixed(k),24,C.ink,"end") + txt(150,62,op+" "+(+c).toFixed(k),24,C.ink,"end") + line(40,72,160,72)) },
    { h:"Work from the right", p:op === "+" ? "Add each column, carrying when a column passes 9." : "Subtract each column; when the top digit is smaller, borrow 1 from the next column.", pic:"" },
    { h:"Answer", p:"The point drops straight down: "+b(ans)+".", pic:"" }
  ]};
});
/* 16.8 ÷ 4 */
rule(/^([\d.]+) ÷ (\d+)(?: =)?$/, function(m, miss){
  var a = m[1], d = +m[2], k = places(a), ans = String(+(+a / d).toFixed(6));
  return { title: a+" ÷ "+d, topic: "decimals", ans: ans, steps: [
    { h:"Divide as if there were no point", p:Math.round(+a * Math.pow(10, k))+" ÷ "+d+" = "+(+(Math.round(+a * Math.pow(10, k)) / d).toFixed(6))+".", pic:"" },
    { h:"Put the point back", p:"The question had "+k+" digit"+(k===1?"":"s")+" after the point, so the answer does too: "+b(ans)+".", pic:"" }
  ]};
});
/* Round 49.62 to the nearest whole number */
rule(/^Round ([\d.]+) to the nearest (whole number|tenth)$/, function(m, miss){
  var x = +m[1], tenth = m[2] === "tenth", ans = tenth ? (Math.round(x * 10) / 10).toFixed(1) : String(Math.round(x));
  var look = tenth ? String(m[1]).split(".")[1].charAt(1) : String(m[1]).split(".")[1].charAt(0);
  return { title: sp(miss.q), topic: "rounding", ans: ans, steps: [
    { h:"Find the digit that decides", p:"Look at the digit just after the place you are rounding to. Here it is "+b(look)+".", pic:"" },
    { h:"5 or more goes up", p:(+look >= 5 ? look+" is 5 or more, so round up" : look+" is less than 5, so stay")+": "+b(ans)+".", pic:"" }
  ]};
});

/* ---------- thinking problems ---------- */
rule(/^___ ÷ (\d+) = (\d+)$/, function(m, miss){
  var d = +m[1], r = +m[2];
  return { title: sp(miss.q), topic: "missing number", ans: String(d*r), steps: [
    { h:"What is it saying?", p:"Some number was shared into "+b(d+" groups")+", and each group got "+b(r)+".", pic: groupsPic(d, r) },
    { h:"Put the groups back together", p:d+" groups of "+r+" is "+d+" × "+r+" = "+b(d*r)+".", pic: sum(Array.apply(null, Array(Math.min(d,5))).map(function(){ return r; }).join(" + ") + (d > 5 ? " …" : "") + " = " + (d*r)) },
    { h:"Check it", p:(d*r)+" ÷ "+d+" = "+r+" ✓. The number "+b("before")+" the ÷ is the whole thing, so it is always the biggest. If your answer is smaller than "+r+", it went the wrong way.", pic:"" }
  ]};
});
rule(/^(\d+) × ___ = (\d+)$/, function(m, miss){
  var a = +m[1], p = +m[2];
  return { title: sp(miss.q), topic: "missing number", ans: String(p/a), steps: [
    { h:"What is it asking?", p:b(a+" groups of what")+" make "+p+"?", pic: groupsPic(a, "?") },
    { h:"Undo the multiply", p:"Dividing undoes multiplying: "+p+" ÷ "+a+" = "+b(p/a)+".", pic:"" },
    { h:"Check it", p:a+" × "+(p/a)+" = "+p+" ✓", pic:"" }
  ]};
});
rule(/^\((\d+) × (\d+)\) \+ ___ = (\d+)$/, function(m, miss){
  var a = +m[1], c = +m[2], t = +m[3], p = a * c;
  return { title: sp(miss.q), topic: "missing number", ans: String(t - p), steps: [
    { h:"Brackets first", p:a+" × "+c+" = "+b(p)+". Now the question is just "+b(p+" + ___ = "+t)+".", pic:"" },
    { h:"How far to "+t+"?", p:t+" − "+p+" = "+b(t-p)+".", pic:"" },
    { h:"Check it", p:p+" + "+(t-p)+" = "+t+" ✓", pic:"" }
  ]};
});
rule(/^What comes next\? ([\d, ]+), ___$/, function(m, miss){
  var xs = m[1].split(",").map(function(s){ return +s; }).filter(function(x){ return !isNaN(x); });
  var ds = xs.slice(1).map(function(x, i){ return x - xs[i]; }), dif = ds[0];
  var add = ds.every(function(x){ return x === dif; });
  var dd = ds.slice(1).map(function(x, i){ return x - ds[i]; }), grow = !add && dd.length && dd.every(function(x){ return x === dd[0]; });
  var rat = xs[0] ? xs[1] / xs[0] : 0, last = xs[xs.length-1], nextJump = grow ? ds[ds.length-1] + dd[0] : 0;
  var nx = add ? last + dif : grow ? last + nextJump : last * rat;
  var lab = function(i){ return add ? "+"+dif : grow ? "+"+ds[i-1] : "×"+rat; };
  return { title: sp(miss.q), topic: "number patterns", ans: String(nx), steps: [
    { h:"What happens each time?", p: add ? "Each number is "+b((dif >= 0 ? "+ " : "− ")+Math.abs(dif))+" from the one before." :
        grow ? "Write the jumps: "+b(ds.join(", "))+". The jump itself grows by "+b(dd[0])+" each time." :
        "The jumps keep getting bigger, so it is not adding. Each number is "+b("× "+rat)+" the one before.",
      pic: svg(Math.min(560, xs.length*80+40), 64, xs.map(function(x, i){ return txt(30+i*80, 26, x, 18) + (i ? txt(30+i*80-40, 56, lab(i), 13, C.acc) : ""); }).join("")) },
    { h:"Do it once more", p: grow ? "The next jump is "+ds[ds.length-1]+" + "+dd[0]+" = "+nextJump+", so "+last+" + "+nextJump+" = "+b(nx)+"." :
        last+(add ? " + "+dif : " × "+rat)+" = "+b(nx)+".", pic:"" }
  ]};
});
rule(/^(\w+) has (\d+) (\w+)\. \1 shares them equally among (\d+) friends, then gives away (\d+) (?:of their|from \1's) own share\. How many does each friend keep\?$/, function(m, miss){
  var A = +m[2], f = +m[4], g = +m[5], e = A / f;
  return { title: "Sharing " + A + " " + m[3], topic: "word problems", ans: String(e), steps: [
    { h:"Share them out", p:A+" ÷ "+f+" = "+b(e)+". Each friend gets "+e+".", pic: groupsPic(f, e) },
    { h:"Whose share changes?", p:"Read the end again: "+m[1]+" gives away "+g+" from "+b(m[1]+"'s own")+" share. The friends' "+m[3]+" are not touched.", pic:"" },
    { h:"So each friend keeps…", p:b(e)+". The "+g+" was a trap - always read to the very last question.", pic:"" }
  ]};
});
rule(/^A van holds (\d+) people\. (\d+) people need a ride/, function(m, miss){
  var v = +m[1], p = +m[2], q = Math.floor(p / v), r = p % v;
  return { title: sp(miss.q), topic: "word problems", ans: String(q + (r ? 1 : 0)), steps: [
    { h:"Fill the vans", p:p+" ÷ "+v+" = "+q+" full vans, with "+b(r)+" people left over.", pic: groupsPic(q, v, r) },
    { h:"Nobody gets left behind", p: r ? "Those "+r+" still need a van, so it is "+q+" + 1 = "+b(q+1)+" vans." : "No one is left over: "+b(q)+" vans.", pic:"" }
  ]};
});
rule(/^A rectangle is (\d+) cm long and (\d+) cm wide\. What is its (area|perimeter)/, function(m, miss){
  var l = +m[1], w = +m[2], area = m[3] === "area";
  return { title: sp(miss.q), topic: area ? "area" : "perimeter", ans: String(area ? l*w : 2*(l+w)), steps: area ? [
    { h:"Area is the squares inside", p:"Fill it with 1 cm squares: "+l+" rows of "+w+".", pic: rectPic(l, w, "area") },
    { h:"Multiply", p:l+" × "+w+" = "+b(l*w)+" square cm.", pic:"" }
  ] : [
    { h:"Perimeter is the way round", p:"Walk all four sides: two long sides and two short ones.", pic: rectPic(l, w, "perim") },
    { h:"Add the four sides", p:l+" + "+w+" + "+l+" + "+w+" = "+b(2*(l+w))+" cm. (Area would be "+l+" × "+w+" - that is a different question.)", pic:"" }
  ]};
});
rule(/^A box is (\d+) cm by (\d+) cm by (\d+) cm/, function(m, miss){
  var a = +m[1], c = +m[2], d = +m[3];
  return { title: sp(miss.q), topic: "volume", ans: String(a*c*d), steps: [
    { h:"One layer first", p:a+" × "+c+" = "+b(a*c)+" cubes in the bottom layer.", pic: rectPic(a, c, "area") },
    { h:"Stack the layers", p:d+" layers: "+(a*c)+" × "+d+" = "+b(a*c*d)+" cubic cm.", pic:"" }
  ]};
});
rule(/^I think of a number, multiply it by (\d+), then (add|subtract) (\d+)\. The answer is (\d+)/, function(m, miss){
  var k = +m[1], add = m[2] === "add", c = +m[3], t = +m[4], before = add ? t - c : t + c;
  return { title: sp(miss.q), topic: "working backwards", ans: String(before / k), steps: [
    { h:"Walk it backwards", p:"Start at the end, "+t+", and undo each step in reverse order.", pic: sum("? → × "+k+" → "+(add ? "+ " : "− ")+c+" → "+t, C.acc) },
    { h:"Undo the last step first", p:"It "+(add ? "added" : "subtracted")+" "+c+", so "+(add ? "subtract" : "add")+" it: "+t+(add ? " − " : " + ")+c+" = "+b(before)+".", pic:"" },
    { h:"Undo the multiply", p:before+" ÷ "+k+" = "+b(before / k)+". Check: "+(before/k)+" × "+k+(add ? " + " : " − ")+c+" = "+t+" ✓", pic:"" }
  ]};
});
rule(/^A is (\d+) more than B\. B is (\d+) times C\. C is (\d+)/, function(m, miss){
  var c = +m[1], k = +m[2], C0 = +m[3], B = k * C0;
  return { title: sp(miss.q), topic: "word problems", ans: String(B + c), steps: [
    { h:"Start with the one you know", p:"C is "+b(C0)+".", pic:"" },
    { h:"Climb to B", p:"B is "+k+" times C: "+k+" × "+C0+" = "+b(B)+".", pic:"" },
    { h:"Climb to A", p:"A is "+c+" more than B: "+B+" + "+c+" = "+b(B+c)+". Write just the number.", pic:"" }
  ]};
});
rule(/^(\w+) is (\d+) years old\. (\w+) is (\d+) times as old\. How much older/, function(m, miss){
  var a = +m[2], k = +m[4];
  return { title: sp(miss.q), topic: "word problems", ans: String(a*k - a), steps: [
    { h:"Find the age first", p:m[3]+" is "+k+" × "+a+" = "+b(a*k)+".", pic:"" },
    { h:"\"How much older\" means the difference", p:a*k+" − "+a+" = "+b(a*k-a)+". Not the total - the gap between them.", pic:"" }
  ]};
});
rule(/^Which is larger: (\d+)\/(\d+)(?:\s+or\s+|\s+or \(2\) )(\d+)\/(\d+)/, function(m, miss){
  var n1 = +m[1], d1 = +m[2], n2 = +m[3], d2 = +m[4], L = d1 * d2 / gcd(d1, d2), a = n1 * L / d1, c = n2 * L / d2;
  var ans = a === c ? "They are equal" : (a > c ? n1+"/"+d1 : n2+"/"+d2);
  return { title: n1+"/"+d1+" or "+n2+"/"+d2, topic: "comparing fractions", ans: ans, steps: [
    { h:"Draw both", p:"Same size bars, cut differently.", pic: svg(300, 84, bar(40,4,240,d1,n1) + bar(40,46,240,d2,n2) + txt(18,24,n1+"/"+d1,13) + txt(18,66,n2+"/"+d2,13)) },
    { h:"Give them the same bottom", p:n1+"/"+d1+" = "+a+"/"+L+", and "+n2+"/"+d2+" = "+c+"/"+L+". Now just compare the tops.", pic:"" },
    { h:"Answer", p: a === c ? "They are the same amount." : b(ans)+" is larger.", pic:"" }
  ]};
});

rule(/^A shelf holds (\d+) books\. There are (\d+) shelves\. (\d+) books are taken out/, function(m, miss){
  var e = +m[1], n = +m[2], t = +m[3];
  return { title: sp(miss.q), topic: "word problems", ans: String(e*n - t), steps: [
    { h:"Find the full total first", p:n+" shelves of "+e+": "+n+" × "+e+" = "+b(e*n)+" books.", pic: e*n <= 100 ? arrayPic(n, e) : "" },
    { h:"Then take some out", p:(e*n)+" − "+t+" = "+b(e*n-t)+".", pic:"" }
  ]};
});
rule(/^(\w+) saves \$(\d+) every week for (\d+) weeks, then spends \$(\d+)/, function(m, miss){
  var a = +m[2], w = +m[3], c = +m[4];
  return { title: sp(miss.q), topic: "word problems", ans: String(a*w - c), steps: [
    { h:"How much was saved?", p:"$"+a+" every week for "+w+" weeks: "+a+" × "+w+" = "+b("$"+(a*w))+".", pic: groupsPic(w, a) },
    { h:"Then spend some", p:(a*w)+" − "+c+" = "+b("$"+(a*w-c))+" left.", pic:"" }
  ]};
});
rule(/^(\w+) buys (\d+) packs of (\w+) with (\d+) in each pack, and (\d+) extra loose ones\. (\w+) has (\d+)\./, function(m, miss){
  var p = +m[2], e = +m[4], x = +m[5], o = +m[7], T = p*e + x;
  return { title: sp(miss.q), topic: "word problems", ans: String(T - o), steps: [
    { h:"Build "+m[1]+"'s total", p:p+" packs of "+e+" = "+(p*e)+", plus "+x+" loose = "+b(T)+".", pic: groupsPic(p, e, x) },
    { h:"\"How many more\" means the difference", p:T+" − "+o+" = "+b(T-o)+".", pic:"" }
  ]};
});
rule(/^A factory makes (\d+) bottles an hour\. It runs for (\d+) hours, then (\d+) bottles/, function(m, miss){
  var a = +m[1], h = +m[2], c = +m[3];
  return { title: sp(miss.q), topic: "word problems", ans: String(a*h - c), steps: [
    { h:"Bottles made", p:a+" × "+h+" = "+b(a*h)+".", pic:"" },
    { h:"Take away the cracked ones", p:(a*h)+" − "+c+" = "+b(a*h-c)+".", pic:"" }
  ]};
});
rule(/^One notebook costs \$(\d+)\.(\d+)\. What do (\d+) notebooks cost, in cents\?$/, function(m, miss){
  var c = +m[1] * 100 + +m[2], n = +m[3];
  return { title: sp(miss.q), topic: "money", ans: String(c*n), steps: [
    { h:"Change to cents first", p:"$"+m[1]+"."+m[2]+" is "+b(c+" cents")+" (a dollar is 100 cents).", pic:"" },
    { h:"Multiply", p:c+" × "+n+" = "+b(c*n)+" cents.", pic:"" }
  ]};
});
rule(/^Estimate: about how many groups of (\d+) fit into (\d+)\?/, function(m, miss){
  var p = +m[1], t = +m[2], q = t / p, ans = Math.round(q / 10) * 10;
  return { title: sp(miss.q), topic: "estimating", ans: String(ans), steps: [
    { h:"Divide", p:t+" ÷ "+p+" is about "+b(Math.round(q*10)/10)+".", pic:"" },
    { h:"Round to the nearest ten", p:"Which ten is "+Math.round(q*10)/10+" closest to? "+b(ans)+".", pic:"" }
  ]};
});
rule(/^A film starts at (\d+):(\d+) pm and lasts (\d+) hours? and (\d+) minutes/, function(m, miss){
  var H = +m[1], M = +m[2], h = +m[3], mm = +m[4], tot = M + mm, eh = H + h + Math.floor(tot / 60), em = tot % 60;
  var ans = eh + ":" + (em < 10 ? "0" : "") + em + " pm";
  return { title: sp(miss.q), topic: "time", ans: ans, steps: [
    { h:"Add the hours", p:H+":"+m[2]+" + "+h+" hour"+(h===1?"":"s")+" = "+b((H+h)+":"+m[2])+".", pic:"" },
    { h:"Add the minutes", p:M+" + "+mm+" = "+tot+" minutes"+(tot >= 60 ? ". That is more than 60, so it makes 1 more hour and "+em+" minutes" : "")+".", pic:"" },
    { h:"Answer", p:b(ans)+".", pic:"" }
  ]};
});

/* fallback for any word problem: the reading habit, then the answer */
function generic(miss){
  var isEng = miss.block === "eng", w = sp(miss.want);
  if(isEng) return english(miss);
  if(miss.sol) return { title:"★ Challenge", topic:"challenge", ans:w, steps:[
    { h:"How to solve it", p:esc(miss.sol), pic:"" },
    { h:"The answer", p:"It comes to "+b(w)+".", pic:"" } ]};
  return { title: miss.block === "think" ? "Thinking problem" : sp(miss.q), topic: "word problems", ans: w, steps: [
    { h:"Read it twice", p:"Read the whole question slowly, twice. What does the "+b("last sentence")+" ask for?", pic:"" },
    { h:"Pull out the numbers", p:"Write each number down with what it means, like \"30 cards\" or \"6 friends\". Then decide: are things being put together (+, ×) or split up (−, ÷)?", pic:"" },
    { h:"The answer", p:"The answer is "+b(w)+". Work backwards from it - can you see each step that gets there?", pic:"" }
  ]};
}

/* English: the rule behind the right answer */
var ENG = [
  [/proper noun/i, "A proper noun is the name of one particular person, place or thing, and it starts with a capital letter. \"teacher\" could be anyone; \"Mrs. Patel\" is one person."],
  [/capital letters/i, "Capitals go on the first word of a sentence, on names of people and places, and on months and days."],
  [/punctuated correctly|exclamation/i, "A sentence starts with a capital. A word like \"Wow\" is followed by a comma, and a strong feeling ends with \"!\"."],
  [/commas/i, "In a list of three or more, put a comma after each item except the last: apples, grapes, and cheese."],
  [/apostrophe|belonging/i, "One owner: dog's. More than one owner ending in s: dogs'. The apostrophe shows who owns it."],
  [/quotation marks/i, "The exact spoken words go inside the quotation marks, with the comma or full stop inside too."],
  [/adjective/i, "An adjective describes a noun - what kind, how many, which one."],
  [/adverb/i, "An adverb describes a verb - how, when or where something is done. Many end in -ly."],
  [/conjunction/i, "A conjunction joins two parts: and, but, or, so, because."],
  [/preposition/i, "A preposition shows where or when: under, over, after, beside."],
  [/past tense/i, "Some verbs are irregular - they do not just add -ed. Say it in a sentence: \"Yesterday I ___.\""],
  [/plural/i, "Some plurals change the word: leaf → leaves, child → children."],
  [/contraction|they're|their|there/i, "they're = they are. their = belongs to them. there = a place. Say the long form to test it."],
  [/complete sentence/i, "A complete sentence needs someone or something doing an action, and it makes sense on its own."],
  [/subject-verb|correct verb|agreement/i, "Two people doing something together take the plural verb: \"My brother and I walk\"."],
  [/pronoun/i, "\"Maya and I\" is two people including me - that is \"we\"."],
  [/subject\?/i, "The subject is who or what the sentence is about - who is doing the action."],
  [/compound sentence|independent clauses/i, "Two full sentences can be joined with a comma and and/but/so, or with a semicolon."],
  [/tense/i, "Keep the whole sentence in the same time - all past, or all present."],
  [/comparative|superlative/i, "Comparing two: -er (bigger). Comparing three or more: -est (biggest)."],
  [/double negative/i, "Use one \"no\" word, not two: \"I don't have any\", not \"I don't have none\"."]
];
function english(miss){
  var w = sp(miss.want), q = sp(miss.q), ruleTxt = "";
  var spell = q.match(/^Spelling: (.+)$/i);
  if(spell){
    var g = sp(miss.gave), word = sp(spell[1]) || w;
    return { title: "Spelling: " + word, topic: "spelling", ans: word, steps: [
      { h:"Say it in parts", p:"Say the word slowly and clap each part. Write one part at a time.", pic:"" },
      { h:"Find the tricky bit", p: g && g !== "(blank)" ? "You wrote "+b(g)+". The word is "+b(word)+". Put your finger on the letters that are different - that is the bit to remember." : "The word is "+b(word)+". Which part looks hardest?", pic:"" },
      { h:"Look, cover, write, check", p:"Look at it, cover it, write it from memory, then check. Do it three times.", pic:"" }
    ]};
  }
  for(var i = 0; i < ENG.length; i++) if(ENG[i][0].test(q)){ ruleTxt = ENG[i][1]; break; }
  var reading = !ruleTxt && /^(why|what|how|which|who|when)/i.test(q);
  return { title: "English", topic: reading ? "reading" : "grammar", ans: w, steps: reading ? [
    { h:"Go back to the passage", p:"The answer is always in the text. Find the sentence that talks about this, and read the sentences around it too.", pic:"" },
    { h:"The answer", p:"The answer was "+b(w)+".", pic:"" },
    { h:"Prove it", p:"Can you point to the words in the passage that show it? That is how to check every reading answer.", pic:"" }
  ] : [
    { h:"The rule", p: esc(ruleTxt || "Read every choice out loud. The right one sounds right and follows the rule."), pic:"" },
    { h:"The answer", p:b(w)+(miss.gave && miss.gave !== "(blank)" ? " - not \""+esc(miss.gave)+"\"." : "."), pic:"" }
  ]};
}

/* ---------- what kind of mistake was it? ---------- */
function wholeInTop(miss){
  var g = parseFrac(miss.gave), w = parseFrac(miss.want);
  if(!g || !w || !w.w || g.w) return false;
  /* the whole-number box was left empty (the app records that as a leading
     space), or her top number starts with the right whole */
  return g.blankWhole || (String(g.n).indexOf(String(w.w)) === 0 && String(g.n).length > String(w.w).length);
}
/* A short key for the mistake, used to notice the same one again. */
function pattern(miss){
  var q = sp(miss.q).replace(/ =$/, ""), g = sp(miss.gave), w = sp(miss.want);
  var pg = parseFrac(g), pw = parseFrac(w), blank = !g || g === "(blank)";
  if(/^\d+\/\d+ = \?\/(\d+)$/.test(q)){
    var D = +q.match(/\?\/(\d+)$/)[1];
    return { key:"equiv-top", name:"equivalent fractions", again: pg && pg.n === D && pg.d === D ? "the new bottom number went on top as well" : "",
      kind: pg && pg.n === D && pg.d === D ? "top-is-bottom" : "other",
      habit: pg && pg.n === D && pg.d === D
        ? "The new bottom number went on top too. The top is how many pieces are coloured - count them in the picture."
        : "Whatever you do to the bottom, do the same to the top." };
  }
  if(/[+−-]/.test(q) && /\/\d+/.test(q) && !/×|÷/.test(q)){
    if(wholeInTop(miss)) return { key:"whole-in-top", name:"mixed numbers", kind:"whole-in-top", again:"the whole number ended up inside the fraction",
      habit:"Before you press Check, put your finger on the big box in front and say \"whole number goes here\"." };
    if(pg && pw && Math.abs(val(pg) - val(pw)) < 1e-9) return { key:"not-simplified", name:"simplifying", kind:"not-simplified", again:"the answer was right but not simplified",
      habit:"When the question says simplify, ask one more question at the end: can the top and bottom both be divided by the same number?" };
    if(pg && pg.n >= pg.d && pg.d > 1) return { key:"too-many-pieces", name:"mixed numbers", kind:"improper",
      habit:"If the top is as big as the bottom, there is a whole hiding in the fraction. Take it out." };
    return { key:"mixed-calc", name:"adding and subtracting fractions", kind:"calc",
      habit:"Wholes with wholes, pieces with pieces - and only the top number changes." };
  }
  if(/^___ ÷ \d+ = \d+$/.test(q)){
    var m = q.match(/÷ (\d+) = (\d+)/), shrunk = +g < +m[2];
    return { key:"missing-div", name:"missing-number division", kind: shrunk ? "divided" : "other", again: shrunk ? "a missing number was divided when it needed multiplying" : "",
      habit:"The number before ÷ is the whole thing, so it is the biggest number in the sum. Multiply to find it." };
  }
  if(/shares them equally/.test(q)) return { key:"share-give", name:"reading to the end", kind:"trap",
    habit:"Before you answer, read the last sentence again and ask: whose things are we counting?" };
  if(/÷/.test(q)) return { key: /remainder/.test(q) ? "remainder" : "division", name: /remainder/.test(q) ? "remainders" : "division", kind:"calc",
    habit: /remainder/.test(q) ? "Multiply back to check: answer × divisor + remainder should give the number you started with." : "Multiply back to check your answer." };
  if(/^[\d.]+ × [\d.]+$/.test(q)) return { key: /\./.test(q) ? "decimal-times" : "times", name: /\./.test(q) ? "decimals" : "multiplication", kind:"calc",
    habit:"Estimate first, so you know roughly how big the answer should be." };
  if(/Which is larger/.test(q)) return { key:"compare-frac", name:"comparing fractions", kind:"calc",
    habit:"Give both fractions the same bottom number, then compare the tops." };
  if(/What comes next/.test(q)) return { key:"pattern", name:"number patterns", kind:"calc",
    habit:"Write the jump between each pair of numbers. Is it the same each time, or does it grow?" };
  if(/simplest form/.test(q)) return { key:"not-simplified", name:"simplifying", kind:"calc",
    habit:"Keep dividing top and bottom until no number except 1 goes into both." };
  var sw = q.match(/^Spelling: (.+)$/i);
  if(sw) return { key:"spell:" + sw[1].toLowerCase(), name:"this word", kind:"spell", again:"this word was spelled differently",
    habit:"Look, cover, write, check - three times, today." };
  if(miss.block === "eng"){
    for(var k = 0; k < ENG.length; k++) if(ENG[k][0].test(q)) return { key:"eng-" + k, name:"this grammar rule", kind:"eng", habit: ENG[k][1] };
    return { key:"eng-reading", name:"reading questions", kind:"eng", habit:"Find the sentence in the passage that proves your answer before you choose." };
  }
  if(blank) return { key:"blank-" + (miss.block || ""), name:"questions left blank", kind:"blank",
    habit:"Write something down, even a first step. A start can be fixed; a blank cannot." };
  return { key:"q:" + q.replace(/\d+/g, "#"), name:"this kind of question", kind:"other", habit:"" };
}

/* Earlier tries at the same kind of mistake on earlier days, oldest
   first, this one last. */
function repeats(miss, history){
  var p = pattern(miss), seen = {}, out = [];
  (history || []).forEach(function(h){
    /* earlier days only: three slips on one sheet is one bad day, not three tries */
    if(!h || !h.q || !h.date || h.date >= miss.date) return;
    var hp = pattern(h);
    if(hp.key !== p.key || (p.kind !== "other" && hp.kind !== p.kind)) return;
    var sig = h.date + "|" + sp(h.q);
    if(seen[sig]) return; seen[sig] = 1;
    out.push(h);
  });
  var me = miss.date + "|" + sp(miss.q);
  if(!seen[me]) out.push(miss);
  out.sort(function(a, c){ return a.date < c.date ? -1 : a.date > c.date ? 1 : 0; });
  return out;
}

/* What she got right, said first - a teacher starts there. */
function rightBit(miss, p){
  var g = parseFrac(miss.gave), w = parseFrac(miss.want);
  if(p.kind === "whole-in-top"){
    var digits = String(g.n);
    if(digits === String(w.w) + String(w.n) && g.d === w.d) return "Your maths was right - the numbers you wrote, " + w.w + " and " + w.n + "/" + w.d + ", are the answer. Only the box was wrong.";
    return "The whole-number box in front was left empty, so the whole number got squashed into the fraction.";
  }
  if(p.kind === "not-simplified") return "Your adding and taking away was right: " + sp(miss.gave) + " is exactly the right amount. Only the last step was missing.";
  if(p.kind === "top-is-bottom") return "You knew what the new bottom number had to be. That part was right.";
  if(p.kind === "divided") return "You did a real division - it just needed to go the other way, a multiply.";
  if(p.kind === "trap") return "You worked out each share correctly. The question was trying to trick you at the end.";
  return "";
}

function teacher(miss, history, tip){
  var p = pattern(miss), list = repeats(miss, history), n = list.length;
  if(n < 2 && !tip) return null;
  var lines = list.map(function(h){
    var mine = h.date === miss.date && sp(h.q) === sp(miss.q);
    return day(h.date) + ": " + esc(sp(h.q).replace(/ =$/, "")) + " → you wrote " + b(sp(h.gave) || "nothing") + (mine ? " (this one)" : "");
  });
  return {
    count: n,
    right: rightBit(miss, p),
    was: n >= 2 ? lines : [],
    say: n >= 2 ? "This is the " + ord(n) + " time " + esc(p.again || "with " + p.name) + "." : "",
    habit: p.habit,
    tip: tip || ""
  };
}

function build(miss, history, tip){
  var q = sp(miss.q).replace(/ =$/, ""), lesson = null;
  if(miss.block !== "eng" && !/^★/.test(q)){
    for(var i = 0; i < R.length && !lesson; i++){
      var m = q.match(R[i][0]);
      if(m){ try{ lesson = R[i][1](m, miss); }catch(e){ lesson = null; } }
    }
  }
  if(!lesson) lesson = generic(miss);
  lesson.note = teacher(miss, history, tip);
  lesson.pattern = pattern(miss);
  return lesson;
}

/* The pop-up's HTML for one step (i), or for the teacher's note (i = steps.length). */
function stepHTML(lesson, i){
  if(i < lesson.steps.length){
    var s = lesson.steps[i];
    return '<div class="xstep"><h4>' + (i + 1) + '. ' + esc(s.h) + '</h4><p>' + s.p + '</p>' +
      (s.pic ? '<div class="xpic">' + s.pic + '</div>' : '') + '</div>';
  }
  var t = lesson.note;
  return '<div class="xteach"><b class="xt">✏️ A note from your teacher</b>' +
    (t.right ? '<p>' + esc(t.right) + '</p>' : '') +
    (t.was.length ? '<p>' + t.say + '</p><ul class="xwas">' + t.was.map(function(w){ return '<li>' + w + '</li>'; }).join("") + '</ul>' : '') +
    (t.tip ? '<p class="xtip">' + esc(t.tip) + '</p>' : '') +
    (t.habit && t.was.length ? '<p><b>Next time: ' + esc(t.habit) + '</b></p>' : '') + '</div>';
}

var api = { build: build, pattern: pattern, repeats: repeats, stepHTML: stepHTML, parseFrac: parseFrac, ord: ord, day: day };
root.Explain = api;
if(typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
