/* Ferramentas base: cobrar, convênios, documentos, raio-x, scripts, lgpd */
/* ---------- quanto cobrar ---------- */
function cobrar(){
  const d=ls.get('axl_cobrar',{aluguel:3500,secretaria:3200,sistemas:400,contador:600,mkt:1500,outros:800,prolabore:25000,imp:12,cartao:3,horas:30,cph:2,ocup:75,faltas:12});
  const F=[['aluguel','Aluguel e condomínio'],['secretaria','Secretária (salário + encargos)'],['sistemas','Sistemas e softwares'],['contador','Contador'],['mkt','Marketing'],['outros','Outros custos fixos']];
  main.innerHTML=head('Quanto cobrar pela consulta','Coloque os seus números. Tudo fica só neste aparelho.')+`
  <div class="split"><div class="form-col card form-sec" id="cf">
    <h3>Custos fixos por mês (R$)</h3>
    <div class="grid2">${F.map(([k,l])=>`<div class="field"><label for="c-${k}">${l}</label><input id="c-${k}" data-k="${k}" inputmode="decimal" value="${d[k]}"></div>`).join('')}</div>
    <h3>Quanto você quer tirar por mês (R$)</h3>
    <div class="field"><label for="c-prolabore">Ganho líquido desejado</label><input id="c-prolabore" data-k="prolabore" inputmode="decimal" value="${d.prolabore}"></div>
    <h3>Agenda</h3>
    <div class="grid2">
      <div class="field"><label for="c-horas">Horas de atendimento por semana</label><input id="c-horas" data-k="horas" inputmode="decimal" value="${d.horas}"></div>
      <div class="field"><label for="c-cph">Consultas por hora</label><input id="c-cph" data-k="cph" inputmode="decimal" value="${d.cph}"></div>
      <div class="field"><label for="c-ocup">Agenda preenchida (%)</label><input id="c-ocup" data-k="ocup" inputmode="decimal" value="${d.ocup}"></div>
      <div class="field"><label for="c-faltas">Faltas (%)</label><input id="c-faltas" data-k="faltas" inputmode="decimal" value="${d.faltas}"></div>
    </div>
    <h3>Descontos sobre o que entra (%)</h3>
    <div class="grid2">
      <div class="field"><label for="c-imp">Impostos</label><input id="c-imp" data-k="imp" inputmode="decimal" value="${d.imp}"><p class="hint">Confirme a sua alíquota com o contador.</p></div>
      <div class="field"><label for="c-cartao">Taxa de cartão/maquininha</label><input id="c-cartao" data-k="cartao" inputmode="decimal" value="${d.cartao}"></div>
    </div>
  </div>
  <aside class="res" aria-live="polite" id="cr"></aside></div></div>`;
  const calc=()=>{
    const v={};main.querySelectorAll('[data-k]').forEach(i=>v[i.dataset.k]=num(i.value));ls.set('axl_cobrar',v);
    const fixos=F.reduce((s,[k])=>s+v[k],0);const horasMes=v.horas*4.33;
    const consultas=horasMes*v.cph*(v.ocup/100)*(1-v.faltas/100);
    const desc=(v.imp+v.cartao)/100;const fat=(fixos+v.prolabore)/Math.max(.01,1-desc);
    const preco=consultas>0?fat/consultas:NaN;const custoH=horasMes>0?fixos/horasMes:NaN;const empate=consultas>0?(fixos/Math.max(.01,1-desc))/consultas:NaN;
    $('#cr').innerHTML=`<div class="lbl">Preço mínimo por consulta</div><div class="big">${brl(Math.ceil(preco/10)*10)}</div>
      <p class="note">Abaixo disso você não chega ao ganho que definiu.</p>
      <div><div class="row"><span>Consultas realizadas por mês</span><b>${Math.round(consultas)||0}</b></div>
      <div class="row"><span>Custos fixos por mês</span><b>${brl(fixos)}</b></div>
      <div class="row"><span>Custo de cada hora aberta</span><b>${brl(custoH)}</b></div>
      <div class="row"><span>Preço só para pagar as contas</span><b>${brl(empate)}</b></div>
      <div class="row"><span>Faturamento necessário</span><b>${brl(fat)}</b></div></div>
      <p class="note">Cada 10% a menos de faltas reduz o preço mínimo em cerca de ${brl(preco-(fat/(horasMes*v.cph*(v.ocup/100)*(1-Math.max(0,v.faltas-10)/100))))}. Confirmação de consulta ajuda aqui.</p>`;
  };
  main.addEventListener('input',calc);calc();
}

