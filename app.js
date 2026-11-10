/* 우리 가게 수업 노트 · 공통 동작 (외부 라이브러리 없음) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── 알림 ── */
  var toastEl = $('.toast');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  /* ── 복사 ── */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.copy');
    if (!btn) return;
    var pre = document.getElementById(btn.getAttribute('data-target'));
    if (!pre) return;
    copyText(pre.innerText.replace(/ /g, ' ')).then(function (ok) {
      if (ok) {
        var label = btn.querySelector('span');
        btn.classList.add('done');
        if (label) label.textContent = '복사했어요';
        toast('복사했어요. Claude Code에 붙여넣으세요');
        setTimeout(function () { btn.classList.remove('done'); if (label) label.textContent = '복사'; }, 2000);
      } else {
        toast('복사가 안 됐어요. 글자를 직접 끌어서 복사해 주세요');
      }
    });
  });

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
  /* ── 카카오톡 (주소를 아직 넣지 않았을 때) ── */
  document.addEventListener('click', function (e) {
    var k = e.target.closest('[data-kakao-pending]');
    if (k) { e.preventDefault(); toast('카카오톡 연결을 준비하고 있어요. 수업 시간에 물어봐 주세요'); }
    var c = e.target.closest('[data-copylink]');
    if (c) {
      e.preventDefault();
      var url = location.href.split('#')[0].split('?')[0] + c.getAttribute('href');
      copyText(url).then(function (ok) { toast(ok ? '질문 주소를 복사했어요' : '복사가 안 됐어요'); });
    }
  });

  /* ── 내 정보로 채우기 (이 화면에서만, 저장하지 않음) ── */
  $$('[data-fill]').forEach(function (input) {
    var key = input.getAttribute('data-fill');
    input.addEventListener('input', function () {
      var v = input.value.trim();
      $$('mark.ph[data-ph="' + key + '"]').forEach(function (m) {
        m.textContent = v ? v : '[' + key + ']';
        m.classList.toggle('filled', !!v);
      });
    });
  });

  /* ── 주소 #으로 펼치기 ── */
  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var d = el.tagName === 'DETAILS' ? el : el.closest('details');
    if (d) d.open = true;
    setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 30);
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();

  /* ── 모두 펼치기 / 접기 ── */
  $$('[data-expand]').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('data-expand') === 'open';
      $$(b.getAttribute('data-scope') || 'details.sess').forEach(function (d) { d.open = open; });
    });
  });

  /* ── 찾기 ── */
  var q = $('#q');
  if (q) {
    var items = $$('[data-s]');
    var groups = $$('[data-group]');
    var count = $('#q-count');
    var empty = $('.empty');
    var main = $('#main');
    var memo = {};
    items.forEach(function (it, i) { memo[i] = (it.getAttribute('data-s') + ' ' + it.textContent).toLowerCase(); });
    var timer;
    q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 120); });
    function run() {
      var words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      var searching = words.length > 0;
      main.classList.toggle('is-searching', searching);
      var n = 0;
      items.forEach(function (it, i) {
        var hit = !searching || words.every(function (w) { return memo[i].indexOf(w) !== -1; });
        it.hidden = !hit;
        if (hit && searching) {
          n++;
          if (it.tagName === 'DETAILS') it.open = true;
        }
      });
      groups.forEach(function (g) {
        var any = $$('[data-s]', g).some(function (it) { return !it.hidden; });
        g.hidden = searching && !any;
      });
      if (count) count.textContent = searching ? (n ? n + '개를 찾았어요' : '') : '';
      if (empty) empty.classList.toggle('show', searching && n === 0);
      highlight(words);
    }
    // 찾은 말을 질문 글자에 노랗게 칠해요 (FAQ)
    var hls = $$('[data-hl]');
    hls.forEach(function (el) { el.setAttribute('data-orig', el.textContent); });
    function esc(x) { return x.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function highlight(words) {
      hls.forEach(function (el) {
        var orig = el.getAttribute('data-orig'), out = esc(orig);
        if (words.length) {
          var re = new RegExp('(' + words.map(function (w) { return esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
          out = out.replace(re, '<mark class="hl">$1</mark>');
        }
        el.innerHTML = out;
      });
    }
    var clear = $('#q-clear');
    if (clear) clear.addEventListener('click', function () { q.value = ''; run(); q.focus(); });
    // 자주 찾는 말 버튼
    $$('.hot').forEach(function (b) {
      b.addEventListener('click', function () { q.value = b.getAttribute('data-q'); run(); q.focus(); });
    });
    // 주소에 ?q=키 처럼 붙이면 그 말로 찾아둔 채 열려요
    try {
      var pre = new URLSearchParams(location.search).get('q');
      if (pre) { q.value = pre; run(); }
    } catch (e) {}
  }

  /* ── 목차 현재 위치 ── */
  var tocLinks = $$('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          tocLinks.forEach(function (a) { a.classList.remove('on'); });
          map[en.target.id].classList.add('on');
          var parent = map[en.target.id].getAttribute('data-parent');
          if (parent && map[parent]) map[parent].classList.add('on');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ── 맨 위로 ── */
  var top = $('.top');
  if (top) {
    window.addEventListener('scroll', function () { top.classList.toggle('show', window.scrollY > 600); }, { passive: true });
  }

  /* ── 인쇄할 때는 모두 펼치기 ── */
  window.addEventListener('beforeprint', function () { $$('details').forEach(function (d) { d.setAttribute('data-was', d.open ? '1' : '0'); d.open = true; }); });
  window.addEventListener('afterprint', function () { $$('details').forEach(function (d) { d.open = d.getAttribute('data-was') === '1'; }); });
})();
