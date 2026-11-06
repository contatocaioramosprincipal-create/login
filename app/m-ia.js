/* Módulos com IA (Cloudflare Workers AI via /api/ai) + auxiliares */
const ta=(k,l,ph='',rows=6)=>`<div class="field"><label for="a-${k}">${l}</label><textarea id="a-${k}" data-a="${k}" rows="${rows}" placeholder="${esc(ph)}"></textarea></div>`;
const inp=(k,l,ph='',v='')=>`<div class="field"><label for="a-${k}">${l}</label><input id="a-${k}" data-a="${k}" placeholder="${esc(ph)}" value="${esc(v)}"></div>`;
const opt=(k,l,opts)=>`<div class="field"><label for="a-${k}">${l}</label><select id="a-${k}" data-a="${k}">${opts.map(o=>`<option>${esc(o)}</option>`).join('')}</select></div>`;
function vals(root){const v={};root.querySelectorAll('[data-a]').forEach(i=>v[i.dataset.a]=i.value.trim());return v}

/* página padrão: formulário + botão + resultado */
function aiPage(title,sub,fields,task,o={}){
  main.innerHTML=head(title,sub)+`<form class="card form-sec aiform noprint" id="aif">${fields}<div class="airow"><button class="btn" type="submit">${o.btn||'Gerar'}</button>${o.extra||''}</div><p class="hint">${o.hint||'Não coloque nome, CPF ou outros dados que identifiquem o paciente.'}</p></form>${aiBox('aio')}</div>`;
  const f=$('#aif'),out=$('#aio');
  f.addEventListener('submit',async e=>{e.preventDefault();const v=o.collect?await o.collect(f):vals(f);if(!v)return;
    const b=f.querySelector('[type=submit]');b.disabled=true;aiLoading(out,o.loading);
    try{const j=await ai(task,v);aiResult(out,j.text,{print:o.print});o.after&&o.after(j,out)}catch(err){aiError(out,err)}finally{b.disabled=false}});
  o.init&&o.init(f);
}

/* ---------- 1. Consulta IA ---------- */
window.mConsulta=p=>{
  let rec=null,chunks=[],t0=0,tick=null;
  aiPage('Consulta IA','Grave a consulta (com o consentimento do paciente) ou cole suas anotações. A IA devolve a evolução em SOAP, as orientações ao paciente e os documentos sugeridos. O áudio não é guardado.',
  `<div class="recbox"><button class="recbtn" type="button" id="recB" aria-pressed="false"><span class="dot" aria-hidden="true"></span><span id="recL">Gravar consulta</span></button><div class="rect" id="recT">00:00</div></div>
   <p class="hint" id="recS">Toque para gravar. Toque de novo para parar e gerar.</p>
   ${ta('texto','Ou cole/dite a transcrição e suas anotações','Ex.: Paciente 54 anos, refere cefaleia há 2 semanas…',7)}`,
  'consulta',{btn:'Gerar documentação',print:true,loading:'Transcrevendo e organizando a consulta…',
   hint:'Peça autorização ao paciente antes de gravar. Revise tudo antes de colar no prontuário.',
   collect:async f=>{const v=vals(f);if(f._audio){v.audio=f._audio;f._audio=null}else if(!v.texto){toast('Grave ou escreva algo antes');return null}return v},
   after:(j,out)=>{if(j.transcricao){const d=document.createElement('details');d.className='card';d.style.marginTop='12px';d.innerHTML=`<summary>Ver transcrição</summary><p style="white-space:pre-wrap;margin-top:10px">${esc(j.transcricao)}</p>`;out.append(d)}},
   init:f=>{const B=$('#recB'),L=$('#recL'),T=$('#recT'),S=$('#recS');
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){B.disabled=true;S.textContent='Este navegador não grava áudio. Use a caixa de texto (o teclado do celular tem ditado).';return}
    B.onclick=async()=>{
      if(rec&&rec.state==='recording'){rec.stop();return}
      try{const st=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];
        const mt=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(m=>MediaRecorder.isTypeSupported?.(m))||'';
        rec=new MediaRecorder(st,mt?{mimeType:mt,audioBitsPerSecond:24000}:{audioBitsPerSecond:24000});
        rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
        rec.onstop=()=>{st.getTracks().forEach(x=>x.stop());clearInterval(tick);B.setAttribute('aria-pressed','false');L.textContent='Gravar de novo';
          const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});const fr=new FileReader();fr.onload=()=>{f._audio=fr.result;S.textContent='Gravação pronta. Gerando…';f.requestSubmit()};fr.readAsDataURL(blob)};
        rec.start(1000);t0=Date.now();B.setAttribute('aria-pressed','true');L.textContent='Parar e gerar';S.textContent='Gravando…';
        tick=setInterval(()=>{const s=Math.floor((Date.now()-t0)/1000);T.textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;if(s>=1200)rec.stop()},500);
      }catch{S.textContent='Sem acesso ao microfone. Libere a permissão no navegador.'}
    }}});
};