/* ---------- convênios ---------- */
function convenios(){
  const d=ls.get('axl_conv',{part:400,cphPart:2,imp:12,taxa:1,rows:[{n:'Convênio A',v:110,dias:60,g:5,cph:3},{n:'Convênio B',v:180,dias:45,g:8,cph:2},{n:'Convênio C',v:90,dias:90,g:12,cph:3}]});
  main.innerHTML=head('Quanto cada convênio paga de verdade','Coloque o valor que cada convênio paga por consulta. A conta desconta glosa, imposto e o custo de esperar o pagamento.')+`
  <div class="split"><div class="form-col card form-sec">
    <h3>Particular</h3>
    <div class="grid3">
      <div class="field"><label for="v-part">Valor da consulta (R$)</label><input id="v-part" inputmode="decimal" value="${d.part}"></div>
      <div class="field"><label for="v-cphp">Consultas por hora</label><input id="v-cphp" inputmode="decimal" value="${d.cphPart}"></div>
      <div class="field"><label for="v-imp">Impostos (%)</label><input id="v-imp" inputmode="decimal" value="${d.imp}"></div>
    </div>
    <h3>Convênios</h3>
    <div class="cv" id="cv"></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn ghost sm" type="button" id="cvAdd">+ Adicionar convênio</button></div>
    <div class="field" style="max-width:260px"><label for="v-taxa">Custo do dinheiro parado (% ao mês)</label><input id="v-taxa" inputmode="decimal" value="${d.taxa}"><p class="hint">Quanto o atraso no pagamento custa para você.</p></div>
  </div><aside class="res" id="vr" aria-live="polite"></aside></div></div>`;
  const cv=$('#cv');
  const rowH=(r,i)=>`<div class="cv-row" data-i="${i}">
    <div class="field"><label>Convênio</label><input data-f="n" value="${esc(r.n)}"></div>
    <div class="field"><label>R$ por consulta</label><input data-f="v" inputmode="decimal" value="${r.v}"></div>
    <div class="field"><label>Glosa (%)</label><input data-f="g" inputmode="decimal" value="${r.g}"></div>
    <div class="field"><label>Paga em (dias)</label><input data-f="dias" inputmode="decimal" value="${r.dias}"></div>
    <button class="x" type="button" aria-label="Remover ${esc(r.n)}" data-del="${i}">×</button>
    <div class="field" style="grid-column:1/-1;max-width:220px"><label>Consultas por hora neste convênio</label><input data-f="cph" inputmode="decimal" value="${r.cph}"></div></div>`;
  const draw=()=>{cv.innerHTML=d.rows.map(rowH).join('');calc()};
  const read=()=>{d.part=num($('#v-part').value);d.cphPart=num($('#v-cphp').value);d.imp=num($('#v-imp').value);d.taxa=num($('#v-taxa').value);
    cv.querySelectorAll('.cv-row').forEach(el=>{const r=d.rows[+el.dataset.i];el.querySelectorAll('[data-f]').forEach(i=>r[i.dataset.f]=i.dataset.f==='n'?i.value:num(i.value))});ls.set('axl_conv',d)};
  const calc=()=>{read();
    const imp=d.imp/100;const partH=d.part*(1-imp)*d.cphPart;
    const list=d.rows.map(r=>{const liq=r.v*(1-r.g/100)*(1-imp)*(1-(d.taxa/100)*(r.dias/30));return{n:r.n||'Sem nome',liq,h:liq*r.cph}}).sort((a,b)=>b.h-a.h);
    const max=Math.max(partH,...list.map(x=>x.h),1);
    $('#vr').innerHTML=`<div class="lbl">Quanto entra por hora de agenda</div>
    <div class="bars"><div class="barrow"><div class="t"><b>Particular</b><span>${brl(partH)}/h</span></div><div class="track"><div class="fill" style="width:${partH/max*100}%"></div></div></div>
    ${list.map(x=>`<div class="barrow"><div class="t"><b>${esc(x.n)}</b><span>${brl(x.h)}/h · ${brl2(x.liq)} líq./consulta</span></div><div class="track"><div class="fill ${x.h<partH*.5?'bad':''}" style="width:${Math.max(2,x.h/max*100)}%"></div></div></div>`).join('')}</div>
    ${list.length?`<p class="note">${esc(list[list.length-1].n)} rende ${brl(list[list.length-1].h)} por hora, ${Math.round((1-list[list.length-1].h/Math.max(partH,1))*100)}% menos que uma hora de particular. Vale avaliar se a agenda dele não deveria virar horário particular.</p>`:''}
    <p class="note">Conta simplificada: valor × (1 − glosa) × (1 − imposto) × (1 − custo do prazo).</p>`;
  };
  main.addEventListener('input',calc);
  cv.addEventListener('click',e=>{const i=e.target.dataset.del;if(i!==undefined){read();d.rows.splice(+i,1);draw()}});
  $('#cvAdd').addEventListener('click',()=>{read();d.rows.push({n:'Novo convênio',v:100,dias:60,g:5,cph:3});draw()});
  draw();
}

