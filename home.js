/* ─────────────────────────────────────────────
   홈 · 30초 타이포그래피 인트로 + BGM
   128 BPM · 64박 = 30초.
   화면은 기기 시계(performance.now)로 움직이고, 음악은 화면이 시작하는 순간에 맞춰 예약해요.
   → 소리가 막힌 기기(아이폰 무음, 카톡 안 브라우저 등)에서도 화면은 반드시 재생돼요.
   외부 라이브러리 · 음악 파일 없이, 소리도 브라우저에서 직접 만들어요.
   ───────────────────────────────────────────── */
(function () {
  'use strict';
  var BPM = 128, B = 60 / BPM, END = 64 * B;           // 30.0초
  function K(k) { return k * B; }
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var body = document.body;
  var stage = $('#stage'), fin = $('#final'), gate = $('#gate'), flash = $('#flash'), glow = $('#glow'),
      lines = $('#lines'), panel = $('#panel'), ring = $('#ring'), canvas = $('#fx'), cx = canvas.getContext('2d'),
      bar = $('#bar'), tcEl = $('#tc'), epEl = $('#ep'), hudl = $('#hudl');
  var W = innerWidth, H = innerHeight, DPR = Math.min(2, window.devicePixelRatio || 1);
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // 휴대폰처럼 손가락으로 쓰는 기기는 그래픽 메모리가 작아요 → 흐림 효과를 끄고 조각 수를 줄여요
  var LOW = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) || Math.min(innerWidth, innerHeight) < 600;
  if (LOW) DPR = 1;

  /* ── 수학 ── */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function p(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function lerp(a, b, x) { return a + (b - a) * x; }
  function out3(x) { return 1 - Math.pow(1 - x, 3); }
  function out4(x) { return 1 - Math.pow(1 - x, 4); }
  function outExpo(x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  function outBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function inOut3(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function in3(x) { return x * x * x; }

  /* ── 글자 크기 맞추기 ── */
  function fit(el) {
    var fw = +el.getAttribute('data-fw'), fh = +el.getAttribute('data-fh'), mx = +(el.getAttribute('data-max') || 9999);
    el.style.fontSize = '100px';
    var w = el.scrollWidth || 1, h = el.offsetHeight || 1;
    var fs = Math.min(100 * fw * W / w, 100 * fh * H / h, mx);
    el.style.fontSize = fs + 'px';
    el._w = w * fs / 100; el._h = h * fs / 100;
  }
  var headWrap = $('#fin-head'), h1 = $('#h1'), h2 = $('#h2'), finalOffset = 0, debugT = null;
  function layout() {
    W = innerWidth; H = innerHeight;
    var all = $$('[data-fw]');
    all.forEach(function (el) { el.style.display = ''; el._on = undefined; });
    all.forEach(fit);
    var rps = $$('.rp'), mn = 9999;
    rps.forEach(function (el) { mn = Math.min(mn, parseFloat(el.style.fontSize)); });
    rps.forEach(function (el) { el.style.fontSize = mn + 'px'; el._h = el.offsetHeight; });
    $$('#stage .t').forEach(hide);
    if (debugT != null) setTimeout(function () { render(debugT); }, 0);
    h1.style.fontSize = (parseFloat(h2.style.fontSize) * 0.5) + 'px';
    var prev = headWrap.style.transform; headWrap.style.transform = 'none';
    var r = headWrap.getBoundingClientRect();
    finalOffset = H / 2 - (r.top + r.height / 2);
    headWrap.style.transform = prev;
    canvas.width = W * DPR; canvas.height = H * DPR; cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function show(el) { if (el._on !== true) { el.style.display = ''; el._on = true; } }
  function put(el, o) {
    show(el);
    var s = 'translate(-50%,-50%) translate(' + (o.x || 0) + 'px,' + (o.y || 0) + 'px)';
    if (o.s != null && o.s !== 1) s += ' scale(' + o.s + ')';
    if (o.sk) s += ' skewX(' + o.sk + 'deg)';
    if (o.r) s += ' rotate(' + o.r + 'deg)';
    el.style.transform = s;
    el.style.opacity = o.o == null ? 1 : o.o;
    el.style.filter = !LOW && o.b > 0.3 ? 'blur(' + o.b.toFixed(1) + 'px)' : 'none';
  }
  function hide(el) { if (el._on !== false) { el.style.display = 'none'; el._on = false; } }
  function within(t, a, b) { return t >= K(a) && t < K(b); }

  /* ═════════════ 장면 ═════════════ */
  // A · 코드 한 줄 몰랐습니다. (0~4박)
  var A = $('#a'), aCh = $$('#a .ch'), aCaret = $('#a .caret');
  var CH0 = 0.25, CHD = 0.095;
  function sA(t) {
    if (t > K(3.95)) { hide(A); return; }
    for (var i = 0; i < aCh.length; i++) aCh[i].style.opacity = t >= CH0 + i * CHD ? 1 : 0;
    aCaret.style.opacity = (t < CH0 + aCh.length * CHD || Math.floor(t * 3.4) % 2 === 0) ? 1 : 0;
    var e = in3(p(t, K(3.3), K(3.9)));
    put(A, { y: -40 * e, o: 1 - e, b: 10 * e });
  }
  // B · 그래서, 말로 했습니다. (4~7.5박) → 정적
  var b1 = $('#b1'), b2 = $('#b2'), b3 = $('#b3');
  function sB(t) {
    if (!within(t, 4, 7.5)) { hide(b1); hide(b2); hide(b3); return; }
    var grow = lerp(1, 1.12, in3(p(t, K(6), K(7.5)))), gap = H * 0.012;
    var y1 = -(b2._h / 2 + b1._h / 2 + gap), y3 = b2._h / 2 + b3._h / 2 + gap;
    var e1 = out3(p(t, K(4), K(4) + 0.3));
    put(b1, { y: (y1 + 24 * (1 - e1)) * grow, s: grow, o: e1 });
    var e2 = outExpo(p(t, K(5), K(5) + 0.4));
    var jit = t > K(7) ? (Math.random() - .5) * 6 * p(t, K(7), K(7.5)) : 0;
    put(b2, { x: jit, s: lerp(1.8, 1, e2) * grow, o: t >= K(5) ? 1 : 0, b: (1 - e2) * 16 });
    b2.style.color = t >= K(6) ? 'var(--m-terra)' : '';
    var e3 = out3(p(t, K(6), K(6) + 0.3));
    put(b3, { y: (y3 + 30 * (1 - e3)) * grow, s: grow, o: e3 });
  }
  // C · 만들어주세요. (8~10박) — 첫 드롭
  var c1 = $('#c1'), c2 = $('#c2');
  function sC(t) {
    if (!within(t, 8, 10)) { hide(c1); hide(c2); return; }
    var e = out4(p(t, K(8), K(8) + 0.16)), out = in3(p(t, K(9.7), K(10)));
    put(c1, { s: lerp(2.8, 1, e) * lerp(1, 0.9, out), o: 1 - out, b: (1 - e) * 22 + out * 8 });
    var e2 = out3(p(t, K(8.3), K(8.3) + 0.25));
    put(c2, { y: c1._h / 2 + c2._h / 2 + H * 0.02 + 12 * (1 - e2), o: e2 * (1 - out) });
  }
  // C2 · 프롬프트 입력 (10~12박)
  var pb = $('#pb'), pbCh = $$('#pb .ch'), pbCaret = $('#pb .caret');
  var PB0 = K(10.15), PBD = (K(11.55) - K(10.15)) / Math.max(16, pbCh.length);
  function sP(t) {
    if (!within(t, 10, 12)) { hide(pb); return; }
    var e = out4(p(t, K(10), K(10) + 0.2)), fly = in3(p(t, K(11.75), K(12)));
    put(pb, { y: lerp(H * 0.06, 0, e) - H * 0.25 * fly, s: lerp(0.92, 1, e) * lerp(1, 0.85, fly), o: e * (1 - fly) });
    for (var i = 0; i < pbCh.length; i++) pbCh[i].style.opacity = t >= PB0 + i * PBD ? 1 : 0;
    pbCaret.style.opacity = (Math.floor(t * 4) % 2 === 0 || t < K(11.55)) ? 1 : 0;
    pb.classList.toggle('sent', t >= K(11.75));
  }
  // 몽타주 (12~20박 · 28~32박) — 박자마다 단어
  var MW = $$('.mw').map(function (el) {
    return { el: el, a: K(+el.getAttribute('data-k')), b: K(+el.getAttribute('data-e')), st: el.getAttribute('data-st'), ep: el.getAttribute('data-ep') };
  });
  function sM(t) {
    var dark = false;
    for (var i = 0; i < MW.length; i++) {
      var m = MW[i], el = m.el, a = m.a;
      if (t < a || t >= m.b) { hide(el); continue; }
      var e = out4(p(t, a, a + 0.18));
      switch (m.st) {
        case 'solid': put(el, { s: lerp(1.35, 1, e), o: e, b: (1 - e) * 8 }); break;
        case 'outline': put(el, { x: lerp(-W * 0.1, 0, e), o: 1 }); break;
        case 'terra': put(el, { x: lerp(W * 0.12, 0, e), sk: lerp(-16, 0, e), o: 1 }); break;
        case 'dark': dark = true; put(el, { s: lerp(0.8, 1, outBack(p(t, a, a + 0.26))), o: 1 });
          panel.style.transform = 'scaleY(' + out4(p(t, a, a + 0.12)) + ')'; break;
        case 'sun': put(el, { y: lerp(H * 0.16, 0, outBack(p(t, a, a + 0.3))), o: 1 }); break;
        case 'zoom': put(el, { s: lerp(0.3, 1, outExpo(p(t, a, a + 0.16))), r: lerp(-10, 0, e), o: 1 }); break;
        case 'big': put(el, { s: lerp(0.5, 1, outExpo(p(t, a, a + 0.22))), o: 1 }); break;
        case 'glitch':
          var g = 1 - p(t, a, a + 0.35), d = 3 + 16 * g;
          put(el, { x: (Math.random() - .5) * 28 * g, s: lerp(1.25, 1, e), o: 1 });
          el.style.textShadow = d + 'px 0 var(--m-terra),' + (-d) + 'px 0 var(--m-sage)';
          break;
      }
    }
    panel.style.display = dark ? 'block' : 'none'; panel.style.opacity = dark ? 1 : 0;
  }
  // 1부 완성. 도장 (20~22박)
  var stamp = $('#stamp');
  function sS(t) {
    if (!within(t, 20, 22)) { hide(stamp); return; }
    var e = out4(p(t, K(20), K(20) + 0.14)), out = in3(p(t, K(21.7), K(22)));
    put(stamp, { s: lerp(2.2, 1, e) * lerp(1, 0.95, out), r: lerp(-14, -6, e), o: (t >= K(20) ? 1 : 0) * (1 - out), b: (1 - e) * 10 });
  }
  // 위기 · 그런데, 검색엔진에게는 빈 화면이었습니다. (22~26박)
  var q1 = $('#q1'), q2 = $('#q2'), q3 = $('#q3'), q4 = $('#q4');
  function sQ(t) {
    if (!within(t, 22, 26)) { hide(q1); hide(q2); hide(q3); hide(q4); return; }
    var out = in3(p(t, K(25.6), K(26)));
    var gap = H * 0.02;
    var y2 = -(q3._h / 2 + q2._h / 2 + gap), y1 = y2 - (q2._h / 2 + q1._h / 2 + gap), y4 = q3._h / 2 + q4._h / 2 + gap * 2.2;
    var e1 = out3(p(t, K(22), K(22) + 0.5));
    put(q1, { y: y1 + 14 * (1 - e1), o: e1 * 0.75 * (1 - out) });
    var e2 = out3(p(t, K(23), K(23) + 0.4));
    put(q2, { y: y2 + 18 * (1 - e2), o: e2 * (1 - out) });
    var d3 = t - K(24), blink = (d3 > 0.12 && d3 < 0.2) || (d3 > 0.34 && d3 < 0.4);
    var fl = t < K(24) ? 0 : (blink ? 0.15 : 1);
    put(q3, { x: d3 >= 0 && d3 < 0.45 ? (Math.random() - .5) * 8 : 0, o: fl * (1 - out) });
    var e4 = out3(p(t, K(24.6), K(24.6) + 0.4));
    put(q4, { y: y4 + 12 * (1 - e4), o: e4 * (1 - out) });
  }
  // 그래서, 이사했습니다. (26~28박)
  var r1 = $('#r1'), r2 = $('#r2');
  function sR(t) {
    if (!within(t, 26, 28)) { hide(r1); hide(r2); return; }
    var zoom = lerp(1, 1.1, in3(p(t, K(27), K(28))));
    var e1 = out3(p(t, K(26), K(26) + 0.3));
    put(r1, { y: (-(r2._h / 2 + r1._h / 2 + H * 0.012)) * zoom, s: zoom, o: e1 });
    var e2 = outExpo(p(t, K(26.5), K(26.5) + 0.35));
    put(r2, { x: lerp(W * 0.6, 0, e2), s: zoom, o: t >= K(26.5) ? 1 : 0, b: (1 - e2) * 24 });
  }
  // 22회차 · 금액은 가게가 다시 계산. (32~34박)
  var s22 = $('#s22'), s22a = $('#s22 .l1'), s22b = $('#s22 .l2');
  function s22f(t) {
    if (!within(t, 32, 34)) { hide(s22); return; }
    put(s22, { o: 1 });
    var e1 = out4(p(t, K(32), K(32) + 0.2));
    s22a.style.opacity = e1; s22a.style.transform = 'translateY(' + (-30 * (1 - e1)) + 'px)';
    var e2 = out4(p(t, K(32.5), K(32.5) + 0.14));
    s22b.style.opacity = t >= K(32.5) ? 1 : 0; s22b.style.transform = 'scale(' + lerp(1.6, 1, e2) + ')';
  }
  // 23회차 · 우리 가게답게. + 색 세 개 (34~36박)
  var s23 = $('#s23'), sw = $('#sw'), swI = $$('#sw i');
  var SWC = ['var(--m-terra)', 'var(--m-sage)', 'var(--m-sun)'];
  function s23f(t) {
    if (!within(t, 34, 36)) { hide(s23); hide(sw); return; }
    var e = out4(p(t, K(34), K(34) + 0.2));
    put(s23, { y: -H * 0.05, s: lerp(1.3, 1, e), o: e });
    put(sw, { y: s23._h / 2 + sw._h / 2 + H * 0.01, o: 1 });
    var ci = 0;
    for (var i = 0; i < 3; i++) {
      var a = K(34 + i * 0.5), x = outBack(p(t, a, a + 0.25));
      swI[i].style.transform = 'scale(' + (t >= a ? x : 0) + ')';
      if (t >= a) ci = i;
    }
    s23.style.color = SWC[ci];
  }
  // 숫자 (36~44박, 2박씩)
  var stats = [0, 1, 2, 3].map(function (i) { return $('#st' + i); });
  function sE(t) {
    for (var i = 0; i < 4; i++) {
      var el = stats[i], a = K(36 + i * 2), b = K(38 + i * 2);
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
    var ln = within(t, 36, 44); lines.style.display = ln ? 'block' : 'none'; lines.style.opacity = ln ? 0.9 : 0;
  }
  // 묻고. 확인하고. 고치고. 저장하고. (44~48박)
  var fb = $('#fb'), fls = $$('#fb .fl');
  function sF(t) {
    if (!within(t, 44, 48)) { hide(fb); return; }
    put(fb, { s: lerp(1, 1.12, in3(p(t, K(44), K(48)))), o: 1 });
    for (var i = 0; i < 4; i++) {
      var a = K(44 + i), e = out4(p(t, a, a + 0.16));
      var dim = i < 3 && t >= K(45 + i) ? 0.3 : 1;
      fls[i].style.opacity = t < a ? 0 : e * dim;
      fls[i].style.transform = 'scale(' + lerp(1.4, 1, e) + ')';
    }
  }
  // 회차 연속 플래시 (48~52박, 16분음표)
  var RP = $$('.rp').map(function (el) { return { el: el, a: K(+el.getAttribute('data-k')), ep: el.getAttribute('data-ep') }; });
  // 깜빡이며 바뀌지 않고, 슬롯머신처럼 부드럽게 위로 굴러가요 (16분음표마다 한 칸)
  function rollPos(t) { return clamp((t - K(48)) / (B / 4), 0, RP.length - 1); }
  function sX(t) {
    if (!within(t, 48, 52)) { for (var j = 0; j < RP.length; j++) hide(RP[j].el); return; }
    var pos = rollPos(t), fade = out3(p(t, K(48), K(48) + 0.12));
    var step = (RP[0].el._h || H * 0.3) * 0.92;
    for (var i = 0; i < RP.length; i++) {
      var d = i - pos, ad = Math.abs(d);
      if (ad > 2.4) { hide(RP[i].el); continue; }
      put(RP[i].el, { y: d * step, s: 1 - Math.min(1, ad) * 0.4, o: clamp(1 - ad * 0.48, 0, 1) * fade });
    }
  }
  // 정적 · 그렇게, (52~54박)
  var g1 = $('#g1');
  function sG(t) {
    if (!within(t, 52, 54)) { hide(g1); return; }
    var x = out3(p(t, K(52.3), K(52.3) + 0.45)), y = p(t, K(53.2), K(54));
    put(g1, { o: x * 0.85 * (1 - y * 0.5), s: lerp(1, 0.86, in3(y)), b: y * 3 });
  }
  // 우리 가게가 열렸습니다. (54박~)
  var eye = $('#fin-eye'), sub = $('#fin-sub'), cta = $$('#fin-cta .btn'), ctl = $('#fin-ctl'), fbg = $('.final-bg');
  function rise(el, t, a) {
    var x = out3(p(t, a, a + 0.5));
    el.style.opacity = x; el.style.transform = 'translateY(' + (18 * (1 - x)) + 'px)';
  }
  var HK = 54;
  function sH(t) {
    if (t < K(HK)) { fin.style.visibility = 'hidden'; return; }
    fin.style.visibility = 'visible';
    var e = out4(p(t, K(HK), K(HK) + 0.18));
    var settle = inOut3(p(t, K(HK + 2), K(HK + 2) + 0.75));
    var big = Math.max(1, Math.min(1.3, 0.94 * W / (h2._w || W)));
    var sc = lerp(big, 1, settle) * lerp(1.6, 1, e);
    headWrap.style.transform = 'translateY(' + lerp(finalOffset, 0, settle) + 'px) scale(' + sc + ')';
    headWrap.style.filter = !LOW && e < 0.98 ? 'blur(' + ((1 - e) * 18).toFixed(1) + 'px)' : 'none';
    h1.style.opacity = 1;
    h2.style.opacity = t >= K(HK) + 0.07 ? 1 : 0;
    rise(eye, t, K(HK + 2) + 0.15);
    rise(sub, t, K(HK + 2) + 0.35);
    for (var i = 0; i < cta.length; i++) rise(cta[i], t, K(HK + 2) + 0.55 + i * 0.1);
    rise(ctl, t, K(HK + 3) + 0.3);
    fbg.classList.toggle('on', t >= K(HK + 1));
    body.classList.toggle('show-nav', t >= K(HK + 3));
  }

  /* ── 효과: 번쩍 · 흔들림 · 박자 빛 · 진행 표시 ── */
  var HITS = [[8, .9, 18], [20, .4, 10], [28, .95, 20], [32.5, .2, 8], [44, .12, 5], [45, .14, 6], [46, .16, 7], [47, .2, 8], [54, 1, 22]];
  var RINGS = [8, 20, 28, 54];
  var KICKS = [4, 5, 6, 7], kk;
  for (kk = 8; kk <= 21; kk++) KICKS.push(kk);
  KICKS.push(24, 25);
  for (kk = 28; kk <= 51; kk++) KICKS.push(kk);
  KICKS.push(54, 56, 57, 58, 59);
  function kickEnv(t) {
    var best = 0;
    for (var i = 0; i < KICKS.length; i++) {
      var d = t - K(KICKS[i]);
      if (d >= 0 && d < 0.6) best = Math.max(best, Math.exp(-d * 7));
    }
    return best;
  }
  function baseGlow(t) {
    var k = t / B;
    if (k < 4) return 0.12;
    if (k < 7.5) return lerp(0.15, 0.75, in3(p(t, K(4), K(7.5))));
    if (k < 8) return 0;
    if (k < 20) return 0.28;
    if (k < 22) return 0.5;
    if (k < 26) return 0.06;
    if (k < 28) return lerp(0.1, 0.8, in3(p(t, K(26), K(28))));
    if (k < 44) return 0.32;
    if (k < 52) return lerp(0.3, 0.95, in3(p(t, K(44), K(52))));
    if (k < 54) return 0.03;
    return lerp(0.7, 0.25, p(t, K(54), K(58)));
  }
  var CHAPTER = [[12, 22, 'PART 1 · 파일 하나로 시작한 쇼핑몰'], [26, 36, 'PART 2 · Next.js로 이사하기']];
  var EPS = [[32, 34, '22'], [34, 36, '23']];
  function fx(t) {
    var f = 0, sh = 0;
    for (var i = 0; i < HITS.length; i++) {
      var d = t - K(HITS[i][0]);
      if (d >= 0 && d < 0.7) { f = Math.max(f, HITS[i][1] * Math.exp(-d * 9)); sh = Math.max(sh, HITS[i][2] * Math.exp(-d * 9)); }
    }
    if (reduce) { f *= 0.3; sh *= 0.15; }
    flash.style.opacity = f;
    var env = kickEnv(t);
    var dx = (Math.random() - .5) * 2 * sh, dy = (Math.random() - .5) * 2 * sh;
    stage.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + (1 + (reduce ? 0 : 0.014) * env) + ')';
    fin.style.transform = t >= K(HK) && sh > 0.3 ? 'translate(' + dx + 'px,' + dy + 'px)' : '';
    glow.style.opacity = Math.min(1, baseGlow(t) + env * 0.3);
    glow.style.transform = 'translate(-50%,-50%) scale(' + (1 + env * 0.06) + ')';
    var rr = -1;
    for (i = 0; i < RINGS.length; i++) { var dd = t - K(RINGS[i]); if (dd >= 0 && dd < 0.7) rr = dd / 0.7; }
    if (rr >= 0) { ring.style.opacity = (1 - rr) * 0.9; ring.style.transform = 'scale(' + (0.2 + out3(rr) * 3.2) + ')'; ring.style.borderWidth = (6 * (1 - rr) + 1) + 'px'; }
    else ring.style.opacity = 0;
    // 진행 · 회차 · 장 제목
    var c = clamp(t, 0, END);
    bar.style.width = (c / END * 100) + '%';
    var s = Math.floor(c), cs = Math.floor((c - s) * 100);
    tcEl.textContent = '00:' + (s < 10 ? '0' : '') + s + '.' + (cs < 10 ? '0' : '') + cs + ' / 00:30.00';
    var ep = '';
    for (i = 0; i < MW.length; i++) if (t >= MW[i].a && t < MW[i].b) ep = MW[i].ep;
    if (within(t, 48, 52)) ep = RP[Math.round(rollPos(t))].ep;
    for (i = 0; i < EPS.length; i++) if (within(t, EPS[i][0], EPS[i][1])) ep = EPS[i][2];
    epEl.textContent = ep ? ep + '회차' : '';
    var ch = 'AI로 웹사이트 만들기';
    for (i = 0; i < CHAPTER.length; i++) if (within(t, CHAPTER[i][0], CHAPTER[i][1])) ch = CHAPTER[i][2];
    if (hudl.textContent !== ch) hudl.textContent = ch;
  }

  /* ── 조각 터짐 ── */
  var parts = [], burstDone = {}, lastT = null;
  var BURSTS = [[8, LOW ? 20 : 40, ['#f6f1e9', '#e5604b'], 0.7], [28, LOW ? 30 : 60, ['#f6f1e9', '#86b592'], 0.8], [54, LOW ? 60 : 130, ['#e5604b', '#86b592', '#f3b545', '#f6f1e9'], 1.0]];
  function burst(n, cols, power) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (0.3 + Math.random()) * Math.max(W, H) * power;
      parts.push({ x: W / 2, y: H / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - H * 0.25, r: Math.random() * 6.28, vr: (Math.random() - .5) * 14,
        w: 5 + Math.random() * 12, h: 3 + Math.random() * 6, c: cols[i % cols.length], life: 1.3 + Math.random() * 1.3, age: 0 });
    }
  }
  function stepParts(t) {
    for (var j = 0; j < BURSTS.length; j++) {
      var bb = BURSTS[j];
      if (t >= K(bb[0]) && !burstDone[bb[0]] && t < K(bb[0]) + 0.3) { burstDone[bb[0]] = 1; burst(bb[1], bb[2], bb[3]); }
    }
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
    sA(t); sB(t); sC(t); sP(t); sM(t); sS(t); sQ(t); sR(t); s22f(t); s23f(t); sE(t); sF(t); sX(t); sG(t); sH(t);
    fx(t); stepParts(t);
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
  // 버튼을 누른 그 순간에 오디오를 깨워요 (아이폰은 이때만 허락해요)
  function unlockAudio() {
    if (!AC) return null;
    try {
      if (!actx) { actx = new AC(); BUF = makeBuffers(actx); }
      if (actx.state !== 'running' && actx.resume) actx.resume();
      var sb = actx.createBuffer(1, 1, 22050), src = actx.createBufferSource();
      src.buffer = sb; src.connect(actx.destination); src.start(0);
      return actx;
    } catch (e) { return null; }
  }

  function buildMusic(ctx, t0, bufs, gainOn) {
    var NOISE = bufs.noise, IR = bufs.ir;
    var bus = ctx.createGain(); bus.gain.value = gainOn ? 1 : 0; bus.connect(ctx.destination);
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 8; comp.attack.value = 0.002; comp.release.value = 0.18;
    comp.connect(bus);
    var master = ctx.createGain(); master.gain.value = 0.64; master.connect(comp);
    var rev = ctx.createConvolver(); rev.buffer = IR; var revOut = ctx.createGain(); revOut.gain.value = 0.45; rev.connect(revOut); revOut.connect(master);
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
    function pad(fs, a, b, v, attack, cut, rel) {
      var lp = filt('lowpass', cut, 0.6), g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(v, a + attack);
      g.gain.setValueAtTime(v, b - rel); g.gain.exponentialRampToValueAtTime(0.0001, b);
      fs.forEach(function (f) { [-10, 10].forEach(function (dt) { var o = osc('sawtooth', f, a, b - a); o.detune.value = dt; o.connect(lp); }); });
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
    function pluck(t, f, v) {
      var o = osc('triangle', f, t, 0.3), o2 = osc('square', f, t, 0.12), lp = filt('lowpass', 4000, 2);
      lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(800, t + 0.15);
      var g2 = ctx.createGain(); g2.gain.value = 0.25; o.connect(lp); o2.connect(g2); g2.connect(lp);
      var g = env(t, v, 0.002, 0.22); lp.connect(g); out(g, 0.3);
    }
    function glitch(t, v) {
      var o = osc('square', 1800 + Math.random() * 1600, t, 0.06), g = env(t, v * 0.12, 0.001, 0.05); o.connect(g); out(g);
      var n = noise(t, 0.06), f = filt('bandpass', 2600, 4), g2 = env(t, v * 0.5, 0.001, 0.05); n.connect(f); f.connect(g2); out(g2);
    }
    function errTone(t, v) {
      var o = osc('sine', 330, t, 0.9); o.frequency.exponentialRampToValueAtTime(110, t + 0.8);
      var g = env(t, v, 0.01, 0.85); o.connect(g); out(g, 0.5);
    }
    function impact(t, v) {
      kick(t, v); sub(t, 52, 1.8, v * 0.95); crash(t, v);
      var n = noise(t, 0.7), f = filt('lowpass', 700), g = env(t, v * 0.55, 0.002, 0.6); n.connect(f); f.connect(g); out(g, 0.5);
    }
    function roll(a, b, v0, v1) {
      var t = a;
      while (t < b - 0.005) {
        var x = (t - a) / (b - a);
        snare(t, lerp(v0, v1, x));
        t += x < 0.4 ? B / 2 : x < 0.72 ? B / 4 : B / 8;
      }
    }
    function groove(k, ch, v, sixteen) {
      kick(T(k), 0.95 * v);
      hat(T(k + 0.5), 0.24 * v, true);
      if (k % 2 === 1) clap(T(k), 0.5 * v);
      bass(ch.root, T(k), B * 0.42, 0.32 * v);
      bass(ch.root, T(k + 0.5), B * 0.42, 0.46 * v);
      if (sixteen) { hat(T(k + 0.25), 0.09, false); hat(T(k + 0.75), 0.09, false); }
    }

    var CH = {
      Am: { root: 110, n: [220, 261.63, 329.63] },
      F: { root: 87.31, n: [174.61, 220, 261.63] },
      C: { root: 130.81, n: [261.63, 329.63, 392] },
      G: { root: 98, n: [196, 246.94, 293.66] },
      Gsus: { root: 98, n: [196, 261.63, 293.66] }
    };
    var i, k;

    // ── 1~2마디 · 타자 소리와 낮은 울림, 쌓이는 긴장 → 정적
    pad([55, 110, 164.81], T(0), T(7.5), 0.035, 1.4, 650, 0.03);
    var aT = $$('#a .ch');
    for (i = 0; i < aT.length; i++) if (aT[i].textContent.trim()) tick(t0 + CH0 + i * CHD, 0.55);
    [4, 5, 6, 7].forEach(function (kk, j) { kick(T(kk), 0.45 + j * 0.13); });
    riser(T(4), T(7.5), 0.17);
    roll(T(6), T(7.5), 0.18, 0.75);

    // ── 3마디 · 첫 드롭 "만들어주세요." + 프롬프트 입력
    impact(T(8), 1.0);
    stab(CH.Am.n, T(8), 0.55, 0.42);
    for (k = 9; k < 12; k++) { kick(T(k), 0.8); hat(T(k + 0.5), 0.16, true); bass(110, T(k + 0.5), B * 0.4, 0.3); }
    var pT = $$('#pb .ch');
    for (i = 0; i < pT.length; i++) if (pT[i].textContent.trim()) tick(PB0 + t0 + i * PBD, 0.5);
    pluck(T(11.75), 880, 0.25); pluck(T(11.75) + 0.06, 1318.51, 0.2);

    // ── 4~5마디 · 1부 몽타주
    for (k = 12; k < 20; k++) groove(k, k < 16 ? CH.Am : CH.F, 1, k >= 16);
    stab(CH.Am.n, T(12), 0.45, 0.3); stab(CH.F.n, T(16), 0.45, 0.3);

    // ── 6마디 앞 · 1부 완성.
    impact(T(20), 0.75); clap(T(20), 0.7);
    stab([130.81, 261.63, 329.63, 392], T(20), 1.2, 0.4);
    kick(T(21), 0.7); bass(98, T(21), B * 0.9, 0.35);

    // ── 6~7마디 · 위기: 그런데, 검색엔진에게는 빈 화면
    pad([110, 130.81, 164.81], T(22), T(26.6), 0.05, 0.6, 520, 0.4);
    sub(T(22), 55, 1.4, 0.5);
    bell(T(23), 1244.5, 0.05);
    [24, 24.12, 24.3, 24.55, 24.75, 25.1].forEach(function (x) { glitch(T(x), 0.6); });
    errTone(T(24), 0.12);
    kick(T(24), 0.5); kick(T(25), 0.55);

    // ── 7마디 뒤 · 그래서, 이사했습니다.
    whoosh(T(26.2), B * 0.5, 0.25);
    riser(T(26), T(27.9), 0.3);
    roll(T(26.5), T(27.85), 0.2, 0.9);

    // ── 8~9마디 · 두 번째 드롭 (2부)
    impact(T(28), 1.05);
    stab(CH.C.n, T(28), 0.5, 0.42);
    var p2 = [CH.C, CH.C, CH.G, CH.G, CH.Am, CH.Am, CH.F, CH.F];
    for (k = 28; k < 36; k++) {
      groove(k, p2[k - 28], 1.05, true);
      sub(T(k), p2[k - 28].root / 2, B * 0.5, 0.25);
      if (k % 2 === 0 && k > 28) stab(p2[k - 28].n, T(k), 0.35, 0.26);
    }
    snare(T(32.5), 0.7); stab([261.63, 329.63, 440], T(32.5), 0.3, 0.3);
    [1318.51, 1567.98, 2093].forEach(function (f, j) { pluck(T(34 + j * 0.5), f, 0.22); });

    // ── 10~11마디 · 숫자
    var p3 = [CH.Am, CH.Am, CH.F, CH.F, CH.C, CH.C, CH.G, CH.G];
    for (k = 36; k < 44; k++) groove(k, p3[k - 36], 1, true);
    [36, 38, 40, 42].forEach(function (kk) { whoosh(T(kk - 0.5), B * 0.5, 0.16); stab(p3[kk - 36].n, T(kk), 0.35, 0.28); });

    // ── 12마디 · 묻고. 확인하고. 고치고. 저장하고.
    [44, 45, 46, 47].forEach(function (kk, j) {
      kick(T(kk), 1); clap(T(kk), 0.6);
      stab(j < 3 ? CH.Gsus.n : CH.G.n, T(kk), 0.32, 0.3 + 0.05 * j);
      bass(98, T(kk), B * 0.8, 0.4);
      hat(T(kk + 0.25), 0.1, false); hat(T(kk + 0.5), 0.2, true); hat(T(kk + 0.75), 0.1, false);
    });
    riser(T(44), T(52), 0.28);

    // ── 13마디 · 회차 연속 플래시 (16분음표마다 한 음씩 올라가요)
    var PENTA = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
    for (i = 0; i < 16; i++) pluck(T(48 + i * 0.25), PENTA[i], 0.16 + i * 0.006);
    for (k = 48; k < 52; k++) { kick(T(k), 1); bass(98, T(k), B * 0.45, 0.35); bass(98, T(k + 0.5), B * 0.45, 0.4); }
    roll(T(48), T(52), 0.2, 0.95);

    // ── 14마디 · 정적 → 빨려 들어가는 소리 → 우리 가게가 열렸습니다.
    swell(T(53.1), T(54), 0.5);
    impact(T(54), 1.1);
    clap(T(54), 0.7);
    stab([130.81, 196, 261.63, 329.63, 392, 587.33], T(54), 2.8, 0.42);
    pad([65.41, 130.81, 196, 261.63, 329.63, 392], T(54), T(58.2), 0.13, 0.04, 2400, 1.6);
    bass(130.81, T(54), 2.6, 0.42);
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98].forEach(function (f, j) { bell(T(54.5 + j * 0.25), f, 0.07); });
    bell(T(56), 1046.5, 0.16); bell(T(56), 1567.98, 0.09);

    // ── 15~16마디 · 여운 (IV → I 로 조용히 마무리)
    [56, 57, 58, 59].forEach(function (kk, j) { kick(T(kk), 0.38 - j * 0.05); hat(T(kk + 0.5), 0.08, true); });
    pad([87.31, 174.61, 220, 261.63], T(58), T(60.4), 0.08, 0.5, 1600, 0.6);
    pad([65.41, 130.81, 196, 261.63, 329.63], T(60), T(66), 0.08, 0.6, 1400, 3.4);
    [1046.5, 1318.51, 1567.98, 2093].forEach(function (f, j) { bell(T(60 + j * 0.5), f, 0.05); });

    return { ctx: ctx, bus: bus };
  }

  function setSound(on) {
    soundOn = on;
    if (audio) { var g = audio.bus.gain, n = audio.ctx.currentTime; g.cancelScheduledValues(n); g.setTargetAtTime(on ? 1 : 0, n, 0.05); }
    [$('#mute'), $('#mute2')].forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'false' : 'true');
      b.textContent = on ? (b.id === 'mute' ? '🔊 소리' : '🔊 소리 켬') : (b.id === 'mute' ? '🔇 소리' : '🔇 소리 끔');
    });
  }
  function stopMusic() {
    if (!audio) return;
    var old = audio; audio = null;
    try { var g = old.bus.gain, n = old.ctx.currentTime; g.cancelScheduledValues(n); g.setTargetAtTime(0, n, 0.06); } catch (e) {}
    setTimeout(function () { try { old.bus.disconnect(); } catch (e) {} }, 900);
  }

  // 확인용: 음악을 소리 없이 미리 만들어 박자별 크기를 재요
  window.__introAudioCheck = function () {
    var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var oc = new OC(2, 44100 * 33, 44100);
    buildMusic(oc, 0.05, makeBuffers(oc), true);
    return oc.startRendering().then(function (buf) {
      var d = buf.getChannelData(0), sr = buf.sampleRate, res = [], peakAll = 0;
      for (var k = 0; k < 68; k++) {
        var a = Math.floor((0.05 + k * B) * sr), b = Math.floor((0.05 + (k + 1) * B) * sr), pk = 0, ss = 0;
        for (var i = a; i < b && i < d.length; i++) { var v = Math.abs(d[i]); if (v > pk) pk = v; ss += v * v; }
        peakAll = Math.max(peakAll, pk);
        res.push(k + ':' + Math.sqrt(ss / Math.max(1, b - a)).toFixed(3));
      }
      return { peak: peakAll.toFixed(3), rms: res.join(' ') };
    });
  };

  /* ═════════════ 재생 ═════════════ */
  var raf = 0, perfStart = 0, running = false, token = 0;
  function now() { return (performance.now() - perfStart) / 1000; }
  function frame() {
    var t = now();
    if (t >= 0) render(t);
    if (t < END + 0.6 || parts.length) raf = requestAnimationFrame(frame);
    else finish();
  }
  function resetVisuals() {
    parts = []; burstDone = {}; lastT = null;
    body.classList.remove('is-final', 'show-nav');
    fin.style.visibility = 'hidden';
    [eye, sub, ctl].concat(cta).forEach(function (el) { el.style.opacity = 0; });
    h1.style.opacity = 0; h2.style.opacity = 0;
    $$('#stage .t').forEach(hide);
    $$('.st-glitch').forEach(function (el) { el.style.textShadow = ''; });
    swI.forEach(function (el) { el.style.transform = 'scale(0)'; });
    pb.classList.remove('sent');
  }
  function start(withSound) {
    var my = ++token;
    soundOn = withSound;
    stopMusic();
    layout(); resetVisuals();
    gate.classList.add('gone');
    setTimeout(function () { if (gate.classList.contains('gone')) gate.style.display = 'none'; }, 450);
    body.classList.add('playing');
    setSound(withSound);
    running = true;
    cancelAnimationFrame(raf);
    perfStart = performance.now() + 60000;               // 시작 전까지는 아무것도 그리지 않아요
    raf = requestAnimationFrame(frame);
    var ctx = unlockAudio(), begun = false;
    function begin() {
      if (begun || my !== token) return; begun = true;
      var lead = 0.12;
      if (ctx && ctx.state === 'running') {
        try {
          audio = buildMusic(ctx, ctx.currentTime + lead, BUF, soundOn);
          perfStart = performance.now() + (lead + (ctx.outputLatency || ctx.baseLatency || 0)) * 1000;
          return;
        } catch (e) { audio = null; }
      }
      perfStart = performance.now() + lead * 1000;        // 소리가 막혀도 화면은 재생해요
    }
    if (!ctx || ctx.state === 'running') begin();
    else {
      try { ctx.resume().then(begin, begin); } catch (e) { begin(); }
      setTimeout(begin, 600);
    }
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
    $$('#stage .t').forEach(hide);
    flash.style.opacity = 0; ring.style.opacity = 0; panel.style.display = 'none'; lines.style.display = 'none';
    glow.style.opacity = 0.25; glow.style.transform = 'translate(-50%,-50%)';
    stage.style.transform = ''; fin.style.transform = '';
    fin.style.visibility = 'visible';
    headWrap.style.transform = 'none'; headWrap.style.filter = 'none';
    [eye, sub, ctl, h1, h2].concat(cta).forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
    fbg.classList.add('on');
    cx.clearRect(0, 0, W, H); parts = [];
  }
  function skip() {
    token++;
    stopMusic();
    running = false; cancelAnimationFrame(raf);
    showFinal();
  }

  /* ── 휴대폰 메뉴: 메뉴가 옆으로 넘칠 때 현재 메뉴가 화면 안에 보이게 밀어줘요 ── */
  (function () {
    var ul = document.querySelector('.nav__links'), cur = ul && ul.querySelector('[aria-current="page"]');
    if (!ul || !cur || ul.scrollWidth <= ul.clientWidth) return;
    var ur = ul.getBoundingClientRect(), cr = cur.getBoundingClientRect();
    if (cr.left >= ur.left && cr.right <= ur.right) return;
    ul.scrollLeft += (cr.left - ur.left) - (ur.width - cr.width) / 2;
  })();
  /* ── 카카오톡: 휴대폰에서는 바로 채팅(앱이 열려요), PC는 채널 홈 ── */
  try {
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-kakao-chat]'), function (a) { a.href = a.getAttribute('data-kakao-chat'); });
    }
  } catch (e) {}
  /* ── 버튼 ── */
  $('#play').addEventListener('click', function () { start(true); });
  $('#play-quiet').addEventListener('click', function () { start(false); });
  $('#enter').addEventListener('click', function () { showFinal(); });
  $('#skip').addEventListener('click', skip);
  $('#replay').addEventListener('click', function () { start(soundOn); });
  $('#mute').addEventListener('click', function () { setSound(!soundOn); });
  $('#mute2').addEventListener('click', function () { setSound(!soundOn); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && running) skip(); });
  document.addEventListener('visibilitychange', function () {
    // 휴대폰에서 다른 앱에 갔다 오면 소리가 멈춰 화면과 어긋날 수 있어요 → 그때는 끝 장면으로
    if (!document.hidden && running && audio && audio.ctx.state !== 'running') skip();
  });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { layout(); if (!running && body.classList.contains('is-final')) showFinal(); }, 120); });

  /* ── 처음 ── */
  var inited = false;
  function init() {
    if (inited) return; inited = true;
    layout();
    // 확인용: 주소 끝에 ?t=7.5 처럼 붙이면 그 순간의 장면을 멈춘 채로 보여줘요
    var m = location.search.match(/[?&]t=([\d.]+)/);
    if (m) {
      debugT = +m[1];
      resetVisuals(); gate.style.display = 'none'; body.classList.add('playing');
      for (var j = 0; j < BURSTS.length; j++) burstDone[BURSTS[j][0]] = 1;
      render(debugT);
      return;
    }
    // 이 사이트의 다른 화면에서 '홈'으로 돌아왔을 때만 끝 장면을 바로 보여줘요.
    // 처음 들어오면(링크·주소창·카톡) 언제나 시작 화면부터 보여줘요.
    var base = location.origin + location.pathname.replace(/[^/]*$/, '');
    var ref = (document.referrer || '').split('#')[0].split('?')[0];
    var fromInside = ref.indexOf(base) === 0 && ref !== base && ref !== base + 'index.html';
    if (fromInside) showFinal();
    else { try { $('#play').focus({ preventScroll: true }); } catch (e) {} }
  }
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : null;
  if (fontsReady) { fontsReady.then(init, init); setTimeout(init, 1500); } else init();
  if (fontsReady) fontsReady.then(function () { if (inited) layout(); });
})();
