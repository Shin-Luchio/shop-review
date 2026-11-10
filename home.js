/* ─────────────────────────────────────────────
   홈 · 15초 타이포그래피 인트로 + BGM
   128 BPM · 32박 = 15초. 음악과 화면은 같은 시계(오디오 시계)로 움직여요.
   외부 라이브러리 · 음악 파일 없이, 소리도 브라우저에서 직접 만들어요.
   ───────────────────────────────────────────── */
(function () {
  'use strict';
  var BPM = 128, B = 60 / BPM, END = 32 * B;           // 15.0초
  function K(k) { return k * B; }
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var body = document.body;
  var stage = $('#stage'), fin = $('#final'), gate = $('#gate'), flash = $('#flash'), glow = $('#glow'),
      lines = $('#lines'), panel = $('#panel'), ring = $('#ring'), canvas = $('#fx'), cx = canvas.getContext('2d'),
      bar = $('#bar'), tcEl = $('#tc'), epEl = $('#ep');
  var W = innerWidth, H = innerHeight, DPR = Math.min(2, window.devicePixelRatio || 1);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 수학 ── */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function p(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function lerp(a, b, x) { return a + (b - a) * x; }
  var out3 = function (x) { return 1 - Math.pow(1 - x, 3); };
  var out4 = function (x) { return 1 - Math.pow(1 - x, 4); };
  var outExpo = function (x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
  var outBack = function (x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  var inOut3 = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var in3 = function (x) { return x * x * x; };

  /* ── 글자 크기 맞추기 ── */
  function fit(el) {
    var fw = +el.getAttribute('data-fw'), fh = +el.getAttribute('data-fh'), mx = +(el.getAttribute('data-max') || 9999);
    el.style.fontSize = '100px';
    var w = el.scrollWidth || 1, h = el.offsetHeight || 1;
    var fs = Math.min(100 * fw * W / w, 100 * fh * H / h, mx);
    el.style.fontSize = fs + 'px';
    el._w = w * fs / 100; el._h = h * fs / 100;
  }
  var headWrap = $('#fin-head'), h1 = $('#h1'), h2 = $('#h2'), finalOffset = 0;
  function layout() {
    W = innerWidth; H = innerHeight;
    $$('[data-fw]').forEach(fit);
    h1.style.fontSize = (parseFloat(h2.style.fontSize) * 0.5) + 'px';
    var prev = headWrap.style.transform; headWrap.style.transform = 'none';
    var r = headWrap.getBoundingClientRect();
    finalOffset = H / 2 - (r.top + r.height / 2);
    headWrap.style.transform = prev;
    canvas.width = W * DPR; canvas.height = H * DPR; cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function put(el, o) {
    var s = 'translate(-50%,-50%) translate(' + (o.x || 0) + 'px,' + (o.y || 0) + 'px)';
    if (o.s != null && o.s !== 1) s += ' scale(' + o.s + ')';
    if (o.sk) s += ' skewX(' + o.sk + 'deg)';
    if (o.r) s += ' rotate(' + o.r + 'deg)';
    el.style.transform = s;
    el.style.opacity = o.o == null ? 1 : o.o;
    el.style.filter = o.b > 0.3 ? 'blur(' + o.b.toFixed(1) + 'px)' : 'none';
  }
  function hide(el) { if (el.style.opacity !== '0') el.style.opacity = '0'; }

  /* ═════════════ 장면 ═════════════ */
  // A · 타자 (0 ~ 4박)
  var A = $('#a'), chars = $$('#a .ch'), caret = $('#a .caret');
  var CH0 = 0.25, CHD = 0.095;
  function sA(t) {
    if (t > K(3.95)) { hide(A); return; }
    for (var i = 0; i < chars.length; i++) chars[i].style.opacity = t >= CH0 + i * CHD ? 1 : 0;
    var typing = t < CH0 + chars.length * CHD;
    caret.style.opacity = typing || Math.floor(t * 3.4) % 2 === 0 ? 1 : 0;
    var e = in3(p(t, K(3.3), K(3.9)));
    put(A, { y: -40 * e, o: 1 - e, b: 10 * e });
  }
  // B · 그래서, 말로 했습니다. (4 ~ 7.5박) → 7.5박에 칼같이 끊김
  var b1 = $('#b1'), b2 = $('#b2'), b3 = $('#b3');
  function sB(t) {
    if (t < K(4) || t >= K(7.5)) { hide(b1); hide(b2); hide(b3); return; }
    var grow = lerp(1, 1.12, in3(p(t, K(6), K(7.5))));
    var gap = H * 0.012;
    var y1 = -(b2._h / 2 + b1._h / 2 + gap), y3 = b2._h / 2 + b3._h / 2 + gap;
    var e1 = out3(p(t, K(4), K(4) + 0.3));
    put(b1, { y: (y1 + 24 * (1 - e1)) * grow, s: grow, o: e1 });
    var x2 = p(t, K(5), K(5) + 0.4), e2 = outExpo(x2);
    var jit = t > K(7) ? (Math.random() - .5) * 6 * p(t, K(7), K(7.5)) : 0;
    put(b2, { x: jit, s: lerp(1.8, 1, e2) * grow, o: t >= K(5) ? 1 : 0, b: (1 - e2) * 16 });
    b2.style.color = t >= K(6) ? 'var(--m-terra)' : '';
    var e3 = out3(p(t, K(6), K(6) + 0.3));
    put(b3, { y: (y3 + 30 * (1 - e3)) * grow, s: grow, o: e3 });
  }
  // C · 만들어줘. (8 ~ 9박) — 드롭
  var c1 = $('#c1'), c2 = $('#c2');
  function sC(t) {
    if (t < K(8) || t >= K(9)) { hide(c1); hide(c2); return; }
    var e = out4(p(t, K(8), K(8) + 0.16));
    put(c1, { s: lerp(2.8, 1, e), o: 1, b: (1 - e) * 22 });
    var e2 = out3(p(t, K(8.3), K(8.3) + 0.25));
    put(c2, { y: c1._h / 2 + c2._h / 2 + H * 0.02 + 12 * (1 - e2), o: e2 });
  }
  // D · 박자마다 바뀌는 단어 (9 ~ 16박)
  var WD = [9, 10, 11, 12, 13, 14, 15, 15.5];
  var words = WD.map(function (_, i) { return $('#w' + i); });
  function sD(t) {
    var active = -1;
    for (var i = 0; i < WD.length; i++) {
      var a = K(WD[i]), b = i < WD.length - 1 ? K(WD[i + 1]) : K(16), el = words[i];
      if (t < a || t >= b) { hide(el); continue; }
      active = i;
      var e = out4(p(t, a, a + 0.18));
      switch (i) {
        case 0: put(el, { s: lerp(1.35, 1, e), o: e, b: (1 - e) * 8 }); break;
        case 1: put(el, { x: lerp(-W * 0.1, 0, e), o: 1 }); break;
        case 2: put(el, { x: lerp(W * 0.12, 0, e), sk: lerp(-16, 0, e), o: 1 }); break;
        case 3: put(el, { s: lerp(0.8, 1, outBack(p(t, a, a + 0.26))), o: 1 }); break;
        case 4: put(el, { y: lerp(H * 0.16, 0, outBack(p(t, a, a + 0.3))), o: 1 }); break;
        case 5: put(el, { s: lerp(0.5, 1, outExpo(p(t, a, a + 0.22))), o: 1 }); break;
        case 6:
          var g = 1 - p(t, a, a + 0.32), d = 3 + 14 * g;
          put(el, { x: (Math.random() - .5) * 26 * g, o: 1 });
          el.style.textShadow = d + 'px 0 var(--m-terra),' + (-d) + 'px 0 var(--m-sage)';
          break;
        case 7: put(el, { s: lerp(0.3, 1, outExpo(p(t, a, a + 0.16))), r: lerp(-10, 0, e), o: 1 }); break;
      }
    }
    var on = t >= K(12) && t < K(13);
    panel.style.opacity = on ? 1 : 0;
    panel.style.transform = 'scaleY(' + (on ? out4(p(t, K(12), K(12) + 0.12)) : 0) + ')';
    epEl.textContent = active >= 0 ? words[active].getAttribute('data-ep') + '회차' : '';
  }
  // E · 숫자 (16 ~ 24박, 2박씩)
  var stats = [0, 1, 2, 3].map(function (i) { return $('#st' + i); });
  function sE(t) {
    for (var i = 0; i < 4; i++) {
      var el = stats[i], a = K(16 + i * 2), b = K(18 + i * 2);
      if (t < a || t >= b) { hide(el); continue; }
      var ein = out4(p(t, a, a + 0.3)), eout = in3(p(t, b - 0.14, b));
      put(el, { y: lerp(H * 0.12, 0, ein) - H * 0.12 * eout, o: ein * (1 - eout) });
      var n = +el.getAttribute('data-n');
      el._num = el._num || el.querySelector('.num');
      el._lab = el._lab || el.querySelector('.lab');
      el._cap = el._cap || el.querySelector('.cap');
      el._num.textContent = Math.round(n * out3(p(t, a, a + 0.5)));
      var el2 = out3(p(t, a + 0.08, a + 0.36));
      el._lab.style.opacity = el2; el._lab.style.transform = 'translateX(' + (36 * (1 - el2)) + 'px)';
      el._cap.style.opacity = out3(p(t, a + 0.24, a + 0.55));
    }
    lines.style.opacity = t >= K(16) && t < K(24) ? 0.9 : 0;
  }
  // F · 묻고. 확인하고. 고치고. (24 ~ 26.5박)
  var fb = $('#fb'), fls = $$('#fb .fl');
  function sF(t) {
    if (t < K(24) || t >= K(26.5)) { hide(fb); return; }
    put(fb, { s: lerp(1, 1.14, in3(p(t, K(24), K(26.5)))), o: 1 });
    for (var i = 0; i < 3; i++) {
      var a = K(24 + i), e = out4(p(t, a, a + 0.16));
      var dim = i < 2 && t >= K(25 + i) ? 0.3 : 1;
      fls[i].style.opacity = t < a ? 0 : e * dim;
      fls[i].style.transform = 'scale(' + lerp(1.4, 1, e) + ')';
    }
  }
  // G · 정적 — 그렇게, (26.5 ~ 28박)
  var g1 = $('#g1');
  function sG(t) {
    if (t < K(26.5) || t >= K(28)) { hide(g1); return; }
    var x = out3(p(t, K(26.75), K(26.75) + 0.45)), y = p(t, K(27.3), K(28));
    put(g1, { o: x * 0.85 * (1 - y * 0.5), s: lerp(1, 0.86, in3(y)), b: y * 3 });
  }
  // H · 우리 가게가 열렸습니다. (28박 ~)
  var eye = $('#fin-eye'), sub = $('#fin-sub'), cta = $$('#fin-cta .btn'), ctl = $('#fin-ctl'), fbg = $('.final-bg');
  function rise(el, t, a) {
    var x = out3(p(t, a, a + 0.5));
    el.style.opacity = x; el.style.transform = 'translateY(' + (18 * (1 - x)) + 'px)';
  }
  function sH(t) {
    if (t < K(28)) { fin.style.visibility = 'hidden'; return; }
    fin.style.visibility = 'visible';
    var e = out4(p(t, K(28), K(28) + 0.18));
    var settle = inOut3(p(t, K(30), K(30) + 0.75));
    var big = Math.max(1, Math.min(1.3, 0.94 * W / (h2._w || W)));
    var sc = lerp(big, 1, settle) * lerp(1.6, 1, e);
    headWrap.style.transform = 'translateY(' + lerp(finalOffset, 0, settle) + 'px) scale(' + sc + ')';
    headWrap.style.filter = e < 0.98 ? 'blur(' + ((1 - e) * 18).toFixed(1) + 'px)' : 'none';
    h1.style.opacity = 1;
    h2.style.opacity = t >= K(28) + 0.07 ? 1 : 0;
    rise(eye, t, K(30) + 0.15);
    rise(sub, t, K(30) + 0.35);
    for (var i = 0; i < cta.length; i++) rise(cta[i], t, K(30) + 0.55 + i * 0.1);
    rise(ctl, t, K(31) + 0.3);
    fbg.classList.toggle('on', t >= K(29));
    body.classList.toggle('show-nav', t >= K(31));
  }

  /* ── 효과: 번쩍 · 흔들림 · 박자 빛 ── */
  var HITS = [[8, .9, 18], [24, .12, 5], [25, .14, 6], [26, .18, 8], [28, 1, 22]];
  var KICKS = [4, 5, 6, 7];
  for (var kk = 8; kk <= 26; kk++) KICKS.push(kk);
  KICKS.push(28);
  function kickEnv(t) {
    var best = 0;
    for (var i = 0; i < KICKS.length; i++) {
      var d = t - K(KICKS[i]);
      if (d >= 0 && d < 0.6) best = Math.max(best, Math.exp(-d * 7));
    }
    return best;
  }
  function baseGlow(t) {
    if (t < K(4)) return 0.12;
    if (t < K(7.5)) return lerp(0.15, 0.75, in3(p(t, K(4), K(7.5))));
    if (t < K(8)) return 0;
    if (t < K(24)) return 0.28;
    if (t < K(26.5)) return lerp(0.3, 0.9, in3(p(t, K(24), K(26.5))));
    if (t < K(28)) return 0.04;
    return lerp(0.7, 0.25, p(t, K(28), K(31)));
  }
  function fx(t) {
    var f = 0, sh = 0;
    for (var i = 0; i < HITS.length; i++) {
      var d = t - K(HITS[i][0]);
      if (d >= 0 && d < 0.7) { f = Math.max(f, HITS[i][1] * Math.exp(-d * 9)); sh = Math.max(sh, HITS[i][2] * Math.exp(-d * 9)); }
    }
    flash.style.opacity = f;
    var env = kickEnv(t);
    var dx = (Math.random() - .5) * 2 * sh, dy = (Math.random() - .5) * 2 * sh;
    stage.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + (1 + 0.014 * env) + ')';
    fin.style.transform = t >= K(28) && sh > 0.3 ? 'translate(' + dx + 'px,' + dy + 'px)' : '';
    glow.style.opacity = Math.min(1, baseGlow(t) + env * 0.3);
    glow.style.transform = 'translate(-50%,-50%) scale(' + (1 + env * 0.06) + ')';
    // 충격파 고리
    var rr = -1;
    [8, 28].forEach(function (k) { var d = t - K(k); if (d >= 0 && d < 0.7) rr = d / 0.7; });
    if (rr >= 0) { ring.style.opacity = (1 - rr) * 0.9; ring.style.transform = 'scale(' + (0.2 + out3(rr) * 3.2) + ')'; ring.style.borderWidth = (6 * (1 - rr) + 1) + 'px'; }
    else ring.style.opacity = 0;
    // 진행 표시
    var c = clamp(t, 0, END);
    bar.style.width = (c / END * 100) + '%';
    var s = Math.floor(c), cs = Math.floor((c - s) * 100);
    tcEl.textContent = '00:' + (s < 10 ? '0' : '') + s + '.' + (cs < 10 ? '0' : '') + cs + ' / 00:15.00';
  }

  /* ── 조각 터짐 ── */
  var parts = [], burstDone = {}, lastT = null;
  function burst(n, cols, power) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (0.3 + Math.random()) * Math.max(W, H) * power;
      parts.push({ x: W / 2, y: H / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - H * 0.25, r: Math.random() * 6.28, vr: (Math.random() - .5) * 14,
        w: 5 + Math.random() * 12, h: 3 + Math.random() * 6, c: cols[i % cols.length], life: 1.3 + Math.random() * 1.3, age: 0 });
    }
  }
  function stepParts(t) {
    [[8, 40, ['#f6f1e9', '#e5604b'], 0.7], [28, 120, ['#e5604b', '#86b592', '#f3b545', '#f6f1e9'], 1.0]].forEach(function (b) {
      if (t >= K(b[0]) && !burstDone[b[0]] && t < K(b[0]) + 0.3) { burstDone[b[0]] = 1; burst(b[1], b[2], b[3]); }
    });
    var dt = lastT == null ? 0 : clamp(t - lastT, 0, 0.05); lastT = t;
    cx.clearRect(0, 0, W, H);
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.age += dt;
      if (q.age > q.life) { parts.splice(i, 1); continue; }
      var drag = Math.pow(0.15, dt);
      q.vx *= drag; q.vy = q.vy * drag + H * 1.5 * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vr * dt;
      cx.globalAlpha = 1 - Math.pow(q.age / q.life, 2);
      cx.save(); cx.translate(q.x, q.y); cx.rotate(q.r); cx.fillStyle = q.c; cx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); cx.restore();
    }
    cx.globalAlpha = 1;
  }

  function render(t) {
    sA(t); sB(t); sC(t); sD(t); sE(t); sF(t); sG(t); sH(t); fx(t); stepParts(t);
  }

  /* ═════════════ 음악 (Web Audio로 직접 합성) ═════════════ */
  var AC = window.AudioContext || window.webkitAudioContext, actx = null, BUF = null, audio = null, soundOn = true;
  function makeBuffers(c0) {
    var len = c0.sampleRate * 2, nb = c0.createBuffer(1, len, c0.sampleRate), d = nb.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var il = Math.floor(c0.sampleRate * 2.4), ir = c0.createBuffer(2, il, c0.sampleRate);
    for (var c = 0; c < 2; c++) { var x = ir.getChannelData(c); for (var j = 0; j < il; j++) x[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / il, 3.2); }
    return { noise: nb, ir: ir };
  }
  function createAudio(offline) {
    var ctx, bufs;
    if (offline) { ctx = offline; bufs = makeBuffers(ctx); }
    else {
      if (!AC) return null;
      try {
        if (!actx) { actx = new AC(); BUF = makeBuffers(actx); }
        if (actx.state === 'suspended') actx.resume();
      } catch (e) { return null; }
      ctx = actx; bufs = BUF;
    }
    var NOISE = bufs.noise, IR = bufs.ir;
    if (audio && !offline) { var old = audio.bus; old.gain.cancelScheduledValues(ctx.currentTime); old.gain.setTargetAtTime(0, ctx.currentTime, 0.04); setTimeout(function () { try { old.disconnect(); } catch (e) {} }, 800); }
    var bus = ctx.createGain(); bus.gain.value = offline || soundOn ? 1 : 0; bus.connect(ctx.destination);
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.18;
    comp.connect(bus);
    var master = ctx.createGain(); master.gain.value = 0.78; master.connect(comp);
    var rev = ctx.createConvolver(); rev.buffer = IR; var revOut = ctx.createGain(); revOut.gain.value = 0.45; rev.connect(revOut); revOut.connect(master);
    var t0 = offline ? 0.05 : ctx.currentTime + 0.15;
    function T(k) { return t0 + k * B; }

    function out(node, send) { node.connect(master); if (send) { var s = ctx.createGain(); s.gain.value = send; node.connect(s); s.connect(rev); } }
    function env(t, peak, a, d) { var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); return g; }
    function osc(type, f, t, dur) { var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + 0.05); return o; }
    function noise(t, dur) { var s = ctx.createBufferSource(); s.buffer = NOISE; s.loop = true; s.start(t, Math.random()); s.stop(t + dur + 0.05); return s; }
    function filt(type, f, q) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }

    function kick(t, v) {
      var o = osc('sine', 155, t, 0.5); o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
      var g = env(t, v, 0.003, 0.42); o.connect(g); out(g);
      var n = noise(t, 0.02), f = filt('highpass', 2500), g2 = env(t, v * 0.22, 0.001, 0.015); n.connect(f); f.connect(g2); out(g2);
    }
    function sub(t, f0, dur, v) { var o = osc('sine', f0, t, dur); o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + dur); var g = env(t, v, 0.006, dur); o.connect(g); out(g); }
    function snare(t, v) {
      var n = noise(t, 0.25), f = filt('bandpass', 1900, 0.8), g = env(t, v * 0.7, 0.001, 0.17); n.connect(f); f.connect(g); out(g, 0.25);
      var o = osc('triangle', 190, t, 0.15); o.frequency.exponentialRampToValueAtTime(140, t + 0.1); var g2 = env(t, v * 0.35, 0.001, 0.1); o.connect(g2); out(g2);
    }
    function clap(t, v) {
      [0, 0.011, 0.022].forEach(function (d) { var n = noise(t + d, 0.06), f = filt('bandpass', 1300, 1.2), g = env(t + d, v * 0.55, 0.001, 0.035); n.connect(f); f.connect(g); out(g, 0.2); });
      var n = noise(t + 0.03, 0.3), f = filt('bandpass', 1150, 0.9), g = env(t + 0.03, v * 0.35, 0.002, 0.2); n.connect(f); f.connect(g); out(g, 0.35);
    }
    function hat(t, v, open) { var n = noise(t, 0.3), f = filt('highpass', 7600), g = env(t, v, 0.001, open ? 0.17 : 0.035); n.connect(f); f.connect(g); out(g); }
    function crash(t, v) { var n = noise(t, 2.3), f = filt('highpass', 4200), g = env(t, v * 0.42, 0.002, 2.0); n.connect(f); f.connect(g); out(g, 0.55); }
    function bass(f, t, dur, v) {
      var lp = filt('lowpass', 1400, 7); lp.frequency.setValueAtTime(1500, t); lp.frequency.exponentialRampToValueAtTime(200, t + dur);
      var o1 = osc('sawtooth', f, t, dur), o2 = osc('square', f / 2, t, dur), g2 = ctx.createGain(); g2.gain.value = 0.5;
      o1.connect(lp); o2.connect(g2); g2.connect(lp);
      var g = env(t, v, 0.004, dur); lp.connect(g); out(g);
    }
    function stab(fs, t, dur, v) {
      var lp = filt('lowpass', 3200, 1); lp.frequency.setValueAtTime(3600, t); lp.frequency.exponentialRampToValueAtTime(500, t + dur);
      fs.forEach(function (f) { [-8, 8].forEach(function (dt) { var o = osc('sawtooth', f, t, dur); o.detune.value = dt; o.connect(lp); }); });
      var g = env(t, v / Math.sqrt(fs.length * 2), 0.005, dur); lp.connect(g); out(g, 0.4);
    }
    function pad(fs, t0p, t1, v, attack, cut, rel) {
      var lp = filt('lowpass', cut, 0.6), g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0p); g.gain.exponentialRampToValueAtTime(v, t0p + attack);
      g.gain.setValueAtTime(v, t1 - rel); g.gain.exponentialRampToValueAtTime(0.0001, t1);
      fs.forEach(function (f) { [-10, 10].forEach(function (dt) { var o = osc('sawtooth', f, t0p, t1 - t0p); o.detune.value = dt; o.connect(lp); }); });
      lp.connect(g); out(g, 0.45);
    }
    function riser(a, b, v) {
      var o = osc('sawtooth', 170, a, b - a); o.frequency.exponentialRampToValueAtTime(1500, b);
      var lp = filt('lowpass', 300, 5); lp.frequency.setValueAtTime(300, a); lp.frequency.exponentialRampToValueAtTime(7000, b);
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(v, b - 0.01); g.gain.linearRampToValueAtTime(0, b);
      o.connect(lp); lp.connect(g); out(g, 0.3);
      var n = noise(a, b - a), bp = filt('bandpass', 400, 1.4); bp.frequency.setValueAtTime(400, a); bp.frequency.exponentialRampToValueAtTime(9000, b);
      var g2 = ctx.createGain(); g2.gain.setValueAtTime(0.0001, a); g2.gain.exponentialRampToValueAtTime(v * 0.9, b - 0.01); g2.gain.linearRampToValueAtTime(0, b);
      n.connect(bp); bp.connect(g2); out(g2, 0.3);
    }
    function swell(a, b, v) {
      var n = noise(a, b - a), hp = filt('highpass', 900); hp.frequency.setValueAtTime(900, a); hp.frequency.exponentialRampToValueAtTime(5000, b);
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(v, b - 0.005); g.gain.linearRampToValueAtTime(0, b);
      n.connect(hp); hp.connect(g); out(g, 0.5);
      [130.81, 196, 261.63].forEach(function (f) { var o = osc('sawtooth', f, a, b - a), lp = filt('lowpass', 1800), gg = ctx.createGain();
        gg.gain.setValueAtTime(0.0001, a); gg.gain.exponentialRampToValueAtTime(v * 0.25, b - 0.005); gg.gain.linearRampToValueAtTime(0, b); o.connect(lp); lp.connect(gg); out(gg, 0.4); });
    }
    function whoosh(t, dur, v) {
      var n = noise(t, dur), bp = filt('bandpass', 300, 1.2); bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(5000, t + dur);
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(bp); bp.connect(g); out(g, 0.3);
    }
    function tick(t, v) {
      var n = noise(t, 0.03), f = filt('bandpass', 3200 + Math.random() * 800, 3), g = env(t, v * 0.55, 0.001, 0.02); n.connect(f); f.connect(g); out(g, 0.1);
      var o = osc('square', 1600 + Math.random() * 400, t, 0.02), g2 = env(t, v * 0.05, 0.001, 0.012); o.connect(g2); out(g2);
    }
    function bell(t, f, v) {
      var o = osc('sine', f, t, 1.8), g = env(t, v, 0.003, 1.6); o.connect(g); out(g, 0.55);
      var o2 = osc('sine', f * 2.01, t, 0.9), g2 = env(t, v * 0.3, 0.002, 0.6); o2.connect(g2); out(g2, 0.55);
    }
    function impact(t, v) {
      kick(t, v); sub(t, 52, 1.8, v * 0.95); crash(t, v);
      var n = noise(t, 0.7), f = filt('lowpass', 700), g = env(t, v * 0.55, 0.002, 0.6); n.connect(f); f.connect(g); out(g, 0.5);
    }
    function roll(a, b, v0, v1) {
      var t = a, i = 0;
      while (t < b - 0.005) {
        var x = (t - a) / (b - a);
        snare(t, lerp(v0, v1, x));
        t += x < 0.4 ? B / 2 : x < 0.72 ? B / 4 : B / 8; i++;
      }
    }

    // 화음 (A 단조 → C 장조로 끝맺음)
    var CH = {
      Am: { root: 110, n: [220, 261.63, 329.63] },
      F: { root: 87.31, n: [174.61, 220, 261.63] },
      C: { root: 130.81, n: [261.63, 329.63, 392] },
      G: { root: 98, n: [196, 246.94, 293.66] }
    };
    var PROG = [CH.Am, CH.F, CH.C, CH.G];

    // ── 1~2마디 · 타자 소리와 낮은 울림, 그리고 쌓이는 긴장
    pad([55, 110, 164.81], T(0), T(7.5), 0.035, 1.4, 650, 0.03);
    var txt = $$('#a .ch');
    for (var i = 0; i < txt.length; i++) if (txt[i].textContent.trim()) tick(t0 + CH0 + i * CHD, 0.55);
    [4, 5, 6, 7].forEach(function (k, j) { kick(T(k), 0.45 + j * 0.13); });
    riser(T(4), T(7.5), 0.17);
    roll(T(6), T(7.5), 0.18, 0.75);
    // 7.5박 ~ 8박 · 완전한 정적

    // ── 3마디 · 드롭 "만들어줘."
    impact(T(8), 1.0);
    stab(CH.Am.n, T(8), 0.55, 0.42);

    // ── 3~6마디 · 그루브
    for (var k = 8; k < 24; k++) {
      var ch = PROG[Math.floor((k - 8) / 4)];
      if (k > 8) kick(T(k), 0.95);
      hat(T(k + 0.5), 0.24, true);
      if (k % 2 === 1) clap(T(k), 0.5);
      bass(ch.root, T(k), B * 0.42, 0.32);
      bass(ch.root, T(k + 0.5), B * 0.42, 0.46);
      if (k >= 16) { hat(T(k + 0.25), 0.09, false); hat(T(k + 0.75), 0.09, false); }
      if ((k - 8) % 4 === 0 && k > 8) stab(ch.n, T(k), 0.45, 0.3);
    }
    snare(T(15.5), 0.65);                                    // "Vercel" 엇박
    [16, 18, 20, 22].forEach(function (k) { whoosh(T(k - 0.5), B * 0.5, 0.16); });
    stab(CH.C.n, T(18), 0.3, 0.22); stab(CH.G.n, T(22), 0.3, 0.22);

    // ── 7마디 · 묻고. 확인하고. 고치고. → 끌어올리기
    [24, 25, 26].forEach(function (k, j) { kick(T(k), 1); clap(T(k), 0.6); stab(CH.G.n, T(k), 0.32, 0.3 + 0.07 * j); bass(98, T(k), B * 0.8, 0.4); });
    riser(T(24), T(26.5), 0.28);
    roll(T(24.5), T(26.5), 0.2, 0.85);
    // 26.5박 · 정적 → 역방향으로 빨려 들어가는 소리
    swell(T(27.1), T(28), 0.5);

    // ── 8마디 · 우리 가게가 열렸습니다.
    impact(T(28), 1.1);
    clap(T(28), 0.7);
    stab([130.81, 196, 261.63, 329.63, 392, 587.33], T(28), 2.8, 0.42);
    pad([65.41, 130.81, 196, 261.63, 329.63, 392], T(28), T(28) + 5.2, 0.14, 0.04, 2400, 3.2);
    bass(130.81, T(28), 2.6, 0.42);
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98].forEach(function (f, j) { bell(T(28.5 + j * 0.25), f, 0.07); });
    bell(T(30), 1046.5, 0.16); bell(T(30), 1567.98, 0.09);

    return { ctx: ctx, t0: t0, bus: bus };
  }
  // 확인용: 음악을 소리 없이 미리 만들어 박자별 크기를 재요 (화면에는 영향 없음)
  window.__introAudioCheck = function () {
    var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var oc = new OC(2, 44100 * 18, 44100);
    createAudio(oc);
    return oc.startRendering().then(function (buf) {
      var d = buf.getChannelData(0), sr = buf.sampleRate, res = [], peakAll = 0;
      for (var k = 0; k < 36; k++) {
        var a = Math.floor((0.05 + k * B) * sr), b = Math.floor((0.05 + (k + 1) * B) * sr), pk = 0, ss = 0;
        for (var i = a; i < b && i < d.length; i++) { var v = Math.abs(d[i]); if (v > pk) pk = v; ss += v * v; }
        peakAll = Math.max(peakAll, pk);
        res.push(k + ':' + pk.toFixed(2) + '/' + Math.sqrt(ss / Math.max(1, b - a)).toFixed(3));
      }
      return { peak: peakAll.toFixed(3), beats: res.join('  ') };
    });
  };
  function setSound(on) {
    soundOn = on;
    if (audio) { var g = audio.bus.gain, n = audio.ctx.currentTime; g.cancelScheduledValues(n); g.setTargetAtTime(on ? 1 : 0, n, 0.05); }
    [$('#mute'), $('#mute2')].forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'false' : 'true');
      b.textContent = on ? (b.id === 'mute' ? '🔊 소리' : '🔊 소리 켬') : (b.id === 'mute' ? '🔇 소리' : '🔇 소리 끔');
    });
  }

  /* ═════════════ 재생 ═════════════ */
  var raf = 0, perfStart = 0, running = false;
  function now() {
    if (audio) return audio.ctx.currentTime - audio.t0 - (audio.ctx.outputLatency || 0);
    return (performance.now() - perfStart) / 1000;
  }
  function frame() {
    var t = now();
    if (t >= 0) render(t);
    if (t < END + 1.2 || parts.length) raf = requestAnimationFrame(frame);
    else finish();
  }
  function resetVisuals() {
    parts = []; burstDone = {}; lastT = null;
    body.classList.remove('is-final', 'show-nav');
    fin.style.visibility = 'hidden';
    [eye, sub, ctl].concat(cta).forEach(function (el) { el.style.opacity = 0; });
    h1.style.opacity = 0; h2.style.opacity = 0;
    $$('#stage .t').forEach(function (el) { el.style.opacity = 0; });
    words[6].style.textShadow = '';
  }
  function start(withSound) {
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
    soundOn = withSound;
    layout(); resetVisuals();
    gate.classList.add('gone');
    body.classList.add('playing');
    audio = createAudio();
    setSound(withSound);
    if (!audio) perfStart = performance.now() + 150;
    running = true;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function finish() {
    running = false;
    cancelAnimationFrame(raf);
    showFinal();
  }
  function showFinal() {
    body.classList.remove('playing');
    body.classList.add('is-final', 'show-nav');
    gate.classList.add('gone');
    $$('#stage .t').forEach(function (el) { el.style.opacity = 0; });
    flash.style.opacity = 0; ring.style.opacity = 0; panel.style.opacity = 0; lines.style.opacity = 0;
    glow.style.opacity = 0.25; glow.style.transform = 'translate(-50%,-50%)';
    stage.style.transform = ''; fin.style.transform = '';
    fin.style.visibility = 'visible';
    headWrap.style.transform = 'none'; headWrap.style.filter = 'none';
    [eye, sub, ctl, h1, h2].concat(cta).forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
    fbg.classList.add('on');
    cx.clearRect(0, 0, W, H); parts = [];
  }
  function skip() {
    if (audio) { var g = audio.bus.gain, n = audio.ctx.currentTime; g.cancelScheduledValues(n); g.setTargetAtTime(0, n, 0.08); }
    running = false; cancelAnimationFrame(raf);
    showFinal();
  }

  /* ── 버튼 ── */
  $('#play').addEventListener('click', function () { start(true); });
  $('#play-quiet').addEventListener('click', function () { start(false); });
  $('#enter').addEventListener('click', function () { showFinal(); });
  $('#skip').addEventListener('click', skip);
  $('#replay').addEventListener('click', function () { start(soundOn); });
  $('#mute').addEventListener('click', function () { setSound(!soundOn); });
  $('#mute2').addEventListener('click', function () { setSound(!soundOn); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && running) skip();
  });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { layout(); if (!running && body.classList.contains('is-final')) showFinal(); }, 120); });

  /* ── 처음 ── */
  function init() {
    layout();
    // 확인용: 주소 끝에 ?t=7.5 처럼 붙이면 그 순간의 장면을 멈춘 채로 보여줘요
    var m = location.search.match(/[?&]t=([\d.]+)/);
    if (m) {
      var tt = +m[1];
      resetVisuals(); gate.style.display = 'none'; body.classList.add('playing');
      burstDone[8] = burstDone[28] = 1;
      render(tt);
      return;
    }
    var seen = false;
    try { seen = sessionStorage.getItem('introSeen') === '1'; } catch (e) {}
    if (reduce || seen) { showFinal(); }
    else { $('#play').focus({ preventScroll: true }); }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else init();
})();