/* ---------- documentos ---------- */
function documentos(p){
  const today=new Date().toISOString().slice(0,10);
  main.innerHTML=head('Gerador de documentos','Preencha, confira e imprima ou salve em PDF. Os dados do paciente não são guardados.')+`
  <div class="split"><div class="form-col card form-sec">
    <div class="field"><label for="d-tipo">Documento</label><select id="d-tipo">
      <option value="atestado">Atestado médico</option><option value="comparecimento">Declaração de comparecimento</option>
      <option value="encaminhamento">Encaminhamento</option><option value="orientacoes">Orientações ao paciente</option></select></div>
    <div class="grid2">
      <div class="field"><label for="d-med">Médico(a)</label><input id="d-med" value="${esc(p.nome||'')}"></div>
      <div class="field"><label for="d-crm">CRM / RQE</label><input id="d-crm" value="${esc(p.crm?('CRM '+p.crm):'')}"></div>
      <div class="field"><label for="d-esp">Especialidade</label><input id="d-esp" value="${esc(p.especialidade||'')}"></div>
      <div class="field"><label for="d-cid">Cidade</label><input id="d-cid" value="${esc(p.cidade||'')}"></div>
    </div>
    <div class="field"><label for="d-pac">Nome do paciente</label><input id="d-pac" autocomplete="off"></div>
    <div class="grid2">
      <div class="field"><label for="d-data">Data do atendimento</label><input id="d-data" type="date" value="${today}"></div>
      <div class="field" data-for="comparecimento"><label for="d-hora">Horário (das … às …)</label><input id="d-hora" placeholder="14h00 às 15h00"></div>
      <div class="field" data-for="atestado"><label for="d-dias">Dias de afastamento</label><input id="d-dias" inputmode="numeric" value="1"></div>
      <div class="field" data-for="atestado"><label for="d-cid10">CID (opcional)</label><input id="d-cid10" placeholder="Só com autorização do paciente"></div>
      <div class="field" data-for="encaminhamento"><label for="d-para">Encaminhar para</label><input id="d-para" placeholder="Cardiologia"></div>
    </div>
    <div class="field" data-for="encaminhamento orientacoes"><label for="d-txt" id="d-txtl">Motivo / resumo</label><textarea id="d-txt"></textarea></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="button" onclick="print()">Imprimir ou salvar PDF</button><button class="btn ghost" type="button" id="d-copy">Copiar texto</button></div>
  </div>
  <div><article class="doc" id="doc" aria-label="Pré-visualização do documento"></article></div></div></div>`;
  const g=id=>$('#'+id).value.trim();
  const fmt=s=>{if(!s)return'___/___/____';const[y,m,dd]=s.split('-');return`${dd}/${m}/${y}`};
  const ext=s=>{const n=new Date(s+'T12:00:00');return isNaN(n)?'':n.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})};
  const draw=()=>{
    const t=g('d-tipo');main.querySelectorAll('[data-for]').forEach(el=>el.hidden=!el.dataset.for.split(' ').includes(t));
    $('#d-txtl').textContent=t==='orientacoes'?'Orientações (uma por linha)':'Motivo / resumo clínico';
    const pac=g('d-pac')||'[nome do paciente]',data=fmt(g('d-data'));let T='',B='';
    if(t==='atestado'){const d=parseInt(g('d-dias'))||1;T='Atestado médico';B=`Atesto, para os devidos fins, que ${pac} esteve sob meus cuidados em ${data}, necessitando de afastamento de suas atividades por ${d} (${d===1?'um':d}) dia${d>1?'s':''} a partir desta data.${g('d-cid10')?`\n\nCID: ${g('d-cid10')} (informado com autorização do paciente).`:''}`}
    if(t==='comparecimento'){T='Declaração de comparecimento';B=`Declaro, para os devidos fins, que ${pac} compareceu a consulta médica neste consultório em ${data}${g('d-hora')?`, no horário de ${g('d-hora')}`:''}.`}
    if(t==='encaminhamento'){T='Encaminhamento';B=`Ao(À) colega de ${g('d-para')||'[especialidade]'},\n\nEncaminho o(a) paciente ${pac} para avaliação e conduta.\n\n${g('d-txt')||'[motivo do encaminhamento e resumo clínico]'}\n\nAgradeço a atenção e coloco-me à disposição.`}
    if(t==='orientacoes'){T='Orientações';const it=(g('d-txt')||'[escreva cada orientação em uma linha]').split('\n').filter(Boolean);B=`${pac},\n\n`+it.map(x=>'• '+x).join('\n')+`\n\nEm caso de piora ou dúvida, entre em contato com o consultório ou procure atendimento de urgência.`}
    $('#doc').innerHTML=`<div class="dh"><b>${esc(g('d-med')||'[nome do médico]')}</b><small>${esc([g('d-esp'),g('d-crm')].filter(Boolean).join(' · '))}</small></div><h2>${T}</h2><div class="body">${esc(B)}</div>
      <div class="sign"><p style="margin-bottom:46px">${esc(g('d-cid')||'')}${g('d-cid')?', ':''}${ext(g('d-data'))}</p><i></i>${esc(g('d-med')||'')}<br>${esc(g('d-crm')||'')}</div>`;
  };
  main.addEventListener('input',draw);main.addEventListener('change',draw);
  $('#d-copy').addEventListener('click',()=>{navigator.clipboard?.writeText($('#doc').innerText).then(()=>toast('Texto copiado'))});
  draw();
}

