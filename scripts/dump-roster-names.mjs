// 临时：列出 30 队现役名单和教练里还没有中文译名的人
import { readFile } from 'node:fs/promises';
const html = await readFile('baseball/index.html', 'utf8');
const lib = html.match(/const NAMES=\{\};\n`([^`]*)`/)[1];
const known = new Set(lib.split(';').map(x => x.split('=')[0].trim()));
const norm = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
const teams = (await (await fetch('https://statsapi.mlb.com/api/v1/teams?sportId=1')).json()).teams;
const missing = new Set();
for (const t of teams) {
  for (const kind of ['roster?rosterType=active', 'coaches']) {
    const d = await (await fetch(`https://statsapi.mlb.com/api/v1/teams/${t.id}/${kind}`)).json();
    for (const p of d.roster || []) if (!known.has(norm(p.person.fullName))) missing.add(`${t.abbreviation}|${p.person.fullName}|${p.position ? p.position.abbreviation : p.job}`);
  }
}
console.log(`MISSING ${missing.size}`);
for (const m of [...missing].sort()) console.log('N:' + m);

// 临时探测：赛程 hydrate=scoringplays 的返回格式
const sp = await (await fetch('https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=2026-10-20&endDate=2026-10-25&hydrate=scoringplays')).json();
const g = sp.dates?.flatMap(d => d.games).find(x => x.scoringPlays?.length);
console.log('SCORING sample game', g?.gamePk, 'plays', g?.scoringPlays?.length);
console.log('SCORING keys', Object.keys(g?.scoringPlays?.[0] || {}).join(','));
console.log('SCORING first', JSON.stringify({ result: g?.scoringPlays?.[0]?.result, about: g?.scoringPlays?.[0]?.about, batter: g?.scoringPlays?.[0]?.matchup?.batter }).slice(0, 800));
