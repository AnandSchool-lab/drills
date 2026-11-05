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
function get(key){      return tx("readonly",  function(s){ return s.get(key); }).catch(function(){ return null; }); }
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

function prefersTyping(){
  try{ return !(navigator.maxTouchPoints > 0); }catch(e){ return true; }
}

/*  Ink.mount(host, key, opts)
      host : element to fill
      key  : storage key, e.g. ink:Alvina:2026-11-05:math:7
      opts : { height, placeholder, ruled, onChange }
*/
function mount(host, key, opts){
  opts = opts || {};
  var height = opts.height || 120;
  var ruled  = opts.ruled !== false;

  host.classList.add("pad");
  host.innerHTML =
    '<div class="pad-surface' + (ruled ? " ruled" : "") + '" style="height:' + height + 'px">' +
      '<span class="pad-ph">' + (opts.placeholder || "show your working") + '</span>' +
      '<canvas class="pad-canvas" hidden></canvas>' +
      '<textarea class="pad-text"' + (opts.textId ? ' id="' + opts.textId + '"' : "") +
        ' hidden spellcheck="false" aria-label="' + (opts.label || "your working") + '"></textarea>' +
    '</div>' +
    '<div class="pad-tools">' +
      '<button type="button" class="pad-btn" data-m="ink">&#9998; Pencil</button>' +
      '<button type="button" class="pad-btn" data-m="type">&#9000; Type</button>' +
      '<button type="button" class="pad-btn" data-undo>&#9003; Undo</button>' +
      '<button type="button" class="pad-btn" data-clear>Clear</button>' +
      '<span class="pad-state"></span>' +
    '</div>';

  var surf = host.querySelector(".pad-surface");
  var cv   = host.querySelector(".pad-canvas");
  var ta   = host.querySelector(".pad-text");
  var ph   = host.querySelector(".pad-ph");
  var state= host.querySelector(".pad-state");

  var data = { v:1, mode: prefersTyping() ? "type" : "ink", w:0, h:height, s:[] };
  var ctx = null, drawing = false, cur = null, t0 = Date.now(), saveTimer = null, dirty = false;

  function width(){ return Math.max(40, Math.round(surf.clientWidth)); }

  function ensureCanvas(){
    if(ctx) return ctx;
    cv.hidden = false;
    data.w = width();
    ctx = fitCanvas(cv, data.w, height);
    return ctx;
  }

  function redraw(){
    if(!ctx) return;
    ctx.clearRect(0, 0, data.w, height);
    paint(ctx, data, 1);
  }

  function showPlaceholder(){
    var empty = data.mode === "type" ? !ta.value : !data.s.length;
    ph.hidden = !empty;
  }

  function setMode(m, focus){
    data.mode = m;
    host.querySelectorAll(".pad-btn[data-m]").forEach(function(b){
      b.classList.toggle("on", b.dataset.m === m);
    });
    if(m === "type"){
      ta.hidden = false; cv.hidden = true;
      if(focus) ta.focus();
    } else {
      ta.hidden = true;
      if(data.s.length || focus){ ensureCanvas(); cv.hidden = false; redraw(); }
    }
    showPlaceholder();
  }

  function flush(){
    if(!dirty) return;
    dirty = false;
    var payload = data.mode === "type"
      ? { v:1, mode:"type", text: ta.value }
      : { v:1, mode:"ink", w:data.w, h:height, s:data.s };
    state.textContent = "saving";
    put(key, payload).then(function(){
      state.textContent = "saved";
      setTimeout(function(){ if(state.textContent === "saved") state.textContent = ""; }, 1600);
    });
    if(opts.onChange) opts.onChange(payload);
  }

  function touch(){
    dirty = true;
    if(saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 500);
  }

  function at(e){
    var r = surf.getBoundingClientRect();
    return [ Math.round((e.clientX - r.left) * 10) / 10,
             Math.round((e.clientY - r.top)  * 10) / 10 ];
  }

  function accepts(e){
    if(e.pointerType === "pen"){ penSeen = true; return true; }
    if(e.pointerType === "touch") return !penSeen;     // palm, once a Pencil is in use
    return true;                                        // mouse / trackpad
  }

  surf.addEventListener("pointerdown", function(e){
    if(data.mode !== "ink" || !accepts(e)) return;
    ensureCanvas();
    if(data.w !== width()){ data.w = width(); ctx = fitCanvas(cv, data.w, height); redraw(); }
    drawing = true;
    try{ surf.setPointerCapture(e.pointerId); }catch(err){}
    var p = at(e);
    cur = { t: Date.now() - t0, p: [p[0], p[1]] };
    data.s.push(cur);
    ph.hidden = true;
    e.preventDefault();
  });

  surf.addEventListener("pointermove", function(e){
    if(!drawing || !cur) return;
    /* Coalesced events give the points the browser batched between frames,
       which is what makes a fast stroke smooth. It can legitimately come
       back empty - an empty array is truthy, so check the length. */
    var co = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    var evts = (co && co.length) ? co : [e];
    ctx.strokeStyle = "#1D4ED8"; ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cur.p[cur.p.length-2], cur.p[cur.p.length-1]);
    for(var i = 0; i < evts.length; i++){
      var p = at(evts[i]);
      cur.p.push(p[0], p[1]);
      ctx.lineTo(p[0], p[1]);
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
  surf.addEventListener("pointerleave", endStroke);

  ta.addEventListener("input", function(){ showPlaceholder(); touch(); });

  host.querySelectorAll(".pad-btn[data-m]").forEach(function(b){
    b.addEventListener("click", function(){ setMode(b.dataset.m, true); touch(); });
  });
  host.querySelector("[data-undo]").addEventListener("click", function(){
    if(data.mode === "type"){ ta.value = ""; }
    else { data.s.pop(); redraw(); }
    showPlaceholder(); touch();
  });
  host.querySelector("[data-clear]").addEventListener("click", function(){
    data.s = []; ta.value = "";
    if(ctx) ctx.clearRect(0, 0, data.w, height);
    showPlaceholder(); touch();
  });

  /* Put back whatever was here last time. */
  var ready = get(key).then(function(saved){
    if(saved && saved.mode === "type"){
      ta.value = saved.text || "";
      setMode("type", false);
    } else if(saved && saved.s && saved.s.length){
      data.s = saved.s;
      data.w = saved.w || width();
      setMode("ink", false);
      ensureCanvas();
      /* saved at a different width? scale it to fit rather than crop it */
      var k = width() / (saved.w || width());
      if(Math.abs(k - 1) > 0.02){
        data.s = saved.s.map(function(st){
          var p = st.p.slice();
          for(var i = 0; i < p.length; i += 2) p[i] = Math.round(p[i] * k * 10) / 10;
          return { t: st.t, p: p };
        });
        data.w = width();
      }
      redraw();
    } else {
      setMode(data.mode, false);
    }
    showPlaceholder();
    return true;
  });

  var handle = {
    key: key,
    ready: ready,
    flush: function(){ if(saveTimer) clearTimeout(saveTimer); flush(); },
    isEmpty: function(){ return data.mode === "type" ? !ta.value.trim() : !data.s.length; },
    data: function(){
      return data.mode === "type"
        ? { v:1, mode:"type", text: ta.value }
        : { v:1, mode:"ink", w:data.w, h:height, s:data.s };
    }
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

window.Ink = {
  mount: mount,
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
