
// ===== carga, gravação e ações novas
async function loadAll_() {
  DB = {}; CHG = []; FILES = {}; WRITES = []; MAILS = [];
  await Promise.all(Object.keys(TAB).filter(n => n !== 'Log').map(async name => {
    const out = []; let from = 0;
    for (;;) {
      const { data, error } = await SB.from(TAB[name][0]).select('*').range(from, from + 999);
      if (error) throw new Error('banco: ' + error.message);
      data.forEach(r => out.push(norm_(name, r))); if (data.length < 1000) break; from += 1000;
    }
    DB[name] = out;
  }));
}
function row_(name, o) { const t = TAB[name][0], r = Object.assign({}, o); if (t === 'planner_arquivos') r.bytes = +r.bytes || 0; if (t === 'planner_log') delete r.id; return r; }
async function flush_() {
  for (let i = 0; i < CHG.length; i++) {
    const [op, name] = CHG[i], t = TAB[name][0]; let res;
    if (op === 'ins') { const batch = [row_(name, CHG[i][2])]; while (i + 1 < CHG.length && CHG[i + 1][0] === 'ins' && CHG[i + 1][1] === name) batch.push(row_(name, CHG[++i][2])); res = await SB.from(t).insert(batch); }
    else if (op === 'upd') { const p = row_(name, CHG[i][3]); if (t === 'planner_arquivos' && !('bytes' in CHG[i][3])) delete p.bytes; let q = SB.from(t).update(p); Object.entries(CHG[i][2]).forEach(([k, v]) => q = q.eq(k, v)); res = await q; }
    else { let q = SB.from(t).delete(); Object.entries(CHG[i][2]).forEach(([k, v]) => q = q.eq(k, v)); res = await q; }
    if (res.error) throw new Error('gravar ' + t + ': ' + res.error.message);
  }
  for (const [nome, content] of WRITES) {
    const { error } = await SB.storage.from(BUCKET).upload(nome, new Blob([content], { type: nome.endsWith('.json') ? 'application/json' : 'text/plain' }), { upsert: true });
    if (error) throw new Error('arquivo ' + nome + ': ' + error.message);
  }
  for (const m of MAILS) {
    try { await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + Deno.env.get('RESEND_API_KEY'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: Deno.env.get('MAIL_FROM') || 'Planner Revalle <onboarding@resend.dev>', to: [m.to], subject: m.subject, html: m.htmlBody, text: m.body }) }); } catch (e) {}
  }
}
async function fetchFile_(nome) {
  const { data, error } = await SB.storage.from(BUCKET).download(nome);
  if (error || !data) return false; FILES[nome] = await data.text(); return true;
}
const adminAtivo_ = () => (DB.Usuarios || []).some(u => u.perfil === 'admin' && u.status === 'ativo');

