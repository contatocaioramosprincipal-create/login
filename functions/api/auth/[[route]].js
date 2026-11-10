import { serverEvent } from '../t.js';
// Contas da AXIS Lab: cadastro, login, sessão e saída. Banco: Cloudflare D1 (binding "DB").
// Senha com PBKDF2-SHA256 (100 mil iterações + sal); sessão em cookie HttpOnly de 30 dias.
const J = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
const COOKIE = 'axl_s';
const DAYS = 30;
const PROFILE = ['nome', 'whatsapp', 'instagram'];
const ADMIN_EMAIL = 'contato.caioramos.principal@gmail.com';
const sha256 = async v => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isoPlusDays = n => new Date(Date.now()+n*864e5).toISOString();

async function schema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, salt TEXT NOT NULL, nome TEXT, especialidade TEXT, crm TEXT, cidade TEXT, whatsapp TEXT, consent_at TEXT, created_at TEXT DEFAULT (datetime('now')), last_login TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL)`),
  ]);
  const cols = await db.prepare("PRAGMA table_info(users)").all();
  const names = new Set((cols.results || []).map(c=>c.name));
  if(!names.has('instagram')) await db.prepare('ALTER TABLE users ADD COLUMN instagram TEXT').run();
  if(!names.has('promo_until')) await db.prepare('ALTER TABLE users ADD COLUMN promo_until TEXT').run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS promo_invites (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, created_by INTEGER NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, redeemed_at TEXT, redeemed_by INTEGER, promo_days INTEGER NOT NULL DEFAULT 365, email_sent_at TEXT)`).run();
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
const pub = (u) => ({ email: u.email, promo_until:u.promo_until||null, is_admin:u.email===ADMIN_EMAIL, ...Object.fromEntries(PROFILE.map((k) => [k, u[k] || ''])) });
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

  if (route === 'invite-info' && method === 'GET') {
    const tokenString = new URL(request.url).searchParams.get('token') || '';
    if (!/^[a-f0-9]{64}$/.test(tokenString)) return J(404,{ok:false,error:'Convite inválido.'});
    const inv = await db.prepare('SELECT email, expires_at, redeemed_at, promo_days FROM promo_invites WHERE token_hash=?').bind(await sha256(tokenString)).first();
    if(!inv || inv.redeemed_at || inv.expires_at<=new Date().toISOString()) return J(410,{ok:false,error:'Este convite já foi utilizado ou expirou.'});
    return J(200,{ok:true,email:inv.email,promo_days:inv.promo_days,expires_at:inv.expires_at});
  }
  if (route === 'invites' && method === 'GET') {
    const t = readCookie(request);
    const me=t&&await db.prepare('SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?').bind(t,new Date().toISOString()).first();
    if(!me || me.email!==ADMIN_EMAIL) return J(403,{ok:false,error:'Acesso restrito.'});
    const rows=await db.prepare('SELECT email,created_at,expires_at,redeemed_at,promo_days,email_sent_at FROM promo_invites ORDER BY id DESC LIMIT 40').all();
    return J(200,{ok:true,invites:rows.results||[]});
  }

  if (method !== 'POST') return J(405, { ok: false });
  if (route === 'logout') {
    const t = readCookie(request);
    if (t) await db.prepare('DELETE FROM sessions WHERE token = ?').bind(t).run();
    return J(200, { ok: true }, { 'set-cookie': cookie('', 0) });
  }

  let b; try { b = await request.json(); } catch { return J(400, { ok: false, error: 'Dados inválidos.' }); }
  if (route === 'invite') {
    const t=readCookie(request);
    const me=t&&await db.prepare('SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?').bind(t,new Date().toISOString()).first();
    if(!me || me.email!==ADMIN_EMAIL) return J(403,{ok:false,error:'Apenas o administrador pode conceder acesso promocional.'});
    const destination=clean(b.email,160).toLowerCase();
    if(!emailOk(destination)) return J(400,{ok:false,error:'Informe um e-mail válido.'});
    const raw=token(),hashToken=await sha256(raw),expires=isoPlusDays(7);
    await db.prepare('INSERT INTO promo_invites (email,token_hash,created_by,created_at,expires_at,promo_days) VALUES (?,?,?, ?,?,365)').bind(destination,hashToken,me.id,new Date().toISOString(),expires).run();
    const url='https://axismed.app.br/app/?invite='+raw;
    let sent=false;
    if(env.RESEND_API_KEY && env.AXIS_MAIL_FROM){
      const mail=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({
        from:env.AXIS_MAIL_FROM,to:[destination],subject:'Seu convite: 1 ano de AXIS Lab',
        text:'Você recebeu um convite promocional de 1 ano para o AXIS Lab. Para criar seu perfil, acesse o link individual abaixo em até 7 dias:\n\n'+url+'\n\nO acesso promocional começa na ativação. Se você não solicitou, ignore este e-mail.'
      })});
      sent=mail.ok;
      if(sent) await db.prepare('UPDATE promo_invites SET email_sent_at=? WHERE token_hash=?').bind(new Date().toISOString(),hashToken).run();
    }
    await serverEvent(env,request,me.id,'promo_invite',{sent:sent?1:0});
    return J(200,{ok:true,url,email:destination,sent,expires_at:expires,message:sent?'Convite enviado por e-mail.':'Convite criado. Configure o provedor de e-mail para envio automático; por enquanto copie o link.'});
  }
  if (route === 'redeem') {
    const t=readCookie(request);
    const me=t&&await db.prepare('SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?').bind(t,new Date().toISOString()).first();
    if(!me) return J(401,{ok:false,error:'Entre na sua conta para ativar o convite.'});
    const raw=String(b.invite_token||'');
    if(!/^[a-f0-9]{64}$/.test(raw))return J(400,{ok:false,error:'Convite inválido.'});
    const inv=await db.prepare('SELECT * FROM promo_invites WHERE token_hash=? AND redeemed_at IS NULL AND expires_at>?').bind(await sha256(raw),new Date().toISOString()).first();
    if(!inv || inv.email!==me.email) return J(403,{ok:false,error:'Convite inválido, expirado ou destinado a outro e-mail.'});
    await db.prepare('UPDATE users SET promo_until=CASE WHEN promo_until > ? THEN datetime(promo_until, ? ) ELSE ? END WHERE id=?').bind(new Date().toISOString(),'+365 days',isoPlusDays(365),me.id).run();
    await db.prepare('UPDATE promo_invites SET redeemed_at=?,redeemed_by=? WHERE id=? AND redeemed_at IS NULL').bind(new Date().toISOString(),me.id,inv.id).run();
    return J(200,{ok:true,promo_days:365});
  }

  const email = clean(b.email, 160).toLowerCase();
  const senha = String(b.senha ?? '');

  if (route === 'signup') {
    const p=Object.fromEntries(PROFILE.map(k=>[k,clean(b[k],k==='instagram'?80:120)]));
    if(!p.nome || !p.whatsapp || !p.instagram) return J(400,{ok:false,error:'Preencha nome, telefone e Instagram.'});
    if(String(p.whatsapp).replace(/\D/g,'').length<10) return J(400,{ok:false,error:'Confira o telefone com DDD.'});
    if(!emailOk(email))return J(400,{ok:false,error:'Confira o e-mail.'});
    if(senha.length<8)return J(400,{ok:false,error:'A senha precisa ter pelo menos 8 caracteres.'});
    if(!b.consent)return J(400,{ok:false,error:'Marque a autorização para continuar.'});
    const exists=await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
    if(exists)return J(409,{ok:false,error:'Já existe uma conta com este e-mail. Use Entrar.'});
    let inv=null;
    if(b.invite_token){
      const raw=String(b.invite_token);
      if(!/^[a-f0-9]{64}$/.test(raw))return J(403,{ok:false,error:'Convite inválido.'});
      inv=await db.prepare('SELECT * FROM promo_invites WHERE token_hash=? AND redeemed_at IS NULL AND expires_at>?').bind(await sha256(raw),new Date().toISOString()).first();
      if(!inv || inv.email!==email)return J(403,{ok:false,error:'Convite inválido, expirado ou de outro e-mail.'});
    }
    const salt=token().slice(0,32);
    const promoUntil=inv?isoPlusDays(365):null;
    const r=await db.prepare(`INSERT INTO users(email,pass,salt,nome,especialidade,crm,cidade,whatsapp,instagram,consent_at,promo_until) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'),?)`)
      .bind(email,await hash(senha,salt),salt,p.nome,'','','',p.whatsapp,p.instagram,promoUntil).run();
    const id=r.meta.last_row_id;
    if(inv)await db.prepare('UPDATE promo_invites SET redeemed_at=?,redeemed_by=? WHERE id=? AND redeemed_at IS NULL').bind(new Date().toISOString(),id,inv.id).run();
    const ck=await newSession(db,id);
    await serverEvent(env,request,id,'signup',{promotional:inv?1:0});
    return J(200,{ok:true,user:{email,...p,promo_until:promoUntil,is_admin:email===ADMIN_EMAIL}}, {'set-cookie':ck});
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
