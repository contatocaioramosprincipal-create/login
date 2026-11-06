// Recebe eventos do track.js e grava no D1 (tabela events). Sem IP: só país/estado/cidade aproximados da Cloudflare.
const ok = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
const c = (v, n = 120) => String(v ?? '').slice(0, n);
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, day TEXT NOT NULL, vid TEXT, sid TEXT, uid INTEGER, e TEXT NOT NULL, path TEXT, props TEXT, ref TEXT, src TEXT, medium TEXT, campaign TEXT, device TEXT, browser TEXT, os TEXT, country TEXT, region TEXT, city TEXT, pwa INTEGER)`,
  `CREATE INDEX IF NOT EXISTS ev_day ON events(day)`,
  `CREATE INDEX IF NOT EXISTS ev_e ON events(e, day)`,
  `CREATE INDEX IF NOT EXISTS ev_uid ON events(uid)`,
  `CREATE TABLE IF NOT EXISTS visitor_users (vid TEXT PRIMARY KEY, uid INTEGER NOT NULL, first_seen TEXT)`,
];
function ua(s) {
  const device = /ipad|tablet/i.test(s) ? 'Tablet' : /mobi|iphone|android/i.test(s) ? 'Celular' : 'Computador';
  const os = /iphone|ipad|ios/i.test(s) ? 'iOS' : /android/i.test(s) ? 'Android' : /windows/i.test(s) ? 'Windows' : /mac os/i.test(s) ? 'macOS' : /linux/i.test(s) ? 'Linux' : 'Outro';
  const browser = /edg\//i.test(s) ? 'Edge' : /instagram/i.test(s) ? 'Instagram' : /fban|fbav/i.test(s) ? 'Facebook' : /crios|chrome/i.test(s) ? 'Chrome' : /safari/i.test(s) ? 'Safari' : /firefox|fxios/i.test(s) ? 'Firefox' : 'Outro';
  return { device, os, browser };
}
function source(ref, utm) {
  if (utm.utm_source || utm.source) return c(utm.utm_source || utm.source, 60).toLowerCase();
  if (!ref) return 'direto';
  let h = ''; try { h = new URL(ref).hostname.replace(/^www\.|^m\.|^l\./, ''); } catch { return 'outro'; }
  if (/instagram/.test(h)) return 'instagram';
  if (/facebook|fb\.com/.test(h)) return 'facebook';
  if (/google\./.test(h)) return 'google';
  if (/wa\.me|whatsapp/.test(h)) return 'whatsapp';
  if (/linkedin|lnkd/.test(h)) return 'linkedin';
  if (/youtube|youtu\.be/.test(h)) return 'youtube';
  if (/bing\./.test(h)) return 'bing';
  return h.slice(0, 60);
}
function readCookie(req) { const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)axl_s=([a-f0-9]{64})/); return m ? m[1] : null; }

export async function onRequestPost({ request, env }) {
  const db = env.DB; if (!db) return ok();
  const agent = request.headers.get('user-agent') || '';
  if (/bot|crawl|spider|headless|preview|lighthouse/i.test(agent)) return ok();
  let b; try { b = JSON.parse(await request.text()); } catch { return ok(); }
  const ev = Array.isArray(b.ev) ? b.ev.slice(0, 40) : [];
  if (!ev.length) return ok();
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  const vid = c(b.vid, 40), sid = c(b.sid, 40), utm = b.utm && typeof b.utm === 'object' ? b.utm : {};
  const ref = c(b.ref, 200); let src = source(ref, utm); const medium = c(utm.utm_medium, 60), campaign = c(utm.utm_campaign, 80);
  if (src === 'direto' && sid) { const f = await db.prepare("SELECT src FROM events WHERE sid = ? AND src <> 'direto' LIMIT 1").bind(sid).first(); if (f) src = f.src; }
  const { device, os, browser } = ua(agent);
  const cf = request.cf || {};
  let uid = null;
  const tok = readCookie(request);
  if (tok) { const s = await db.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?').bind(tok, new Date().toISOString()).first(); uid = s ? s.user_id : null; }
  const now = Date.now();
  const st = db.prepare('INSERT INTO events (ts, day, vid, sid, uid, e, path, props, ref, src, medium, campaign, device, browser, os, country, region, city, pwa) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const rows = ev.map((x) => {
    const t = Number(x.ts); const d = new Date(Math.abs(now - t) < 864e5 ? t : now);
    return st.bind(d.toISOString(), d.toISOString().slice(0, 10), vid, sid, uid, c(x.e, 40), c(x.path, 160), c(JSON.stringify(x.p || {}), 600), ref, src, medium, campaign, device, browser, os, c(cf.country, 4), c(cf.region, 60), c(cf.city, 60), b.pwa ? 1 : 0);
  });
  if (uid && vid) rows.push(db.prepare("INSERT OR IGNORE INTO visitor_users (vid, uid, first_seen) VALUES (?, ?, datetime('now'))").bind(vid, uid));
  await db.batch(rows);
  return ok();
}

// Evento registrado pelo servidor (cadastro, login, uso de IA).
export async function serverEvent(env, request, uid, e, props = {}) {
  try {
    const db = env.DB; if (!db) return;
    await db.batch(SCHEMA.map((s) => db.prepare(s)));
    const { device, os, browser } = ua(request.headers.get('user-agent') || '');
    const cf = request.cf || {}; const d = new Date().toISOString();
    await db.prepare('INSERT INTO events (ts, day, uid, e, path, props, device, browser, os, country, region, city) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(d, d.slice(0, 10), uid, e, 'server', c(JSON.stringify(props), 600), device, browser, os, c(cf.country, 4), c(cf.region, 60), c(cf.city, 60)).run();
  } catch {}
}
