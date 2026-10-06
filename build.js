// Static site generator: node build.js
// Output: / (English), /de/ (German), /fr/ (French), each with the same six pages.
const fs = require('fs');
const path = require('path');

const LANGS = ['en', 'de', 'fr'];
const PAGES = [
  { id: 'home', slug: '', title: 'homeTitle', desc: 'homeDesc' },
  { id: 'about', slug: 'about', title: 'aboutTitle', desc: 'aboutDesc' },
  { id: 'gatherings', slug: 'gatherings', title: 'gathTitle', desc: 'gathDesc' },
  { id: 'preachings', slug: 'preachings', title: 'prTitle', desc: 'prDesc' },
  { id: 'visit', slug: 'visit', title: 'visitTitle', desc: 'visitDesc' },
  { id: 'departments', slug: 'departments', title: 'depTitle', desc: 'depDesc' },
  { id: 'give', slug: 'give', title: 'giveTitle', desc: 'giveDesc' },
  { id: 'legal', slug: 'legal', title: 'legalTitle', desc: 'legalDesc' }
];
const SKIP = { en: 'Skip to content', de: 'Zum Inhalt springen', fr: 'Aller au contenu' };

const LINKS = {
  facebook: 'https://www.facebook.com/lightofgodwienerneustadt/',
  youtube: 'https://www.youtube.com/@TheLightofGodMinistriesWienerN',
  instagram: 'https://www.instagram.com/obakpolorosas',
  tiktok: 'https://www.tiktok.com/@the.light.of.god4',
  whatsappUrl: 'https://wa.me/436769465931',
  mapsPlace: 'https://maps.app.goo.gl/q8VCxmj5MTgP4SUw8'
};

// Giving details. Fill these in to show a bank-transfer card and/or an online-giving button on the Give page.
// While empty, the page shows only the "call or WhatsApp us" card (no details are invented).
const GIVE = { holder: 'Osaremwanta Obakpolor', iban: 'AT56 2026 7020 1202 5629', bic: 'WINSATWN', reference: '', paymentLink: '' };

const DEPT_ICONS = {
  music: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  media: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5l6-3.5v10l-6-3.5"/></svg>',
  kids: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1 1.3 2.1 2 3.5 2s2.5-.7 3.5-2"/><circle cx="9" cy="10" r=".6" fill="currentColor"/><circle cx="15" cy="10" r=".6" fill="currentColor"/></svg>'
};

// Department photos live in assets/departments/<slug>/NN.jpg (full size) and t-NN.jpg (thumbnail).
// cover = which photo shows on the department card; count = number of photos (0 = no gallery page yet).
const DEPT_SLUG = { music: 'choir', media: 'media', kids: 'kids' };
const DEPT_MEDIA = { choir: { cover: 4, count: 4 }, kids: { cover: 8, count: 14 }, media: { cover: 0, count: 0 } };
const DEPT_PAGES = Object.entries(DEPT_MEDIA).filter(([, m]) => m.count > 0)
  .map(([slug]) => ({ id: 'department', slug: 'departments/' + slug, dept: slug, parent: 'departments' }));
const pad2 = n => String(n).padStart(2, '0');

const ICONS = {
  Facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.5-3.3h-3.3V8.4c0-.9.4-1.7 1.8-1.7H17V3.8c-.3 0-1.3-.2-2.5-.2-2.6 0-4.3 1.6-4.3 4.4v2.5H7.4v3.3h2.8V22z"/></svg>',
  Instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  YouTube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z"/></svg>',
  TikTok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.5 2h3.4c.2 1.700 1.400 3.400 3.600 3.600v3.400c-1.300 0-2.600-.4-3.700-1.100v6.300a5.700 5.700 0 1 1-5.700-5.700c.3 0 .6 0 .9.100v3.500a2.300 2.300 0 1 0 1.500 2.100z"/></svg>',
  WhatsApp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.600 15.100L2 22l5-1.300A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.100-1.100l-.3-.2-3 .8.8-2.900-.2-.3A8 8 0 1 1 12 20zm4.400-5.900c-.2-.1-1.400-.7-1.600-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1-.7-.3-2.200-.8-3.200-2.600-.1-.2 0-.3.1-.4l.4-.5c.1-.1.1-.3.2-.4 0-.1 0-.3 0-.4l-.7-1.700c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.6.6-.9 1.300-.9 2 .1 1 .5 2 1.100 2.800 1 1.500 2.300 2.600 3.800 3.200 1 .4 1.700.5 2.300.4.700-.1 1.600-.7 1.800-1.300.2-.6.2-1.100.1-1.200-.1-.1-.2-.2-.4-.3z"/></svg>',
  Google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>'
};
const SOCIALS = [
  ['Facebook', LINKS.facebook, 'fb'], ['Instagram', LINKS.instagram, 'ig'], ['YouTube', LINKS.youtube, 'yt'],
  ['TikTok', LINKS.tiktok, 'tt'], ['WhatsApp', LINKS.whatsappUrl, 'wa']
];

