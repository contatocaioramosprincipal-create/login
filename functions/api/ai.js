import { serverEvent } from './t.js';
// IA da AXIS Lab: Cloudflare Workers AI (binding "AI"). Exige login. Limite diário por usuário (D1).
// Nada do que o médico envia é guardado: só contamos o uso.
const J = (s, b) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const LLM = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const STT = '@cf/openai/whisper-large-v3-turbo';
const LIMIT = 60;
const c = (v, n = 6000) => String(v ?? '').trim().slice(0, n);

const BASE = 'Você é o assistente da AXIS Lab para médicos brasileiros. Responda em português do Brasil, direto e prático, sem enrolação e sem repetir a pergunta. Use listas curtas e negrito só no essencial. Se não tiver certeza ou faltar informação, diga claramente "não sei" ou o que falta, nunca invente dados, doses, leis ou referências. A decisão final é sempre do médico.';

const T = {
  stt: {},
  consulta: {
    sys: 'Você transforma a transcrição de uma consulta médica em documentação. Use só o que foi dito; o que não foi dito, deixe como "não informado". Não invente exames, doses nem diagnósticos.',
    user: (b) => `Especialidade: ${c(b.especialidade, 80)}\nTranscrição da consulta:\n${c(b.texto, 14000)}\n\nEntregue, nesta ordem e com estes títulos:\n## Evolução (SOAP)\nS, O, A e P em tópicos curtos.\n## Orientações ao paciente\nLinguagem simples, em segunda pessoa, pronta para enviar.\n## Documentos sugeridos\nSó os que a conversa indica (atestado, pedido de exame, encaminhamento, receita), cada um com uma linha do que deve conter.\n## Pontos de atenção\nO que ficou em aberto ou precisa ser confirmado.`,
    max: 1400,
  },
  doc: {
    sys: 'Você redige documentos médicos formais no padrão brasileiro. Deixe entre colchetes o que o médico precisa completar, como [nome do paciente]. Não inclua CID se não for informado. Não inclua assinatura, ela é colocada depois.',
    user: (b) => `Documento: ${c(b.tipo, 80)}\nEspecialidade: ${c(b.especialidade, 80)}\nContexto dado pelo médico:\n${c(b.contexto, 3000)}\n\nEscreva apenas o texto do documento.`,
    max: 900,
  },
  query: {
    sys: 'Você traduz temas médicos para termos de busca do PubMed. Responda só com 1 a 4 termos em inglês, separados por " AND ", sem tags, aspas, parênteses nem explicação. Exemplo: heart failure AND SGLT2 inhibitors',
    user: (b) => `Tema: ${c(b.tema, 200) || c(b.especialidade, 80)}${b.tema ? ` (especialidade: ${c(b.especialidade, 80)})` : ''}`,
    max: 40,
  },
  radar: {
    sys: 'Você resume literatura médica recente para um médico ocupado. Use só os resumos fornecidos; não acrescente estudos.',
    user: (b) => `Especialidade: ${c(b.especialidade, 80)}\nResumos (PubMed):\n${c(b.texto, 16000)}\n\nPara cada estudo relevante: **título traduzido** (revista, ano), o que encontrou em 1 a 2 linhas e "Na prática:" com o impacto no consultório. Termine com "Em uma frase:" resumindo a semana. Ignore estudos sem relevância clínica.`,
    max: 1400,
  },
  artigo: {
    sys: 'Você faz leitura crítica de artigos médicos. Use só o texto fornecido.',
    user: (b) => `Artigo:\n${c(b.texto, 16000)}\n\nEntregue: ## Pergunta do estudo  ## Desenho e população  ## Principais resultados (com números)  ## Limitações  ## Na prática (o que muda no consultório)  ## Nível de evidência (alto, moderado ou baixo, com o motivo).`,
    max: 1200,
  },
  revisao: {
    sys: 'Você é um preceptor que prepara revisões rápidas para provas e títulos de especialista. Se o tema for amplo demais, foque no que mais cai.',
    user: (b) => `Tema: ${c(b.tema, 300)}\nNível: ${c(b.nivel, 60)}\n\nEntregue: ## Resumo em tópicos (o essencial)  ## 5 questões de múltipla escolha (A a D) com gabarito comentado no final  ## Pegadinhas comuns.`,
    max: 1600,
  },
  glosas: {
    sys: 'Você é auditor de faturamento médico de convênios no Brasil (TISS/TUSS). Use só os dados fornecidos. Valores devem vir do texto, nunca estimados sem avisar.',
    user: (b) => `Demonstrativo ou lista de glosas:\n${c(b.texto, 14000)}\n\nEntregue: ## Resumo (total glosado, quantos itens, convênio se aparecer)  ## Glosas por motivo (tabela simples: motivo, itens, valor, chance de reverter: alta, média ou baixa)  ## O que corrigir para não repetir  ## Recurso de glosa pronto (texto formal para o item de maior valor, com campos entre colchetes).`,
    max: 1600,
  },
  posts: {
    sys: 'Você é estrategista de conteúdo para médicos e segue a Resolução CFM 2.336/2023: nada de promessa de resultado, sensacionalismo, preço como chamariz ou antes e depois sem finalidade educativa.',
    user: (b) => `Especialidade: ${c(b.especialidade, 80)}\nCidade: ${c(b.cidade, 80)}\nPedido: ${c(b.pedido, 800)}\nFormato: ${c(b.formato, 60)}\n\nEntregue 5 ideias. Para cada uma: **título/gancho**, roteiro em 4 a 6 tópicos (ou texto dos slides), legenda curta e chamada para ação permitida.`,
    max: 1600,
  },
  cfm: {
    sys: 'Você revisa publicidade médica pela Resolução CFM 2.336/2023 e pelo Código de Ética Médica. Verifique um por um: (1) promessa ou garantia de resultado; (2) preço, desconto, promoção, sorteio ou condição de pagamento usados como chamariz (proibido); (3) antes e depois fora do contexto educativo, sem identificação e sem explicar que resultados variam; (4) sensacionalismo, superlativos ("o melhor", "incrível", "revolucionário") e autopromoção; (5) falta de nome, CRM e RQE quando cita especialidade; (6) exposição de paciente identificável; (7) técnica sem reconhecimento científico. A versão ajustada não pode conter nenhum desses itens. Seja objetivo; se algo depende de interpretação, diga.',
    user: (b) => `Texto do post/anúncio:\n${c(b.texto, 4000)}\n\nEntregue: ## Veredito (Pode publicar, Ajustar ou Não publicar)  ## Pontos de risco (trecho, motivo e regra)  ## Versão ajustada pronta para publicar.`,
    max: 1000,
  },
  aval: {
    sys: 'Você responde avaliações públicas (Google, Doctoralia) em nome de um consultório médico. Regra absoluta: nunca confirmar que a pessoa é paciente, nunca citar diagnóstico, tratamento ou detalhes do atendimento (sigilo e LGPD). Tom educado, curto, humano.',
    user: (b) => `Avaliação recebida (${c(b.nota, 10)} estrelas):\n${c(b.texto, 2000)}\nTom desejado: ${c(b.tom, 60)}\n\nEscreva 2 opções de resposta, cada uma com até 4 linhas. Se for negativa, convide para conversar por canal privado.`,
    max: 600,
  },
  treino: {
    sys: 'Você faz role-play de treinamento para secretárias de consultório médico. Você interpreta o paciente descrito no cenário, com mensagens curtas como no WhatsApp. Não saia do personagem, a não ser quando a secretária escrever "FIM": aí dê uma nota de 0 a 10 e 3 dicas objetivas de melhoria.',
    chat: true,
    max: 400,
  },
  msg: {
    sys: 'Você escreve mensagens de WhatsApp para consultórios médicos: claras, empáticas, curtas, sem dados clínicos desnecessários.',
    user: (b) => `Situação: ${c(b.situacao, 1500)}\nTom: ${c(b.tom, 60)}\n\nEscreva 2 versões (uma mais curta), prontas para copiar. Use [colchetes] para o que precisa ser preenchido.`,
    max: 600,
  },
  posso: {
    sys: 'Você orienta médicos brasileiros sobre regras do CFM (Res. 2.336/2023 de publicidade, Código de Ética Médica, Res. 2.314/2022 de telemedicina), LGPD e CDC. Cite a norma quando souber; se não souber ao certo, diga que não sabe. Termine sempre lembrando que não substitui um advogado.',
    user: (b) => `Pergunta: ${c(b.pergunta, 1500)}\n\nResponda: ## Resposta curta (Pode, Não pode ou Depende)  ## Por quê (com a norma)  ## Como fazer de forma segura.`,
    max: 800,
  },
  cardapio: {
    sys: 'Você é um nutricionista prático que monta cardápios simples para médicos com rotina corrida e plantões. Nada de dietas extremas. Se houver condição de saúde citada, recomende acompanhamento com nutricionista.',
    user: (b) => `Objetivo: ${c(b.objetivo, 200)}\nRotina: ${c(b.rotina, 400)}\nRestrições/preferências: ${c(b.restricoes, 300)}\n\nEntregue: ## Dia normal (café, almoço, lanche, jantar)  ## Dia de plantão (o que levar na bolsa e o que comer de madrugada)  ## Lista de compras da semana.`,
    max: 1100,
  },
  fisico: {
    sys: 'Você é um treinador que monta planos simples e seguros para médicos com pouco tempo. Progressão gradual. Se a pessoa citar dor ou condição, recomende avaliação antes.',
    user: (b) => `Modalidade: ${c(b.modalidade, 60)}\nNível: ${c(b.nivel, 60)}\nObjetivo: ${c(b.objetivo, 200)}\nDias e tempo disponíveis: ${c(b.dias, 120)}\n\nEntregue um plano de 4 semanas em tabela por semana (dia, treino, duração), mais 3 regras para ajustar em semana de plantão.`,
    max: 1200,
  },
};

