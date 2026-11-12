// Cadastro e interesse da AXIS Lab -> Cloudflare D1 (binding "DB").
const CORS={'content-type':'application/json'};
const FIELDS=['type','nome','especialidade','crm','cidade','whatsapp','email','ferramenta','nota'];
export async function onRequestPost({request,env}){
  let b;try{b=await request.json()}catch{return new Response('{"ok":false}',{status:400,headers:CORS})}
  const row={};for(const k of FIELDS){const v=b[k];if(v!==undefined&&v!==null)row[k]=String(v).slice(0,200)}
  if(!row.type||!/^(cadastro|interesse|raiox|diagnostico|agendamento)$/.test(row.type))return new Response('{"ok":false}',{status:400,headers:CORS});
  if(!env.DB)return new Response('{"ok":true,"stored":false}',{headers:CORS});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT DEFAULT (datetime('now')), type TEXT, nome TEXT, especialidade TEXT, crm TEXT, cidade TEXT, whatsapp TEXT, email TEXT, ferramenta TEXT, nota TEXT, ua TEXT)`).run();
  await env.DB.prepare(`INSERT INTO leads (type,nome,especialidade,crm,cidade,whatsapp,email,ferramenta,nota,ua) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(row.type,row.nome||null,row.especialidade||null,row.crm||null,row.cidade||null,row.whatsapp||null,row.email||null,row.ferramenta||null,row.nota||null,(request.headers.get('user-agent')||'').slice(0,160)).run();
  return new Response('{"ok":true,"stored":true}',{headers:CORS});
}
export async function onRequest(){return new Response('{"ok":false}',{status:405,headers:CORS})}
