/* ============================================================
   ink.js - the work pad.
   A place to show your working: Apple Pencil strokes, or typing.

   Two rules shape this file:
     1. Nothing is ever lost. Every stroke is written to IndexedDB
        a moment after the pen lifts.
     2. The same pad works with a Pencil, a finger, or a keyboard,
        and stores all three the same way, so the rest of the app
        never has to care which one arrived.

   Stored shape (small on purpose - a page of working is a few KB):
     { v:1, mode:"ink", w:<css px>, h:<css px>,
       s:[ { t:<ms since pad opened>, p:[x,y, x,y, ...] }, ... ] }
     { v:1, mode:"type", text:"..." }
   ============================================================ */
(function(){
"use strict";

var DB_NAME = "drills-ink", DB_VER = 1, STORE = "pads";
var dbp = null;

function db(){
  if(dbp) return dbp;
  dbp = new Promise(function(resolve, reject){
    if(!self.indexedDB) return reject(new Error("no indexeddb"));
    var rq = indexedDB.open(DB_NAME, DB_VER);
    rq.onupgradeneeded = function(){
      var d = rq.result;
      if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    };
    rq.onsuccess = function(){ resolve(rq.result); };
    rq.onerror   = function(){ reject(rq.error); };
  }).catch(function(e){ dbp = null; throw e; });
  return dbp;
}

function tx(mode, fn){
  return db().then(function(d){
    return new Promise(function(resolve, reject){
      var t = d.transaction(STORE, mode), s = t.objectStore(STORE), out;
      out = fn(s);
      t.oncomplete = function(){ resolve(out && out.result !== undefined ? out.result : out); };
      t.onerror    = function(){ reject(t.error); };
      t.onabort    = function(){ reject(t.error); };
    });
  });
}

/* Storage never throws at the caller. A failed save must not stop a child
   from carrying on with the next problem - it retries on the next stroke. */
function put(key, val){ return tx("readwrite", function(s){ return s.put(val, key); }).catch(function(){ return null; }); }
/* A missing key resolves to undefined. (tx hands back the request itself
   when its result is undefined, which made "no copy here" look like a
   copy and stopped her work being brought back from the server.) */
function get(key){
  return tx("readonly", function(s){ return s.get(key); })
    .then(function(v){ return (typeof IDBRequest !== "undefined" && v instanceof IDBRequest) ? undefined : v; })
    .catch(function(){ return null; });
}
function del(key){      return tx("readwrite", function(s){ return s.delete(key); }).catch(function(){ return null; }); }

function allKeys(){
  return tx("readonly", function(s){ return s.getAllKeys(); }).catch(function(){ return []; });
}

/* Drop pads older than the cutoff date (YYYY-MM-DD). Keys carry the date. */
function pruneBefore(cutoff){
  return allKeys().then(function(keys){
    var old = (keys || []).filter(function(k){
      var m = String(k).match(/:(\d{4}-\d{2}-\d{2}):/);
      return m && m[1] < cutoff;
    });
    return Promise.all(old.map(del));
  }).catch(function(){ return null; });
}

/* Everything stored for one child on one day - what the nightly export reads. */
function allFor(kid, date){
  var prefix = "ink:" + kid + ":" + date + ":";
  return allKeys().then(function(keys){
    var mine = (keys || []).filter(function(k){ return String(k).indexOf(prefix) === 0; });
    return Promise.all(mine.map(function(k){
      return get(k).then(function(v){ return { key:String(k), data:v }; });
    }));
  }).catch(function(){ return []; });
}

/* ---------- drawing ---------- */

function fitCanvas(cv, w, h){
  var dpr = Math.min(window.devicePixelRatio || 1, 2);   // 2 is plenty, and halves the memory
  cv.width  = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width  = w + "px";
  cv.style.height = h + "px";
  var ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  return ctx;
}

function strokePath(ctx, pts, scale){
  if(pts.length < 2) return;
  scale = scale || 1;
  ctx.beginPath();
  ctx.moveTo(pts[0]*scale, pts[1]*scale);
  if(pts.length === 2){                       // a single dot
    ctx.lineTo(pts[0]*scale + 0.1, pts[1]*scale + 0.1);
  } else {
    for(var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]*scale, pts[i+1]*scale);
  }
  ctx.stroke();
}

function paint(ctx, data, scale, color, width){
  ctx.strokeStyle = color || "#1D4ED8";
  ctx.lineWidth = (width || 2.4) * (scale || 1);
  (data && data.s ? data.s : []).forEach(function(st){ strokePath(ctx, st.p, scale); });
}

/* A flat PNG of a pad - used for the nightly PDF and the parent view. */
function toImage(data, scale){
  scale = scale || 2;
  var w = (data && data.w) || 600, h = (data && data.h) || 140;
  var cv = document.createElement("canvas");
  cv.width = Math.round(w * scale);
  cv.height = Math.round(h * scale);
  var ctx = cv.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  paint(ctx, data, scale, "#17315C", 2.4);
  return cv.toDataURL("image/png");
}

/* Draw it back in the order it was written. This is the bit that shows
   how she got there, rather than only what she ended up with. */
function replay(cv, data, opts){
  opts = opts || {};
  var w = (data && data.w) || 600, h = (data && data.h) || 140;
  var ctx = fitCanvas(cv, w, h);
  var speed = opts.speed || 1;
  var strokes = (data && data.s) ? data.s : [];
  var i = 0, j = 2, raf = null;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = opts.color || "#1D4ED8";
  ctx.lineWidth = 2.4;

  function step(){
    if(i >= strokes.length){ if(opts.onDone) opts.onDone(); return; }
    var pts = strokes[i].p;
    var chunk = Math.max(2, Math.round(4 * speed) * 2);
    var end = Math.min(pts.length, j + chunk);
    ctx.beginPath();
    ctx.moveTo(pts[j-2], pts[j-1]);
    for(var k = j; k < end; k += 2) ctx.lineTo(pts[k], pts[k+1]);
    ctx.stroke();
    j = end;
    if(j >= pts.length){ i++; j = 2; }
    raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);
  return function cancel(){ if(raf) cancelAnimationFrame(raf); };
}

/* ---------- the pad ---------- */

/* A Pencil on the glass means the hand resting beside it is not a stroke.
   Once we have seen a real pen, touches stop counting as drawing. */
var penSeen = false;
var live = [];          // pads currently on screen, so we can flush them all at once

/* ============================================================
   PALM SHIELD

   Writing with a Pencil means resting a wrist on the glass, and a
   wrist lands wherever it lands - on Undo, on Clear, on Clear
   everything. Rejecting palm touches inside the writing box was never
   enough: the damage happens to the buttons around it.

   So while a Pencil is actually in use, a finger or palm cannot press
   anything. The Pencil still can - with one in your hand you tap
   buttons with its tip anyway - and plain scrolling still works,
   because only interactive targets are blocked, never the page.

   It lifts itself 45 seconds after the last stroke, so putting the
   Pencil down and using fingers needs no thought and no toggle.
   ============================================================ */
var SHIELD_MS = 45000;
var shieldUntil = 0, swallowClick = false;

function shieldOn(){ return Date.now() < shieldUntil; }
function touchPen(){
  var was = shieldOn();
  shieldUntil = Date.now() + SHIELD_MS;
  if(!was) paintShield(true);
  clearTimeout(touchPen._t);
  touchPen._t = setTimeout(function(){ paintShield(false); }, SHIELD_MS + 50);
}

function paintShield(on){
  /* A palm resting on the glass does not only press things - it also
     starts an iOS text selection, which throws Copy / Look Up / Translate
     over the page mid-sentence. Turning selection off while the Pencil is
     in use stops that; the answer boxes stay selectable so typing and
     editing still work normally. */
  try{ document.body.classList.toggle("pen-mode", !!on); }catch(e){}
  var el = document.getElementById("palmShield");
  if(!el && !on) return;
  if(!el){
    el = document.createElement("div");
    el.id = "palmShield";
    el.className = "palmshield";
    el.innerHTML = '<span>&#9998; Pencil in use — taps ignored</span>' +
                   '<button type="button">Use my finger</button>';
    el.querySelector("button").addEventListener("click", function(){
      shieldUntil = 0; paintShield(false);
    });
    document.body.appendChild(el);
  }
  el.hidden = !on;
}

var BLOCKABLE = "button,a,input,select,textarea,label,summary,[data-clear],[role=button]";

function guard(e){
  if(!shieldOn()) return;
  if(e.pointerType && e.pointerType !== "touch") return;   // the Pencil may press anything
  var t = e.target;
  if(!t || !t.closest) return;
  if(t.closest(".pad-surface")) return;                    // the pad does its own rejecting
  if(t.closest("#palmShield")) return;                     // never block the way out
  if(!t.closest(BLOCKABLE)) return;                        // let scrolling and plain taps through
  e.preventDefault();
  e.stopPropagation();
  swallowClick = true;
}

if(typeof document !== "undefined"){
  document.addEventListener("pointerdown", guard, true);
  document.addEventListener("click", function(e){
    if(!swallowClick) return;
    swallowClick = false;
    if(e.target && e.target.closest && e.target.closest(".pad-surface, #palmShield")) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
}

function prefersTyping(){
  try{ return !(navigator.maxTouchPoints > 0); }catch(e){ return true; }
}

/*  Ink.mount(host, key, opts)

    Three ways to show working, in one pad. Whatever they pick, the
    others keep whatever was already in them.

      Pencil - write straight on the problem. The default on an iPad.
      Photo  - for work already done on paper, or a school sheet.
      Type   - a keyboard, for a laptop.

    On the lag: the first version of this measured the canvas position
    once per point, inside a loop over coalesced events, inside every
    pointermove. An Apple Pencil reports about ten points a frame, so
    that was ten forced layout calculations per frame and the stroke
    visibly trailed the nib. The rect is now measured when it can
    actually have changed - on pointer down, on resize, on scroll -
    and never in the drawing path.
*/
var MAX_EDGE = 1400;      // px on the long side - plenty to read handwriting
var JPEG_Q   = 0.68;
var MAX_SHOT = 700 * 1024;

function shrink(file){
  return new Promise(function(resolve, reject){
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function(){
      try{
        var w = img.naturalWidth, h = img.naturalHeight;
        var k = Math.min(1, MAX_EDGE / Math.max(w, h));
        var cv = document.createElement("canvas");
        cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        var c = cv.getContext("2d");
        c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height);
        c.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        var out = cv.toDataURL("image/jpeg", JPEG_Q);
        if(out.length > MAX_SHOT) out = cv.toDataURL("image/jpeg", 0.5);
        if(out.length > MAX_SHOT) return reject(new Error("photo too large"));
        resolve(out);
      }catch(e){ reject(e); }
    };
    img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error("could not read that photo")); };
    img.src = url;
  });
}

