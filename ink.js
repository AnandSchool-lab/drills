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
var live = [];          // pads currently on screen, so we can flush them all at once

/*  Ink.mount(host, key, opts)

    A place to put their working. Two ways in:

      Photo  - they work it out on paper and photograph it. This is the
               one that wins. Handwriting on paper is better practice
               than handwriting on glass, their school work is on paper
               anyway, and a photo cannot be ruined by a resting wrist,
               a pinch-zoom or Safari deciding to scroll instead.
      Type   - a keyboard, for a laptop or a quick line of reasoning.

    Photographs are shrunk and re-encoded in the browser before they go
    anywhere: a 4MB iPad photo becomes about 150KB, which is the
    difference between this fitting in the free tier for years and not.

      host : element to fill
      key  : storage key, e.g. ink:Alvina:2026-11-05:math:7
      opts : { placeholder, textId, label, onChange, maxShots }
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
        var ctx = cv.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        var out = cv.toDataURL("image/jpeg", JPEG_Q);
        /* one more pass if a very busy page still came out large */
        if(out.length > MAX_SHOT) out = cv.toDataURL("image/jpeg", 0.5);
        if(out.length > MAX_SHOT) return reject(new Error("photo too large"));
        resolve(out);
      }catch(e){ reject(e); }
    };
    img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error("could not read that photo")); };
    img.src = url;
  });
}

function mount(host, key, opts){
  opts = opts || {};
  var maxShots = opts.maxShots || 4;

  host.classList.add("pad");
  host.innerHTML =
    '<div class="pad-tools">' +
      '<label class="pad-btn shoot">&#128247; Take a photo' +
        '<input type="file" accept="image/*" capture="environment" hidden></label>' +
      '<button type="button" class="pad-btn" data-type>&#9000; Type instead</button>' +
      '<span class="pad-state"></span>' +
    '</div>' +
    '<div class="pad-body">' +
      '<div class="shots"></div>' +
      '<p class="pad-ph">' + (opts.placeholder || "Work it out on paper, then photograph it.") + '</p>' +
      '<textarea class="pad-text"' + (opts.textId ? ' id="' + opts.textId + '"' : "") +
        ' hidden spellcheck="false" placeholder="Type your working here"' +
        ' aria-label="' + (opts.label || "your working") + '"></textarea>' +
    '</div>';

  var fileIn = host.querySelector("input[type=file]");
  var shotsEl = host.querySelector(".shots");
  var ta = host.querySelector(".pad-text");
  var ph = host.querySelector(".pad-ph");
  var state = host.querySelector(".pad-state");

  var imgs = [], typing = false, saveTimer = null, dirty = false;

  function current(){
    return typing
      ? { v:1, mode:"type", text: ta.value }
      : { v:1, mode:"photo", imgs: imgs, text: ta.value || "" };
  }

  function flush(){
    if(!dirty) return;
    dirty = false;
    state.textContent = "saving";
    put(key, current()).then(function(){
      state.textContent = "saved";
      setTimeout(function(){ if(state.textContent === "saved") state.textContent = ""; }, 1600);
    });
    if(opts.onChange) opts.onChange(current());
  }
  function touch(){
    dirty = true;
    if(saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 500);
  }

  function paint(){
    shotsEl.innerHTML = imgs.map(function(src, i){
      return '<figure class="shot"><img src="' + src + '" alt="page ' + (i+1) + '">' +
             '<button type="button" class="shotx" data-i="' + i + '" ' +
             'aria-label="remove page ' + (i+1) + '">&times;</button></figure>';
    }).join("");
    shotsEl.querySelectorAll(".shotx").forEach(function(b){
      b.addEventListener("click", function(){
        imgs.splice(+b.dataset.i, 1); paint(); touch();
      });
    });
    ph.hidden = typing || imgs.length > 0;
    host.querySelector(".shoot").hidden = typing || imgs.length >= maxShots;
  }

  fileIn.addEventListener("change", function(){
    var f = fileIn.files && fileIn.files[0];
    fileIn.value = "";
    if(!f) return;
    state.textContent = "adding…";
    shrink(f).then(function(src){
      imgs.push(src);
      if(imgs.length > maxShots) imgs = imgs.slice(-maxShots);
      paint(); touch();
    }).catch(function(e){
      state.textContent = e.message || "could not add that";
      setTimeout(function(){ state.textContent = ""; }, 3000);
    });
  });

  host.querySelector("[data-type]").addEventListener("click", function(){
    typing = !typing;
    ta.hidden = !typing;
    shotsEl.hidden = typing;
    host.querySelector("[data-type]").classList.toggle("on", typing);
    host.querySelector("[data-type]").innerHTML = typing
      ? "&#128247; Photo instead" : "&#9000; Type instead";
    paint();
    if(typing) ta.focus();
    touch();
  });

  ta.addEventListener("input", function(){ touch(); });

  var ready = get(key).then(function(saved){
    if(saved && saved.mode === "type"){
      typing = true; ta.value = saved.text || "";
      ta.hidden = false; shotsEl.hidden = true;
      host.querySelector("[data-type]").classList.add("on");
      host.querySelector("[data-type]").innerHTML = "&#128247; Photo instead";
    } else if(saved){
      imgs = saved.imgs || [];
      ta.value = saved.text || "";
    }
    paint();
    return true;
  });

  var handle = {
    key: key,
    ready: ready,
    flush: function(){ if(saveTimer) clearTimeout(saveTimer); flush(); },
    isEmpty: function(){ return typing ? !ta.value.trim() : !imgs.length; },
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

  /* Safari can be pinch-zoomed, and a fixed element in a zoomed page does
     not stay where it is told - which is how Done ended up off the left
     edge of the screen. Pin the box to the visual viewport instead. */
  function fit(){
    var vv = window.visualViewport;
    if(!vv) return;
    back.style.width  = vv.width + "px";
    back.style.height = vv.height + "px";
    back.style.left   = vv.offsetLeft + "px";
    back.style.top    = vv.offsetTop + "px";
  }
  fit();
  if(window.visualViewport){
    window.visualViewport.addEventListener("resize", fit);
    window.visualViewport.addEventListener("scroll", fit);
  }

  function close(){
    try{ pad.flush(); }catch(e){}
    var data = null;
    try{ data = pad.data(); }catch(e){}
    if(window.visualViewport){
      window.visualViewport.removeEventListener("resize", fit);
      window.visualViewport.removeEventListener("scroll", fit);
    }
    document.body.classList.remove("sheetopen");
    back.remove();
    live = live.filter(function(p){ return p !== pad; });
    if(opts.onClose) opts.onClose(data);
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