/* ---------- 2. Documentos com IA ---------- */
window.mDocIA=p=>aiPage('Escrever documento com IA','Diga o que precisa e a IA redige no padrão formal. Os campos do paciente ficam entre colchetes para você completar.',
 `${opt('tipo','Documento',['Relatório médico','Laudo','Justificativa para convênio (OPME/procedimento)','Termo de consentimento livre e esclarecido','Encaminhamento','Declaração','Carta para outro médico','Recusa de procedimento'])}${ta('contexto','O que precisa constar','Ex.: justificar ressonância de joelho para convênio, dor há 3 meses, falha do tratamento conservador…')}`,
 'doc',{print:true});

/* ---------- 4. Radar Médico ---------- */
window.mRadar=p=>aiPage('Novidades da sua especialidade','A IA busca no PubMed os estudos dos últimos 90 dias e resume o que muda na prática.',
 `<div class="grid2">${inp('especialidade','Especialidade','',p.especialidade||'')}${inp('tema','Tema (opcional)','Ex.: insuficiência cardíaca, GLP-1')}</div>`,
 'radar',{btn:'Buscar novidades',loading:'Buscando no PubMed e resumindo…',hint:'Fonte: PubMed (NCBI). Confira o artigo original antes de mudar condutas.',
  after:(j,out)=>{if(j.links){const d=document.createElement('div');d.className='card';d.style.marginTop='12px';d.innerHTML=`<div class="eyebrow">Artigos usados</div><ul style="margin:10px 0 0;padding-left:18px">${j.links.map(l=>`<li><a href="${l}" target="_blank" rel="noopener">${l.replace('https://','')}</a></li>`).join('')}</ul><p class="hint">Busca: ${esc(j.busca||'')}</p>`;out.append(d)}}});

window.mArtigo=p=>aiPage('Resumir artigo','Cole o texto do artigo (ou só o resumo) e receba uma leitura crítica pronta.',
 `${ta('texto','Texto do artigo','Cole aqui o abstract ou o artigo completo',10)}<div class="field"><label for="pdfi">Ou envie o PDF</label><input type="file" id="pdfi" accept="application/pdf"></div>`,
 'artigo',{btn:'Resumir',hint:'Artigos muito longos são cortados nas primeiras páginas.',init:f=>{$('#pdfi').onchange=async e=>{const file=e.target.files[0];if(!file)return;toast('Lendo o PDF…');
   try{const t=await pdfText(file);$('#a-texto').value=t.slice(0,16000);toast('PDF carregado')}catch{toast('Não consegui ler esse PDF. Cole o texto.')}}}});

async function pdfText(file){
  if(!window.pdfjsLib){await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=ok;s.onerror=no;document.head.append(s)});
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}
  const doc=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let t='';
  for(let i=1;i<=Math.min(doc.numPages,15);i++){const pg=await doc.getPage(i);const c=await pg.getTextContent();t+=c.items.map(x=>x.str).join(' ')+'\n'}
  return t;
}

window.mRevisao=p=>aiPage('Revisão para prova','Resumo do essencial, questões comentadas e pegadinhas sobre qualquer tema.',
 `${inp('tema','Tema','Ex.: manejo da cetoacidose diabética')}${opt('nivel','Nível',['Residência','Título de especialista','Atualização'])}`,'revisao',{btn:'Montar revisão',print:true});