// registro da crítica (antes: Apps Script "Crítica do planner")
const CRIT_KEYS = ['id', 'v', 'u', 'code', 'gv', 'parecer'];
function critOut_(r) { return Object.assign({}, r.dados || {}, { id: r.id, v: r.v, u: r.u, code: r.code, gv: r.gv, parecer: r.parecer }); }
async function critRows_(filtro) {
  const out = []; let from = 0;
  for (;;) { let q = SB.from('planner_criticas').select('*'); Object.entries(filtro).forEach(([k, v]) => q = q.eq(k, v)); const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error('banco: ' + error.message); out.push(...data); if (data.length < 1000) break; from += 1000; }
  return out;
}
const pendente_ = p => !p || /^pendente$/i.test(p);
const ASYNC = {
  async 'crit.list'(b) { session(b, ['admin', 'logistica', 'gerente', 'gv', 'sns']); return { items: (await critRows_({ v: String(b.v || '') })).map(critOut_) }; },
  async 'crit.submit'(b) {
    session(b, ['admin', 'logistica', 'gerente', 'gv', 'sns']);
    const v = String(b.v || ''), gv = String(b.gv || '').trim(), units = (b.units || []).map(String); if (!v || !gv) throw new Error('Planner e nome do GV são obrigatórios');
    const atuais = (await critRows_({ v, gv })).filter(r => units.indexOf(r.u) >= 0), porK = new Map(atuais.map(r => [r.u + '|' + r.code, r]));
    let added = 0, updated = 0, removed = 0, kept = 0; const vistos = new Set(), agora = now();
    for (const it of (b.items || [])) {
      const u = String(it.u), code = String(it.code), k = u + '|' + code; vistos.add(k); const cur = porK.get(k);
      const dados = Object.assign({}, it); CRIT_KEYS.forEach(x => delete dados[x]); dados.upd = agora;
      if (cur && !pendente_(cur.parecer)) { kept++; continue; }
      if (cur) { const { error } = await SB.from('planner_criticas').update({ dados: Object.assign({}, cur.dados, dados, { em: (cur.dados || {}).em || agora }), parecer: it.parecer || cur.parecer || 'Pendente' }).eq('id', cur.id); if (error) throw new Error(error.message); updated++; }
      else { dados.em = dados.em || agora; const { error } = await SB.from('planner_criticas').insert({ id: uid('c'), v, u, code, gv, parecer: it.parecer || 'Pendente', dados }); if (error) throw new Error(error.message); added++; }
    }
    const tirar = atuais.filter(r => !vistos.has(r.u + '|' + r.code) && pendente_(r.parecer)).map(r => r.id);
    if (tirar.length) { const { error } = await SB.from('planner_criticas').delete().in('id', tirar); if (error) throw new Error(error.message); removed = tirar.length; }
    kept += atuais.filter(r => !vistos.has(r.u + '|' + r.code) && !pendente_(r.parecer)).length;
    return { added, updated, removed, kept };
  },
  async 'crit.parecer'(b) {
    const u = session(b, ['admin', 'logistica']); let n = 0;
    for (const p of (b.updates || [])) {
      const { data } = await SB.from('planner_criticas').select('dados').eq('id', String(p.id)).maybeSingle(); if (!data) continue;
      const { error } = await SB.from('planner_criticas').update({ parecer: String(p.parecer || 'Pendente'), dados: Object.assign({}, data.dados, { obs: String(p.obs || ''), parAt: now(), parPor: u.email }) }).eq('id', String(p.id));
      if (error) throw new Error(error.message); n++;
    }
    log(u.email, 'crit.parecer', n + ' parecer(es)'); return { updated: n };
  },
  // arquivos grandes: o navegador baixa direto do Storage por um link temporário
  async 'data.get'(b) {
    const u = session(b, ['admin', 'logistica', 'gerente', 'gv', 'sns']), nome = String(b.name || '');
    if (!adm_(u) && !(nome === 'index.json' || /^v\/[\w-]+\.json$/.test(nome) || /^rotina\/(estado\.gz|meta\.json|ls\.json)$/.test(nome) || /^rel\/(index\.json|coord\/\d+\.json)$/.test(nome) || nome === 'janelas/ajustes-hist.json')) throw new Error('Sem permissão para este arquivo');
    const a = fileRow(nome); if (!a) throw new Error('not_found: ' + nome);
    const { data, error } = await SB.storage.from(BUCKET).createSignedUrl(nome, 120); if (error) throw new Error('not_found: ' + nome);
    return { url: data.signedUrl, atualizado: a.atualizado };
  },
  async 'link.get'(b) { await fetchFile_('index.json'); const n = String(b.name || ''); if (/^v\/[\w-]+\.json$/.test(n)) await fetchFile_(n); return linkView(b.k, n); },
  // migração (uma vez): a planilha e os arquivos do sistema antigo entram aqui
  async 'import.usuarios'(b) {
    if (adminAtivo_()) throw new Error('Já existem usuários: entre como administrador para continuar a migração');
    (b.rows || []).forEach(r => append('Usuarios', r)); return { n: (b.rows || []).length };
  },
  async 'import.rows'(b) {
    session(b, ['admin']); const name = String(b.sheet || ''); if (!TAB[name] || name === 'Usuarios') throw new Error('Aba inválida');
    if (b.limpar) { const { error } = await SB.from(TAB[name][0]).delete().neq(name === 'Log' ? 'acao' : TAB[name][1][0], '\u0000'); if (error) throw new Error(error.message); DB[name] = []; }
    (b.rows || []).forEach(r => append(name, r)); return { n: (b.rows || []).length };
  },
  async 'import.file'(b) {
    const u = session(b, ['admin']); const nome = String(b.name || ''); if (!/^[\w\-./]+$/.test(nome) || nome.indexOf('..') >= 0) throw new Error('Nome de arquivo inválido');
    const content = String(b.content == null ? '' : b.content); WRITES.push([nome, content]);
    const a = fileRow(nome), m = { atualizado: String(b.atualizado || now()), por: String(b.por || u.email), bytes: content.length };
    if (a) update('Arquivos', a._row, m); else append('Arquivos', Object.assign({ nome, file_id: '' }, m)); return { nome, bytes: content.length };
  },
  async 'import.crit'(b) {
    session(b, ['admin']); const v = String(b.v || ''); const its = b.items || [];
    if (b.limpar) await SB.from('planner_criticas').delete().eq('v', v);
    const recs = its.map(it => { const dados = Object.assign({}, it); CRIT_KEYS.forEach(x => delete dados[x]);
      return { id: String(it.id || uid('c')), v, u: String(it.u), code: String(it.code), gv: String(it.gv || ''), parecer: String(it.parecer || 'Pendente'), dados }; });
    for (let i = 0; i < recs.length; i += 500) { const { error } = await SB.from('planner_criticas').upsert(recs.slice(i, i + 500)); if (error) throw new Error(error.message); }
    return { n: recs.length };
  }
};

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' };
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = o => new Response(JSON.stringify(o), { headers: Object.assign({ 'Content-Type': 'application/json' }, CORS) });
  if (req.method !== 'POST') return json({ ok: true, app: 'planner-revalle', banco: !!chave_() });
  let res;
  try {
    const b = JSON.parse(await req.text() || '{}');
    await loadAll_();
    const fa = ASYNC[b.action], fn = ACTIONS[b.action];
    if (!fa && !fn) throw new Error('ação desconhecida');
    res = (fa ? await fa(b) : fn(b)) || {};
    await flush_(); res.ok = true;
  } catch (err) { res = { ok: false, error: String(err && err.message || err) }; }
  return json(res);
});
