// 临时探测：比赛集锦 /v1/game/{pk}/content
const r = await fetch('https://statsapi.mlb.com/api/v1/game/849805/content');
console.log('status', r.status);
const d = await r.json();
console.log('top keys', Object.keys(d).join(','));
const hl = d.highlights || {};
console.log('highlights keys', Object.keys(hl).join(','));
const items = hl.highlights?.items || hl.live?.items || [];
console.log('items', items.length);
for (const it of items.slice(0, 3)) {
  console.log('ITEM', JSON.stringify({ headline: it.headline, blurb: it.blurb, duration: it.duration, date: it.date,
    keywords: (it.keywordsAll || []).slice(0, 8), cuts: (it.image?.cuts || []).map(c => [c.width, c.height, c.src]).slice(0, 4),
    playbacks: (it.playbacks || []).map(p => [p.name, p.url]) }).slice(0, 2500));
}
console.log('editorial recap', JSON.stringify(d.editorial?.recap?.mlb?.headline || null));