const FLAGS = {
  en: { name: 'English', svg: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" stroke-width="1.4"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6"/><path d="M15 0V20M0 10H30" stroke="#C8102E" stroke-width="3.6"/></svg>' },
  de: { name: 'Deutsch', svg: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#DD0000"/><rect y="13.33" width="30" height="6.67" fill="#FFCE00"/></svg>' },
  fr: { name: 'Français', svg: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#fff"/><rect width="10" height="20" fill="#0055A4"/><rect x="20" width="10" height="20" fill="#EF4135"/></svg>' }
};

const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const layout = read('src/layout.html');
const pageSrc = Object.fromEntries(PAGES.map(p => [p.id, read(`src/pages/${p.id}.html`)]));
pageSrc.department = read('src/pages/department.html');

const dirOf = (lang, page) => (lang === 'en' ? '' : lang + '/') + (page.slug ? page.slug + '/' : '');
const depthOf = dir => dir.split('/').filter(Boolean).length;

function fill(tpl, vars, where) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`Missing key "${k}" in ${where}`);
    return vars[k];
  });
}

function build() {
  // clean previous output
  for (const d of ['de', 'fr', 'about', 'gatherings', 'preachings', 'visit', 'legal', 'departments', 'give']) {
    fs.rmSync(path.join(__dirname, d), { recursive: true, force: true });
  }
  let count = 0;
  for (const lang of LANGS) {
    const t = require(`./src/i18n/${lang}.js`);
    for (const page of [...PAGES, ...DEPT_PAGES]) {
      const dir = dirOf(lang, page);
      const deptInfo = page.dept ? t.departments.find(x => DEPT_SLUG[x.icon] === page.dept) : null;
      const root = '../'.repeat(depthOf(dir));
      const href = (l, p) => root + dirOf(l, p) || './';
      const vars = { ...t, ...LINKS, page: page.id, root, skip: SKIP[lang], pageTitle: deptInfo ? `${deptInfo.name} – ${t.depGalleryEyebrow} – The Light of God Ministries` : t[page.title], pageDesc: deptInfo ? deptInfo.text : t[page.desc] };
      for (const p of PAGES) {
        vars['h' + p.id[0].toUpperCase() + p.id.slice(1)] = href(lang, p);
        vars['cur_' + p.id] = p.id === page.id ? ' aria-current="page"' : '';
      }
      if (page.parent) vars['cur_' + page.parent] = ' aria-current="page"';
      vars.langSwitch = LANGS.map(l => {
        const cur = l === lang;
        return `<a href="${href(l, page)}" lang="${l}" hreflang="${l}" title="${FLAGS[l].name}" aria-label="${FLAGS[l].name}"${cur ? ' aria-current="true"' : ''}>${FLAGS[l].svg}</a>`;
      }).join('');
      vars.socialIcons = SOCIALS.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener" aria-label="${n}">${ICONS[n]}</a>`).join('');
      vars.socialPills = SOCIALS.concat([['Google', LINKS.mapsPlace, 'map-link']])
        .map(([n, u, c]) => `<a class="social-link ${c}" href="${u}" target="_blank" rel="noopener">${ICONS[n]} ${n === 'Google' ? 'Google Maps' : n}</a>`).join('\n          ');
      vars.iconInstagram = ICONS.Instagram;
      const joinUrl = name => `${LINKS.whatsappUrl}?text=${encodeURIComponent(t.depWaMsg.replace('{name}', name))}`;
      vars.deptCards = '<div class="cards">' + t.departments.map(d => {
        const slug = DEPT_SLUG[d.icon], m = DEPT_MEDIA[slug];
        const hasGallery = m.count > 0;
        const cover = hasGallery
          ? `<div class="cover"><img src="${root}assets/departments/${slug}/t-${pad2(m.cover)}.jpg" alt="${d.name}" width="900" height="600" loading="lazy"></div>`
          : `<div class="cover ph" aria-hidden="true">${DEPT_ICONS[d.icon]}</div>`;
        const title = hasGallery ? `<a class="stretched" href="${root}${dirOf(lang, { slug: 'departments/' + slug })}">${d.name}</a>` : d.name;
        const more = hasGallery ? `<p class="dept-more">${t.depViewPhotos} →</p>` : '';
        return `
          <article class="card dept${hasGallery ? ' linked' : ''}">
            ${cover}
            <h3>${title}</h3>
            <p>${d.text}</p>
            ${more}
            <a class="btn btn-indigo btn-sm" href="${joinUrl(d.name)}" target="_blank" rel="noopener">${t.depJoin}</a>
          </article>`;
      }).join('') + '\n        </div>';
      if (deptInfo) {
        const slug = page.dept, m = DEPT_MEDIA[slug];
        vars.deptName = deptInfo.name;
        vars.deptText = deptInfo.text;
        vars.deptJoinUrl = joinUrl(deptInfo.name);
        vars.galleryGrid = '<ul class="gallery">' + Array.from({ length: m.count }, (_, i) => {
          const n = i + 1, alt = t.depPhotoAlt.replace('{name}', deptInfo.name).replace('{n}', n);
          return `
          <li><a href="${root}assets/departments/${slug}/${pad2(n)}.jpg" data-lightbox data-alt="${alt}"><img src="${root}assets/departments/${slug}/t-${pad2(n)}.jpg" alt="${alt}" width="900" height="600" loading="lazy"></a></li>`;
        }).join('') + '\n        </ul>';
      }
      vars.iconYoutubeButton = '<svg class="yt-mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#fff"/><path d="M10 9l5.5 3-5.5 3z" fill="#e00000"/></svg>';
      vars.giveBankCard = GIVE.iban ? `<article class="card"><span class="day">${t.giveBankTitle}</span><h3>${GIVE.holder}</h3><dl class="bank"><dt>${t.giveIban}</dt><dd>${GIVE.iban}</dd>${GIVE.bic ? `<dt>${t.giveBic}</dt><dd>${GIVE.bic}</dd>` : ''}${GIVE.reference ? `<dt>${t.giveRef}</dt><dd>${GIVE.reference}</dd>` : ''}</dl></article>` : '';
      vars.giveLinkCard = GIVE.paymentLink ? `<article class="card featured"><span class="day">${t.giveEyebrow}</span><h3>${t.giveH1}</h3><p>${t.giveThanks}</p><a class="btn btn-gold" href="${GIVE.paymentLink}" target="_blank" rel="noopener">${t.giveLinkCta}</a></article>` : '';
      vars.iconTiktok = ICONS.TikTok;
      vars.i18nJson = JSON.stringify(t.js).replace(/</g, '\\u003c');

      const svc = [
        { day: t.dayMon, name: t.svcBible, time: '17:30 – 19:00', text: t.svcBibleText, online: true },
        { day: t.dayWed, name: t.svcPrayer, time: '17:00 – 18:30', text: t.svcPrayerText },
        { day: t.daySun, name: t.svcService, time: '10:00 – 12:30', text: t.svcServiceText, featured: true }
      ];
      vars.serviceCards = '<div class="cards">' + svc.map(s => `
          <article class="card${s.featured ? ' featured' : ''}">
            <span class="day">${s.day}</span>
            <h3>${s.name}</h3>
            <p class="time">${s.time}</p>
            <p>${s.text}</p>
            ${s.online
              ? `<a class="link" href="${LINKS.whatsappUrl}" target="_blank" rel="noopener">${t.askLink}</a>`
              : `<a class="link" href="${vars.hVisit}">Bräunlichgasse 24 →</a>`}
          </article>`).join('') + '\n        </div>';
      vars.serviceCardsDetailed = '<div class="cards">' + svc.map(s => `
          <article class="card${s.featured ? ' featured' : ''}">
            <span class="day">${s.day}</span>
            <h3>${s.name}</h3>
            <p class="time">${s.time}</p>
            <p>${s.text}</p>
            <p class="where-line">${s.online ? t.gathOnline : 'Bräunlichgasse 24, Wiener Neustadt'}</p>
            ${s.online ? `<a class="link" href="${LINKS.whatsappUrl}" target="_blank" rel="noopener">${t.askLink}</a>` : ''}
          </article>`).join('') + '\n        </div>';

      // resolve nested placeholders (page content may contain {{...}} from vars) in two passes
      const where = `${lang}/${page.id}`;
      let content = fill(pageSrc[page.id], vars, where);
      content = fill(content, vars, where);
      const html = fill(layout, { ...vars, content }, where);
      const out = path.join(__dirname, dir, 'index.html');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, html, 'utf8');
      count++;
    }
  }
  console.log(`Built ${count} pages`);
}
build();
