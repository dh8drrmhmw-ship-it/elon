// 临时探测：胜败投（hydrate=decisions）和按日期查询的球员异动
const j = async u => (await fetch('https://statsapi.mlb.com/api' + u)).json();
const s = await j('/v1/schedule?sportId=1&startDate=2026-10-20&endDate=2026-10-25&hydrate=decisions,scoringplays&fields=dates,games,gamePk,decisions,winner,loser,save,id,fullName,scoringPlays,result,event,rbi,awayScore,homeScore,about,halfInning,inning,matchup,batter');
const g = s.dates?.flatMap(d => d.games).find(x => x.decisions);
console.log('DECISIONS', g?.gamePk, JSON.stringify(g?.decisions));
console.log('SCORING0', JSON.stringify(g?.scoringPlays?.[0]));
const t = await j('/v1/transactions?sportId=1&startDate=2026-10-11&endDate=2026-10-25');
const tx = t.transactions || [];
console.log('TX total', tx.length);
const codes = {};
tx.forEach(x => { codes[x.typeCode + ' ' + x.typeDesc] = (codes[x.typeCode + ' ' + x.typeDesc] || 0) + 1; });
console.log('TX codes', JSON.stringify(codes));
for (const code of ['TR', 'SFA', 'SGN', 'CLW', 'DES', 'REL', 'RET', 'OUT']) {
  const x = tx.find(y => y.typeCode === code);
  if (x) console.log('TX', code, JSON.stringify(x).slice(0, 700));
}
// 去年同期（休赛期开始）看看签约格式
const t2 = await j('/v1/transactions?sportId=1&startDate=2025-11-05&endDate=2025-11-20');
const tx2 = (t2.transactions || []).filter(x => ['SFA', 'TR', 'SGN'].includes(x.typeCode)).slice(0, 6);
tx2.forEach(x => console.log('TX2', JSON.stringify(x).slice(0, 600)));
