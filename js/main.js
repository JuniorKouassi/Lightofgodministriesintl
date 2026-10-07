(function () {
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  var t = window.I18N || {};

  function onScroll() { nav.classList.toggle('solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      menu.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  // Next gathering, computed in Vienna time so visitors anywhere see the right one.
  // day: 0 = Sunday. start/end in minutes from midnight.
  var gatherings = [
    { day: 0, start: 600, end: 750, key: 'sun' },
    { day: 1, start: 1050, end: 1140, key: 'mon' },
    { day: 3, start: 1020, end: 1110, key: 'wed' }
  ];

  function viennaNow() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Vienna', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var get = function (type) { return parts.find(function (p) { return p.type === type; }).value; };
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day: day, min: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10) };
  }
  function fmt(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function tpl(s, v) { return s.replace(/\{(\w+)\}/g, function (_, k) { return v[k]; }); }

  function nextGathering() {
    var now = viennaNow(), best = null;
    gatherings.forEach(function (g) {
      var delta = (g.day - now.day) * 1440 + (g.start - now.min);
      var live = g.day === now.day && now.min >= g.start && now.min < g.end;
      if (!live && delta <= 0) delta += 7 * 1440;
      if (live) delta = 0;
      if (!best || delta < best.delta) best = { g: g, delta: delta, live: live };
    });
    return best;
  }

  var el = document.getElementById('nextService');
  if (el && t.days) {
    try {
      var n = nextGathering();
      var label = t.labels[n.g.key];
      el.textContent = n.live
        ? tpl(t.now, { label: label, end: fmt(n.g.end) })
        : tpl(t.next, { label: label, day: t.days[n.g.day], time: fmt(n.g.start) });
    } catch (e) { /* leave empty */ }
  }

  // Map: load Google only after an explicit click (privacy).
  var map = document.getElementById('map');
  var loadBtn = document.getElementById('loadMap');
  if (map && loadBtn) {
    loadBtn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = map.getAttribute('data-src');
      f.title = map.getAttribute('data-title') || '';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      map.appendChild(f);
      var c = map.querySelector('.map-consent');
      if (c) c.remove();
    });
  }

  // Hero logo intro: loops continuously, fading out at the end of each pass so the restart is smooth.
  // Skipped (static final frame) for reduced-motion and data-saver visitors.
  var hero = document.getElementById('hero');
  var hv = document.getElementById('heroVideo');
  if (hero && hv) {
    var conn = navigator.connection || {};
    var skip = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || conn.saveData;
    if (!skip) {
      hero.classList.add('will-play');
      hv.src = (window.matchMedia && matchMedia('(max-width: 860px)').matches) ? hv.getAttribute('data-small') : hv.getAttribute('data-large');
      hv.addEventListener('playing', function () { hero.classList.add('video-on'); });
      hv.addEventListener('timeupdate', function () {
        hero.classList.toggle('fade-out', !!hv.duration && hv.duration - hv.currentTime < 0.7);
      });
      hv.addEventListener('error', function () { hero.classList.remove('will-play'); });
      var p = hv.play();
      if (p && p.catch) p.catch(function () { hero.classList.remove('will-play'); });
    }
  }

  // Photo gallery lightbox
  var lb = document.getElementById('lightbox');
  var thumbs = Array.prototype.slice.call(document.querySelectorAll('a[data-lightbox]'));
  if (lb && thumbs.length) {
    var lbImg = lb.querySelector('.lb-img');
    var lbCount = lb.querySelector('.lb-count');
    var idx = 0, opener = null;
    var show = function (i) {
      idx = (i + thumbs.length) % thumbs.length;
      lbImg.src = thumbs[idx].getAttribute('href');
      lbImg.alt = thumbs[idx].getAttribute('data-alt') || '';
      lbCount.textContent = (idx + 1) + ' / ' + thumbs.length;
      var nx = new Image(); nx.src = thumbs[(idx + 1) % thumbs.length].getAttribute('href');
    };
    var open = function (i, from) {
      opener = from; show(i); lb.hidden = false; document.body.style.overflow = 'hidden';
      lb.querySelector('.lb-close').focus();
    };
    var close = function () {
      lb.hidden = true; document.body.style.overflow = ''; lbImg.removeAttribute('src');
      if (opener) opener.focus();
    };
    thumbs.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); open(i, a); }); });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-figure')) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'Tab') {
        var f = lb.querySelectorAll('button'); var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var tx = null;
    lb.addEventListener('touchstart', function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  // Offerings flow: gift type -> amount -> pay
  var gf = document.getElementById('giveFlow');
  if (gf) {
    var cfg = JSON.parse(gf.getAttribute('data-cfg'));
    gf.classList.add('js');
    var panels = gf.querySelectorAll('.gf-panel');
    var stepLis = gf.querySelectorAll('.gf-steps li');
    var state = { type: null, amount: null };
    var cur = 1;
    var lang = document.documentElement.lang || 'en';
    var fmt = function (n) {
      try { return new Intl.NumberFormat(lang, { style: 'currency', currency: cfg.currency }).format(n); } catch (e) { return n + ' ' + cfg.currency; }
    };
    var go = function (n) {
      cur = n;
      panels.forEach(function (p) { p.hidden = Number(p.getAttribute('data-step')) !== n; });
      stepLis.forEach(function (li) {
        var s = Number(li.getAttribute('data-s'));
        li.classList.toggle('on', s === n); li.classList.toggle('done', s < n);
      });
      var h = gf.querySelector('.gf-panel[data-step="' + n + '"] h3');
      if (h) h.focus({ preventScroll: true });
      gf.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    var err = function (n, msg) { gf.querySelector('.gf-panel[data-step="' + n + '"] .gf-err').textContent = msg || ''; };
    var customWrap = gf.querySelector('.gf-custom');
    var customIn = document.getElementById('gf-custom');
    gf.querySelectorAll('input[name="gf-amt"]').forEach(function (r) {
      r.addEventListener('change', function () {
        var other = r.value === 'other' && r.checked;
        customWrap.hidden = !other;
        if (other) customIn.focus();
        err(2, '');
      });
    });
    gf.querySelectorAll('input[name="gf-type"]').forEach(function (r) { r.addEventListener('change', function () { err(1, ''); }); });

    var readAmount = function () {
      var sel = gf.querySelector('input[name="gf-amt"]:checked');
      if (!sel) return null;
      var v = sel.value === 'other' ? parseFloat(String(customIn.value).replace(',', '.')) : parseFloat(sel.value);
      if (!isFinite(v) || v < 1) return null;
      return Math.round(v * 100) / 100;
    };
    var setMethod = function (el, href) {
      if (href) { el.setAttribute('href', href); el.removeAttribute('aria-disabled'); }
      else { el.removeAttribute('href'); el.setAttribute('aria-disabled', 'true'); }
    };
    var prepareStep3 = function () {
      document.getElementById('gf-sum').textContent = cfg.names[state.type] + ' · ' + fmt(state.amount);
      var stripeUrl = cfg.stripe[state.type] || '';
      setMethod(gf.querySelector('[data-m="card"]'), stripeUrl);
      document.getElementById('gf-stripe-note').hidden = !stripeUrl;
      var pp = cfg.paypalMe ? 'https://www.paypal.me/' + encodeURIComponent(cfg.paypalMe) + '/' + state.amount + cfg.currency : '';
      setMethod(gf.querySelector('[data-m="paypal"]'), pp);
      document.getElementById('gf-holder').textContent = cfg.bank.holder;
      document.getElementById('gf-iban').textContent = cfg.bank.iban;
      document.getElementById('gf-bic').textContent = cfg.bank.bic;
      document.getElementById('gf-ref').textContent = cfg.names[state.type];
    };
    gf.addEventListener('click', function (e) {
      var b = e.target.closest('button, a');
      if (!b || !gf.contains(b)) return;
      if (b.hasAttribute('data-back')) { go(cur - 1); return; }
      if (b.hasAttribute('data-next')) {
        if (cur === 1) {
          var t = gf.querySelector('input[name="gf-type"]:checked');
          if (!t) { err(1, gf.getAttribute('data-err-type')); return; }
          state.type = t.value; go(2);
        } else if (cur === 2) {
          var a = readAmount();
          if (a === null) { err(2, gf.getAttribute('data-err-amount')); return; }
          state.amount = a; prepareStep3(); go(3);
        }
        return;
      }
      if (b.getAttribute('data-m') === 'bank') {
        var box = document.getElementById('gf-bank');
        var open = box.hidden;
        box.hidden = !open; b.setAttribute('aria-expanded', String(open));
        return;
      }
      if (b.classList.contains('gf-copy')) {
        var txt = document.getElementById(b.getAttribute('data-copy-target')).textContent;
        var done = function () {
          var old = b.textContent; b.textContent = gf.getAttribute('data-copied');
          setTimeout(function () { b.textContent = old; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () {});
        return;
      }
      if (b.tagName === 'A' && b.getAttribute('aria-disabled') === 'true') e.preventDefault();
    });
    customIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); gf.querySelector('.gf-panel[data-step="2"] [data-next]').click(); } });
  }

  // Scroll reveal
  var items = document.querySelectorAll('.card, .about-grid > *, .visit-grid > *, .leader-grid > *, .watch .wrap > *, .social-link');
  items.forEach(function (i) { i.classList.add('reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (i) { io.observe(i); });
  } else {
    items.forEach(function (i) { i.classList.add('in'); });
  }
})();