/* ---------- raio-x ---------- */
const RX=[
 ['Google','Seu perfil no Google (Perfil da Empresa) está verificado e com fotos reais do consultório?'],
 ['Google','Você tem mais de 30 avaliações no Google e responde a elas?'],
 ['Google','Horário, telefone/WhatsApp e link de agendamento estão corretos no Google?'],
 ['Instagram','Você posta pelo menos 2 vezes por semana no Instagram?'],
 ['Instagram','A bio diz claramente sua especialidade, cidade e como marcar?'],
 ['Instagram','Seu conteúdo explica e tira dúvidas (não só divulga)?'],
 ['Site','Você tem site próprio que abre bem no celular?'],
 ['Site','O site mostra CRM/RQE e tem botão direto para o WhatsApp?'],
 ['Atendimento','O WhatsApp responde novos contatos em menos de 15 minutos, inclusive à noite?'],
 ['Atendimento','A secretária confirma as consultas na véspera?'],
 ['Atendimento','Você sabe quantos contatos chegam por mês e quantos viram consulta?'],
 ['Atendimento','Pacientes que somem recebem uma mensagem de retorno?']
];
const RXR={Google:'Complete o Perfil da Empresa no Google com fotos reais, horários e link de agendamento, e peça avaliações depois de cada consulta.',Instagram:'Tenha uma rotina de conteúdo educativo (2 a 3 por semana) e uma bio com especialidade, cidade e link para marcar.',Site:'Um site simples, rápido no celular, com CRM/RQE e botão de WhatsApp, passa confiança para quem pesquisa você.',Atendimento:'Responder rápido e confirmar consultas é o que mais aumenta a agenda. Uma secretária de IA atende em segundos, a qualquer hora.'};
function raiox(p){
  const a=ls.get('axl_rx',{});
  let h=head('Raio-X do consultório','Responda com sinceridade. A nota mostra onde o paciente se perde entre encontrar você e marcar a consulta.')+'<div class="split"><div class="form-col card">';
  let last='';RX.forEach(([ar,q],i)=>{if(ar!==last){h+=`<div class="area">${ar}</div>`;last=ar}
    h+=`<div class="q" role="group" aria-label="${esc(q)}"><b>${q}</b><div class="opts">${[['2','Sim'],['1','Em parte'],['0','Não']].map(([v,l])=>`<button type="button" class="opt" data-q="${i}" data-v="${v}" aria-pressed="${a[i]===v}">${l}</button>`).join('')}</div></div>`});
  h+='</div><aside class="res" id="rr" aria-live="polite"></aside></div></div>';main.innerHTML=h;
  const calc=()=>{
    const done=Object.keys(a).length;const areas={};RX.forEach(([ar],i)=>{areas[ar]=areas[ar]||{s:0,n:0};areas[ar].n+=2;areas[ar].s+=+(a[i]??0)});
    const score=Math.round(RX.reduce((s,_,i)=>s+ +(a[i]??0),0)/(RX.length*2)*100);
    const weak=Object.entries(areas).sort((x,y)=>x[1].s/x[1].n-y[1].s/y[1].n).slice(0,2);
    $('#rr').innerHTML=done<RX.length?`<div class="lbl">Sua nota</div><div class="big">${done}/${RX.length}</div><p class="note">Responda todas as perguntas para ver a nota e o que priorizar.</p>`:
    `<div class="lbl">Nota do consultório</div><div class="big">${score}<span style="font-size:20px;opacity:.6">/100</span></div>
    <p class="note">${score>=80?'Muito bom. Agora é manter a constância.':score>=50?'Base boa, mas tem pacientes escapando no caminho.':'Tem muito paciente procurando e não chegando até você.'}</p>
    <div class="bars">${Object.entries(areas).map(([k,v])=>`<div class="barrow"><div class="t"><b>${k}</b><span>${Math.round(v.s/v.n*100)}%</span></div><div class="track"><div class="fill ${v.s/v.n<.5?'bad':''}" style="width:${Math.max(3,v.s/v.n*100)}%"></div></div></div>`).join('')}</div>
    <div class="lbl" style="margin-top:6px">Por onde começar</div><ul class="recs">${weak.map(([k])=>`<li>${RXR[k]}</li>`).join('')}</ul>
    <a class="btn" href="https://instagram.com/axismed_marketing" target="_blank" rel="noopener">Quero ajuda da AXIS com isso</a>`;
    if(done===RX.length&&!ls.get('axl_rx_sent',false)){ls.set('axl_rx_sent',true);api({type:'raiox',nota:score,...p})}
  };
  main.addEventListener('click',e=>{const b=e.target.closest('.opt');if(!b)return;a[b.dataset.q]=b.dataset.v;ls.set('axl_rx',a);ls.set('axl_rx_sent',false);
    main.querySelectorAll(`.opt[data-q="${b.dataset.q}"]`).forEach(x=>x.setAttribute('aria-pressed',x===b));calc()});
  calc();
}