/* ---------- 6. Auditor de Convênios ---------- */
window.mGlosas=p=>aiPage('Glosas e recurso','Cole o demonstrativo de pagamento ou a lista de glosas (ou envie o PDF). Você recebe o resumo por motivo, o que corrigir e o recurso pronto.',
 `${ta('texto','Demonstrativo / glosas','Cole aqui as linhas do demonstrativo (guia, procedimento, valor, código e motivo da glosa)',10)}<div class="field"><label for="pdfi">Ou envie o PDF do demonstrativo</label><input type="file" id="pdfi" accept="application/pdf"></div>`,
 'glosas',{btn:'Analisar glosas',print:true,hint:'Antes de colar, apague nomes e carteirinhas de pacientes.',init:f=>{$('#pdfi').onchange=async e=>{const file=e.target.files[0];if(!file)return;toast('Lendo o PDF…');try{$('#a-texto').value=(await pdfText(file)).slice(0,14000);toast('PDF carregado')}catch{toast('Não consegui ler esse PDF.')}}}});

window.mReceber=()=>{
  const L=ls.get('axl_receber',[]);
  main.innerHTML=head('A receber dos convênios','Anote o que foi faturado e quando deve cair. Fica salvo só neste aparelho.')+`<form class="card form-sec" id="rf"><div class="grid3"><div class="field"><label for="r-c">Convênio</label><input id="r-c" required></div><div class="field"><label for="r-v">Valor (R$)</label><input id="r-v" inputmode="decimal" required></div><div class="field"><label for="r-d">Previsão de pagamento</label><input id="r-d" type="date" required></div></div><button class="btn" type="submit">Adicionar</button></form><div id="rl" style="margin:16px 0 48px"></div></div>`;
  const draw=()=>{const hoje=new Date().toISOString().slice(0,10);L.sort((a,b)=>a.d.localeCompare(b.d));
    const ab=L.filter(x=>!x.ok),tot=ab.reduce((s,x)=>s+x.v,0),atr=ab.filter(x=>x.d<hoje);
    $('#rl').innerHTML=`<div class="res" style="position:static;margin-bottom:14px"><div class="lbl">Dinheiro parado</div><div class="big">${brl(tot)}</div><p class="note">${atr.length?`${atr.length} pagamento(s) atrasado(s): ${brl(atr.reduce((s,x)=>s+x.v,0))}`:'Nada atrasado.'}</p></div>`+
     (L.length?L.map((x,i)=>`<div class="card rrow${x.ok?' done':''}${!x.ok&&x.d<hoje?' late':''}"><div><b>${esc(x.c)}</b><small>${new Date(x.d+'T12:00').toLocaleDateString('pt-BR')}${!x.ok&&x.d<hoje?' · atrasado':''}</small></div><b>${brl2(x.v)}</b><div class="airow"><button class="btn ghost sm" type="button" data-ok="${i}">${x.ok?'Desfazer':'Recebido'}</button><button class="btn ghost sm" type="button" data-del="${i}" aria-label="Remover">✕</button></div></div>`).join(''):'<p class="muted">Nenhum lançamento ainda.</p>')};
  $('#rf').onsubmit=e=>{e.preventDefault();L.push({c:$('#r-c').value.trim(),v:num($('#r-v').value),d:$('#r-d').value,ok:false});ls.set('axl_receber',L);e.target.reset();draw()};
  $('#rl').onclick=e=>{const o=e.target.closest('[data-ok]'),d=e.target.closest('[data-del]');if(o){L[+o.dataset.ok].ok=!L[+o.dataset.ok].ok}else if(d){L.splice(+d.dataset.del,1)}else return;ls.set('axl_receber',L);draw()};
  draw();
};

/* ---------- 7. Estúdio de Marketing Ético ---------- */
window.mPosts=p=>aiPage('Ideias de posts','Descreva o que quer comunicar e receba 5 ideias com roteiro, legenda e chamada, dentro das regras do CFM.',
 `${ta('pedido','O que você quer comunicar','Ex.: explicar quando a dor no peito é emergência, para público leigo',4)}${opt('formato','Formato',['Carrossel','Reels (roteiro de vídeo)','Post único','Stories'])}`,'posts',{btn:'Gerar ideias'});
window.mCFM=p=>aiPage('Verificador CFM','Cole o texto do post ou anúncio. A IA aponta os riscos pela Resolução CFM 2.336/2023 e devolve uma versão segura.',
 ta('texto','Texto do post / anúncio','Cole a legenda, o texto dos slides ou do anúncio',8),'cfm',{btn:'Verificar'});
