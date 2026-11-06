/* Financeiro: meta do mês, PF x PJ, reajuste, equipamento (usa calcPage/fld/sel/chk/R de m-calc.js) */
const BR=n=>brl(n);

window.fMeta=()=>calcPage('Meta do mês','Quanto falta para bater o faturamento do mês e quantas consultas por dia isso exige.',
 `<div class="grid2">${fld('meta','Meta de faturamento (R$)',40000)}${fld('feito','Já faturado no mês (R$)',18000)}${fld('ticket','Valor médio por atendimento (R$)',300)}${fld('dias','Dias de atendimento que faltam',10)}${fld('faltas','Faltas esperadas (%)',10)}</div>`,
 v=>{const falta=Math.max(0,v.meta-v.feito),cons=v.ticket>0?falta/v.ticket:NaN,agend=cons/(1-v.faltas/100);
  return R('Consultas que faltam',isFinite(cons)?Math.ceil(cons):'—',falta===0?'Meta batida. Parabéns!':`Faltam ${BR(falta)} para a meta.`,
  [['Agendar (contando faltas)',isFinite(agend)?Math.ceil(agend):'—'],['Por dia de atendimento',v.dias>0&&isFinite(agend)?f1(agend/v.dias,1):'—'],['Progresso',v.meta>0?f1(Math.min(100,v.feito/v.meta*100),0)+'%':'—']])},
 'cálculo simples a partir dos seus números');

/* IRPF mensal (tabela vigente desde mai/2025) + redutor da Lei 15.270/2025 (a partir de 2026) */
function irpfMensal(base,redutor){
  const T=[[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]];
  const [,a,d]=T.find(t=>base<=t[0]);let ir=Math.max(0,base*a-d);
  if(redutor){if(base<=5000)ir=0;else if(base<=7350)ir=Math.max(0,ir-(978.62-0.133145*base))}
  return ir;
}
function simplesIII(rbt12){
  const F=[[180000,.06,0],[360000,.112,9360],[720000,.135,17640],[1800000,.16,35640],[3600000,.21,125640],[4800000,.33,648000]];
  const [,a,d]=F.find(f=>rbt12<=f[0])||F[5];return rbt12>0?(rbt12*a-d)/rbt12:0;
}
window.fPFPJ=()=>calcPage('PF ou PJ: quanto você pagaria','Estimativa simplificada para comparar formatos. Confirme sempre com o seu contador.',
 `<div class="grid2">${fld('fat','Faturamento mensal (R$)',30000)}${fld('desp','Despesas do consultório (R$/mês)',8000)}${fld('iss','ISS do município (%)',3)}${fld('cont','Contador no PJ (R$/mês)',600)}</div>${chk('red','Aplicar redutor do IR de 2026 (Lei 15.270/2025)')}`,
 v=>{
  const teto=8475.55,inssPF=Math.min(v.fat-v.desp,teto)*.2;
  const basePF=Math.max(0,v.fat-v.desp-inssPF);const irPF=irpfMensal(basePF,v.red);const issPF=0;
  const liqPF=v.fat-v.desp-inssPF-irPF-issPF;
  // Simples Anexo III com Fator R (pró-labore = 28% do faturamento)
  const pro=v.fat*.28,inssPro=Math.min(pro,teto)*.11,irPro=irpfMensal(pro-inssPro,v.red);
  const das=v.fat*simplesIII(v.fat*12);
  const liqSN=v.fat-v.desp-das-inssPro-irPro-v.cont;
  // Lucro presumido (serviços): IRPJ+CSLL sobre 32%, PIS 0,65%, COFINS 3%, ISS
  const pres=v.fat*.32,irpj=pres*.15+Math.max(0,pres-20000)*.10,csll=pres*.09,pc=v.fat*.0365,iss=v.fat*v.iss/100;
  const proLP=1621,cpp=proLP*.2,inssLP=proLP*.11;
  const liqLP=v.fat-v.desp-irpj-csll-pc-iss-cpp-inssLP-v.cont;
  const L=[['Pessoa física (carnê-leão)',liqPF],['PJ Simples (Anexo III, Fator R)',liqSN],['PJ Lucro Presumido',liqLP]].sort((a,b)=>b[1]-a[1]);
  return R('Formato com mais dinheiro no bolso',L[0][0],`Diferença para o segundo: ${BR(L[0][1]-L[1][1])} por mês`,L.map(([n,x])=>[n,BR(x)+'/mês']))
   +`<p class="note">Premissas: PF com livro-caixa e INSS 20% até o teto; Simples com pró-labore de 28% (Fator R) e alíquota efetiva do Anexo III; Presumido com pró-labore de um salário mínimo e ISS informado. Lucros acima de R$ 50 mil/mês distribuídos podem ter retenção de 10% a partir de 2026. Não considera ISS fixo de sociedade uniprofissional.</p>`},
 'tabela mensal do IRPF (mai/2025), Lei 15.270/2025, LC 123/2006 (Anexo III); valores aproximados');

window.fReajuste=()=>calcPage('Simulador de reajuste','Quanto você ganha subindo o valor da consulta, mesmo que alguns pacientes não fiquem.',
 `<div class="grid2">${fld('p0','Valor atual (R$)',350)}${fld('p1','Novo valor (R$)',420)}${fld('n','Consultas particulares por mês',80)}${fld('perda','Pacientes que podem sair (%)',10)}</div>`,
 v=>{const f0=v.p0*v.n,n1=v.n*(1-v.perda/100),f1v=v.p1*n1,emp=v.p1>0?(1-v.p0/v.p1)*100:NaN;
  return R('Diferença no mês',(f1v-f0>=0?'+':'')+BR(f1v-f0),`Você só perde dinheiro se mais de ${f1(emp,0)}% dos pacientes saírem.`,[['Hoje',BR(f0)],['Depois do reajuste',BR(f1v)],['Consultas depois',f1(n1,0)],['No ano',BR((f1v-f0)*12)]])},
 'cálculo de elasticidade simples');

window.fEquip=()=>calcPage('Vale a pena comprar o equipamento?','Em quanto tempo ele se paga.',
 `<div class="grid2">${fld('custo','Valor do equipamento (R$)',60000)}${fld('preco','Cobrado por procedimento (R$)',400)}${fld('var','Custo por procedimento (R$)',60)}${fld('n','Procedimentos por mês',15)}${fld('fixo','Custo fixo mensal (manutenção etc.)',300)}</div>`,
 v=>{const mc=(v.preco-v.var)*v.n-v.fixo,meses=mc>0?v.custo/mc:Infinity,proc=v.preco-v.var>0?Math.ceil(v.custo/(v.preco-v.var)):NaN;
  return R('Tempo para se pagar',isFinite(meses)?`${f1(meses,1)} meses`:'não se paga',mc>0?`Depois disso, sobra ${BR(mc)} por mês.`:'A margem mensal não cobre os custos.',[['Procedimentos para pagar',isFinite(proc)?proc:'—'],['Margem por procedimento',BR(v.preco-v.var)],['Lucro em 3 anos',BR(mc*36-v.custo)]])},
 'payback simples, sem juros');
