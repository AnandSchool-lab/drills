/* ============================================================
   solve.js - works a problem the way you would explain it to a
   nine-year-old, and draws the picture that makes it obvious.

   Used in two places: the parent dashboard fills its answer box from
   here so nobody has to write the explanation by hand, and the child's
   app renders what comes back.

   What it returns:
     { type, steps:[{ text, svg }], answer, tip }
   Pictures are optional per step. Anything this cannot recognise comes
   back with type "unknown" and no steps, and the parent writes it
   themselves - better an empty box than a confident wrong explanation.
   ============================================================ */
(function(){
"use strict";

/* ---------- small drawing helpers ---------- */
var INK = "#17315C", LINE = "#C7D6E8", FILL = "#2454CE", FILL2 = "#9CC0FF",
    GONE = "#E7EDF5", GOOD = "#1C7C54", WARN = "#D9731A";

function svg(w, h, body){
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" width="100%" ' +
         'style="max-width:' + w + 'px;height:auto;display:block;margin:6px auto">' + body + '</svg>';
}
function txt(x, y, s, size, colour, anchor){
  return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 15) + '" ' +
    'fill="' + (colour || INK) + '" text-anchor="' + (anchor || "start") + '" ' +
    'font-family="-apple-system,Segoe UI,Roboto,sans-serif">' + s + '</text>';
}

/* A bar cut into d equal pieces, with the first `shade` filled.
   `cross` marks pieces being taken away. */
function bar(d, shade, cross, w, y, h, fill){
  w = w || 350; y = y || 0; h = h || 42; fill = fill || FILL;
  var cw = w / d, out = '', i;
  for(i = 0; i < d; i++){
    var x = i * cw;
    var on = i < shade;
    var off = cross && i >= shade - cross && i < shade;
    out += '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + cw.toFixed(1) + '" height="' + h +
      '" fill="' + (off ? GONE : on ? fill : "#fff") + '" stroke="' + LINE + '" stroke-width="1.5"/>';
    if(off){
      out += '<path d="M' + (x+6).toFixed(1) + ',' + (y+6) + ' L' + (x+cw-6).toFixed(1) + ',' + (y+h-6) +
             ' M' + (x+cw-6).toFixed(1) + ',' + (y+6) + ' L' + (x+6).toFixed(1) + ',' + (y+h-6) +
             '" stroke="' + WARN + '" stroke-width="2.5" stroke-linecap="round"/>';
    }
  }
  return out;
}

function gcd(a,b){ return b ? gcd(b, a%b) : a; }

/* ---------- the explainers ---------- */

function explainLike(a, b, d, op){
  var res = op === "+" ? a + b : a - b;
  var steps = [];

  steps.push({
    text: "Look at the bottom numbers first. They are both " + d +
          ", so you can leave them completely alone. Only the tops change.",
    svg: svg(440, 58, bar(d, a, 0, 350, 8, 42) +
      txt(362, 36, a + "/" + d, 15, INK))
  });

  if(op === "-"){
    steps.push({
      text: "Take " + b + " pieces away from the " + a + " you started with. " +
            a + " take away " + b + " is " + res + ".",
      svg: svg(440, 58, bar(d, a, b, 350, 8, 42) + txt(362, 36, "−" + b + "/" + d, 15, WARN))
    });
  } else {
    steps.push({
      text: "Add " + b + " more pieces to the " + a + " you had. " +
            a + " and " + b + " more is " + res + ".",
      svg: svg(440, 58,
        bar(d, Math.min(d, a + b), 0, 350, 8, 42) +
        '<rect x="' + (350 / d * a).toFixed(1) + '" y="8" width="' +
          (350 / d * b).toFixed(1) + '" height="42" fill="' + FILL2 + '" stroke="' + LINE + '"/>' +
        txt(362, 36, "+" + b + "/" + d, 15, GOOD))
    });
  }

  var out = { text: "So you have " + res + " pieces out of " + d + ": " + res + "/" + d + ".", svg: null };
  steps.push(out);

  var g = gcd(res, d);
  if(g > 1 && res > 0){
    steps.push({
      text: "Both " + res + " and " + d + " can be divided by " + g + ". " +
            res + " ÷ " + g + " = " + (res/g) + " and " + d + " ÷ " + g + " = " + (d/g) +
            ". The same amount of bar, just cut into bigger pieces.",
      svg: svg(440, 112,
        bar(d, res, 0, 350, 6, 40) + txt(362, 30, res + "/" + d, 14, INK) +
        bar(d/g, res/g, 0, 350, 62, 40, GOOD) + txt(362, 86, (res/g) + "/" + (d/g), 14, GOOD))
    });
  }
  return { steps: steps, answer: (g > 1 ? (res/g) + "/" + (d/g) : res + "/" + d),
           tip: "When the bottom numbers already match, you never change them. That is the easy kind." };
}

function explainMixedSub(A, x, B, y, d){
  var diff = x - y, W = A - B, g = gcd(diff, d), steps = [];

  steps.push({
    text: "Deal with the fraction bits first. The bottoms are both " + d +
          ", so leave them. " + x + " take away " + y + " is " + diff + ".",
    svg: svg(440, 58, bar(d, x, y, 320, 8, 42) +
      txt(332, 36, x + "/" + d + " − " + y + "/" + d, 13, INK))
  });

  steps.push({
    text: "Now the whole numbers. " + A + " take away " + B + " is " + W + ".",
    svg: svg(440, 62, (function(){
      var out = '', i;
      for(i = 0; i < A; i++){
        var gone = i >= A - B;
        out += '<rect x="' + (i*46) + '" y="8" width="40" height="40" rx="4" fill="' +
          (gone ? GONE : FILL) + '" stroke="' + LINE + '" stroke-width="1.5"/>';
        if(gone) out += '<path d="M' + (i*46+10) + ',18 L' + (i*46+30) + ',38 M' + (i*46+30) +
          ',18 L' + (i*46+10) + ',38" stroke="' + WARN + '" stroke-width="2.5" stroke-linecap="round"/>';
      }
      return out + txt(A*46 + 8, 34, "= " + W, 16, INK);
    })())
  });

  steps.push({ text: "Put them back together: " + W + " and " + diff + "/" + d + ".", svg: null });

  if(g > 1){
    steps.push({
      text: "It asks you to simplify. " + diff + " and " + d + " can both be divided by " + g +
            ", which gives " + (diff/g) + "/" + (d/g) + ". Exactly the same amount — bigger pieces.",
      svg: svg(440, 112,
        bar(d, diff, 0, 350, 6, 40) + txt(362, 30, diff + "/" + d, 14, INK) +
        bar(d/g, diff/g, 0, 350, 62, 40, GOOD) + txt(362, 86, (diff/g) + "/" + (d/g), 14, GOOD))
    });
  }
  return { steps: steps,
           answer: W + " " + (g > 1 ? (diff/g) + "/" + (d/g) : diff + "/" + d),
           tip: "Wholes with wholes, tops with tops. Never add or subtract the bottom numbers." };
}

function explainSimplify(n, d){
  var g = gcd(n, d);
  if(g <= 1) return { steps: [{ text: n + "/" + d + " is already as simple as it goes — no number divides into both.", svg:null }],
                      answer: n + "/" + d, tip: "" };
  return { steps: [
    { text: "Find a number that divides into both " + n + " and " + d + ". The biggest one is " + g + ".",
      svg: svg(440, 58, bar(d, n, 0, 350, 8, 42) + txt(362, 36, n + "/" + d, 14, INK)) },
    { text: "Divide the top and the bottom by " + g + ". " + n + " ÷ " + g + " = " + (n/g) +
            ", and " + d + " ÷ " + g + " = " + (d/g) + ".",
      svg: svg(440, 58, bar(d/g, n/g, 0, 350, 8, 42, GOOD) + txt(362, 36, (n/g) + "/" + (d/g), 14, GOOD)) },
    { text: "Look at the two bars — the shaded part is the same size. You have not changed how much it is, only how many pieces it is cut into.", svg: null }
  ], answer: (n/g) + "/" + (d/g),
     tip: "Try 2 first, then 3, then 5. Most of the ones you meet come out with those." };
}

function explainEquivalent(n, d, D){
  var k = D / d, nn = n * k;
  if(!Number.isInteger(k)) return null;
  return { steps: [
    { text: "The bottom went from " + d + " to " + D + ". Ask yourself: " + d +
            " times what makes " + D + "? The answer is " + k + ".",
      svg: svg(440, 112, bar(d, n, 0, 350, 6, 40) + txt(362, 30, n + "/" + d, 14, INK) +
        bar(D, nn, 0, 350, 62, 40, GOOD) + txt(362, 86, nn + "/" + D, 14, GOOD)) },
    { text: "Whatever you do to the bottom you must do to the top. " + n + " × " + k + " = " + nn + ".", svg: null },
    { text: "Both bars have the same amount shaded — that is what equivalent means.", svg: null }
  ], answer: nn + "/" + D,
     tip: "Same thing to the top and the bottom, every time. Do one without the other and you change the amount." };
}

function explainMultiply(a, b){
  var big = Math.max(a, b), small = Math.min(a, b);
  if(big < 10) return { steps:[{ text: a + " × " + b + " is a times-table fact — worth knowing by heart. It is " + (a*b) + ".", svg:null }],
                        answer: String(a*b), tip:"" };
  var tens = Math.floor(big / 10) * 10, ones = big - tens;
  var W = 360, wT = W * tens / big, wO = W * ones / big, H = 90;
  return { steps: [
    { text: "Split the big number up. " + big + " is " + tens + " and " + ones +
            ". Easier numbers to multiply.", svg: null },
    { text: "Think of it as a rectangle " + big + " across and " + small +
            " down, cut into two pieces.",
      svg: svg(400, H + 46,
        '<rect x="8" y="8" width="' + wT.toFixed(1) + '" height="' + H + '" fill="' + FILL2 +
          '" stroke="' + LINE + '" stroke-width="1.5"/>' +
        '<rect x="' + (8 + wT).toFixed(1) + '" y="8" width="' + wO.toFixed(1) + '" height="' + H +
          '" fill="#FDEEDC" stroke="' + LINE + '" stroke-width="1.5"/>' +
        txt(8 + wT/2, H/2 + 14, tens + " × " + small + " = " + (tens*small), 15, INK, "middle") +
        txt(8 + wT + wO/2, H/2 + 14, ones + "×" + small, 13, INK, "middle") +
        txt(8 + wT/2, H + 30, tens, 13, INK, "middle") +
        txt(8 + wT + wO/2, H + 30, ones, 13, INK, "middle")) },
    { text: ones + " × " + small + " = " + (ones*small) + ". Now add the two pieces: " +
            (tens*small) + " + " + (ones*small) + " = " + (a*b) + ".", svg: null }
  ], answer: String(a*b),
     tip: "Breaking a number into tens and ones works for every multiplication you will meet this year." };
}

function explainDivide(a, b){
  var q = Math.floor(a / b), r = a % b;
  var dots = '', i, perRow = Math.min(b, 10);
  for(i = 0; i < a; i++){
    var grp = Math.floor(i / b), pos = i % b;
    var left = r > 0 && i >= q * b;
    dots += '<circle cx="' + (16 + pos * 26) + '" cy="' + (16 + grp * 30) + '" r="8" fill="' +
      (left ? WARN : FILL) + '"/>';
  }
  var steps = [
    { text: "You are sharing " + a + " things into groups of " + b + ". Keep taking " + b +
            " away and count how many groups you get.",
      svg: svg(Math.max(200, 16 + perRow * 26 + 40), 16 + Math.ceil(a / b) * 30 + 10, dots) },
    { text: "You get " + q + " full group" + (q === 1 ? "" : "s") +
            (r ? ", and " + r + " left over that cannot make another group." : ", with nothing left over."), svg: null }
  ];
  return { steps: steps, answer: r ? q + " remainder " + r : String(q),
           tip: r ? "The remainder is always smaller than the number you are dividing by." : "" };
}

/* ---------- which one is this? ---------- */
function forQuestion(q){
  var s = String(q || "").replace(/−/g, "-").replace(/×/g, "x").replace(/÷/g, "/div/");
  var m;

  m = s.match(/(\d+)\s+(\d+)\/(\d+)\s*-\s*(\d+)?\s*(\d+)\/(\d+)/);
  if(m && +m[3] === +m[6]) return tag("mixedSub",
    explainMixedSub(+m[1], +m[2], +(m[4] || 0), +m[5], +m[3]));

  m = s.match(/^\s*(\d+)\/(\d+)\s*([+-])\s*(\d+)\/(\d+)/);
  if(m && +m[2] === +m[5]) return tag("like", explainLike(+m[1], +m[4], +m[2], m[3]));

  m = s.match(/(\d+)\/(\d+)\s*(?:in\s+)?simplest form/i);
  if(m) return tag("simplify", explainSimplify(+m[1], +m[2]));

  m = s.match(/(\d+)\/(\d+)\s*=\s*\?\s*\/\s*(\d+)/);
  if(m){ var e = explainEquivalent(+m[1], +m[2], +m[3]); if(e) return tag("equivalent", e); }

  m = s.match(/^\s*(\d+)\s*x\s*(\d+)/);
  if(m) return tag("multiply", explainMultiply(+m[1], +m[2]));

  m = s.match(/^\s*(\d+)\s*\/div\/\s*(\d+)/);
  if(m) return tag("divide", explainDivide(+m[1], +m[2]));

  return { type:"unknown", steps:[], answer:"", tip:"" };
}
function tag(t, r){ r.type = t; return r; }

/* Render to HTML. Text is escaped; the only markup is the pictures this
   file drew itself. */
function render(sol){
  if(!sol || !sol.steps || !sol.steps.length) return "";
  function esc(x){ return String(x==null?"":x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  return sol.steps.map(function(st, i){
    return '<div class="sstep"><p><b>Step ' + (i+1) + '.</b> ' + esc(st.text) + '</p>' +
           (st.svg || "") + '</div>';
  }).join("") +
  (sol.answer ? '<p class="sans">The answer is <b>' + esc(sol.answer) + '</b></p>' : "") +
  (sol.tip ? '<p class="stip"><b>Tip:</b> ' + esc(sol.tip) + '</p>' : "");
}

window.Solve = { forQuestion: forQuestion, render: render };
})();
