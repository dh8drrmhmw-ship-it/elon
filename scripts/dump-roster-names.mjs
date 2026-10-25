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
