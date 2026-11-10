
const $=(s,r=document)=>r.querySelector(s);
var main=$('#main');
const ls={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}},del(k){try{localStorage.removeItem(k)}catch{}}};
const brl=n=>isFinite(n)?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'—';
const brl2=n=>isFinite(n)?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—';
const num=v=>{const n=parseFloat(String(v).replace(/\./g,'').replace(',','.'));return isFinite(n)?n:0};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),2200)}
async function api(body){try{await fetch('/api/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})}catch{}}
const ICON={
 money:'<path d="M12 2v20M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5 9.2 9.5 12 10s5 1.6 5 3.5S14.8 17 12 17s-5-1.1-5-3"/>',
 chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 doc:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
 scan:'<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
 chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>',
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
 mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 check:'<path d="M5 12l4 4 10-10"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
 calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h4"/>'
};
const ic=k=>`<span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg></span>`;
/* ---------- login / cadastro ---------- */
async function auth(path,body){const r=await fetch('/api/auth/'+path,{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});let j={};try{j=await r.json()}catch{}if(!r.ok||!j.ok)throw new Error(j.error||'Não foi possível agora. Tente de novo.');return j.user}
function onboarding(mode){
  mode=mode||(ls.get('axl_had_account',false)?'login':'signup');
  $('#bar').hidden=true;$('#foot').hidden=true;
  const pw=(id,ac)=>`<div class="pw"><input id="${id}" name="senha" type="password" required autocomplete="${ac}" minlength="8" placeholder="Mínimo 8 caracteres"><button type="button" class="eye" aria-label="Mostrar senha" data-eye="${id}">Mostrar</button></div>`;
  main.innerHTML=`<div class="onb">
  <div class="onb-l">
    <a class="brand" href="/lab/" aria-label="Voltar ao AXIS Lab"><svg width="30" height="34" viewBox="0 0 44 50" aria-hidden="true"><polygon points="21,2 0,46 15,46" fill="#F2EBDD"/><polygon points="22,5 42,46 28,46 20.5,19" fill="#7FB89A"/></svg><b>AXIS</b><span>LAB</span></a>
    <div>
      <div class="eyebrow" style="color:var(--sage)">Grátis para médicos</div>
      <h1>Ferramentas para o dia a dia do médico.</h1>
      <ul><li>Consulta com IA: grave e receba a evolução pronta</li><li>Documentos, calculadoras clínicas e novidades da sua área</li><li>Financeiro, glosas de convênio e marketing dentro do CFM</li><li>Secretária, jurídico e a sua vida fora do consultório</li></ul>
    </div>
    <p style="font-size:13px;color:rgba(242,235,221,.5)">Feito pela AXIS · marketing, IA e sistemas para médicos</p>
  </div>
  <div class="onb-r"><div style="width:100%;max-width:480px;margin:0 auto">
    <div class="tabs" role="tablist" aria-label="Acesso">
      <button class="opt" type="button" role="tab" data-mode="login" aria-pressed="${mode==='login'}">Entrar</button>
      <button class="opt" type="button" role="tab" data-mode="signup" aria-pressed="${mode==='signup'}">Criar conta</button>
    </div>
    ${mode==='login'?`<form id="authF" novalidate style="display:grid;gap:16px">
      <div><h2 style="font-size:28px">Bem-vindo(a) de volta.</h2></div>
      <div class="field"><label for="l-mail">E-mail</label><input id="l-mail" name="email" type="email" required autocomplete="email" placeholder="voce@clinica.com.br"></div>
      <div class="field"><label for="l-pw">Senha</label>${pw('l-pw','current-password')}</div>
      <p class="hint" id="authErr" role="alert" style="color:var(--red)"></p>
      <button class="btn" type="submit">Entrar</button>
      <p class="hint">Esqueceu a senha? Fale com a AXIS no <a href="https://instagram.com/axismed_marketing" target="_blank" rel="noopener">Instagram</a> que liberamos um novo acesso.</p>
    </form>`:`<form id="authF" novalidate style="display:grid;gap:16px">
      <div><h2 style="font-size:28px">Crie seu acesso grátis.</h2><p class="muted" style="margin-top:4px">Leva 30 segundos.</p></div>
      <div class="field"><label for="f-nome">Seu nome</label><input id="f-nome" name="nome" required autocomplete="name" placeholder="Dra. Ana Souza"></div>
      <div class="grid2">
        <div class="field"><label for="f-esp">Especialidade</label><input id="f-esp" name="especialidade" required placeholder="Dermatologia" list="esps"></div>
        <div class="field"><label for="f-crm">CRM / UF <span style="font-weight:400">(opcional)</span></label><input id="f-crm" name="crm" placeholder="123456/SP"></div>
        <div class="field"><label for="f-cid">Cidade / UF</label><input id="f-cid" name="cidade" required placeholder="Sorocaba/SP"></div>
        <div class="field"><label for="f-wa">WhatsApp</label><input id="f-wa" name="whatsapp" required inputmode="tel" autocomplete="tel" placeholder="(15) 99999-9999"></div>
      </div>
      <div class="field"><label for="f-mail">E-mail</label><input id="f-mail" name="email" type="email" required autocomplete="email" placeholder="voce@clinica.com.br"></div>
      <div class="field"><label for="f-pw">Crie uma senha</label>${pw('f-pw','new-password')}</div>
      <label class="consent"><input type="checkbox" id="f-ok" name="consent"> <span>Concordo que a AXIS guarde estes dados para liberar o acesso e entrar em contato comigo. Nada de dados de pacientes é guardado nas ferramentas.</span></label>
      <p class="hint" id="authErr" role="alert" style="color:var(--red)"></p>
      <button class="btn" type="submit">Criar conta e entrar</button>
    </form>`}
  </div></div></div>
  <datalist id="esps">${['Clínica médica','Dermatologia','Pediatria','Ginecologia e obstetrícia','Urologia','Cardiologia','Ortopedia','Psiquiatria','Endocrinologia','Oftalmologia','Otorrinolaringologia','Neurologia','Gastroenterologia','Medicina do trabalho','Perícia médica','Cirurgia plástica','Nutrologia'].map(e=>`<option value="${e}">`).join('')}</datalist>`;
  main.addEventListener('click',e=>{const t=e.target.closest('[data-mode]');if(t){onboarding(t.dataset.mode)}
    const eye=e.target.closest('[data-eye]');if(eye){const i=$('#'+eye.dataset.eye);const sh=i.type==='password';i.type=sh?'text':'password';eye.textContent=sh?'Ocultar':'Mostrar'}});
  $('#authF').addEventListener('submit',async e=>{
    e.preventDefault();const f=Object.fromEntries(new FormData(e.target).entries());const err=$('#authErr');err.textContent='';
    const btn=e.target.querySelector('[type=submit]');btn.disabled=true;const old=btn.textContent;btn.textContent='Aguarde…';
    try{
      if(mode==='signup'){
        if(!f.nome||!f.especialidade||!f.cidade||!f.whatsapp||!f.email)throw new Error('Preencha nome, especialidade, cidade, WhatsApp e e-mail.');
        if(String(f.whatsapp).replace(/\D/g,'').length<10)throw new Error('Confira o WhatsApp com DDD.');
        if(String(f.senha||'').length<8)throw new Error('A senha precisa ter pelo menos 8 caracteres.');
        if(!$('#f-ok').checked)throw new Error('Marque a autorização para continuar.');
        f.consent=true;
      }
      const u=await auth(mode,f);ls.set('axl_had_account',true);const nx=new URLSearchParams(location.search).get('next');if(nx&&/^\/[a-z]/.test(nx)){location.href=nx;return}user=u;location.hash='#/';route();
    }catch(x){err.textContent=x.message;btn.disabled=false;btn.textContent=old}
  });
}


/* ---------- IA (Cloudflare Workers AI via /api/ai) ---------- */
async function ai(task, payload){
  const r=await fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({task,...payload})});
  let j={};try{j=await r.json()}catch{}
  if(!r.ok||!j.ok)throw new Error(j.error||'A IA não respondeu agora. Tente de novo em instantes.');
  return j;
}
function md(s){ // markdown simples -> html seguro
  const lines=esc(s||'').split('\n');let out='',ul=false;
  for(let l of lines){
    l=l.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
    if(/^\s*[-•*]\s+/.test(l)){if(!ul){out+='<ul>';ul=true}out+='<li>'+l.replace(/^\s*[-•*]\s+/,'')+'</li>';continue}
    if(ul){out+='</ul>';ul=false}
    if(/^#{1,4}\s/.test(l))out+='<h4>'+l.replace(/^#{1,4}\s/,'')+'</h4>';
    else if(l.trim())out+='<p>'+l+'</p>';
  }
  return out+(ul?'</ul>':'');
}
function aiBox(id){return `<div class="aiout" id="${id}" aria-live="polite"></div>`}
function aiLoading(el,txt){el.innerHTML=`<div class="aiload"><span class="spin" aria-hidden="true"></span>${txt||'A IA está trabalhando…'}</div>`}
function aiResult(el,text,opts={}){
  el.innerHTML=`<div class="aires">${md(text)}</div><div class="airow"><button class="btn ghost sm" type="button" data-copy>Copiar</button>${opts.print?'<button class="btn ghost sm" type="button" onclick="print()">Imprimir / PDF</button>':''}</div><p class="hint">Gerado por IA. Revise antes de usar: a decisão é sempre do médico.</p>`;
  el.querySelector('[data-copy]').onclick=()=>navigator.clipboard?.writeText(text).then(()=>toast('Copiado'));
  el._text=text;
}
function aiError(el,e){el.innerHTML=`<p class="err">${esc(e.message)}</p>`}

/* ---------- registro das 10 ferramentas ---------- */
const TOOLS=[
 {id:'tools',ic:'doc',t:'AXIS Tools',d:'Checklists, repasses e acesso rápido aos documentos, calculadoras e plantões.',mods:[['inicio','Visão geral',()=>window.axToolsHome],['check','Axis Check',()=>window.axToolsCheck],['repasse','Axis Repasse',()=>window.axToolsRepasse]]},
 {id:'consulta',ic:'mic',t:'Consulta IA',d:'Grave ou dite a consulta e receba evolução, orientações ao paciente e documentos prontos.',mods:[['gravar','Consulta',()=>window.mConsulta]]},
 {id:'documentos',ic:'doc',t:'Central de Documentos',d:'Atestado, relatórios, justificativas, termos e encaminhamentos em segundos.',mods:[['modelos','Modelos rápidos',()=>documentos],['ia','Escrever com IA',()=>window.mDocIA]]},
 {id:'calc',ic:'calc',t:'Calculadoras Clínicas',d:'IMC, função renal, idade gestacional, dose por peso, escores e conversões.',mods:[['imc','IMC e superfície',()=>window.cIMC],['renal','Função renal',()=>window.cRenal],['ig','Idade gestacional',()=>window.cIG],['dose','Dose por peso',()=>window.cDose],['escores','Escores',()=>window.cEscores],['conv','Conversões',()=>window.cConv]]},
 {id:'radar',ic:'search',t:'Radar Médico',d:'Novidades da sua especialidade e resumo prático de qualquer artigo.',mods:[['novidades','Novidades',()=>window.mRadar],['artigo','Resumir artigo',()=>window.mArtigo],['revisao','Revisão para prova',()=>window.mRevisao]]},
 {id:'financeiro',ic:'money',t:'Financeiro do Consultório',d:'Quanto cobrar, convênios, PF ou PJ, meta do mês, reajuste e equipamentos.',mods:[['cobrar','Quanto cobrar',()=>cobrar],['convenios','Convênios',()=>convenios],['meta','Meta do mês',()=>window.fMeta],['pfpj','PF ou PJ',()=>window.fPFPJ],['reajuste','Reajuste',()=>window.fReajuste],['equip','Equipamento',()=>window.fEquip]]},
 {id:'auditor',ic:'chart',t:'Auditor de Convênios',d:'Cole o demonstrativo: veja as glosas, o dinheiro parado e o recurso pronto.',mods:[['glosas','Glosas e recurso',()=>window.mGlosas],['receber','A receber',()=>window.mReceber]]},
 {id:'estudio',ic:'scan',t:'Estúdio de Marketing Ético',d:'Raio-X, ideias de posts, roteiros, verificador CFM e respostas a avaliações.',mods:[['raiox','Raio-X',()=>raiox],['posts','Ideias de posts',()=>window.mPosts],['cfm','Verificador CFM',()=>window.mCFM],['avaliacoes','Responder avaliação',()=>window.mAval],['datas','Datas da saúde',()=>window.mDatas]]},
 {id:'secretaria',ic:'chat',t:'Central da Secretária',d:'Scripts, treino com paciente difícil, mensagens delicadas e rotinas.',mods:[['scripts','Scripts',()=>scripts],['treino','Treino com IA',()=>window.mTreino],['mensagem','Mensagem difícil',()=>window.mMsg],['rotina','Abertura e fechamento',()=>window.mRotina]]},
 {id:'juridico',ic:'shield',t:'Escudo Jurídico',d:'LGPD, termos, modelos de contrato e dúvidas sobre as regras do CFM.',mods:[['lgpd','Checklist LGPD',()=>lgpd],['posso','Posso fazer isso?',()=>window.mPosso],['modelos','Modelos',()=>window.mModelosJur]]},
 {id:'vida',ic:'users',t:'Vida do Médico',d:'Plantões, cardápio, treino, sono pós-plantão, pausa e finanças pessoais.',mods:[['plantoes','Plantões',()=>window.vPlantoes],['cardapio','Cardápio',()=>window.vCardapio],['treino','Corrida e treino',()=>window.vTreino],['sono','Sono e plantão',()=>window.vSono],['pausa','Pausa de 3 minutos',()=>window.vPausa],['futuro','Liberdade financeira',()=>window.vFuturo]]}
];
let CUR={tool:null,mod:null};

/* ---------- início ---------- */
function home(p){
  const first=(p.nome||'').replace(/^(dra?\.?\s*)/i,'').split(' ')[0];
  main.innerHTML=`<div class="wrap">
  <section class="hello"><h1>Olá, ${esc(first||'doutor(a)')}.</h1><p>O que vamos resolver hoje?</p></section>
  <div class="tools">${TOOLS.map((t,i)=>`<a class="tool${i===0?' hero-tool':''}" href="#/${t.id}">${ic(t.ic)}<h3>${t.t}</h3><p>${t.d}</p><span class="tag">${t.mods.length>1?t.mods.length+' ferramentas':'Abrir'}</span></a>`).join('')}</div>
  <div class="card" style="margin:20px 0 48px;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;background:var(--forest);color:var(--cream);border:0">
    <div style="max-width:560px"><div class="eyebrow" style="color:var(--sage-2)">Quer que a gente faça por você?</div><p style="margin-top:8px;font-size:17px">A AXIS cuida do site, do Google, do Instagram, dos anúncios e da secretária de IA do seu consultório.</p></div>
    <a class="btn" style="background:var(--cream);color:var(--forest)" href="https://instagram.com/axismed_marketing" target="_blank" rel="noopener">Falar com a AXIS</a>
  </div></div>`;
}
/* cabeçalho de cada módulo: volta, nome da ferramenta e abas */
function head(t,s){
  const tool=TOOLS.find(x=>x.id===CUR.tool);
  const tabs=tool&&tool.mods.length>1?`<nav class="mtabs" aria-label="${esc(tool.t)}">${tool.mods.map(([id,nm])=>`<a href="#/${tool.id}/${id}" class="${id===CUR.mod?'on':''}" ${id===CUR.mod?'aria-current="page"':''}>${nm}</a>`).join('')}</nav>`:'';
  return `<div class="wrap"><div class="view-h noprint"><a class="back" href="#/">‹ Todas as ferramentas</a>${tool?`<div class="eyebrow">${esc(tool.t)}</div>`:''}${tabs}<h1>${t}</h1>${s?`<p class="muted" style="max-width:680px">${s}</p>`:''}</div>`;
}

/* ---------- roteador ---------- */
let user;
async function loadUser(){try{const r=await fetch('/api/auth/me',{credentials:'same-origin'});const j=await r.json();return j.user||null}catch{return null}}
async function route(){
  const fresh=main.cloneNode(false);main.replaceWith(fresh);main=fresh;
  if(user===undefined){main.innerHTML='<div class="wrap" style="padding:80px 0;color:var(--mute)">Carregando…</div>';user=await loadUser()}
  if(!user){onboarding();return}
  {const nx=new URLSearchParams(location.search).get('next');if(nx&&/^\/[a-z]/.test(nx)){location.replace(nx);return}}
  $('#bar').hidden=false;$('#foot').hidden=false;
  const [tid,mid]=location.hash.replace(/^#\/?/,'').split('/');
  const tool=TOOLS.find(t=>t.id===tid);
  if(!tool){CUR={tool:null,mod:null};home(user);document.title='AXIS Lab';scrollTo(0,0);return}
  const mod=tool.mods.find(m=>m[0]===mid)||tool.mods[0];
  CUR={tool:tool.id,mod:mod[0]};
  const fn=mod[2]();
  if(typeof fn==='function')fn(user);else main.innerHTML=head(mod[1],'Em breve.')+'</div>';
  document.title=`${mod[1]} · ${tool.t} · AXIS Lab`;scrollTo(0,0);
}
$('#logout').addEventListener('click',async()=>{try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'})}catch{}user=null;location.hash='';route()});
addEventListener('hashchange',()=>route());
document.addEventListener('DOMContentLoaded',()=>route());
