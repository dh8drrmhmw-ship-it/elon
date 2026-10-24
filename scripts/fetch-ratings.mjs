// 抓取 Baseball Savant（MLB 官方 Statcast）的球员百分位排名，写成 ratings.json 供页面读取。
// 用法：node scripts/fetch-ratings.mjs <输出文件>
// 抓取失败时不写文件、以非零状态退出，页面会显示“暂无能力值”。
import { writeFile } from 'node:fs/promises';

const out = process.argv[2] || 'ratings.json';
const now = new Date();
const season = now.getUTCMonth() < 2 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();

// 去掉不是百分位或方向不明确的列
const SKIP = new Set(['player_name', 'player_id', 'year', 'brl', 'swing_length']);

function parseCSV(text) {
  const rows = text.replace(/^﻿/, '').trim().split(/\r?\n/)
    .map(line => [...line.matchAll(/("([^"]*)"|[^,]*)(,|$)/g)].map(m => m[2] ?? m[1]).slice(0, -1));
  const [head, ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

async function fetchType(type, year) {
  const url = `https://baseballsavant.mlb.com/leaderboard/percentile-rankings?type=${type}&team=&year=${year}&csv=true`;
  const r = await fetch(url, { headers: { 'user-agent': 'benlei-baseball/1.0 (+https://github.com/dh8drrmhmw-ship-it/elon)' } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const out = {};
  for (const row of parseCSV(await r.text())) {
    const p = {};
    for (const [k, v] of Object.entries(row)) if (!SKIP.has(k) && v !== '' && !isNaN(+v)) p[k] = +v;
    if (Object.keys(p).length) out[row.player_id] = p;
  }
  return out;
}

let year = season, batters, pitchers;
try {
  [batters, pitchers] = await Promise.all([fetchType('batter', year), fetchType('pitcher', year)]);
  if (Object.keys(batters).length < 50) {   // 赛季刚开始数据太少时，用上一季
    year = season - 1;
    [batters, pitchers] = await Promise.all([fetchType('batter', year), fetchType('pitcher', year)]);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

console.log(`Baseball Savant ${year}：打者 ${Object.keys(batters).length} 人，投手 ${Object.keys(pitchers).length} 人`);
console.log('样例（Shohei Ohtani 660271）:', JSON.stringify({ b: batters['660271'], p: pitchers['660271'] }));

await writeFile(out, JSON.stringify({
  source: 'Baseball Savant', year, updated: now.toISOString().slice(0, 10), batters, pitchers,
}));
console.log(`已写入 ${out}`);
