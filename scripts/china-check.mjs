// 从中国大陆的测试节点访问本垒用到的每个地址，看哪些能打开、要多久。
// 测试节点来自 Globalping（https://globalping.io，免费公开的网络测量平台）。
// 用法：node scripts/china-check.mjs [报告文件]，报告是 Markdown，默认打印到终端。
import { writeFile } from 'node:fs/promises';

const GP = 'https://api.globalping.io/v1';
const PAGES = 'dh8drrmhmw-ship-it.github.io';
const LIMIT = 10;        // 每个地址最多用几个节点
const LOCATIONS = [{ country: 'CN', limit: LIMIT }];
const GITHUB_PAGES_IPS = /^185\.199\.(108|109|110|111)\.153$/;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 比赛集锦的视频放在哪个服务器，是接口返回的，这里找一场最近的比赛看一眼
async function videoTarget() {
  try {
    const d = new Date(Date.now() - 86400e3);
    const ymd = x => x.toISOString().slice(0, 10);
    const sched = await (await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=${ymd(new Date(d - 20 * 86400e3))}&endDate=${ymd(d)}`)).json();
    const pks = sched.dates.flatMap(x => x.games).filter(g => g.status.abstractGameState === 'Final').map(g => g.gamePk).reverse();
    for (const pk of pks.slice(0, 5)) {
      const c = await (await fetch(`https://statsapi.mlb.com/api/v1/game/${pk}/content`)).json();
      for (const it of c.highlights?.highlights?.items || []) {
        const mp4 = (it.playbacks || []).find(p => /mp4/i.test(p.name) && /^https:/.test(p.url));
        if (mp4) { const u = new URL(mp4.url); return { host: u.host, path: u.pathname }; }
      }
    }
  } catch (e) { console.error('找不到集锦视频地址：', e.message); }
  return null;
}

async function measure(body) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${GP}/measurements`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status === 429 && attempt < 3) { await sleep(30e3); continue; }
    if (!r.ok) return { error: `Globalping ${r.status}: ${(await r.text()).slice(0, 200)}` };
    const { id } = await r.json();
    for (let i = 0; i < 60; i++) {
      await sleep(1500);
      const m = await (await fetch(`${GP}/measurements/${id}`)).json();
      if (m.status !== 'in-progress') return m;
    }
    return { error: '等待结果超时' };
  }
}

const where = p => `${p.city || '?'} · ${(p.network || '').slice(0, 28)}`;
const ms = x => x == null ? '' : x >= 1000 ? `${(x / 1000).toFixed(1)} 秒` : `${Math.round(x)} 毫秒`;

async function httpCheck(t) {
  const m = await measure({
    type: 'http', target: t.host, locations: LOCATIONS,
    measurementOptions: { protocol: 'HTTPS', request: { method: t.method || 'GET', path: t.path || '/', query: t.query } },
  });
  if (m.error) return { ...t, error: m.error, rows: [] };
  const rows = m.results.map(({ probe, result: r }) => {
    const ok = r.status === 'finished' && r.statusCode > 0 && r.statusCode < 500;
    const why = ok ? `HTTP ${r.statusCode}` : (r.rawOutput || r.status || '').split('\n')[0].slice(0, 80);
    return { where: where(probe), ok, why, total: r.timings?.total, ttfb: r.timings?.firstByte };
  });
  return { ...t, rows };
}

async function dnsCheck(host) {
  const m = await measure({ type: 'dns', target: host, locations: LOCATIONS, measurementOptions: { query: { type: 'A' } } });
  if (m.error) return { host, error: m.error, rows: [] };
  return {
    host, rows: m.results.map(({ probe, result: r }) => ({
      where: where(probe),
      ips: (r.answers || []).filter(a => a.type === 'A').map(a => a.value),
      why: r.status === 'finished' ? '' : (r.rawOutput || r.status || '').split('\n')[0].slice(0, 80),
    })),
  };
}

const probes = await (await fetch(`${GP}/probes`)).json();
const cn = probes.filter(p => p.location?.country === 'CN');
const lines = [`# 国内访问检测（${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC）`, '',
  `Globalping 目前在中国大陆有 ${cn.length} 个在线节点：${[...new Set(cn.map(p => `${p.location.city}（${p.location.network}）`))].join('、') || '无'}。每个地址最多测 ${LIMIT} 个节点。`, ''];

