import { serverEvent } from '../t.js';
// Contas da AXIS Lab: cadastro, login, sessão e saída. Banco: Cloudflare D1 (binding "DB").
// Senha com PBKDF2-SHA256 (100 mil iterações + sal); sessão em cookie HttpOnly de 30 dias.
const J = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
const COOKIE = 'axl_s';
const DAYS = 30;
const PROFILE = ['nome', 'especialidade', 'crm', 'cidade', 'whatsapp'];

async function schema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, salt TEXT NOT NULL, nome TEXT, especialidade TEXT, crm TEXT, cidade TEXT, whatsapp TEXT, consent_at TEXT, created_at TEXT DEFAULT (datetime('now')), last_login TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL)`),
  ]);
}
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hash(password, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256));
}
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const cookie = (v, maxAge) => `${COOKIE}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
function readCookie(req) { const m = (req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`)); return m ? m[1] : null; }
const pub = (u) => ({ email: u.email, ...Object.fromEntries(PROFILE.map((k) => [k, u[k] || ''])) });
const clean = (v, n = 120) => String(v ?? '').trim().slice(0, n);

async function newSession(db, userId) {
  const t = token();
  const exp = new Date(Date.now() + DAYS * 864e5).toISOString();
  await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(t, userId, exp).run();
  await db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").bind(userId).run();
  return cookie(t, DAYS * 86400);
}

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return J(503, { ok: false, error: 'Banco indisponível. Tente em instantes.' });
  await schema(db);
  const route = (params.route || []).join('/');
  const method = request.method;

  if (route === 'me' && method === 'GET') {
    const t = readCookie(request);
    if (!t) return J(200, { ok: true, user: null });
    const u = await db.prepare("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?").bind(t, new Date().toISOString()).first();
    return J(200, { ok: true, user: u ? pub(u) : null });
  }

  if (method !== 'POST') return J(405, { ok: false });
  if (route === 'logout') {
    const t = readCookie(request);
    if (t) await db.prepare('DELETE FROM sessions WHERE token = ?').bind(t).run();
    return J(200, { ok: true }, { 'set-cookie': cookie('', 0) });
  }

  let b; try { b = await request.json(); } catch { return J(400, { ok: false, error: 'Dados inválidos.' }); }
  const email = clean(b.email, 160).toLowerCase();
  const senha = String(b.senha ?? '');

  if (route === 'signup') {
    const p = Object.fromEntries(PROFILE.map((k) => [k, clean(b[k])]));
    if (!p.nome || !p.especialidade || !p.cidade || !p.whatsapp) return J(400, { ok: false, error: 'Preencha nome, especialidade, cidade e WhatsApp.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return J(400, { ok: false, error: 'Confira o e-mail.' });
    if (senha.length < 8) return J(400, { ok: false, error: 'A senha precisa ter pelo menos 8 caracteres.' });
    if (!b.consent) return J(400, { ok: false, error: 'Marque a autorização para continuar.' });
    const exists = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (exists) return J(409, { ok: false, error: 'Já existe uma conta com este e-mail. Use “Entrar”.' });
    const salt = token().slice(0, 32);
    const r = await db.prepare(`INSERT INTO users (email, pass, salt, nome, especialidade, crm, cidade, whatsapp, consent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
      .bind(email, await hash(senha, salt), salt, p.nome, p.especialidade, p.crm, p.cidade, p.whatsapp).run();
    const id = r.meta.last_row_id;
    const ck = await newSession(db, id);
    await serverEvent(env, request, id, 'signup', { especialidade: p.especialidade, cidade: p.cidade });
    return J(200, { ok: true, user: { email, ...p } }, { 'set-cookie': ck });
  }

  if (route === 'login') {
    const u = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    const ok = u && same(await hash(senha, u.salt), u.pass);
    if (!ok) { await new Promise((r) => setTimeout(r, 400)); return J(401, { ok: false, error: 'E-mail ou senha incorretos.' }); }
    const ck = await newSession(db, u.id);
    await serverEvent(env, request, u.id, 'login');
    return J(200, { ok: true, user: pub(u) }, { 'set-cookie': ck });
  }

  return J(404, { ok: false });
}
