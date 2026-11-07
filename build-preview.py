#!/usr/bin/env python3
"""Build standalone, clickable previews of the two screens.

The point is to review the real thing without an iPad in hand: the actual
app.js, content.js, ink.js and parent page, inlined into one file each,
with the network replaced by canned answers. Everything you click is the
code that ships; only the data is invented.
"""
import json, os, re, pathlib

SRC = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path(os.environ.get("DRILLS_OUT", SRC / "preview"))
OUT.mkdir(parents=True, exist_ok=True)
# stand-in pictures of their paper; any PNG data: URL works
_shots = SRC / "preview-shots.json"
SHOTS = json.load(open(_shots)) if _shots.exists() else {"math": "", "essay": ""}

import datetime
# the preview is always "today", whenever it is built - otherwise the
# dashboard opens on a day with nothing in it and looks broken
_t = datetime.date.today()
TODAY = _t.isoformat()
YDAY  = (_t - datetime.timedelta(days=1)).isoformat()

def inline_scripts(html: str, base: pathlib.Path) -> str:
    """Replace <script src="x.js"></script> with the file's contents."""
    def sub(m):
        src = m.group(1)
        p = (base / src).resolve()
        if not p.exists():
            return m.group(0)
        return "<script>\n/* ---- inlined: %s ---- */\n%s\n</script>" % (src, p.read_text())
    return re.sub(r'<script src="([^"]+)"></script>', sub, html)


# ---------------------------------------------------------------- kids
REVIEW_ALVINA = {
    "kid": "Alvina", "date": TODAY,
    "praise": "You showed every step on the subtracting ones, even the hard one at Q12. "
              "That is the part most people skip straight past.",
    "spelling": [
        {"word": "important", "wrote": "importent", "right": "important"},
        {"word": "neighbor",  "wrote": "nieghbor",  "right": "neighbor"},
        {"word": "surprise",  "wrote": "suprise",   "right": "surprise"},
    ],
    "essay": {
        "summary": "Six sentences and a real ending, and you used every one of the five senses "
                   "the prompt asked for. The cold swings was the best line.",
        "fixes": [
            {"was": "I can here the birds", "should": "I can hear the birds",
             "why": "hear has your ear in it"},
            {"was": "dosent", "should": "doesn't", "why": "does + not, squeezed together"},
        ],
        "next": "Try starting one sentence with something other than I or The.",
    },
    "math": {"approach": "Lines the fractions up properly, then rushes the last step.",
             "note": "Left 6/14 unsimplified twice."},
    "focus": ["simplifying fractions", "hear / here"],
}

def real_review(kid, fallback):
    """The newest real overnight review for this child, else the invented one,
    so the preview shows what the girls will actually read."""
    found = sorted((SRC / "archive").glob(f"*/*/review-{kid}.json"))
    return {"kid": kid, "date": TODAY, **json.load(open(found[-1]))} if found else fallback