if (!cn.length) {
  lines.push('没有可用的大陆节点，无法检测。');
} else {
  const video = await videoTarget();
  const targets = [
    { name: '本垒网页（GitHub Pages）', host: PAGES, path: '/elon/baseball/' },
    { name: '3D 画面的 three.js（GitHub Pages）', host: PAGES, path: '/elon/baseball/vendor/three.min.js', method: 'HEAD' },
    { name: 'MLB 数据接口', host: 'statsapi.mlb.com', path: '/api/v1/sports/1' },
    { name: '球员头像', host: 'img.mlbstatic.com', path: '/mlb-photos/image/upload/w_213,q_auto:best/v1/people/660271/headshot/67/current', method: 'HEAD' },
    { name: '球队队徽', host: 'www.mlbstatic.com', path: '/team-logos/119.svg', method: 'HEAD' },
    video ? { name: '比赛集锦视频', host: video.host, path: video.path, method: 'HEAD' } : null,
    { name: 'Google 字体（样式表）', host: 'fonts.googleapis.com', path: '/css2', query: 'family=Noto+Sans+SC:wght@400&display=swap' },
    { name: 'Google 字体（字体文件）', host: 'fonts.gstatic.com', path: '/', method: 'HEAD' },
    { name: 'AI 战报（Anthropic 接口）', host: 'api.anthropic.com', path: '/v1/messages', method: 'HEAD' },
    // 对照：节点真的在防火墙内，Google 应该打不开、百度应该能打开
    { name: '对照：Google 搜索', host: 'www.google.com', path: '/', method: 'HEAD' },
    { name: '对照：百度', host: 'www.baidu.com', path: '/', method: 'HEAD' },
  ].filter(Boolean);

  const results = [];
  for (const t of targets) {
    console.error('测试', t.name);
    const r = await httpCheck(t);
    // 同一个地址从 GitHub 的美国服务器访问一次，作为对照
    try {
      const u = `https://${t.host}${t.path}${t.query ? '?' + t.query : ''}`;
      r.us = `HTTP ${(await fetch(u, { method: t.method || 'GET', signal: AbortSignal.timeout(15e3) })).status}`;
    } catch (e) { r.us = e.name === 'TimeoutError' ? '超时' : e.message; }
    results.push(r);
  }

  lines.push('## 总览', '', '| 内容 | 地址 | 能打开的节点 | 平均耗时 | 美国对照 |', '|---|---|---|---|---|');
  for (const r of results) {
    const ok = r.rows.filter(x => x.ok);
    const avg = ok.length ? ok.reduce((s, x) => s + (x.total || 0), 0) / ok.length : null;
    lines.push(`| ${r.name} | \`${r.host}\` | ${r.error ? r.error : `${ok.length} / ${r.rows.length}`} | ${ms(avg)} | ${r.us} |`);
  }

  lines.push('', '## DNS 是否被污染', '', 'GitHub Pages 的正确地址是 185.199.108–111.153，返回别的地址说明域名解析被篡改。', '');
  for (const host of [PAGES, 'statsapi.mlb.com', 'fonts.googleapis.com', 'www.google.com']) {
    console.error('DNS', host);
    const d = await dnsCheck(host);
    lines.push(`### ${host}`, '', '| 节点 | 解析结果 |', '|---|---|');
    if (d.error) lines.push(`| — | ${d.error} |`);
    for (const x of d.rows) {
      const bad = host === PAGES && x.ips.length && !x.ips.every(ip => GITHUB_PAGES_IPS.test(ip));
      lines.push(`| ${x.where} | ${x.ips.join(', ') || x.why || '无结果'}${bad ? ' ⚠️ 不是 GitHub 的地址' : ''} |`);
    }
    lines.push('');
  }

  lines.push('## 每个节点的详细结果', '');
  for (const r of results) {
    lines.push(`### ${r.name}`, '', `\`https://${r.host}${r.path}${r.query ? '?' + r.query : ''}\``, '', '| 节点 | 结果 | 首字节 | 总耗时 |', '|---|---|---|---|');
    if (r.error) lines.push(`| — | ${r.error} | | |`);
    for (const x of r.rows) lines.push(`| ${x.where} | ${x.ok ? '✅' : '❌'} ${x.why} | ${ms(x.ttfb)} | ${ms(x.total)} |`);
    lines.push('');
  }
}

const report = lines.join('\n') + '\n';
if (process.argv[2]) await writeFile(process.argv[2], report);
console.log(report);