function prefersTyping(){
  try{ return !(navigator.maxTouchPoints > 0); }catch(e){ return true; }
}

/* The page's own accent, so ink is bright blue on a dark iPad and deep
   blue on a light one. Saved strokes carry no colour; the parent page and
   the nightly images draw them dark on white whatever this was. */
function penColour(){
  try{
    var c = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    if(c) return c;
  }catch(e){}
  return "#1D4ED8";
}

function mount(host, key, opts){
  opts = opts || {};
  var height   = opts.height || 300;
  var maxShots = opts.maxShots || 4;

  host.classList.add("pad");
  if(opts.compact) host.classList.add("compact");
  host.innerHTML =
    '<div class="pad-tools">' +
      '<button type="button" class="pad-btn" data-m="ink">&#9998;' +
        (opts.compact ? '' : ' Pencil') + '</button>' +
      '<button type="button" class="pad-btn" data-m="type">&#9000;' +
        (opts.compact ? '' : ' Type') + '</button>' +
      '<label class="pad-btn" data-m="photo">&#128247; Photo' +
        '<input type="file" accept="image/*" capture="environment" hidden></label>' +
      '<span class="pad-gap"></span>' +
      '<button type="button" class="pad-btn" data-undo>&#9003;' +
        (opts.compact ? '' : ' Undo') + '</button>' +
      '<button type="button" class="pad-btn" data-clear>' +
        (opts.compact ? '&times;' : 'Clear') + '</button>' +
      '<span class="pad-state"></span>' +
    '</div>' +
    '<div class="pad-body">' +
      '<div class="pad-surface ruled"><span class="pad-ph">' +
        (opts.placeholder || "write your working here") + '</span>' +
        '<canvas class="pad-canvas"></canvas></div>' +
      '<div class="shots" hidden></div>' +
      '<textarea class="pad-text" hidden spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off"' +
        (opts.textId ? ' id="' + opts.textId + '"' : "") +
        ' placeholder="' + (opts.typePlaceholder || "Type your working here") + '"' +
        ' aria-label="' + (opts.label || "your working") + '"></textarea>' +
    '</div>';

  var body   = host.querySelector(".pad-body");
  var surf   = host.querySelector(".pad-surface");
  var cv     = host.querySelector(".pad-canvas");
  var shotsEl= host.querySelector(".shots");
  var ta     = host.querySelector(".pad-text");
  var fileIn = host.querySelector("input[type=file]");
  var state  = host.querySelector(".pad-state");

  var data = { v:1, mode: prefersTyping() ? "type" : "ink", w:0, h:height, s:[], imgs:[], text:"" };
  var ctx = null, drawing = false, cur = null, orig = null;
  var t0 = Date.now(), saveTimer = null, dirty = false;
  /* true once she has drawn, typed, erased or added a photo in this pad
     since it opened - so closing an untouched pad sends nothing anywhere */
  var changed = false;

  function sizeCanvas(){
    var w = Math.max(40, Math.round(surf.clientWidth));
    var h = Math.max(80, Math.round(surf.clientHeight));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = penColour(); ctx.lineWidth = 2.4;   /* set once, never per stroke */
    var old = data.w;
    data.w = w; data.h = h;
    if(old && Math.abs(w / old - 1) > 0.02) rescale(w / old);
    redraw();
  }

  function rescale(k){
    data.s = data.s.map(function(st){
      var p = st.p.slice();
      for(var i = 0; i < p.length; i += 2) p[i] = Math.round(p[i] * k * 10) / 10;
      return { t: st.t, p: p };
    });
  }

  function redraw(){
    if(!ctx) return;
    ctx.clearRect(0, 0, data.w, data.h);
    data.s.forEach(function(st){
      var p = st.p;
      if(p.length < 2) return;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]);
      if(p.length === 2) ctx.lineTo(p[0] + 0.1, p[1] + 0.1);
      else for(var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i+1]);
      ctx.stroke();
    });
  }

  function accepts(e){
    if(e.pointerType === "pen"){ penSeen = true; touchPen(); return true; }
    if(e.pointerType === "touch") return !penSeen;   /* palm, once a Pencil is in use */
    return true;
  }

  /* Where the nib is, without ever measuring the panel.

     offsetX/offsetY are already relative to the surface, so they stay
     right no matter what the panel does - moved by a zoomed Safari,
     scrolled, resized mid-stroke. Coalesced points carry only client
     coordinates, so they are placed as a delta from the event that
     brought them, which is exact and still touches no layout. */
  surf.addEventListener("pointerdown", function(e){
    if(data.mode !== "ink" || !accepts(e)) return;
    drawing = true;
    try{ surf.setPointerCapture(e.pointerId); }catch(err){}
    cur = { t: Date.now() - t0, p: [ r1(e.offsetX), r1(e.offsetY) ] };
    data.s.push(cur);
    var ph = host.querySelector(".pad-ph"); if(ph) ph.remove();
    e.preventDefault();
  });

  function r1(n){ return Math.round(n * 10) / 10; }

  surf.addEventListener("pointermove", function(e){
    if(!drawing || !cur) return;
    var co = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    var evts = (co && co.length) ? co : null;
    var p = cur.p;
    ctx.beginPath();
    ctx.moveTo(p[p.length-2], p[p.length-1]);
    if(!evts){
      var x = r1(e.offsetX), y = r1(e.offsetY);
      p.push(x, y); ctx.lineTo(x, y);
    } else {
      var ox = e.offsetX, oy = e.offsetY, cx = e.clientX, cy = e.clientY;
      for(var i = 0; i < evts.length; i++){
        var gx = r1(ox + (evts[i].clientX - cx));
        var gy = r1(oy + (evts[i].clientY - cy));
        p.push(gx, gy); ctx.lineTo(gx, gy);
      }
    }
    ctx.stroke();
    e.preventDefault();
  });

  function endStroke(e){
    if(!drawing) return;
    drawing = false;
    try{ surf.releasePointerCapture(e.pointerId); }catch(err){}
    if(cur && cur.p.length < 2) data.s.pop();
    cur = null;
    touch();
  }
  surf.addEventListener("pointerup", endStroke);
  surf.addEventListener("pointercancel", endStroke);

  /* ---- photos ---- */
  function paintShots(){
    shotsEl.innerHTML = data.imgs.map(function(src, i){
      return '<figure class="shot"><img src="' + src + '" alt="page ' + (i+1) + '">' +
        '<button type="button" class="shotx" data-i="' + i + '" aria-label="remove page">&times;</button></figure>';
    }).join("");
    shotsEl.querySelectorAll(".shotx").forEach(function(b){
      b.addEventListener("click", function(){ data.imgs.splice(+b.dataset.i, 1); paintShots(); touch(); });
    });
  }

  fileIn.addEventListener("change", function(){
    var f = fileIn.files && fileIn.files[0];
    fileIn.value = "";
    if(!f) return;
    state.textContent = "adding photo…";
    shrink(f).then(function(src){
      state.textContent = "";
      data.imgs.push(src);
      if(data.imgs.length > maxShots) data.imgs = data.imgs.slice(-maxShots);
      setMode("photo"); paintShots(); touch();
    }).catch(function(e){
      state.textContent = e.message || "could not add that";
      setTimeout(function(){ state.textContent = ""; }, 3000);
    });
  });

  /* ---- modes ---- */
  function setMode(m){
    data.mode = m;
    host.querySelectorAll(".pad-btn[data-m]").forEach(function(b){
      b.classList.toggle("on", b.dataset.m === m);
    });
    surf.hidden    = m !== "ink";
    shotsEl.hidden = m !== "photo";
    ta.hidden      = m !== "type";
    host.querySelector("[data-undo]").hidden = m === "photo";
    if(m === "ink") requestAnimationFrame(sizeCanvas);
  }

  host.querySelectorAll("button.pad-btn[data-m]").forEach(function(b){
    b.addEventListener("click", function(){ setMode(b.dataset.m); touch(); if(b.dataset.m === "type") ta.focus(); });
  });

  host.querySelector("[data-undo]").addEventListener("click", function(){
    if(data.mode === "type") ta.value = "";
    else { data.s.pop(); redraw(); }
    touch();
  });
  host.querySelector("[data-clear]").addEventListener("click", function(){
    if(data.mode === "photo") data.imgs = [];
    else if(data.mode === "type") ta.value = "";
    else { data.s = []; redraw(); }
    paintShots(); touch();
  });
  ta.addEventListener("input", function(){ touch(); });

  /* ---- saving ---- */
  function current(){
    return { v:1, mode:data.mode, w:data.w, h:data.h,
             s:data.s, imgs:data.imgs, text:ta.value || "" };
  }
  /* Saves quietly. It still writes every half second so nothing is ever
     lost, but a child does not need a running commentary about it - the
     only thing worth saying is when it has gone wrong. */
  function flush(){
    if(!dirty) return;
    dirty = false;
    put(key, current()).then(function(ok){
      state.textContent = (ok === null) ? "could not save" : "";
    });
    if(opts.onChange) opts.onChange(current());
  }
  function touch(){
    dirty = true; changed = true;
    if(saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 500);
  }

  var ready = get(key).then(function(saved){
    if(saved){
      data.s    = saved.s || [];
      data.imgs = saved.imgs || [];
      ta.value  = saved.text || "";
      data.w    = saved.w || 0;
      if(saved.mode) data.mode = saved.mode;
    }
    paintShots();
    setMode(data.mode);
    return true;
  });

  var handle = {
    key: key,
    ready: ready,
    flush: function(){ if(saveTimer) clearTimeout(saveTimer); flush(); },
    isEmpty: function(){ return !data.s.length && !data.imgs.length && !ta.value.trim(); },
    changed: function(){ return changed; },
    data: current
  };
  live.push(handle);
  return handle;
}

