/* Vida do Médico: plantões, sono, pausa, liberdade financeira (sem IA) */
window.vPlantoes=()=>{
  const L=ls.get('axl_plantoes',[]);const hoje=new Date().toISOString().slice(0,10);
  main.innerHTML=head('Plantões','Controle seus plantões, quanto vai receber e quanto já recebeu. Fica salvo só neste aparelho.')+`<form class="card form-sec" id="pf"><div class="grid3">
   <div class="field"><label for="p-d">Data</label><input id="p-d" type="date" value="${hoje}" required></div>
   <div class="field"><label for="p-l">Local</label><input id="p-l" placeholder="Hospital / UPA" required></div>
   <div class="field"><label for="p-h">Horas</label><input id="p-h" inputmode="decimal" value="12" required></div>
   <div class="field"><label for="p-v">Valor (R$)</label><input id="p-v" inputmode="decimal" required></div>
   <div class="field"><label for="p-pg">Previsão de pagamento</label><input id="p-pg" type="date"></div></div>
   <button class="btn" type="submit" style="justify-self:start">Adicionar plantão</button></form><div id="pl" style="margin:16px 0 48px"></div></div>`;
  const draw=()=>{L.sort((a,b)=>b.d.localeCompare(a.d));const mes=hoje.slice(0,7),dm=L.filter(x=>x.d.startsWith(mes));
    const aR=L.filter(x=>!x.ok),h=dm.reduce((s,x)=>s+x.h,0);
    $('#pl').innerHTML=`<div class="res" style="position:static;margin-bottom:14px"><div class="lbl">Este mês</div><div class="big">${brl(dm.reduce((s,x)=>s+x.v,0))}</div><div><div class="row"><span>Plantões / horas</span><b>${dm.length} / ${f1(h,0)}h</b></div><div class="row"><span>Valor médio por hora</span><b>${h?brl2(dm.reduce((s,x)=>s+x.v,0)/h):'—'}</b></div><div class="row"><span>A receber (total)</span><b>${brl(aR.reduce((s,x)=>s+x.v,0))}</b></div><div class="row"><span>Horas nos últimos 7 dias</span><b>${f1(L.filter(x=>(new Date(hoje)-new Date(x.d))/864e5<7&&x.d<=hoje).reduce((s,x)=>s+x.h,0),0)}h</b></div></div></div>`+
     (L.length?L.map((x,i)=>`<div class="card rrow${x.ok?' done':''}${!x.ok&&x.pg&&x.pg<hoje?' late':''}"><div><b>${esc(x.l)}</b><small>${new Date(x.d+'T12:00').toLocaleDateString('pt-BR')} · ${f1(x.h,0)}h${x.pg&&!x.ok?` · paga em ${new Date(x.pg+'T12:00').toLocaleDateString('pt-BR')}`:''}</small></div><b>${brl2(x.v)}</b><div class="airow"><button class="btn ghost sm" type="button" data-ok="${i}">${x.ok?'Desfazer':'Recebido'}</button><button class="btn ghost sm" type="button" data-del="${i}" aria-label="Remover">✕</button></div></div>`).join(''):'<p class="muted">Nenhum plantão ainda.</p>')};
  $('#pf').onsubmit=e=>{e.preventDefault();L.push({d:$('#p-d').value,l:$('#p-l').value.trim(),h:num($('#p-h').value),v:num($('#p-v').value),pg:$('#p-pg').value,ok:false});ls.set('axl_plantoes',L);$('#p-l').value='';$('#p-v').value='';draw()};
  $('#pl').onclick=e=>{const o=e.target.closest('[data-ok]'),d=e.target.closest('[data-del]');if(o)L[+o.dataset.ok].ok=!L[+o.dataset.ok].ok;else if(d)L.splice(+d.dataset.del,1);else return;ls.set('axl_plantoes',L);draw()};
  draw();
};