/* ---------- scripts ---------- */
const SC={
 'Primeiro contato':[['Boas-vindas','Olá, [Nome]! Aqui é a [Secretária], do consultório da [Dra./Dr. Nome]. Que bom que você entrou em contato 😊\nPara eu te ajudar a marcar, a consulta seria particular ou por convênio?'],['Valor da consulta (particular)','A consulta particular com a [Dra./Dr. Nome] é R$ [valor] e dura cerca de [tempo]. Ela inclui [retorno em até X dias, se houver].\nTenho horários na [dia] às [hora] ou na [dia] às [hora]. Qual fica melhor para você?']],
 'Confirmação':[['Véspera da consulta','Olá, [Nome]! Passando para confirmar sua consulta com a [Dra./Dr. Nome] amanhã, [dia], às [hora].\nResponda 1 para confirmar ou 2 se precisar remarcar.\nEndereço: [endereço]'],['No dia','Bom dia, [Nome]! Te esperamos hoje às [hora]. Se tiver exames anteriores, traga para a consulta. Até já!']],
 'Faltas e remarcação':[['Paciente faltou','Olá, [Nome]! Sentimos sua falta hoje na consulta das [hora]. Aconteceu alguma coisa?\nSe quiser, já te passo novos horários para remarcar.'],['Remarcação pelo consultório','Olá, [Nome]! Precisamos remarcar sua consulta de [dia] por um imprevisto da agenda. Pedimos desculpas.\nTenho [opção 1] ou [opção 2]. Qual fica melhor?']],
 'Retorno e avaliação':[['Lembrete de retorno','Olá, [Nome]! A [Dra./Dr. Nome] pediu para lembrar do seu retorno, previsto para [período].\nQuer que eu já reserve um horário?'],['Pedido de avaliação no Google','Olá, [Nome]! Obrigada pela confiança na consulta de hoje.\nSe puder, deixe sua avaliação sobre o atendimento no Google, isso ajuda outras pessoas a nos encontrarem: [link]\n(Não precisa contar nada sobre a consulta, só como foi ser atendido(a).)']],
 'Cobrança':[['Lembrete gentil','Olá, [Nome]! Tudo bem? Identificamos que o pagamento referente a [serviço] de [data] ficou em aberto.\nSe já pagou, por favor desconsidere. Se preferir, envio a chave Pix: [chave].']]
};
function scripts(){
  const cats=Object.keys(SC);let cur=cats[0];
  main.innerHTML=head('Scripts para a secretária','Mensagens prontas para o WhatsApp. Troque o que está entre colchetes e copie.')+`<div class="tabs" role="tablist">${cats.map(c=>`<button class="opt" type="button" role="tab" data-c="${c}" aria-pressed="${c===cur}">${c}</button>`).join('')}</div><div class="scr" id="sc"></div></div>`;
  const draw=()=>{$('#sc').innerHTML=SC[cur].map(([t,x],i)=>`<div class="card"><div class="top"><h3>${t}</h3><button class="btn ghost sm" type="button" data-cp="${i}">Copiar</button></div><p>${esc(x)}</p></div>`).join('')};
  main.addEventListener('click',e=>{const c=e.target.closest('[data-c]');if(c){cur=c.dataset.c;main.querySelectorAll('[data-c]').forEach(b=>b.setAttribute('aria-pressed',b===c));draw()}
    const k=e.target.closest('[data-cp]');if(k){navigator.clipboard?.writeText(SC[cur][+k.dataset.cp][1]).then(()=>toast('Mensagem copiada'))}});
  draw();
}