/* Called before any navigation, and when the app is backgrounded. A pad
   normally writes itself half a second after the pen lifts; this closes
   the gap where a child taps Home mid-stroke. */
function flushAll(){
  live.forEach(function(p){ try{ p.flush(); }catch(e){} });
}
function forget(){ live = []; }

if(typeof document !== "undefined"){
  window.addEventListener("pagehide", flushAll);
  document.addEventListener("visibilitychange", function(){
    if(document.visibilityState === "hidden") flushAll();
  });
}

/* ============================================================
   FULL-PAGE WORKING SHEET

   A 116px strip under a problem is not room to work out a fraction.
   This opens most of the screen instead: the question stays at the
   top so they can see what they are answering, and Done puts them
   back where they were with the working saved.
   ============================================================ */
function openSheet(key, opts){
  opts = opts || {};
  /* Never two at once. Tapping the button twice used to stack overlays,
     which is why the prompt and toolbar appeared three times down the page. */
  if(document.querySelector(".sheetback")) return null;
  var back = document.createElement("div");
  back.className = "sheetback";
  back.innerHTML =
    '<div class="sheetbox" role="dialog" aria-modal="true" aria-label="Working space">' +
      '<div class="sheethead">' +
        '<button type="button" class="sheetdone">&#10003; Save &amp; close</button>' +
        '<span class="sheetq"></span>' +
      '</div>' +
      '<div class="sheetbody"></div>' +
    '</div>';
  back.querySelector(".sheetq").textContent = opts.title || "Your working";
  document.body.appendChild(back);
  document.body.classList.add("sheetopen");

  var body = back.querySelector(".sheetbody");
  var host = document.createElement("div");
  body.appendChild(host);

  var pad = mount(host, key, {
    placeholder: opts.placeholder,
    textId: opts.textId,
    label: opts.label,
    maxShots: opts.maxShots,
    onChange: opts.onChange
  });

  /* The panel used to be re-positioned on every visual-viewport change, to
     keep Done on screen when Safari was pinch-zoomed. That moved the
     writing surface out from under its own coordinates mid-stroke, so the
     ink landed away from the nib. The drawing no longer cares where the
     panel is, so the panel can hold still. */

  function close(){
    try{ pad.flush(); }catch(e){}
    var data = null;
    try{ data = pad.data(); }catch(e){}
    var touched = false;
    try{ touched = pad.changed(); }catch(e){}
    document.body.classList.remove("sheetopen");
    back.remove();
    live = live.filter(function(p){ return p !== pad; });
    if(opts.onClose) opts.onClose(data, touched);
  }

  back.querySelector(".sheetdone").addEventListener("click", close);
  back.addEventListener("click", function(e){ if(e.target === back) close(); });
  document.addEventListener("keydown", function esc(e){
    if(e.key === "Escape"){ document.removeEventListener("keydown", esc); close(); }
  });
  return { close: close, pad: pad };
}

window.Ink = {
  mount: mount,
  openSheet: openSheet,
  flushAll: flushAll,
  forget: forget,
  save: put,
  load: get,
  clear: del,
  allFor: allFor,
  pruneBefore: pruneBefore,
  toImage: toImage,
  replay: replay,
  available: function(){ return !!self.indexedDB; }
};

})();
