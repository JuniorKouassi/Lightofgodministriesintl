(function () {
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  function onScroll() { nav.classList.toggle('solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      menu.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  // Next gathering, computed in Vienna time so visitors anywhere see the right one.
  // day: 0 = Sunday. start/end in minutes from midnight.
  var gatherings = [
    { day: 0, start: 600, end: 750, label: 'Church Service' },
    { day: 1, start: 1050, end: 1140, label: 'Online Bible Study' },
    { day: 3, start: 1020, end: 1110, label: 'Prayer Meeting' }
  ];
  var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function viennaNow() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Vienna', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var get = function (t) { return parts.find(function (p) { return p.type === t; }).value; };
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day: day, min: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10) };
  }
  function fmt(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

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
  try {
    var n = nextGathering();
    el.textContent = n.live
      ? n.g.label + ' is happening now (until ' + fmt(n.g.end) + ').'
      : 'Next: ' + n.g.label + ', ' + names[n.g.day] + ' at ' + fmt(n.g.start) + '.';
  } catch (e) { /* leave empty */ }

  // Scroll reveal
  var items = document.querySelectorAll('.card, .about-grid > *, .visit-grid > *, .watch .wrap > *, .social-link');
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