function readCookie(req) { const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)axl_s=([a-f0-9]{64})/); return m ? m[1] : null; }

async function llm(env, sys, msgs, max) {
  const r = await env.AI.run(LLM, { messages: [{ role: 'system', content: BASE + '\n' + sys }, ...msgs], max_tokens: max, temperature: 0.3 });
  return (r && (r.response ?? r.result?.response) || '').trim();
}

async function pubmed(term) {
  const E = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  const search = async (q) => (await fetch(`${E}esearch.fcgi?db=pubmed&retmode=json&retmax=6&sort=relevance&term=${encodeURIComponent(q)}&tool=axislab`).then((r) => r.json()))?.esearchresult?.idlist || [];
  const recent = ` AND ("last 90 days"[dp]) AND hasabstract`;
  let ids = await search(`(${term}) AND (randomized controlled trial[pt] OR meta-analysis[pt] OR systematic review[pt] OR guideline[pt])` + recent);
  if (ids.length < 3) ids = [...new Set([...ids, ...await search(`(${term})` + recent)])].slice(0, 6);
  if (!ids.length) return { ids, text: '' };
  const text = await fetch(`${E}efetch.fcgi?db=pubmed&rettype=abstract&retmode=text&id=${ids.join(',')}&tool=axislab`).then((r) => r.text());
  return { ids, text };
}

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  if (!db) return J(503, { ok: false, error: 'Serviço indisponível.' });
  if (!env.AI) return J(503, { ok: false, error: 'A IA está sendo ativada. Tente de novo em alguns minutos.' });
  const t = readCookie(request);
  const u = t && await db.prepare('SELECT u.id, u.especialidade, u.cidade FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?').bind(t, new Date().toISOString()).first();
  if (!u) return J(401, { ok: false, error: 'Entre na sua conta para usar a IA.' });

  let b; try { b = await request.json(); } catch { return J(400, { ok: false, error: 'Dados inválidos.' }); }
  const task = String(b.task || '');
  if (!T[task] || task === 'query') return J(400, { ok: false, error: 'Ferramenta desconhecida.' });
  await db.prepare('CREATE TABLE IF NOT EXISTS ai_usage (user_id INTEGER, day TEXT, n INTEGER, PRIMARY KEY (user_id, day))').run();
  if (task === 'stt') { // trecho de até ~30 s de áudio (WAV 16 kHz) -> texto
    const a = String(b.audio || '').replace(/^data:[^,]+,/, '');
    if (!a || a.length > 3e6) return J(413, { ok: false, error: 'Trecho de áudio inválido.' });
    const k = 'stt:' + new Date().toISOString().slice(0, 10);
    const r0 = await db.prepare('SELECT n FROM ai_usage WHERE user_id = ? AND day = ?').bind(u.id, k).first();
    if (r0 && r0.n >= 400) return J(429, { ok: false, error: 'Limite diário de gravação atingido. Amanhã libera de novo.' });
    await db.prepare('INSERT INTO ai_usage (user_id, day, n) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET n = n + 1').bind(u.id, k).run();
    try { const s = await env.AI.run(STT, { audio: a, language: 'pt' }); await serverEvent(env, request, u.id, 'ai', { task: 'stt', ok: 1 }); return J(200, { ok: true, text: (s?.text || '').trim() }); }
    catch { return J(502, { ok: false, error: 'Não consegui transcrever agora. Tente de novo.' }); }
  }
  b.especialidade = b.especialidade || u.especialidade; b.cidade = b.cidade || u.cidade;

  await db.prepare('CREATE TABLE IF NOT EXISTS ai_usage (user_id INTEGER, day TEXT, n INTEGER, PRIMARY KEY (user_id, day))').run();
  const day = new Date().toISOString().slice(0, 10);
  const row = await db.prepare('SELECT n FROM ai_usage WHERE user_id = ? AND day = ?').bind(u.id, day).first();
  if (row && row.n >= LIMIT) return J(429, { ok: false, error: `Você usou as ${LIMIT} gerações de hoje. Amanhã libera de novo.` });
  await db.prepare('INSERT INTO ai_usage (user_id, day, n) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET n = n + 1').bind(u.id, day).run();

  const t0 = Date.now();
  try {
    const def = T[task];
    const out = { ok: true };
    if (task === 'consulta' && b.audio) {
      const a = String(b.audio).replace(/^data:[^,]+,/, '');
      if (a.length > 25e6) return J(413, { ok: false, error: 'Áudio longo demais. Grave em partes de até 20 minutos.' });
      const s = await env.AI.run(STT, { audio: a, language: 'pt' });
      b.texto = (s?.text || '').trim();
      if (!b.texto) return J(422, { ok: false, error: 'Não consegui entender o áudio. Tente gravar mais perto do microfone.' });
      out.transcricao = b.texto;
    }
    if (task === 'radar') {
      const term = (await llm(env, T.query.sys, [{ role: 'user', content: T.query.user(b) }], T.query.max)).replace(/["'`()\[\]]/g, '').split('\n')[0].trim();
      const p = await pubmed(term);
      if (!p.ids.length) return J(200, { ok: true, text: `Não encontrei estudos dos últimos 90 dias para essa busca (${term}). Tente um tema mais amplo.` });
      b.texto = p.text; out.links = p.ids.map((id) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`); out.busca = term;
    }
    let text;
    if (def.chat) {
      const hist = (Array.isArray(b.msgs) ? b.msgs : []).slice(-16).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: c(m.content, 800) }));
      text = await llm(env, def.sys + `\nCenário: ${c(b.cenario, 600)}`, hist.length ? hist : [{ role: 'user', content: 'Comece a conversa como o paciente.' }], def.max);
    } else {
      if (!c(b.texto || b.contexto || b.tema || b.pergunta || b.situacao || b.pedido || b.objetivo || b.modalidade, 10)) return J(400, { ok: false, error: 'Preencha o campo principal.' });
      text = await llm(env, def.sys, [{ role: 'user', content: def.user(b) }], def.max);
    }
    if (!text) throw new Error('vazio');
    out.text = text;
    await serverEvent(env, request, u.id, 'ai', { task, ok: 1, ms: Date.now() - t0 });
    return J(200, out);
  } catch (e) {
    await serverEvent(env, request, u.id, 'ai', { task, ok: 0 });
    return J(502, { ok: false, error: 'A IA não respondeu agora. Tente de novo em instantes.' });
  }
}