/* ---------- lgpd ---------- */
const LG=[
 ['Prontuários com acesso por usuário e senha individual','Cada pessoa da equipe tem o próprio login, nada de senha compartilhada.'],
 ['Termo de sigilo assinado pela equipe','Secretária e assistentes assinam compromisso de confidencialidade.'],
 ['Aviso de privacidade disponível ao paciente','Na recepção ou no site: quais dados você coleta e para quê.'],
 ['Consentimento para fotos e uso de imagem','Por escrito, antes de qualquer foto, e separado para uso em redes sociais.'],
 ['Nada de dados de paciente em grupos de WhatsApp pessoais','Exames e laudos circulam só por canal do consultório.'],
 ['Computadores com senha e bloqueio automático de tela','E antivírus atualizado.'],
 ['Backup automático e testado dos dados','Pelo menos semanal, guardado fora do consultório.'],
 ['Papéis com dados descartados de forma segura','Fragmentadora, nunca no lixo comum.'],
 ['Contratos com fornecedores que acessam dados','Sistema de prontuário, laboratório e contador com cláusula de proteção de dados.'],
 ['Responsável definido para pedidos de pacientes','Quem responde se um paciente pedir cópia ou exclusão dos dados.'],
 ['Plano para incidente de vazamento','Saber o que fazer e a quem avisar se algo vazar.'],
 ['Avaliações respondidas sem citar o atendimento','Nunca confirmar que a pessoa é paciente nem falar do caso em público.']
];
function lgpd(){
  const a=ls.get('axl_lgpd',{});
  main.innerHTML=head('Checklist LGPD do consultório','Marque o que já está em ordem. Fica salvo neste aparelho para você voltar depois.')+`<div class="card" style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b id="lgN"></b><span class="muted" style="font-size:14px">Orientação geral, não substitui assessoria jurídica.</span></div><div class="prog"><i id="lgP"></i></div></div>
  <div class="ck">${LG.map(([t,s],i)=>`<label><input type="checkbox" data-i="${i}" ${a[i]?'checked':''}><span>${t}<small>${s}</small></span></label>`).join('')}</div></div>`;
  const upd=()=>{const n=Object.values(a).filter(Boolean).length;$('#lgN').textContent=`${n} de ${LG.length} itens em ordem`;$('#lgP').style.width=(n/LG.length*100)+'%'};
  main.addEventListener('change',e=>{const i=e.target.dataset.i;if(i!==undefined){a[i]=e.target.checked;ls.set('axl_lgpd',a);upd()}});upd();
}

