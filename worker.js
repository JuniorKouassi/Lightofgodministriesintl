// Cloudflare Worker for lightofgodministriesintl.
//  - /api/videos      -> the church's newest YouTube videos (+ live stream id when live), cached for a few minutes
//  - /thumb/<id>.jpg  -> video preview pictures, served from this site so visitors do not contact YouTube until they press play
//  - everything else  -> the static website (assets)
const CHANNEL_ID = 'UC7WvYHd-FKpB2IIH7Igz93A';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const LIVE_URL = `https://www.youtube.com/channel/${CHANNEL_ID}/live`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function parseFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const e = m[1];
    const id = (e.match(/<yt:videoId>([^<]+)</) || [])[1];
    const title = decode((e.match(/<title>([^<]*)</) || [])[1] || '');
    const published = (e.match(/<published>([^<]+)</) || [])[1] || '';
    // titles look like "... - 25/10/2026": use that date for the service day, else the upload date
    const dm = title.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const date = dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : published.slice(0, 10);
    return { id, title, date };
  }).filter(v => v.id && ID_RE.test(v.id));
}

async function cached(ctx, key, ttl, produce) {
  const cache = caches.default;
  const req = new Request('https://cache.internal/' + key);
  const hit = await cache.match(req);
  if (hit) return hit.json();
  const value = await produce();
  ctx.waitUntil(cache.put(req, new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` } })));
  return value;
}

async function getVideos(ctx) {
  try {
    return await cached(ctx, 'feed-v1', 600, async () => {
      const r = await fetch(FEED_URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error('feed ' + r.status);
      const videos = parseFeed(await r.text());
      if (!videos.length) throw new Error('empty feed');
      return videos;
    });
  } catch (e) { return []; }
}

// Best effort: the channel's /live page names a watch URL and says isLiveNow only while a stream is running.
async function getLiveId(ctx) {
  try {
    return await cached(ctx, 'live-v1', 90, async () => {
      const r = await fetch(LIVE_URL, { headers: { 'User-Agent': UA, 'Accept-Language': 'en', Cookie: 'CONSENT=YES+1' }, signal: AbortSignal.timeout(5000) });
      if (!r.ok) return null;
      const html = await r.text();
      const c = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/);
      if (c && /"isLiveNow":true/.test(html)) return c[1];
      return null;
    });
  } catch (e) { return null; }
}

const json = (obj, ttl) => new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${ttl}` } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/videos') {
      const [videos, live] = await Promise.all([getVideos(ctx), getLiveId(ctx)]);
      return json({ videos: videos.slice(0, 12), live, updated: new Date().toISOString() }, 120);
    }

    const t = url.pathname.match(/^\/thumb\/([A-Za-z0-9_-]{11})\.jpg$/);
    if (t) {
      const id = t[1];
      const [videos, live] = await Promise.all([getVideos(ctx), getLiveId(ctx)]);
      if (!videos.some(v => v.id === id) && live !== id) return new Response('Not found', { status: 404 });
      const sizes = url.searchParams.get('q') === 'mq' ? ['mqdefault'] : ['maxresdefault', 'hqdefault'];
      for (const size of sizes) {
        const r = await fetch(`https://i.ytimg.com/vi/${id}/${size}.jpg`, { cf: { cacheTtl: 86400, cacheEverything: true } });
        if (r.ok) return new Response(r.body, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
      }
      return new Response('Not found', { status: 404 });
    }

    return env.ASSETS.fetch(request);
  }
};
