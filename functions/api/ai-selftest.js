// Teste temporário do Whisper com áudios fixos do próprio site (sem entrada do usuário). Remover depois.
const b64 = (buf) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
export async function onRequestGet({ request, env }) {
  const out = {};
  for (const f of ['a.wav', 'a.webm', 'a.m4a']) {
    try {
      const buf = await (await env.ASSETS.fetch(new URL('/selftest/' + f, request.url))).arrayBuffer();
      const r = await env.AI.run('@cf/openai/whisper-large-v3-turbo', { audio: b64(buf), language: 'pt' });
      out[f] = r?.text || r;
    } catch (e) { out[f] = 'ERRO: ' + e.message; }
  }
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
}
