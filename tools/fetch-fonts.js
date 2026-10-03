// One-time: download the latin subset of the Google Fonts we use and write css/fonts.css (self-hosted, no Google requests at runtime).
const fs = require('fs'), https = require('https');
const get = (u, bin) => new Promise((res, rej) => https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }, r => {
  const c = []; r.on('data', d => c.push(d)); r.on('end', () => res(bin ? Buffer.concat(c) : Buffer.concat(c).toString()));
}).on('error', rej));
(async () => {
  const api = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@400;500;600;700&display=swap';
  const css = await get(api);
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)].filter(m => m[1] === 'latin');
  let out = '';
  for (const [, , block] of blocks) {
    const fam = /font-family:\s*'([^']+)'/.exec(block)[1];
    const wt = /font-weight:\s*([\d ]+);/.exec(block)[1].trim();
    const url = /url\(([^)]+)\)/.exec(block)[1];
    const file = `${fam.replace(/\s+/g, '-').toLowerCase()}-${wt.replace(/\s+/g, '-')}.woff2`;
    fs.writeFileSync('assets/fonts/' + file, await get(url, true));
    out += block.replace(/url\([^)]+\)/, `url(../assets/fonts/${file})`).replace(/unicode-range:[^;]+;/, m => m) + '\n';
    console.log(fam, wt, file);
  }
  fs.writeFileSync('css/fonts.css', out);
})();
