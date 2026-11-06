// Relatório da atividade no site e na plataforma. Só para administradores (e-mail na lista abaixo ou em env.ADMIN_EMAILS).
import { SCHEMA } from '../t.js';
const ADMINS = ['caioramos.comercial@gmail.com'];
const J = (s, b, h = {}) => new Response(typeof b === 'string' ? b : JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...h } });
function readCookie(req) { const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)axl_s=([a-f0-9]{64})/); return m ? m[1] : null; }

export async function onRequestGet({ request, env }) {
  const db = env.DB;
  const tok = readCookie(request);
  const me = tok && await db.prepare('SELECT u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?').bind(tok, new Date().toISOString()).first();
  const admins = [...ADMINS, ...String(env.ADMIN_EMAILS || '').split(',')].map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!me) return J(401, { ok: false, error: 'Entre com a sua conta.' });
  if (!admins.includes(me.email.toLowerCase())) return J(403, { ok: false, error: 'Esta conta não tem acesso ao painel.' });

  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, salt TEXT NOT NULL, nome TEXT, especialidade TEXT, crm TEXT, cidade TEXT, whatsapp TEXT, consent_at TEXT, created_at TEXT DEFAULT (datetime('now')), last_login TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ai_usage (user_id INTEGER, day TEXT, n INTEGER, PRIMARY KEY (user_id, day))`),
  ]);
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10)));
  const since = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10);
  const all = async (sql, ...b) => (await db.prepare(sql).bind(...b).all()).results || [];
  const one = async (sql, ...b) => (await db.prepare(sql).bind(...b).first()) || {};
  const W = `day >= ?`;

  if (url.searchParams.get('csv') === 'users') {
    const rows = await all(`SELECT id, created_at, nome, email, whatsapp, especialidade, crm, cidade, last_login FROM users ORDER BY id DESC`);
    const head = ['id', 'cadastro', 'nome', 'email', 'whatsapp', 'especialidade', 'crm', 'cidade', 'ultimo_login'];
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿' + [head.join(';'), ...rows.map((r) => [r.id, r.created_at, r.nome, r.email, r.whatsapp, r.especialidade, r.crm, r.cidade, r.last_login].map(q).join(';'))].join('\n');
    return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="axis-lab-usuarios.csv"', 'cache-control': 'no-store' } });
  }

  const [kpi, kpiPrev, daily, pages, sources, campaigns, devices, browsers, cities, clicks, sections, scroll, timeOn, tools, ai, funnel, users, recent, leads] = await Promise.all([
    one(`SELECT COUNT(DISTINCT vid) visitors, COUNT(DISTINCT sid) sessions, SUM(e='view') views, SUM(e='install_click') install_clicks, SUM(e='app_installed') installs, SUM(e='click' AND json_extract(props,'$.to') IN ('instagram','whatsapp')) contact_clicks FROM events WHERE ${W} AND vid IS NOT NULL`, since),
    one(`SELECT COUNT(DISTINCT vid) visitors, SUM(e='view') views FROM events WHERE day >= ? AND day < ? AND vid IS NOT NULL`, new Date(Date.now() - (2 * days - 1) * 864e5).toISOString().slice(0, 10), since),
    all(`SELECT day, COUNT(DISTINCT vid) visitors, SUM(e='view') views, SUM(e='signup') signups, COUNT(DISTINCT CASE WHEN e IN ('tool','ai') THEN uid END) active FROM events WHERE ${W} GROUP BY day ORDER BY day`, since),
    all(`SELECT CASE WHEN path LIKE '/app%' THEN '/app' ELSE path END page, SUM(e='view') views, COUNT(DISTINCT vid) visitors FROM events WHERE ${W} AND e='view' GROUP BY page ORDER BY views DESC LIMIT 15`, since),
    all(`SELECT src, COUNT(DISTINCT vid) visitors, COUNT(DISTINCT sid) sessions FROM events WHERE ${W} AND vid IS NOT NULL GROUP BY src ORDER BY visitors DESC LIMIT 15`, since),
    all(`SELECT src, medium, campaign, COUNT(DISTINCT vid) visitors FROM events WHERE ${W} AND campaign <> '' GROUP BY src, medium, campaign ORDER BY visitors DESC LIMIT 15`, since),
    all(`SELECT device k, COUNT(DISTINCT vid) n FROM events WHERE ${W} AND vid IS NOT NULL GROUP BY device ORDER BY n DESC`, since),
    all(`SELECT browser k, COUNT(DISTINCT vid) n FROM events WHERE ${W} AND vid IS NOT NULL GROUP BY browser ORDER BY n DESC`, since),
    all(`SELECT city, region, country, COUNT(DISTINCT vid) n FROM events WHERE ${W} AND vid IS NOT NULL GROUP BY city, region, country ORDER BY n DESC LIMIT 15`, since),
    all(`SELECT json_extract(props,'$.label') label, json_extract(props,'$.to') dest, path, COUNT(*) n, COUNT(DISTINCT vid) people FROM events WHERE ${W} AND e IN ('click','install_click') GROUP BY label, dest, path ORDER BY n DESC LIMIT 20`, since),
    all(`SELECT path, json_extract(props,'$.id') id, COUNT(DISTINCT vid) n FROM events WHERE ${W} AND e='section' GROUP BY path, id ORDER BY path, n DESC`, since),
    all(`SELECT path, json_extract(props,'$.pct') pct, COUNT(DISTINCT vid) n FROM events WHERE ${W} AND e='scroll' GROUP BY path, pct ORDER BY path, pct`, since),
    all(`SELECT CASE WHEN path LIKE '/app%' THEN '/app' ELSE path END page, ROUND(AVG(MIN(json_extract(props,'$.sec'), 1800))) avg_sec, COUNT(*) n FROM events WHERE ${W} AND e='leave' GROUP BY page ORDER BY n DESC LIMIT 10`, since),
    all(`SELECT json_extract(props,'$.tool') tool, json_extract(props,'$.mod') mod, COUNT(*) opens, COUNT(DISTINCT COALESCE(uid, vid)) people FROM events WHERE ${W} AND e='tool' GROUP BY tool, mod ORDER BY opens DESC LIMIT 40`, since),
    all(`SELECT json_extract(props,'$.task') task, SUM(json_extract(props,'$.ok')=1) ok, SUM(json_extract(props,'$.ok')=0) err, COUNT(DISTINCT uid) people, ROUND(AVG(json_extract(props,'$.ms'))/1000.0,1) avg_s FROM events WHERE ${W} AND e='ai' GROUP BY task ORDER BY ok DESC`, since),
    one(`SELECT
        (SELECT COUNT(DISTINCT vid) FROM events WHERE ${W} AND vid IS NOT NULL) total,
        (SELECT COUNT(DISTINCT vid) FROM events WHERE ${W} AND e='view' AND path='/') site,
        (SELECT COUNT(DISTINCT vid) FROM events WHERE ${W} AND e='view' AND path LIKE '/lab%') lab,
        (SELECT COUNT(DISTINCT vid) FROM events WHERE ${W} AND e='view' AND path LIKE '/app%') app,
        (SELECT COUNT(*) FROM events WHERE ${W} AND e='signup') signups,
        (SELECT COUNT(DISTINCT uid) FROM events WHERE ${W} AND e='tool' AND uid IS NOT NULL) used_tool,
        (SELECT COUNT(DISTINCT uid) FROM events WHERE ${W} AND e='ai') used_ai`, since, since, since, since, since, since, since),
    all(`SELECT u.id, u.created_at, u.nome, u.email, u.whatsapp, u.especialidade, u.crm, u.cidade, u.last_login,
        (SELECT COUNT(*) FROM events e WHERE e.uid=u.id AND e.e='tool') tools,
        (SELECT COUNT(*) FROM events e WHERE e.uid=u.id AND e.e='ai') ai,
        (SELECT json_extract(props,'$.tool') FROM events e WHERE e.uid=u.id AND e.e='tool' GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1) top_tool,
        (SELECT e.src FROM visitor_users v JOIN events e ON e.vid=v.vid WHERE v.uid=u.id AND e.src IS NOT NULL ORDER BY e.ts LIMIT 1) source,
        (SELECT MAX(ts) FROM events e WHERE e.uid=u.id) last_seen
      FROM users u ORDER BY u.id DESC LIMIT 300`),
    all(`SELECT e.ts, e.e, e.path, e.props, e.src, e.device, e.city, u.nome FROM events e LEFT JOIN users u ON u.id=e.uid WHERE e.e NOT IN ('scroll','section','leave') ORDER BY e.id DESC LIMIT 60`),
    all(`SELECT * FROM leads ORDER BY id DESC LIMIT 50`).catch(() => []),
  ]);
  return J(200, { ok: true, days, since, kpi, kpiPrev, daily, pages, sources, campaigns, devices, browsers, cities, clicks, sections, scroll, timeOn, tools, ai, funnel, users, recent, leads,
    totals: await one(`SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM users WHERE created_at >= ?) new_users`, since) });
}