window.mAval=p=>aiPage('Responder avaliação','Respostas para Google e Doctoralia que não confirmam que a pessoa é paciente (sigilo e LGPD).',
 `${ta('texto','Avaliação recebida','Cole o texto da avaliação',5)}<div class="grid2">${opt('nota','Nota',['5','4','3','2','1'])}${opt('tom','Tom',['Acolhedor','Formal','Breve'])}</div>`,'aval',{btn:'Escrever resposta'});

const DATAS=[['01','Janeiro Branco (saúde mental) · Janeiro Roxo (hanseníase)',[['04','Dia Mundial do Braille'],['20','Dia do Farmacêutico'],['30','Dia Mundial de Combate à Hanseníase (último domingo)']]],
 ['02','Fevereiro Roxo e Laranja (lúpus, Alzheimer, fibromialgia e leucemia)',[['04','Dia Mundial do Câncer'],['28','Dia das Doenças Raras (último dia)']]],
 ['03','Março Lilás (câncer de colo do útero) · Março Azul-Marinho (câncer colorretal)',[['08','Dia da Mulher'],['21','Dia da Síndrome de Down'],['24','Dia Mundial da Tuberculose'],['2ª qui','Dia Mundial do Rim']]],
 ['04','Abril Azul (autismo) · Abril Verde (segurança no trabalho)',[['02','Dia da Conscientização do Autismo'],['07','Dia Mundial da Saúde'],['11','Dia do Parkinson']]],
 ['05','Maio Amarelo (trânsito) · Maio Roxo (doenças inflamatórias intestinais)',[['05','Dia da Higiene das Mãos'],['17','Dia Mundial da Hipertensão'],['31','Dia Mundial sem Tabaco']]],
 ['06','Junho Vermelho (doação de sangue) · Junho Laranja (anemia e leucemia)',[['14','Dia do Doador de Sangue']]],
 ['07','Julho Amarelo (hepatites) · Julho Verde (câncer de cabeça e pescoço)',[['28','Dia Mundial das Hepatites']]],
 ['08','Agosto Dourado (aleitamento) · Agosto Lilás',[['1ª semana','Semana Mundial do Aleitamento']]],
 ['09','Setembro Amarelo (prevenção do suicídio) · Setembro Verde (doação de órgãos)',[['10','Dia de Prevenção do Suicídio'],['21','Dia do Alzheimer'],['29','Dia Mundial do Coração']]],
 ['10','Outubro Rosa (câncer de mama)',[['10','Dia Mundial da Saúde Mental'],['18','Dia do Médico'],['20','Dia Mundial da Osteoporose']]],
 ['11','Novembro Azul (saúde do homem) · Novembro Roxo (prematuridade)',[['14','Dia Mundial do Diabetes'],['17','Dia Mundial da Prematuridade']]],
 ['12','Dezembro Vermelho (HIV/aids) · Dezembro Laranja (câncer de pele)',[['01','Dia Mundial de Luta contra a Aids']]]];
const MES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
window.mDatas=()=>{const m=new Date().getMonth();const ord=[...DATAS.slice(m),...DATAS.slice(0,m)];
  main.innerHTML=head('Datas da saúde','Campanhas e datas para planejar o conteúdo. Começa pelo mês atual.')+`<div class="scr">${ord.map(([n,camp,ds],i)=>`<div class="card"${i===0?' style="border-color:var(--sage-d)"':''}><div class="top"><h3>${MES[+n-1]}${i===0?' · agora':''}</h3><a class="btn ghost sm" href="#/estudio/posts">Criar post</a></div><p class="muted" style="margin-bottom:8px">${camp}</p>${ds.map(([d,t])=>`<div class="row2"><b>${d}</b><span>${t}</span></div>`).join('')}</div>`).join('')}</div></div>`};