kids = inline_scripts((SRC / "index.html").read_text(), SRC)
kids = kids.replace("</head>", """
<script>
/* ================= PREVIEW ONLY =================
   Nothing below ships. It stands in for the network so the page can be
   clicked through without an iPad, a Worker or a database. */
(function(){
  var REVIEW = %s;
  try{
    localStorage.setItem("dd:names", JSON.stringify(["Alvina","Andrila"]));
    localStorage.setItem("dd:profile", JSON.stringify("Alvina"));
    localStorage.setItem("dd:apiUrl", JSON.stringify("https://preview.invalid"));
  }catch(e){}

  function reply(o){ return Promise.resolve(new Response(JSON.stringify(o),
    { headers:{ "Content-Type":"application/json" } })); }
  var real = window.fetch;
  window.fetch = function(u, o){
    u = String(u);
    if(u.indexOf("/review") > -1)
      return Promise.resolve(new Response(JSON.stringify({ ok:true, review:REVIEW }),
        { headers:{ "Content-Type":"application/json" } }));
    if(u.indexOf("/stuck") > -1 && (!o || o.method !== "POST")){
      /* Work the answer out from the question actually on the screen, using
         the same solve.js the parent dashboard uses. Nothing is canned, so
         what you read here is exactly what the child would read. */
      var blk = window.activeBlock || "math", list = [];
      var rows = [].slice.call(document.querySelectorAll(".workrow[data-q]"));
      /* a fraction shows off the pictures best, so put those first */
      rows.sort(function(a, b){
        return (/\\//.test(b.getAttribute("data-q")) ? 1 : 0) -
               (/\\//.test(a.getAttribute("data-q")) ? 1 : 0);
      });
      for(var i = 0; i < rows.length && list.length < 2; i++){
        var q = rows[i].getAttribute("data-q") || "";
        var sol = window.Solve ? Solve.forQuestion(q) : null;
        if(!sol || !sol.steps || !sol.steps.length) continue;
        list.push({ block: blk, pad: rows[i].getAttribute("data-pad"), q: q,
                    solution: list.length ? "" : JSON.stringify(sol) });
      }
      return reply({ ok:true, stuck:list });
    }
    if(u.indexOf("/retake") > -1)
      return Promise.resolve(new Response(JSON.stringify({ ok:true, dates:[] }),
        { headers:{ "Content-Type":"application/json" } }));
    /* A pretend server that remembers what the app backs up, kept in
       sessionStorage so it survives wiping the "iPad" (localStorage and
       IndexedDB) - which is exactly the restore test. */
    if(u.indexOf("/draft") > -1 || u.indexOf("/ink") > -1 || u.indexOf("/mywork") > -1){
      var S; try{ S = JSON.parse(sessionStorage.getItem("pv:server") || "null"); }catch(e){}
      S = S || { drafts:{}, ink:{} };
      var keep = function(){ sessionStorage.setItem("pv:server", JSON.stringify(S)); };
      if(o && o.method === "POST"){
        var b = JSON.parse(o.body || "{}");
        if(u.indexOf("/draft") > -1){ S.drafts[b.kid+"|"+b.date+"|"+b.block] = b.data; keep(); }
        if(u.indexOf("/ink") > -1){
          var k = b.kid+"|"+b.date+"|"+b.block+"|"+b.pad, d = b.data || {};
          var blank = !(d.s && d.s.length) && !(d.imgs && d.imgs.length) && !String(d.text || "").trim();
          if(!(blank && S.ink[k])) S.ink[k] = d;
          keep();
        }
        return reply({ ok:true });
      }
      var qs = new URL(u).searchParams, pre = qs.get("kid")+"|"+qs.get("date")+"|"+qs.get("block");
      return reply({ ok:true, draft: S.drafts[pre] || null, answers: [],
        pads: Object.keys(S.ink).filter(function(k){ return k.indexOf(pre + "|") === 0; })
              .map(function(k){ return { pad: k.split("|")[3], data: JSON.stringify(S.ink[k]) }; }) });
    }
    if(u.indexOf("preview.invalid") > -1)
      return Promise.resolve(new Response(JSON.stringify({ ok:true }),
        { headers:{ "Content-Type":"application/json" } }));
    return real.apply(this, arguments);
  };

  function bar(){
    var el = document.createElement("div");
    el.className = "previewbar";
    el.innerHTML = "<b>Preview</b> &middot; the real app, with invented work. " +
                   "Nothing here is sent anywhere.";
    document.body.appendChild(el);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bar); else bar();
})();
</script>
<style>
.previewbar{position:fixed;left:50%%;transform:translateX(-50%%);bottom:0;z-index:90;
  background:#6D28D9;color:#fff;font-size:.78rem;padding:5px 16px;border-radius:9px 9px 0 0;
  box-shadow:0 -2px 12px rgba(0,0,0,.2);max-width:96vw;text-align:center}
.previewbar b{letter-spacing:.06em;text-transform:uppercase;font-size:.72rem}
</style>
</head>""" % json.dumps(REVIEW_ALVINA := real_review("Alvina", REVIEW_ALVINA)))
(OUT / "Preview-kids-app.html").write_text(kids)
print("kids preview:", len(kids)//1024, "KB")


# ---------------------------------------------------------------- parent

def sheet(kid, block, rows):
    """rows: (q, gave, want, ok, pad)"""
    return [{"kid": kid, "block": block, "n": i + 1, "q": q, "gave": g,
             "want": w, "ok": 1 if ok else 0, "pad": pad}
            for i, (q, g, w, ok, pad) in enumerate(rows)]

ANSWERS = (
  sheet("Alvina", "math", [
    ("7 \u00d7 4", "28", "28", 1, "m0-0"),
    ("4 \u00d7 11", "44", "44", 1, "m0-1"),
    ("45 \u00d7 4", "170", "180", 0, "m0-2"),
    ("8 \u00d7 4", "32", "32", 1, "m0-3"),
    ("37 \u00d7 4", "148", "148", 1, "m0-4"),
    ("12 \u00f7 4", "3", "3", 1, "m1-0"),
    ("27 \u00f7 4", "6", "6", 1, "m1-1"),
    ("27 \u00f7 4 (remainder)", "24", "3", 0, "m1-1"),
    ("64 \u00f7 4", "16", "16", 1, "m1-2"),
    ("1/2 = ?/4", "4/4", "2/4", 0, "m2-0"),
    ("3 10/12 \u2212 2 2/12 (simplify)", "1 8/12", "1 2/3", 0, "m2-1"),
    ("6 9/12 \u2212 3 1/12 (simplify)", "3 8/12", "3 2/3", 0, "m2-2"),
    ("6 11/14 \u2212 4 5/14 (simplify)", "blank", "2 3/7", 0, "m2-3"),
    ("1 5/8 + 3 6/8 =", "5 3/8", "5 3/8", 1, "m2-4"),
    ("2/4 in simplest form", "1/2", "1/2", 1, "m2-5"),
  ]) +
  sheet("Alvina", "think", [
    ("11 \u00d7 ___ = 110", "10", "10", 1, "t0-0"),
    ("(5 \u00d7 13) + ___ = 83", "18", "18", 1, "t0-1"),
    ("What comes next? 3, 9, 27, 81, ___", "blank", "243", 0, "t0-2"),
    ("A is 5 more than B. B is 2 times C. C is 7. What is A?", "A is 19", "19", 0, "t0-3"),
    ("A van holds 8 people. 38 people need a ride. How many vans?", "5", "5", 1, "t0-4"),
    ("A film starts at 2:15 pm and lasts 3 hours and 45 minutes. What time does it end?",
     "6:00 pm", "6:00 pm", 1, "t0-5"),
    ("What comes next? 2, 6, 18, 54, ___", "blank", "162", 0, "t0-6"),
  ]) +
  sheet("Alvina", "eng", [
    ("Spelling: important", "importent", "important", 0, "sp0"),
    ("Spelling: neighbor", "nieghbor", "neighbor", 0, "sp1"),
    ("Spelling: surprise", "surprise", "surprise", 1, "sp2"),
    ("They ____ going home.", "are", "are", 1, ""),
    ("What does 'reluctant' mean?", "unwilling", "unwilling", 1, ""),
    ("Choose the adverb: She ran ____.", "quickly", "quickly", 1, ""),
  ]) +
  sheet("Andrila", "math", [
    ("7 \u00d7 4", "28", "28", 1, "m0-0"),
    ("8 \u00d7 7", "54", "56", 0, "m0-1"),
    ("45 \u00d7 4", "180", "180", 1, "m0-2"),
  ]) +
  sheet("Andrila", "eng", [
    ("Choose the adverb: She ran ____.", "fast", "quickly", 0, ""),
    ("Spelling: straight", "strait", "straight", 0, "sp0"),
  ])
)

LIVE = {
    "ok": True, "date": TODAY, "serverTime": "2026-11-05T22:41:00Z",
    "live": [{
        "kid":"Alvina","block":"math","date":TODAY,"answered":11,"total":18,"mins":14,
        "stuck": json.dumps([{"q":7,"why":"blank 6 min"},{"q":12,"why":"changed 5x"}]),
        "seen_at":"2026-11-05T22:40:40Z"
    }],
    "today": [
        {"kid":"Andrila","date":TODAY,"block":"math","got":17,"total":18,"secs":1180,"at":""},
        {"kid":"Andrila","date":TODAY,"block":"eng","got":16,"total":18,"secs":2050,"at":""},
        {"kid":"Alvina","date":TODAY,"block":"math","got":16,"total":18,"secs":1320,"at":""},
        {"kid":"Alvina","date":TODAY,"block":"eng","got":14,"total":18,"secs":2210,"at":""},
        {"kid":"Alvina","date":TODAY,"block":"think","got":9,"total":10,"secs":1010,"at":""},
    ],
    "misses": [
        {"kid":"Alvina","date":TODAY,"block":"math","q":"45 \u00d7 4","gave":"170","want":"180"},
        {"kid":"Alvina","date":TODAY,"block":"math","q":"7 5/12 \u2212 3 1/12 (simplify)",
         "gave":"4 4/12","want":"4 1/3"},
        {"kid":"Alvina","date":TODAY,"block":"math","q":"2/4 in simplest form","gave":"2/4","want":"1/2"},
        {"kid":"Alvina","date":TODAY,"block":"eng","q":"They ____ going home.","gave":"is","want":"are"},
        {"kid":"Alvina","date":TODAY,"block":"eng","q":"What does 'reluctant' mean?",
         "gave":"excited","want":"unwilling"},
        {"kid":"Alvina","date":TODAY,"block":"think","q":"What comes next: 3, 6, 12, 24, ?",
         "gave":"30","want":"48"},
        {"kid":"Andrila","date":TODAY,"block":"math","q":"8 \u00d7 7","gave":"54","want":"56"},
        {"kid":"Andrila","date":TODAY,"block":"eng","q":"Choose the adverb: She ran ____.",
         "gave":"fast","want":"quickly"},
    ],
    "tests": [],
    "answers": ANSWERS,
    "stuck": [
        {"kid":"Alvina","date":TODAY,"block":"math","pad":"m2-3",
         "q":"6 11/14 \u2212 4 5/14 (simplify)","asked":"2026-11-05T22:38:00Z","answered":0},
        {"kid":"Alvina","date":TODAY,"block":"think","pad":"t4",
         "q":"What comes next: 3, 6, 12, 24, ?","asked":"2026-11-05T22:12:00Z","answered":1},
    ],
}

REVIEW_ANDRILA = {
    "kid":"Andrila","date":TODAY,
    "praise":"Fastest maths sheet yet and still 17 out of 18.",
    "spelling":[{"word":"straight","wrote":"strait","right":"straight"}],
    "essay":{"summary":"Clear and well ordered, every sentence does a job. It could be longer.",
             "fixes":[{"was":"alot","should":"a lot","why":"always two words"}],
             "next":"Add one sentence saying how the place makes you feel."},
    "math":{"approach":"Works it out in her head and writes only the answer.",
            "note":"Worth asking her to show one line, so a slip is findable."},
    "focus":["showing working"],
}

REVIEW_ANDRILA = real_review("Andrila", REVIEW_ANDRILA)

# Alvina's real working for 6 9/12 - 3 1/12, so the pencil opens real handwriting
_real = SRC / "archive/2026-11/2026-11-05/Alvina/math-m2-3-strokes.json"
REAL_INK = _real.read_text() if _real.exists() else json.dumps({"v":1,"mode":"ink","imgs":[],"text":"","s":[]})

INK = {
    "Alvina": {"ok":True,"kid":"Alvina","date":TODAY,"pads":[
        {"block":"math","pad":"m2-1","mode":"photo","bytes":0,"at":"",
         "data": json.dumps({"v":1,"mode":"photo","imgs":[SHOTS["math"]],"text":""})},
        {"block":"math","pad":"m0-2","mode":"type","bytes":0,"at":"",
         "data": json.dumps({"v":1,"mode":"type","imgs":[],"text":"40x4=160\n5x4=20\n160+20=170"})},
        {"block":"math","pad":"m2-2","mode":"ink","bytes":0,"at":"",
         "data": REAL_INK},
        {"block":"eng","pad":"write","mode":"photo","bytes":0,"at":"",
         "data": json.dumps({"v":1,"mode":"photo","imgs":[SHOTS["essay"]],"text":""})},
    ]},
    "Andrila": {"ok":True,"kid":"Andrila","date":TODAY,"pads":[]},
}

parent = inline_scripts((SRC / "parent" / "index.html").read_text(), SRC / "parent")
parent = parent.replace("</head>", """
<script>
/* ================= PREVIEW ONLY ================= */
(function(){
  var LIVE = %s, REVIEWS = %s, INK = %s;
  function reply(o){ return Promise.resolve(new Response(JSON.stringify(o),
    { headers:{ "Content-Type":"application/json" } })); }
  var real = window.fetch;
  window.fetch = function(u, o){
    u = String(u);
    if(u.indexOf("/live") > -1){
      if(u.indexOf("key=") > -1 && u.indexOf("key=&") === -1) return reply(LIVE);
      return Promise.resolve(new Response("{}", { status:401 }));
    }
    if(u.indexOf("/review") > -1){
      var m = /kid=([^&]+)/.exec(u);
      var k = m ? decodeURIComponent(m[1]) : "Alvina";
      return reply({ ok:true, review: REVIEWS[k] || null });
    }
    if(u.indexOf("/ink") > -1){
      var n = /kid=([^&]+)/.exec(u);
      return reply(INK[n ? decodeURIComponent(n[1]) : "Alvina"] || { ok:true, pads:[] });
    }
    if(u.indexOf("/solution") > -1) return reply({ ok:true });
    if(u.indexOf("/retake") > -1) return reply({ ok:true });
    return real.apply(this, arguments);
  };
  try{ localStorage.setItem("dd:parentKey", "preview"); }catch(e){}

  var bar = document.createElement("div");
  bar.className = "previewbar";
  bar.innerHTML = "<b>Preview</b> &middot; real page, invented work. " +
                  "Switch children at the top; press a <b>notes</b> button to open her pages.";
  function add(){ document.body.appendChild(bar); }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
})();
</script>
<style>
.previewbar{position:fixed;left:50%%;transform:translateX(-50%%);bottom:0;z-index:90;
  background:#6D28D9;color:#fff;font-size:.78rem;padding:5px 16px;border-radius:9px 9px 0 0;
  box-shadow:0 -2px 12px rgba(0,0,0,.2);max-width:96vw;text-align:center}
.previewbar b{letter-spacing:.04em}
</style>
</head>""" % (json.dumps(LIVE), json.dumps({"Alvina":REVIEW_ALVINA,"Andrila":REVIEW_ANDRILA}),
              json.dumps(INK)))
(OUT / "Preview-parent-dashboard.html").write_text(parent)
print("parent preview:", len(parent)//1024, "KB")
