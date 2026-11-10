/* AXIS Tools — organização administrativa local. Não armazenar dados identificáveis de pacientes. */
(function(){
'use strict';
const today=()=>new Date().toLocaleDateString('sv-SE');
const storage=(key,def)=>{try{return JSON.parse(localStorage.getItem('axl_tools_'+key))||def}catch{return def}};
const save=(key,value)=>localStorage.setItem('axl_tools_'+key,JSON.stringify(value));
const clean=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const go=(id)=>location.hash='#/'+id;
const box=(title,sub)=>head(title,sub);
const link=(id,label,desc)=>'<a href="#/'+id+'" class="card" style="display:block;text-decoration:none;padding:22px;min-width:0"><b>'+label+'</b><p class="muted" style="margin:8px 0 0;font-size:14px">'+desc+'</p><span style="display:block;color:#2f6b4c;margin-top:14px;font-weight:700">Abrir →</span></a>';
window.axToolsHome=function(){
 main.innerHTML=box('AXIS Tools','Ferramentas práticas para ganhar tempo e controlar a rotina. Você continua usando as ferramentas já disponíveis no AXIS Lab.')+
 '<div class="card" style="background:#12362b;color:#f2ebdd;margin-bottom:20px"><div class="eyebrow" style="color:#a9d4bc">Seu espaço de trabalho</div><h2 style="color:#f2ebdd;margin:10px 0">Menos burocracia. Mais tempo para o que importa.</h2><p>Organização administrativa sem dados identificáveis de pacientes. Os dados de Check e Repasse ficam somente neste navegador.</p></div>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:44px">'+
 link('tools/check','Axis Check','Abertura, fechamento, tarefas e pendências recorrentes.')+
 link('tools/repasse','Axis Repasse','Registre valores previstos, recebidos e pendentes por local de trabalho.')+
 link('documentos','Axis Docs','Documentos, modelos editáveis e textos de apoio.')+
 link('calc','Axis Calc','Calculadoras clínicas com referências e limitações.')+
 link('vida/plantoes','Axis Plantão','Controle plantões, horas, valores e pagamentos.')+
 link('auditor','Axis Glosas','Organize glosas, recursos e valores pendentes.')+
 '</div><p class="hint">As ferramentas clínicas não substituem análise, revisão e responsabilidade profissional. Para dados sensíveis, utilize somente sistemas apropriados.</p></div>';
};
const defaults=[
 {name:'Abertura do consultório',tasks:['Verificar agenda e alterações','Conferir condições da recepção','Revisar materiais e suprimentos','Verificar mensagens administrativas pendentes']},
 {name:'Fechamento do consultório',tasks:['Revisar pendências do dia','Conferir registros financeiros administrativos','Organizar ambiente e equipamentos','Confirmar tarefas do próximo dia']},
 {name:'Rotina semanal',tasks:['Conferir pagamentos e repasses','Revisar documentos a vencer','Verificar estoque administrativo','Revisar pendências da equipe']}
];
window.axToolsCheck=function(){
 const data=storage('check',{groups:defaults.map((g,i)=>({id:'g'+i,name:g.name,tasks:g.tasks.map((t,j)=>({id:'t'+i+'-'+j,text:t,done:false}))})),date:today(),notes:[]});
 function reset(){if(data.date!==today()){data.groups.forEach(g=>g.tasks.forEach(t=>t.done=false));data.date=today();save('check',data)}}
 function render(){
  reset();let total=0,done=0;data.groups.forEach(g=>g.tasks.forEach(t=>{total++;if(t.done)done++}));
  main.innerHTML=box('Axis Check','Rotinas do consultório, com progresso diário e tarefas personalizáveis. Salvo somente neste aparelho.')+
  '<div class="card" style="margin-bottom:18px"><b>Progresso do dia: '+done+' de '+total+' tarefas</b><div class="prog" style="margin-top:10px"><i style="width:'+(total?done/total*100:0)+'%"></i></div><p class="muted" style="margin-top:10px;font-size:13px">Não inclua nomes, diagnósticos ou informações de pacientes.</p></div>'+
  data.groups.map((g,gi)=>'<section class="card" style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><h3>'+clean(g.name)+'</h3><button type="button" class="opt" data-add="'+gi+'">+ Tarefa</button></div><div class="ck" style="margin-top:12px">'+g.tasks.map((t,ti)=>'<label><input type="checkbox" data-check="'+gi+':'+ti+'" '+(t.done?'checked':'')+'><span>'+clean(t.text)+'</span><button type="button" aria-label="Excluir tarefa" data-remove="'+gi+':'+ti+'" style="margin-left:auto;border:0;background:transparent;cursor:pointer;font-size:18px">×</button></label>').join('')+'</div></section>').join('')+
  '<div class="card" style="margin-bottom:35px"><h3>Nova lista de verificação</h3><form id="check-group-form" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><input name="name" placeholder="Ex.: Rotina mensal" required maxlength="70" style="flex:1;min-width:190px"><button class="btn" type="submit">Criar lista</button></form><button type="button" class="opt" id="check-reset" style="margin-top:16px">Reiniciar marcações do dia</button></div></div>';
  main.querySelectorAll('[data-check]').forEach(el=>el.addEventListener('change',()=>{const [i,j]=el.dataset.check.split(':').map(Number);data.groups[i].tasks[j].done=el.checked;save('check',data);render()}));
  main.querySelectorAll('[data-add]').forEach(el=>el.addEventListener('click',()=>{const i=Number(el.dataset.add),value=prompt('Nome da tarefa (sem dados de pacientes):');if(value&&value.trim()){data.groups[i].tasks.push({id:String(Date.now()),text:value.trim().slice(0,160),done:false});save('check',data);render()}}));
  main.querySelectorAll('[data-remove]').forEach(el=>el.addEventListener('click',()=>{const [i,j]=el.dataset.remove.split(':').map(Number);data.groups[i].tasks.splice(j,1);save('check',data);render()}));
  main.querySelector('#check-group-form').addEventListener('submit',e=>{e.preventDefault();const name=e.target.elements.name.value.trim();if(!name)return;data.groups.push({id:String(Date.now()),name:name.slice(0,70),tasks:[]});save('check',data);render()});
  main.querySelector('#check-reset').addEventListener('click',()=>{if(confirm('Reiniciar todas as marcações de hoje?')){data.groups.forEach(g=>g.tasks.forEach(t=>t.done=false));save('check',data);render()}});
 }
 render();
};
window.axToolsRepasse=function(){
 const items=storage('repasse',[]);
 function draw(){
  const total=items.reduce((s,x)=>s+x.amount,0),paid=items.filter(x=>x.paid).reduce((s,x)=>s+x.amount,0);
  main.innerHTML=box('Axis Repasse','Controle pessoal dos honorários previstos e recebidos. Não cadastre informações de pacientes.')+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:18px">'+
  '<div class="card"><div class="muted">Total registrado</div><h2>'+money(total)+'</h2></div><div class="card"><div class="muted">Recebido</div><h2>'+money(paid)+'</h2></div><div class="card"><div class="muted">Pendente</div><h2>'+money(total-paid)+'</h2></div></div>'+
  '<form class="card form-sec" id="rep-form" style="margin-bottom:18px"><h3>Novo lançamento</h3><div class="grid2">'+
  '<div class="field"><label>Local de trabalho</label><input name="place" maxlength="90" required placeholder="Clínica ou hospital"></div>'+
  '<div class="field"><label>Data do serviço</label><input name="date" type="date" required value="'+today()+'"></div>'+
  '<div class="field"><label>Valor previsto (R$)</label><input name="amount" type="number" min="0.01" step="0.01" required></div>'+
  '<div class="field"><label>Previsão de pagamento</label><input name="due" type="date"></div></div>'+
  '<button class="btn" type="submit">Registrar repasse</button></form>'+
  '<div class="card" style="margin-bottom:40px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><h3>Lançamentos</h3><button class="opt" type="button" id="rep-export">Exportar CSV</button></div>'+
  (items.length?'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;margin-top:10px;text-align:left"><thead><tr><th>Local / data</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+items.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>'<tr style="border-top:1px solid #e4ddcf"><td style="padding:12px 8px">'+clean(x.place)+'<br><small>'+clean(x.date)+(x.due?' · Prev. '+clean(x.due):'')+'</small></td><td>'+money(x.amount)+'</td><td>'+(x.paid?'Recebido':'Pendente')+'</td><td><button class="opt" type="button" data-paid="'+x.id+'">'+(x.paid?'Desfazer':'Recebido')+'</button> <button class="opt" type="button" data-delete="'+x.id+'">Excluir</button></td></tr>').join('')+'</tbody></table></div>':'<p class="muted" style="margin-top:12px">Nenhum repasse cadastrado.</p>')+
  '<p class="hint" style="margin-top:12px">Armazenamento apenas neste navegador. Faça exportações periódicas; limpar os dados do navegador pode apagar os lançamentos.</p></div></div>';
  main.querySelector('#rep-form').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),amount=Number(f.get('amount'));if(!Number.isFinite(amount)||amount<=0)return;items.push({id:String(Date.now())+Math.random().toString(36).slice(2,6),place:String(f.get('place')).trim().slice(0,90),date:String(f.get('date')),due:String(f.get('due')||''),amount,paid:false});save('repasse',items);draw()});
  main.querySelectorAll('[data-paid]').forEach(el=>el.addEventListener('click',()=>{const x=items.find(t=>t.id===el.dataset.paid);if(x){x.paid=!x.paid;save('repasse',items);draw()}}));
  main.querySelectorAll('[data-delete]').forEach(el=>el.addEventListener('click',()=>{const ix=items.findIndex(t=>t.id===el.dataset.delete);if(ix>=0&&confirm('Excluir este lançamento?')){items.splice(ix,1);save('repasse',items);draw()}}));
  main.querySelector('#rep-export').addEventListener('click',()=>{const lines=[['Local','Data','Valor','Previsao','Status'],...items.map(x=>[x.place,x.date,x.amount.toFixed(2),x.due,x.paid?'Recebido':'Pendente'])];const csv='\uFEFF'+lines.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='axis-repasses.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
 }
 draw();
};
})();