window.vSono=()=>{
  main.innerHTML=head('Sono e plantão','Guia prático para dormir melhor antes e depois do plantão noturno, e calculadora de horário.')+`<div class="split"><div class="card form-sec">
   <div class="grid2"><div class="field"><label for="s-a">Acordar às</label><input id="s-a" type="time" value="06:30"></div><div class="field"><label for="s-f">Ou: plantão termina às</label><input id="s-f" type="time" value="07:00"></div></div>
   <p class="hint">Ciclos de sono de cerca de 90 minutos, mais 15 minutos para adormecer.</p></div><aside class="res" id="sr"></aside></div>
   <div class="scr">${[
    ['Antes do plantão noturno','Cochilo de 90 minutos no fim da tarde (por volta das 16h–18h).\nCafeína só no início do plantão; evite depois das 3h da manhã.\nRefeição leve antes de sair.'],
    ['Durante o plantão','Se puder, cochilo de 20 a 25 minutos entre 2h e 4h (não passe de 30 para não acordar grogue).\nLuz forte nas primeiras horas, mais fraca perto do fim.\nÁgua e lanche com proteína em vez de doce.'],
    ['Depois do plantão','Óculos escuros na volta para casa, para o cérebro não "acordar".\nDurma logo ao chegar, por no máximo 4 a 5 horas, e levante.\nQuarto escuro, frio e sem celular. À noite, durma no horário normal para voltar ao ritmo.'],
    ['Se dirigir depois do plantão','Sono ao volante é tão perigoso quanto álcool. Se estiver bocejando ou piscando pesado, cochile 20 minutos antes de dirigir ou use transporte por aplicativo.']
   ].map(([t,x])=>`<div class="card"><div class="top"><h3>${t}</h3></div><p>${x}</p></div>`).join('')}</div></div>`;
  const hm=v=>{const [h,m]=v.split(':').map(Number);return h*60+m},fmt=m=>{m=((m%1440)+1440)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`};
  const run=()=>{const a=hm($('#s-a').value||'06:30'),f=hm($('#s-f').value||'07:00');
    $('#sr').innerHTML=`<div class="lbl">Para acordar às ${fmt(a)}, deite às</div><div class="big">${fmt(a-6*90-15)}</div><p class="note">ou ${fmt(a-5*90-15)} (5 ciclos) · ${fmt(a-4*90-15)} (4 ciclos)</p><div><div class="row"><span>Pós-plantão: dormir até</span><b>${fmt(f+45+3*90)}</b></div><div class="row"><span>Cochilo curto pós-plantão</span><b>até ${fmt(f+45+90)}</b></div></div>`};
  main.addEventListener('input',run);run();
};

window.vPausa=()=>{
  main.innerHTML=head('Pausa de 3 minutos','Respiração guiada para entre um paciente e outro. Siga o círculo.')+`<div class="card pausa"><div class="breath" id="br"><span id="bt">Toque em começar</span></div><div class="airow" style="justify-content:center"><button class="btn" type="button" id="bgo">Começar</button>${'<select id="bm" aria-label="Ritmo" style="width:auto"><option value="4,4,4,4">Respiração quadrada (4-4-4-4)</option><option value="4,7,8,0">Relaxar (4-7-8)</option><option value="5,0,5,0">Coerência (5-5)</option></select>'}</div><p class="muted" id="bc" style="text-align:center">3:00</p></div></div>`;
  let on=false,tm=[];const B=$('#br'),T=$('#bt'),C=$('#bc'),G=$('#bgo');
  const stop=()=>{on=false;tm.forEach(clearTimeout);tm=[];B.style.transform='scale(.6)';T.textContent='Pronto. Bom atendimento!';G.textContent='Começar';};
  G.onclick=()=>{if(on){stop();return}on=true;G.textContent='Parar';const [i,h1,e,h2]=$('#bm').value.split(',').map(Number);const end=Date.now()+180000;
    const step=()=>{if(!on)return;if(Date.now()>=end){stop();return}
      const seq=[['Inspire',i,'scale(1)'],['Segure',h1,null],['Expire',e,'scale(.6)'],['Segure',h2,null]].filter(s=>s[1]>0);let t=0;
      seq.forEach(([lbl,s,tr])=>{tm.push(setTimeout(()=>{if(!on)return;T.textContent=lbl;if(tr){B.style.transition=`transform ${s}s ease-in-out`;B.style.transform=tr}},t*1000));t+=s});
      tm.push(setTimeout(step,t*1000))};
    const clk=()=>{if(!on)return;const r=Math.max(0,Math.ceil((end-Date.now())/1000));C.textContent=`${Math.floor(r/60)}:${String(r%60).padStart(2,'0')}`;tm.push(setTimeout(clk,500))};
    step();clk()};
  addEventListener('hashchange',stop,{once:true});
};

window.vFuturo=()=>calcPage('Liberdade financeira','Quanto você precisa juntar para viver de renda e em quanto tempo chega lá.',
 `<div class="grid2">${fld('gasto','Gasto mensal desejado (R$)',25000)}${fld('tem','Já investido (R$)',300000)}${fld('aporte','Investe por mês (R$)',10000)}${fld('juros','Rendimento real ao ano (%, acima da inflação)',5)}${fld('saque','Taxa de retirada segura (%/ano)',4)}${fld('idade','Sua idade',38)}</div>`,
 v=>{const alvo=v.gasto*12/(v.saque/100),r=Math.pow(1+v.juros/100,1/12)-1;let s=v.tem,m=0;
  while(s<alvo&&m<720){s=s*(1+r)+v.aporte;m++}
  const ok=m<720;
  return R('Patrimônio necessário',brl(alvo),ok?`Você chega lá em ${f1(m/12,1)} anos, com ${f1(v.idade+m/12,0)} anos de idade.`:'Com esses números, não chega em 60 anos. Aumente o aporte.',
   [['Progresso hoje',f1(Math.min(100,v.tem/alvo*100),0)+'%'],['Renda passiva hoje',brl(v.tem*v.saque/100/12)+'/mês'],['Com +R$ 2 mil/mês de aporte',(()=>{let s2=v.tem,k=0;while(s2<alvo&&k<720){s2=s2*(1+r)+v.aporte+2000;k++}return k<720?f1(k/12,1)+' anos':'—'})()]])},
 'juros compostos em valores reais; regra dos 4% (Trinity Study). Não é recomendação de investimento');
