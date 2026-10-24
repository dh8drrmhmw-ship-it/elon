// 抓取 MLB The Show 的 Live Series 球员卡能力值，写成 ratings.json 供页面读取。
// 用法：node scripts/fetch-ratings.mjs <输出文件>
// 抓取失败时不写文件、以非零状态退出，页面会显示“暂无能力值”。
import { writeFile } from 'node:fs/promises';

const out = process.argv[2] || 'ratings.json';
const YEARS = (process.env.SHOW_YEARS || '26,25').split(',');

// 页面用到的能力项（The Show 接口字段名）
const HITTER = ['contact_left', 'contact_right', 'power_left', 'power_right', 'plate_vision', 'plate_discipline',
  'batting_clutch', 'bunting_ability', 'drag_bunting_ability', 'hitting_durability', 'fielding_durability',
  'fielding_ability', 'arm_strength', 'arm_accuracy', 'reaction_time', 'blocking', 'speed',
  'baserunning_ability', 'baserunning_aggression'];
const PITCHER = ['stamina', 'pitching_clutch', 'hits_per_bf', 'k_per_bf', 'bb_per_bf', 'hr_per_bf',
  'pitch_velocity', 'pitch_control', 'pitch_movement'];

async function getJSON(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'benlei-baseball/1.0' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await new Promise(res => setTimeout(res, 1000 * i));
    }
  }
}

async function fetchYear(yy) {
  const base = `https://mlb${yy}.theshow.com/apis/items.json?type=mlb_card`;
  const first = await getJSON(`${base}&page=1`);
  const pages = first.total_pages || 1;
  const items = [...(first.items || [])];
  for (let p = 2; p <= pages; p += 5) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(5, pages - p + 1) }, (_, i) => getJSON(`${base}&page=${p + i}`)));
    batch.forEach(b => items.push(...(b.items || [])));
  }
  return items;
}

let items = null, year = null;
for (const yy of YEARS) {
  try { items = await fetchYear(yy); year = yy; break; }
  catch (e) { console.error(`MLB The Show ${yy}: ${e.message}`); }
}
if (!items) { console.error('没有拿到任何球员卡数据'); process.exit(1); }

const live = items.filter(c => c.series === 'Live');
console.log(`MLB The Show ${year}: 共 ${items.length} 张卡，Live Series ${live.length} 张`);
if (items[0]) console.log('字段示例:', Object.keys(items[0]).join(', '));

const pick = (c, keys) => Object.fromEntries(keys.filter(k => typeof c[k] === 'number').map(k => [k, c[k]]));
const players = live.map(c => ({
  n: c.name,
  t: c.team_short_name || c.team,
  ovr: c.ovr,
  pos: c.display_position,
  h: c.is_hitter !== false,
  a: pick(c, c.is_hitter === false ? PITCHER : HITTER),
}));
if (!players.length) { console.error('Live Series 球员卡为 0，可能接口字段有变化'); process.exit(1); }

const judge = players.find(p => p.n === 'Aaron Judge');
if (judge) console.log('样例:', JSON.stringify(judge));

await writeFile(out, JSON.stringify({ source: `MLB The Show ${year}`, updated: new Date().toISOString().slice(0, 10), players }));
console.log(`已写入 ${out}，${players.length} 名球员`);
