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
