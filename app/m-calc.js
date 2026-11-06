/* Calculadoras clínicas (sem IA, funcionam offline). Fórmulas de referência citadas em cada tela. */
function calcPage(title, sub, fields, compute, ref){
  main.innerHTML=head(title,sub)+`<div class="split"><div class="form-col card form-sec">${fields}</div><aside class="res" id="cres" aria-live="polite"></aside></div><p class="hint" style="padding-bottom:40px">Referência: ${ref}. Ferramenta de apoio; a decisão clínica é do médico.</p></div>`;
  const run=()=>{const v={};main.querySelectorAll('[data-k]').forEach(i=>v[i.dataset.k]=i.type==='checkbox'?i.checked:(i.tagName==='SELECT'||i.type==='date'?i.value:num(i.value)));$('#cres').innerHTML=compute(v)};
  main.addEventListener('input',run);main.addEventListener('change',run);run();
}
const fld=(k,l,v='',extra='')=>`<div class="field"><label for="k-${k}">${l}</label><input id="k-${k}" data-k="${k}" inputmode="decimal" value="${v}" ${extra}></div>`;
const sel=(k,l,opts)=>`<div class="field"><label for="k-${k}">${l}</label><select id="k-${k}" data-k="${k}">${opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div>`;
const chk=(k,l)=>`<label class="chk"><input type="checkbox" data-k="${k}"> <span>${l}</span></label>`;
const R=(lbl,big,note,rows=[])=>`<div class="lbl">${lbl}</div><div class="big">${big}</div>${note?`<p class="note">${note}</p>`:''}<div>${rows.map(([a,b])=>`<div class="row"><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
const f1=(n,d=1)=>isFinite(n)?n.toLocaleString('pt-BR',{maximumFractionDigits:d,minimumFractionDigits:0}):'—';

window.cIMC=()=>calcPage('IMC e superfície corporal','Peso e altura do paciente.',
 `<div class="grid2">${fld('p','Peso (kg)',70)}${fld('a','Altura (cm)',170)}</div>`,
 v=>{const m=v.a/100,imc=v.p/(m*m),sc=Math.sqrt(v.a*v.p/3600);
  const c=imc<18.5?'Baixo peso':imc<25?'Eutrofia':imc<30?'Sobrepeso':imc<35?'Obesidade grau I':imc<40?'Obesidade grau II':'Obesidade grau III';
  const pmin=18.5*m*m,pmax=24.9*m*m;
  return R('IMC',f1(imc),c,[['Faixa de peso com IMC 18,5–24,9',`${f1(pmin,0)} a ${f1(pmax,0)} kg`],['Superfície corporal (Mosteller)',`${f1(sc,2)} m²`]])},
 'OMS (classificação do IMC); Mosteller, NEJM 1987');

window.cRenal=()=>calcPage('Função renal','Creatinina sérica, idade, sexo e peso.',
 `<div class="grid2">${fld('cr','Creatinina (mg/dL)',1)}${fld('id','Idade (anos)',60)}${fld('p','Peso (kg)',70)}${sel('s','Sexo',[['f','Feminino'],['m','Masculino']])}</div>`,
 v=>{const f=v.s==='f',k=f?.7:.9,a=f?-.241:-.302,r=v.cr/k;
  const ckd=142*Math.pow(Math.min(r,1),a)*Math.pow(Math.max(r,1),-1.2)*Math.pow(.9938,v.id)*(f?1.012:1);
  const cg=((140-v.id)*v.p)/(72*v.cr)*(f?.85:1);
  const st=ckd>=90?'G1':ckd>=60?'G2':ckd>=45?'G3a':ckd>=30?'G3b':ckd>=15?'G4':'G5';
  return R('TFGe CKD-EPI 2021',`${f1(ckd,0)}<span style="font-size:18px;opacity:.6"> mL/min/1,73m²</span>`,`Estágio KDIGO ${st}`,[['Clearance Cockcroft-Gault',`${f1(cg,0)} mL/min`]])},
 'CKD-EPI 2021 sem raça (Inker, NEJM 2021); Cockcroft-Gault (1976); KDIGO 2012');

window.cIG=()=>{const t=new Date().toISOString().slice(0,10);calcPage('Idade gestacional','Pela data da última menstruação ou por um ultrassom anterior.',
 `${sel('m','Calcular por',[['dum','DUM'],['usg','Ultrassom']])}<div class="grid2"><div class="field"><label for="k-d">Data (DUM ou do ultrassom)</label><input id="k-d" data-k="d" type="date" value="${t}"></div>${fld('sw','IG no ultrassom: semanas',0)}${fld('sd','IG no ultrassom: dias',0)}</div><p class="hint">Na opção DUM, os campos do ultrassom são ignorados.</p>`,
 v=>{if(!v.d)return R('Idade gestacional','—','Informe a data.');const d=new Date(v.d+'T12:00:00'),now=new Date();now.setHours(12,0,0,0);
  let dum=new Date(d);if(v.m==='usg')dum=new Date(d.getTime()-((v.sw*7)+v.sd)*864e5);
  const days=Math.round((now-dum)/864e5),dpp=new Date(dum.getTime()+280*864e5);
  if(days<0)return R('Idade gestacional','—','A data está no futuro.');
  const tri=days<14*7?'1º trimestre':days<28*7?'2º trimestre':'3º trimestre';
  return R('Idade gestacional hoje',`${Math.floor(days/7)}s ${days%7}d`,tri,[['Data provável do parto',dpp.toLocaleDateString('pt-BR')],['DUM considerada',dum.toLocaleDateString('pt-BR')],['Dias de gestação',days]])},
 'Regra de Naegele (DPP = DUM + 280 dias)')};

