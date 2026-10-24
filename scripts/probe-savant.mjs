// 临时探测：Baseball Savant 百分位排名 CSV 能否从 GitHub Actions 访问，以及有哪些列
for (const type of ['batter', 'pitcher']) {
  const url = `https://baseballsavant.mlb.com/leaderboard/percentile-rankings?type=${type}&team=&year=2026&csv=true`;
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15' } });
    const t = await r.text();
    const lines = t.replace(/^﻿/, '').split('\n');
    console.log(type, r.status, r.headers.get('content-type'), `${lines.length} 行`);
    console.log(lines.slice(0, 3).join('\n').slice(0, 1500));
    const judge = lines.find(l => /Judge/.test(l));
    if (judge) console.log('Judge:', judge.slice(0, 600));
  } catch (e) { console.log(type, '失败', e.message); }
}