/* ---------- 8. Central da Secretária (IA) ---------- */
const CEN=['Paciente irritado porque o médico atrasou 1 hora','Paciente pedindo desconto na consulta particular','Paciente querendo encaixe para hoje com a agenda cheia','Paciente pedindo resultado de exame pelo WhatsApp','Paciente que quer remarcar pela terceira vez','Paciente perguntando se o convênio cobre um procedimento','Paciente que ainda não decidiu se marca (está comparando preços)'];
window.mTreino=p=>{
  let msgs=[],cen=CEN[0];
  main.innerHTML=head('Treino com paciente difícil','A IA faz o papel do paciente, como no WhatsApp. Responda como a secretária. Quando terminar, escreva FIM para receber nota e dicas.')+`<div class="card form-sec"><div class="field"><label for="tc">Cenário</label><select id="tc">${CEN.map(c=>`<option>${c}</option>`).join('')}</select></div><button class="btn ghost sm" type="button" id="tgo" style="justify-self:start">Começar treino</button></div>
   <div class="chatbox" id="chat" aria-live="polite"></div><form class="chatin" id="cf" hidden><input id="cm" placeholder="Sua resposta como secretária…" autocomplete="off"><button class="btn" type="submit">Enviar</button><button class="btn ghost" type="button" id="cfim">FIM</button></form></div>`;
  const C=$('#chat'),draw=()=>{C.innerHTML=msgs.map(m=>`<div class="bub ${m.role==='assistant'?'pt':'me'}">${m.role==='assistant'?md(m.content):esc(m.content)}</div>`).join('');C.scrollTop=C.scrollHeight};
  const send=async()=>{const w=document.createElement('div');w.className='bub pt';w.innerHTML='<span class="spin"></span>';C.append(w);
    try{const j=await ai('treino',{cenario:cen,msgs});msgs.push({role:'assistant',content:j.text})}catch(e){msgs.push({role:'assistant',content:'('+e.message+')'})}draw()};
  $('#tgo').onclick=()=>{cen=$('#tc').value;msgs=[];$('#cf').hidden=false;$('#tgo').textContent='Recomeçar';draw();send()};
  $('#cf').onsubmit=e=>{e.preventDefault();const v=$('#cm').value.trim();if(!v)return;msgs.push({role:'user',content:v});$('#cm').value='';draw();send()};
  $('#cfim').onclick=()=>{msgs.push({role:'user',content:'FIM'});draw();send()};
};
window.mMsg=p=>aiPage('Mensagem difícil','Descreva a situação e receba a mensagem pronta para o WhatsApp.',
 `${ta('situacao','Situação','Ex.: avisar que o médico teve uma emergência e a consulta de amanhã precisa ser remarcada',4)}${opt('tom','Tom',['Acolhedor','Formal','Direto'])}`,'msg',{btn:'Escrever mensagem'});

/* ---------- 9. Escudo Jurídico (IA) ---------- */
window.mPosso=p=>aiPage('Posso fazer isso?','Tire dúvidas sobre publicidade médica, telemedicina, LGPD e relação com o paciente.',
 ta('pergunta','Sua dúvida','Ex.: posso postar foto de antes e depois de um paciente no Instagram?',4),'posso',{btn:'Perguntar',hint:'Orientação geral. Para casos concretos, consulte um advogado.'});

/* ---------- 10. Vida do Médico (IA) ---------- */
window.vCardapio=p=>aiPage('Cardápio da semana','Cardápio simples para a sua rotina, incluindo o que levar para o plantão.',
 `${opt('objetivo','Objetivo',['Comer melhor sem complicar','Perder peso com saúde','Ganhar massa muscular','Mais energia nos plantões'])}${inp('rotina','Rotina','Ex.: consultório 8h–18h, 2 plantões noturnos por semana')}${inp('restricoes','Restrições ou preferências','Ex.: sem lactose, não gosto de peixe')}`,'cardapio',{btn:'Montar cardápio',print:true,hint:'Sugestão geral. Com alguma condição de saúde, procure um nutricionista.'});
window.vTreino=p=>aiPage('Corrida e treino','Plano de 4 semanas que cabe na sua agenda e se ajusta nas semanas de plantão.',
 `<div class="grid2">${opt('modalidade','Modalidade',['Corrida','Musculação','Corrida + musculação','Caminhada','Treino em casa (sem equipamento)'])}${opt('nivel','Nível',['Iniciante','Intermediário','Avançado'])}</div>${inp('objetivo','Objetivo','Ex.: correr 5 km, voltar a treinar, prova de 10 km')}${inp('dias','Dias e tempo','Ex.: 3 vezes por semana, 40 minutos')}`,'fisico',{btn:'Montar plano',print:true});