window.cDose=()=>calcPage('Dose por peso','Para qualquer medicamento: informe a dose de referência que você usa. A calculadora não sugere medicamento nem dose.',
 `<div class="grid2">${fld('p','Peso (kg)',20)}${fld('mgkg','Dose (mg/kg por dose)',10)}${fld('x','Doses por dia',3)}${fld('max','Dose máxima por dose (mg, opcional)',0)}${fld('conc','Concentração (mg/mL, opcional)',0)}</div>`,
 v=>{let dose=v.p*v.mgkg;const capped=v.max>0&&dose>v.max;if(capped)dose=v.max;const ml=v.conc>0?dose/v.conc:NaN;
  return R('Dose por tomada',`${f1(dose)} mg`,capped?'Limitada pela dose máxima informada.':'',[['Volume por tomada',isFinite(ml)?f1(ml,1)+' mL':'informe a concentração'],['Total por dia',`${f1(dose*v.x)} mg`]])},
 'cálculo aritmético a partir dos valores informados; confira sempre a bula e a literatura');

window.cEscores=()=>calcPage('Escores clínicos','Marque o que se aplica.',
 `${sel('e','Escore',[['cha','CHA₂DS₂-VASc (FA)'],['curb','CURB-65 (pneumonia)']])}
 <div data-sc="cha" class="form-sec">${chk('icc','Insuficiência cardíaca')}${chk('has','Hipertensão')}${chk('dm','Diabetes')}${chk('avc','AVC/AIT/tromboembolismo prévio (+2)')}${chk('vasc','Doença vascular')}${sel('ida','Idade',[['0','< 65'],['1','65–74'],['2','≥ 75']])}${sel('sx','Sexo',[['0','Masculino'],['1','Feminino']])}</div>
 <div data-sc="curb" class="form-sec">${chk('conf','Confusão mental')}${chk('ur','Ureia > 50 mg/dL (≈ BUN > 19)')}${chk('fr','FR ≥ 30 irpm')}${chk('pa','PAS < 90 ou PAD ≤ 60 mmHg')}${chk('i65','Idade ≥ 65 anos')}</div>`,
 v=>{main.querySelectorAll('[data-sc]').forEach(e=>e.hidden=e.dataset.sc!==v.e);
  if(v.e==='cha'){const s=(v.icc?1:0)+(v.has?1:0)+(v.dm?1:0)+(v.avc?2:0)+(v.vasc?1:0)+num(v.ida)+num(v.sx);
   return R('CHA₂DS₂-VASc',s,s===0?'Baixo risco':s===1?'Risco baixo a intermediário':'Risco aumentado de AVC',[['Pontos de sexo feminino',num(v.sx)?'incluídos (+1)':'—']])}
  const s=(v.conf?1:0)+(v.ur?1:0)+(v.fr?1:0)+(v.pa?1:0)+(v.i65?1:0);
  return R('CURB-65',s,s<=1?'Baixo risco (mortalidade ~1,5%)':s===2?'Risco intermediário (~9%)':'Alto risco (15–40%)')},
 'Lip et al., Chest 2010 (CHA₂DS₂-VASc); Lim et al., Thorax 2003 (CURB-65)');

window.cConv=()=>calcPage('Conversões de unidades','Digite o valor e escolha a conversão.',
 `<div class="grid2">${fld('v','Valor',100)}${sel('t','Conversão',[['gli','Glicose mg/dL → mmol/L'],['gli2','Glicose mmol/L → mg/dL'],['col','Colesterol mg/dL → mmol/L'],['tg','Triglicerídeos mg/dL → mmol/L'],['cr','Creatinina mg/dL → µmol/L'],['tc','Temperatura °C → °F'],['tf','Temperatura °F → °C'],['lb','Peso lb → kg']])}</div>`,
 v=>{const F={gli:[x=>x/18.016,'mmol/L'],gli2:[x=>x*18.016,'mg/dL'],col:[x=>x/38.67,'mmol/L'],tg:[x=>x/88.57,'mmol/L'],cr:[x=>x*88.42,'µmol/L'],tc:[x=>x*9/5+32,'°F'],tf:[x=>(x-32)*5/9,'°C'],lb:[x=>x*.4536,'kg']}[v.t];
  return R('Resultado',`${f1(F[0](v.v),2)} <span style="font-size:18px;opacity:.6">${F[1]}</span>`,'')},
 'fatores de conversão padrão (SI)');
