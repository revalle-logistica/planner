// ===== Planner Revalle · API no Supabase (Edge Function "api") =====
// Gerado por supabase/build-api.py: este arquivo junta (1) esta camada de adaptação, (2) o apps-script/Code.gs sem mudanças
// e (3) as ações novas. As abas da planilha viram tabelas e os arquivos do Drive viram o bucket privado "dados".
import { createClient } from 'npm:@supabase/supabase-js@2';
function chave_() {
  const k = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (k) return k;
  const s = Deno.env.get('SUPABASE_SECRET_KEYS') || ''; try { const j = JSON.parse(s); return typeof j === 'string' ? j : (j.default || Object.values(j)[0]); } catch (e) { return s; }
}
const SB = createClient(Deno.env.get('SUPABASE_URL'), chave_(), { auth: { persistSession: false } });
const BUCKET = 'dados';
const TAB = { Usuarios: ['usuarios', ['email']], Sessoes: ['sessoes', ['token']], Equipes: ['equipes', ['unb', 'setor']], Links: ['links', ['token']],
  Arquivos: ['arquivos', ['nome']], Notas: ['notas', ['id']], SnsVinculo: ['sns_vinculo', ['sns_email']], PedidosSNS: ['pedidos_sns', ['id']], Log: ['log', null] };
let DB = {}, CHG = [], FILES = {}, WRITES = [], MAILS = [];

// ---- SHA-256 síncrono (mesmo resultado do Utilities.computeDigest do Apps Script, para as senhas continuarem valendo)
function sha256(bytes) {
  const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n); m.set(bytes); m[l] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(n - 4, l * 8); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
  const w = new Uint32Array(64);
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3), s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7)), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10)), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = new Uint8Array(32), ov = new DataView(out.buffer); H.forEach((x, i) => ov.setUint32(i * 4, x)); return out;
}
const TE = new TextEncoder();
const Utilities = {
  DigestAlgorithm: { SHA_256: 'SHA_256' },
  computeDigest: (_alg, s) => sha256(TE.encode(String(s))),
  base64Encode: (b) => { let s = ''; for (const x of b) s += String.fromCharCode(x & 255); return btoa(s); },
  getUuid: () => crypto.randomUUID()
};
const LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
const CacheService = { getScriptCache: () => ({ get: () => null, put() {} }) };
const MailApp = { sendEmail(o) { if (!Deno.env.get('RESEND_API_KEY')) throw new Error('envio de e-mail ainda não configurado'); MAILS.push(o); } };
const Session = { getEffectiveUser: () => ({ getEmail: () => '' }) };
const PropertiesService = { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) };

// ===== apps-script/Code.gs (sem mudanças)
/* Planner Revalle — Sistema (login, equipes, links dos vendedores e dados no Drive)
   Projeto do Apps Script na conta Log Agreste. Implantar como App da Web:
   Executar como: Eu · Quem pode acessar: Qualquer pessoa.
   Planilha "Planner Revalle - Sistema" e pasta "Planner Revalle - Dados" são criadas sozinhas no 1º uso (rode setup() uma vez).
   Todas as chamadas: POST (text/plain) com JSON {action, token?, ...}. Resposta: {ok:true,...} ou {ok:false,error}. */

const SS_NAME = 'Planner Revalle - Sistema';
const FOLDER_NAME = 'Planner Revalle - Dados';
const SESSION_DAYS = 30;
const SHEETS = {
  Usuarios: ['email', 'nome', 'area', 'perfil', 'status', 'salt', 'hash', 'criado', 'aprovado_por', 'aprovado_em', 'ultimo_acesso'],
  Sessoes: ['token', 'email', 'expira'],
  Equipes: ['unb', 'setor', 'gv_email', 'atualizado'],
  Links: ['token', 'unb', 'setor', 'ativo', 'criado_por', 'criado_em', 'desativado_em'],
  Arquivos: ['nome', 'file_id', 'atualizado', 'por', 'bytes'],
  Log: ['quando', 'email', 'acao', 'detalhe'],
  Notas: ['id', 'tipo', 'unidade', 'planner', 'pdv', 'setor', 'texto', 'status', 'autor', 'autor_nome', 'criado', 'atualizado', 'excluida', 'categoria', 'regiao'],
  SnsVinculo: ['sns_email', 'gvs', 'revenda', 'atualizado'],
  PedidosSNS: ['id', 'v', 'unb', 'un', 'code', 'sns_email', 'sns_nome', 'item', 'status', 'gv_email', 'gv_nome', 'gv_obs', 'gv_em', 'criado', 'atualizado']
};

// ---------- infraestrutura
function props() { return PropertiesService.getScriptProperties(); }
function ss__gs() {
  const id = props().getProperty('SS_ID');
  if (id) return SpreadsheetApp.openById(id);
  const s = SpreadsheetApp.create(SS_NAME);
  props().setProperty('SS_ID', s.getId());
  return s;
}
function folder__gs() {
  const id = props().getProperty('FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  const f = DriveApp.createFolder(FOLDER_NAME);
  props().setProperty('FOLDER_ID', f.getId());
  return f;
}
/** Rode uma vez pelo editor para autorizar e criar a planilha e a pasta. */
function setup() {
  const s = ss(); folder();
  Object.keys(SHEETS).forEach(sh);
  const first = s.getSheetByName('Página1') || s.getSheetByName('Sheet1') || s.getSheetByName('Planilha1');
  if (first && s.getSheets().length > 1) s.deleteSheet(first);
  Logger.log('Planilha: ' + s.getUrl());
  Logger.log('Pasta: ' + folder().getUrl());
}
function sh(name) {
  const s = ss(); let x = s.getSheetByName(name);
  if (!x) {
    x = s.insertSheet(name);
    x.getRange(1, 1, x.getMaxRows(), SHEETS[name].length).setNumberFormat('@'); // tudo texto: preserva zeros à esquerda
    x.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold');
    x.setFrozenRows(1);
  }
  return x;
}
function rows__gs(name) {
  const v = sh(name).getDataRange().getValues(); const h = v.shift() || SHEETS[name];
  return v.map((r, i) => { const o = { _row: i + 2 }; h.forEach((k, j) => o[k] = String(r[j] == null ? '' : r[j])); return o; })
    .filter(o => Object.keys(o).some(k => k !== '_row' && o[k] !== ''));
}
function append__gs(name, obj) {
  const s = sh(name), n = SHEETS[name].length, r = s.getLastRow() + 1;
  s.getRange(r, 1, 1, n).setNumberFormat('@').setValues([SHEETS[name].map(k => obj[k] == null ? '' : String(obj[k]))]); // texto: preserva zeros à esquerda
}
function update__gs(name, row, obj) {
  const s = sh(name);
  SHEETS[name].forEach((k, j) => { if (k in obj) s.getRange(row, j + 1).setValue(String(obj[k])); });
}
function delRows__gs(name, rowNums) { const s = sh(name); rowNums.sort((a, b) => b - a).forEach(r => s.deleteRow(r)); }
function now() { return new Date().toISOString(); }
function uid(p) { return p + Utilities.getUuid().replace(/-/g, ''); }
function log(email, acao, detalhe) { try { append('Log', { quando: now(), email, acao, detalhe: String(detalhe || '').slice(0, 500) }); } catch (e) {} }
function hash(senha, salt) {
  let h = salt + '|' + senha;
  for (let i = 0; i < 300; i++) h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt));
  return h;
}

// ---------- HTTP
function doGet() { return out({ ok: true, app: 'planner-revalle' }); }
function doPost(e) {
  let res;
  try {
    const b = JSON.parse(e.postData.contents || '{}');
    const fn = ACTIONS[b.action];
    if (!fn) throw new Error('ação desconhecida');
    res = fn(b) || {}; res.ok = true;
  } catch (err) { res = { ok: false, error: String(err && err.message || err) }; }
  return out(res);
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function locked(fn) { const l = LockService.getScriptLock(); l.waitLock(20000); try { return fn(); } finally { l.releaseLock(); } }

// ---------- sessão e permissões
function userOf(email) { email = String(email || '').toLowerCase().trim(); return rows('Usuarios').find(u => u.email === email) || null; }
function session(b, perfis) {
  const t = String(b.token || ''); if (!t) throw new Error('auth');
  const s = rows('Sessoes').find(x => x.token === t);
  if (!s || s.expira < now()) throw new Error('auth');
  const u = userOf(s.email);
  if (!u || u.status !== 'ativo') throw new Error('auth');
  if (perfis && perfis.indexOf(u.perfil) < 0) throw new Error('Sem permissão para esta ação');
  return u;
}
function pub(u) { return { email: u.email, nome: u.nome, area: u.area, perfil: u.perfil, status: u.status, criado: u.criado, aprovado_em: u.aprovado_em, ultimo_acesso: u.ultimo_acesso }; }
function adm_(u) { return u.perfil === 'admin' || u.perfil === 'logistica'; }
function veTudo_(u) { return adm_(u) || u.perfil === 'gerente'; }
// SNS: vinculado a um ou mais GVs e a uma revenda (Agreste = Alagoinhas + Serrinha · Nordeste = Ribeira do Pombal + Paulo Afonso)
const REVENDAS = { Agreste: /alagoinhas|serrinha/i, Nordeste: /pombal|paulo\s*afonso/i };
function vinculo_(email) { const v = rows('SnsVinculo').find(x => x.sns_email === email); return v ? { gvs: v.gvs ? v.gvs.split(',').filter(Boolean) : [], revenda: v.revenda } : { gvs: [], revenda: '' }; }
function equipeEmails_(u) { return u.perfil === 'sns' ? vinculo_(u.email).gvs : [u.email]; }
function gvOwns(u, unb, setor) {
  if (veTudo_(u)) return true;
  if (u.perfil === 'sns') { const gvs = vinculo_(u.email).gvs; return rows('Equipes').some(e => gvs.indexOf(e.gv_email) >= 0 && e.unb === String(unb) && e.setor === String(setor)); }
  return rows('Equipes').some(e => e.gv_email === u.email && e.unb === String(unb) && e.setor === String(setor));
}

// ---------- arquivos no Drive
function fileRow(nome) { return rows('Arquivos').find(a => a.nome === nome) || null; }
function readFile__gs(nome) {
  const a = fileRow(nome); if (!a) throw new Error('not_found: ' + nome);
  return { content: DriveApp.getFileById(a.file_id).getBlob().getDataAsString('UTF-8'), atualizado: a.atualizado };
}
function writeFile__gs(nome, content, por) {
  return locked(() => {
    const a = fileRow(nome), safe = nome.replace(/[\\/]/g, '__');
    let f;
    if (a) { f = DriveApp.getFileById(a.file_id); f.setContent(content); update('Arquivos', a._row, { atualizado: now(), por, bytes: content.length }); }
    else { f = folder().createFile(safe, content, nome.endsWith('.json') ? 'application/json' : 'text/plain'); append('Arquivos', { nome, file_id: f.getId(), atualizado: now(), por, bytes: content.length }); }
    return { nome, bytes: content.length };
  });
}

// ---------- visão filtrada para o link do vendedor
function linkView(k, nome) {
  const l = rows('Links').find(x => x.token === String(k || '') && x.ativo === 'sim');
  if (!l) throw new Error('Link inválido ou desativado. Peça um novo link ao seu GV.');
  const idx = JSON.parse(readFile('index.json').content);
  const vers = (idx.versions || []).filter(v => (v.units || []).some(u => u.id === l.unb)).sort((a, b) => b.vig.localeCompare(a.vig));
  if (!vers.length) throw new Error('Sem planner publicado para esta unidade.');
  const last = vers[0];
  const link = { unb: l.unb, setor: l.setor };
  if (nome === 'index.json') {
    return { content: JSON.stringify({ versions: [Object.assign({}, last, { units: last.units.filter(u => u.id === l.unb) })], link }), link };
  }
  if (nome !== 'v/' + last.id + '.json') throw new Error('Sem permissão para este arquivo');
  const cache = CacheService.getScriptCache(), ck = 'lv:' + l.token + ':' + (last.updated || '');
  const hit = cache.get(ck); if (hit) return { content: hit, link };
  const v = JSON.parse(readFile(nome).content);
  v.units = v.units.filter(u => u.id === l.unb);
  v.clients = v.clients.filter(c => c[0] === l.unb && (String(c[4]) === l.setor || String(c[7]) === l.setor));
  v.sellers = {}; // vendedor é identificado só pelo código do setor
  v.link = link;
  const s = JSON.stringify(v);
  try { if (s.length < 95000) cache.put(ck, s, 21600); } catch (e) {}
  return { content: s, link };
}


// ---------- e-mails automáticos (aprovação e recusa do cadastro)
const SITE_URL = 'https://revalle-logistica.github.io/planner/';
const MODULOS = {
  gv: [
    ['🏠', 'Início', 'Resumo do planner em vigor em cada unidade e as etapas do planner, do começo ao fim.'],
    ['📊', 'Antes × Depois', 'Visitas por dia, o que mudou, planificador por vendedor, frequência, mapa e relação de clientes. Dá para filtrar por GV.'],
    ['🧭', 'Minha rota', 'A semana e o roteiro do dia de cada setor, com mapa, janelas de entrega e busca por PDV.'],
    ['🔎', 'Análise do planner', 'Visão por setor, por dia, por volume do PDV e números do planner de cada unidade.'],
    ['📝', 'Oportunidades', 'Anotações rápidas durante o planner (ponto de apoio, visita, janela, cadastro…) para não se perder.'],
    ['✍️', 'Crítica do planner', 'Selecione clientes no mapa e proponha vendedor, dia e frequência. Vai direto para a Logística.'],
    ['🔁', 'Alterações', 'Acompanhe as suas solicitações e o parecer da Logística, inclusive os ajustes de janela.'],
    ['🔗', 'Links dos vendedores', 'Gere o link pessoal da Minha rota de cada setor da sua equipe e mande no WhatsApp. O vendedor não precisa de senha.'],
    ['📅', 'Rotina e indicadores', 'Reunião semanal, indicadores, buffer e plano de ação do planner.']
  ],
  admin: [
    ['📊', 'Planner de visitas', 'Início, Antes × Depois, Minha rota, Análise do planner e Oportunidades de qualquer unidade e setor.'],
    ['✍️', 'Crítica e Alterações', 'Solicitações dos GVs com o parecer da Logística, monitor semanal e resumo das solicitações (visitas e janelas).'],
    ['🔗', 'Links dos vendedores', 'Links da Minha rota de todos os setores.'],
    ['🚚', 'Janelas BEES', 'Gera o arquivo semanal de importação das janelas de entrega e guarda o histórico.'],
    ['📅', 'Rotina e indicadores', 'Reunião semanal, indicadores, buffer e plano de ação.'],
    ['🗂️', 'Central de relatórios', 'Onde sobem os relatórios de clientes e os ajustes de janelas do TCD.'],
    ['⬆️', 'Importar planner e Bases da rotina', 'Publica uma nova versão do planner e atualiza as bases da rotina (03.05.30 e demais).'],
    ['👥', 'Usuários e equipes', 'Aprova os pedidos de acesso, define perfis e os setores de cada GV.']
  ]
};
const CUIDADOS = {
  gv: ['O acesso é pessoal: não compartilhe sua senha.', 'Os setores da sua equipe são definidos pela Logística. Se faltar algum, é só avisar.', 'Peça aos vendedores que não repassem o link: cada link abre a carteira do setor. Trocou o vendedor ou o celular? Use “Gerar novo”.'],
  admin: ['O acesso é pessoal: não compartilhe sua senha.', 'Janelas BEES e os relatórios de cadastro têm CPF/CNPJ de clientes. Baixe só quando for usar e não repasse fora da empresa.', 'Não abra no Excel o CSV do BEES antes de importar: ele corta os números do CNPJ.']
};
function esc_(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function emailHtml_(tipo, nome, perfil) {
  const pn = String(nome || '').split(' ')[0];
  const ok = tipo === 'aprovado';
  const perfilTxt = perfil === 'admin' ? 'Administrador' : perfil === 'logistica' ? 'Logística' : perfil === 'gerente' ? 'Gerente comercial (todos os GVs)' : perfil === 'sns' ? 'SNS' : 'Gerente de Vendas (GV)';
  const F = "font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;";
  let corpo;
  if (ok) {
    const mods = MODULOS[perfil === 'admin' || perfil === 'logistica' ? 'admin' : 'gv'].filter(m => perfil !== 'logistica' || !/Usuários/.test(m[1])).map(m =>
      '<tr><td style="padding:0 0 10px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fa;border-radius:12px"><tr>' +
      '<td width="52" valign="top" style="padding:14px 0 14px 14px;font-size:22px;line-height:1">' + m[0] + '</td>' +
      '<td style="padding:13px 16px 13px 4px;' + F + '"><div style="font-size:15px;font-weight:700;color:#152033">' + esc_(m[1]) + '</div>' +
      '<div style="font-size:13.5px;line-height:1.5;color:#55627a;margin-top:2px">' + esc_(m[2]) + '</div></td></tr></table></td></tr>').join('');
    const cuid = CUIDADOS[perfil === 'admin' || perfil === 'logistica' ? 'admin' : 'gv'].map(c => '<li style="margin:0 0 6px">' + esc_(c) + '</li>').join('');
    corpo =
      '<p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#22a35a">✓ Cadastro aprovado</p>' +
      '<h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:#152033">Bem-vindo ao Planner, ' + esc_(pn) + '!</h1>' +
      '<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#3b4760">Seu acesso foi liberado com o perfil <span style="display:inline-block;background:#fff4d1;color:#8a5a00;border-radius:999px;padding:2px 10px;font-weight:700;font-size:13px">' + perfilTxt + '</span>. Entre com o seu e-mail e a senha que você criou no cadastro.</p>' +
      '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 26px"><tr><td style="background:#f5b301;border-radius:12px"><a href="' + SITE_URL + '" style="display:inline-block;padding:14px 26px;' + F + 'font-size:15px;font-weight:800;color:#111111;text-decoration:none">Acessar o Planner →</a></td></tr></table>' +
      '<p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#152033">O que você pode usar</p>' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">' + mods + '</table>' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;background:#fff8e6;border:1px solid #f7dc8c;border-radius:12px"><tr><td style="padding:14px 18px;' + F + 'font-size:13.5px;line-height:1.55;color:#5c4400">' +
      '<div style="font-weight:700;margin-bottom:6px">Cuidados</div><ul style="margin:0;padding-left:18px">' + cuid + '</ul></td></tr></table>';
  } else {
    corpo =
      '<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#152033">Olá, ' + esc_(pn) + '</h1>' +
      '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3b4760">Recebemos o seu pedido de acesso ao Planner Revalle, mas ele <b>não foi aprovado</b> neste momento.</p>' +
      '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3b4760">O sistema é usado pela Logística e pelos Gerentes de Vendas. Os vendedores acessam a <b>Minha rota</b> por um link pessoal enviado pelo GV, sem precisar de cadastro.</p>' +
      '<p style="margin:0;font-size:15px;line-height:1.6;color:#3b4760">Se você acha que precisa de acesso, fale com a Logística.</p>';
  }
  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#e9edf3">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e9edf3"><tr><td align="center" style="padding:28px 12px">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">' +
    '<tr><td style="background:#152033;padding:22px 28px"><table role="presentation" cellspacing="0" cellpadding="0"><tr>' +
    '<td style="width:44px;height:44px"><img src="' + SITE_URL + 'img/icon-192.png" width="44" height="44" alt="" style="display:block;border-radius:12px"></td>' +
    '<td style="padding-left:12px;' + F + '"><div style="font-size:18px;font-weight:800;color:#ffffff">Planner <span style="color:#f5b301">Revalle</span></div>' +
    '<div style="font-size:12px;color:#a2afc6;margin-top:2px">Logística · Agreste e Nordeste</div></td></tr></table></td></tr>' +
    '<tr><td style="padding:30px 28px 26px;' + F + '">' + corpo + '</td></tr>' +
    '<tr><td style="padding:18px 28px 24px;border-top:1px solid #e6eaf1;' + F + 'font-size:13px;line-height:1.55;color:#6b778d">Abraço,<br><b style="color:#152033">Alyson Gomes de Souza</b><br>Diretoria de Logística · Revalle' +
    '<div style="margin-top:14px;font-size:11.5px;color:#98a2b3">Mensagem automática do Planner Revalle. Dúvidas: responda este e-mail.</div></td></tr>' +
    '</table></td></tr></table></body></html>';
}
function enviarEmail_(tipo, u, perfil) {
  try {
    const assunto = tipo === 'aprovado'
      ? (perfil === 'admin' ? 'Seu acesso de administrador ao Planner Revalle foi aprovado' : 'Seu acesso ao Planner Revalle foi aprovado')
      : 'Seu pedido de acesso ao Planner Revalle';
    const texto = tipo === 'aprovado'
      ? 'Olá, ' + u.nome + '! Seu acesso ao Planner Revalle foi aprovado (' + (perfil === 'admin' ? 'Administrador' : perfil === 'logistica' ? 'Logística' : perfil === 'gerente' ? 'Gerente comercial' : perfil === 'sns' ? 'SNS' : 'GV') + '). Acesse ' + SITE_URL + ' com o seu e-mail e a senha do cadastro.'
      : 'Olá, ' + u.nome + '. Seu pedido de acesso ao Planner Revalle não foi aprovado neste momento. Fale com a Logística se precisar.';
    MailApp.sendEmail({ to: u.email, subject: assunto, body: texto, htmlBody: emailHtml_(tipo, u.nome, perfil), name: 'Planner Revalle · Logística' });
    log(u.email, 'email', tipo);
    return true;
  } catch (e) { log(u.email, 'email.erro', e.message); return false; }
}
/** Rode pelo editor para autorizar o envio de e-mails e receber os 3 modelos nesta conta. */
function testeEmails() {
  const me = Session.getEffectiveUser().getEmail();
  enviarEmail_('aprovado', { email: me, nome: 'Alyson Gomes' }, 'gv');
  enviarEmail_('aprovado', { email: me, nome: 'Alyson Gomes' }, 'admin');
  enviarEmail_('recusado', { email: me, nome: 'Alyson Gomes' }, 'gv');
}

// ---------- ações
const ACTIONS = {
  // cadastro e acesso
  signup(b) {
    return locked(() => {
      const email = String(b.email || '').toLowerCase().trim(), nome = String(b.nome || '').trim(), senha = String(b.senha || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('E-mail inválido');
      if (nome.length < 3) throw new Error('Informe o nome completo');
      if (senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres');
      if (userOf(email)) throw new Error('Este e-mail já tem cadastro');
      const first = !rows('Usuarios').some(u => u.perfil === 'admin' && u.status === 'ativo');
      const salt = uid('');
      append('Usuarios', { email, nome, area: String(b.area || ''), perfil: first ? 'admin' : '', status: first ? 'ativo' : 'pendente', salt, hash: hash(senha, salt), criado: now(), aprovado_por: first ? 'primeiro acesso' : '', aprovado_em: first ? now() : '' });
      log(email, 'signup', first ? 'primeiro administrador' : 'pendente');
      return { status: first ? 'ativo' : 'pendente', admin: first };
    });
  },
  login(b) {
    const u = userOf(b.email);
    if (!u || hash(String(b.senha || ''), u.salt) !== u.hash) throw new Error('E-mail ou senha incorretos');
    if (u.status === 'pendente') throw new Error('Seu cadastro está aguardando a aprovação do administrador');
    if (u.status !== 'ativo') throw new Error('Seu acesso está bloqueado. Fale com o administrador');
    const token = uid('s_'), exp = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
    locked(() => {
      append('Sessoes', { token, email: u.email, expira: exp });
      update('Usuarios', u._row, { ultimo_acesso: now() });
      const old = rows('Sessoes').filter(s => s.expira < now()).map(s => s._row); if (old.length) delRows('Sessoes', old);
    });
    return { token, expira: exp, user: pub(u) };
  },
  me(b) { return { user: pub(session(b)) }; },
  logout(b) { const t = String(b.token || ''); locked(() => { const r = rows('Sessoes').filter(s => s.token === t).map(s => s._row); if (r.length) delRows('Sessoes', r); }); return {}; },
  senha(b) {
    const u = session(b);
    if (hash(String(b.atual || ''), u.salt) !== u.hash) throw new Error('Senha atual incorreta');
    if (String(b.nova || '').length < 6) throw new Error('A nova senha precisa ter pelo menos 6 caracteres');
    const salt = uid(''); locked(() => update('Usuarios', u._row, { salt, hash: hash(String(b.nova), salt) })); return {};
  },

  // usuários (administrador)
  'users.list'(b) { session(b, ['admin']); return { users: rows('Usuarios').map(pub), equipes: rows('Equipes').map(e => ({ unb: e.unb, setor: e.setor, gv: e.gv_email })), vinculos: rows('SnsVinculo').map(v => ({ sns: v.sns_email, gvs: v.gvs ? v.gvs.split(',').filter(Boolean) : [], revenda: v.revenda })) }; },
  'sns.vinculo.set'(b) {
    const a = session(b, ['admin']);
    return locked(() => {
      const u = userOf(b.email); if (!u) throw new Error('Usuário não encontrado');
      const gvs = (b.gvs || []).map(String).filter(e => { const g = userOf(e); return g && g.perfil === 'gv'; });
      const revenda = String(b.revenda || ''); if (revenda && !REVENDAS[revenda]) throw new Error('Revenda inválida');
      const r = rows('SnsVinculo').find(x => x.sns_email === u.email);
      const o = { sns_email: u.email, gvs: gvs.join(','), revenda, atualizado: now() };
      if (r) update('SnsVinculo', r._row, o); else append('SnsVinculo', o);
      log(a.email, 'sns.vinculo.set', u.email + ' ' + revenda + ' ' + gvs.join(','));
      return { gvs, revenda };
    });
  },
  // pedidos dos SNS: o SNS pede, um GV vinculado aprova ou reprova, e o aprovado segue para o parecer da Logística
  'sns.me'(b) { const u = session(b, ['sns']); return vinculo_(u.email); },
  'sns.submit'(b) {
    const u = session(b, ['sns']); const v = String(b.v || ''); if (!v) throw new Error('Planner não informado');
    const vin = vinculo_(u.email); if (!vin.gvs.length) throw new Error('Você ainda não está vinculado a nenhum GV. Peça à Logística para fazer o vínculo.');
    const rx = REVENDAS[vin.revenda]; const units = (b.units || []).map(String); const itens = (b.itens || []).slice(0, 2000);
    itens.forEach(it => { if (rx && !rx.test(String(it.un || ''))) throw new Error('A unidade ' + it.un + ' não é da sua revenda (' + vin.revenda + ')'); });
    return locked(() => {
      const meus = rows('PedidosSNS').filter(r => r.sns_email === u.email && r.v === v && units.indexOf(r.unb) >= 0);
      const pend = meus.filter(r => r.status === 'aguardando_gv'), decid = new Set(meus.filter(r => r.status !== 'aguardando_gv').map(r => r.unb + '|' + r.code));
      if (pend.length) delRows('PedidosSNS', pend.map(r => r._row));
      let add = 0, kept = 0;
      itens.forEach(it => {
        const k = String(it.u) + '|' + String(it.code);
        if (decid.has(k)) { kept++; return; }
        append('PedidosSNS', { id: uid('p'), v, unb: String(it.u), un: String(it.un || ''), code: String(it.code), sns_email: u.email, sns_nome: u.nome, item: JSON.stringify(it), status: 'aguardando_gv', criado: now(), atualizado: now() }); add++;
      });
      log(u.email, 'sns.submit', v + ' ' + add + ' pedido(s)');
      return { added: add, kept, removed: Math.max(0, pend.length - add) };
    });
  },
  'sns.list'(b) {
    const u = session(b, ['admin', 'logistica', 'gerente', 'gv', 'sns']); const v = String(b.v || '');
    const vins = rows('SnsVinculo');
    const meus = u.perfil === 'gv' ? new Set(vins.filter(x => x.gvs.split(',').indexOf(u.email) >= 0).map(x => x.sns_email)) : null;
    const it = rows('PedidosSNS').filter(r => (!v || r.v === v) && (veTudo_(u) || (u.perfil === 'sns' ? r.sns_email === u.email : meus.has(r.sns_email))));
    return { perfil: u.perfil, pedidos: it.map(r => { const o = {}; SHEETS.PedidosSNS.forEach(k => o[k] = r[k]); o.item = JSON.parse(r.item || '{}'); return o; }) };
  },
  'sns.decide'(b) {
    const u = session(b, ['admin', 'logistica', 'gerente', 'gv']); const ids = new Set((b.ids || []).map(String));
    const dec = String(b.decisao || ''); if (['aprovado_gv', 'reprovado_gv', 'aguardando_gv'].indexOf(dec) < 0) throw new Error('Decisão inválida');
    return locked(() => {
      const vins = rows('SnsVinculo'); const out = [];
      rows('PedidosSNS').filter(r => ids.has(r.id)).forEach(r => {
        if (u.perfil === 'gv') { const vv = vins.find(x => x.sns_email === r.sns_email); if (!vv || vv.gvs.split(',').indexOf(u.email) < 0) throw new Error('Este SNS não está vinculado a você'); }
        const p = dec === 'aguardando_gv' ? { status: dec, gv_email: '', gv_nome: '', gv_obs: '', gv_em: '', atualizado: now() } : { status: dec, gv_email: u.email, gv_nome: u.nome, gv_obs: String(b.obs || '').slice(0, 500), gv_em: now(), atualizado: now() };
        update('PedidosSNS', r._row, p); out.push(Object.assign({}, r, p));
      });
      log(u.email, 'sns.decide', dec + ' ' + out.length);
      return { atualizados: out.length };
    });
  },
  'users.set'(b) {
    const a = session(b, ['admin']);
    return locked(() => {
      const u = userOf(b.email); if (!u) throw new Error('Usuário não encontrado');
      if (u.email === a.email && (b.status && b.status !== 'ativo' || b.perfil && b.perfil !== 'admin')) throw new Error('Você não pode tirar o seu próprio acesso de administrador');
      const p = {};
      if (b.perfil) { if (['admin', 'logistica', 'gerente', 'gv', 'sns'].indexOf(b.perfil) < 0) throw new Error('Perfil inválido'); p.perfil = b.perfil; }
      if (b.status) { if (['ativo', 'bloqueado', 'recusado'].indexOf(b.status) < 0) throw new Error('Situação inválida'); p.status = b.status; }
      if (p.status === 'ativo' && u.status === 'pendente') { p.aprovado_por = a.email; p.aprovado_em = now(); if (!p.perfil && !u.perfil) p.perfil = 'gv'; }
      update('Usuarios', u._row, p);
      if (p.status && p.status !== 'ativo') { const r = rows('Sessoes').filter(s => s.email === u.email).map(s => s._row); if (r.length) delRows('Sessoes', r); }
      log(a.email, 'users.set', u.email + ' ' + JSON.stringify(p));
      let email = null;
      if (u.status === 'pendente' && p.status === 'ativo') email = enviarEmail_('aprovado', u, p.perfil || u.perfil);
      if (u.status === 'pendente' && p.status === 'recusado') email = enviarEmail_('recusado', u, u.perfil);
      return { user: pub(Object.assign(u, p)), email };
    });
  },
  // equipe de um GV: lista completa de setores (substitui a anterior; setor de outro GV é transferido)
  'equipes.set'(b) {
    const a = session(b, ['admin']);
    return locked(() => {
      const gv = userOf(b.gv); if (!gv) throw new Error('GV não encontrado');
      const want = new Map((b.setores || []).map(s => [String(s.unb) + '|' + String(s.setor), { unb: String(s.unb), setor: String(s.setor) }]));
      const all = rows('Equipes'), del = [], moved = [];
      all.forEach(e => {
        const k = e.unb + '|' + e.setor;
        if (e.gv_email === gv.email && !want.has(k)) del.push(e._row);
        else if (want.has(k)) { if (e.gv_email !== gv.email) moved.push({ unb: e.unb, setor: e.setor, de: e.gv_email }); del.push(e._row); }
      });
      if (del.length) delRows('Equipes', del);
      want.forEach(s => append('Equipes', { unb: s.unb, setor: s.setor, gv_email: gv.email, atualizado: now() }));
      log(a.email, 'equipes.set', gv.email + ' ' + want.size + ' setores');
      return { setores: want.size, transferidos: moved };
    });
  },

  // links dos vendedores (administrador e gerente: todos · GV: só a equipe)
  'links.list'(b) {
    const u = session(b, ['admin', 'logistica', 'gerente', 'gv', 'sns']);
    const meus = equipeEmails_(u); const eq = rows('Equipes').filter(e => veTudo_(u) || meus.indexOf(e.gv_email) >= 0);
    const mine = new Set(eq.map(e => e.unb + '|' + e.setor));
    const links = rows('Links').filter(l => l.ativo === 'sim' && (veTudo_(u) || mine.has(l.unb + '|' + l.setor)))
      .map(l => ({ unb: l.unb, setor: l.setor, token: l.token, criado_em: l.criado_em, criado_por: l.criado_por }));
    return { perfil: u.perfil, equipe: eq.map(e => ({ unb: e.unb, setor: e.setor, gv: e.gv_email })), links };
  },
  'links.generate'(b) {
    const u = session(b, ['admin', 'logistica', 'gerente', 'gv', 'sns']);
    const lista = b.setores || [{ unb: b.unb, setor: b.setor }];
    return locked(() => {
      const all = rows('Links'), out = [];
      lista.forEach(s => {
        const unb = String(s.unb), setor = String(s.setor);
        if (!gvOwns(u, unb, setor)) throw new Error('O setor ' + setor + ' não é da sua equipe');
        if (b.soNovos && all.some(l => l.ativo === 'sim' && l.unb === unb && l.setor === setor)) return;
        all.filter(l => l.ativo === 'sim' && l.unb === unb && l.setor === setor).forEach(l => update('Links', l._row, { ativo: 'nao', desativado_em: now() }));
        const token = uid('k');
        append('Links', { token, unb, setor, ativo: 'sim', criado_por: u.email, criado_em: now() });
        out.push({ unb, setor, token });
      });
      log(u.email, 'links.generate', out.map(x => x.unb + '/' + x.setor).join(','));
      return { links: out };
    });
  },
  'links.disable'(b) {
    const u = session(b, ['admin', 'logistica', 'gerente', 'gv', 'sns']);
    const unb = String(b.unb), setor = String(b.setor);
    if (!gvOwns(u, unb, setor)) throw new Error('O setor ' + setor + ' não é da sua equipe');
    return locked(() => {
      rows('Links').filter(l => l.ativo === 'sim' && l.unb === unb && l.setor === setor).forEach(l => update('Links', l._row, { ativo: 'nao', desativado_em: now() }));
      log(u.email, 'links.disable', unb + '/' + setor); return {};
    });
  },
  'link.get'(b) { return linkView(b.k, String(b.name || '')); },

  // dados (planner, relatórios, janelas)
  'data.get'(b) {
    const u = session(b, ['admin', 'logistica', 'gerente', 'gv', 'sns']), nome = String(b.name || '');
    if (!adm_(u) && !(nome === 'index.json' || /^v\/[\w-]+\.json$/.test(nome) || /^rotina\/(estado\.gz|meta\.json|ls\.json)$/.test(nome) || /^rel\/(index\.json|coord\/\d+\.json)$/.test(nome) || nome === 'janelas/ajustes-hist.json')) throw new Error('Sem permissão para este arquivo');
    return readFile(nome);
  },
  'data.put'(b) {
    const u = session(b, ['admin', 'logistica']);
    const nome = String(b.name || ''); if (!/^[\w\-./]+$/.test(nome) || nome.indexOf('..') >= 0) throw new Error('Nome de arquivo inválido');
    const r = writeFile(nome, String(b.content == null ? '' : b.content), u.email); log(u.email, 'data.put', nome); return r;
  },
  // anotações do time (Oportunidades): qualquer usuário registra; muda/exclui quem escreveu ou o administrador
  'notas.list'(b) {
    session(b, ['admin', 'logistica', 'gerente', 'gv', 'sns']); const t = String(b.tipo || '');
    return { notas: rows('Notas').filter(n => n.excluida !== 'sim' && (!t || n.tipo === t)).map(notaPub_) };
  },
  'notas.add'(b) {
    const u = session(b, ['admin', 'logistica', 'gerente', 'gv', 'sns']); const itens = (b.itens || []).slice(0, 200);
    if (!itens.length) throw new Error('Nada para registrar');
    const out = locked(() => itens.map(it => {
      const texto = String(it.texto || '').trim().slice(0, 4000); if (!texto) throw new Error('Texto vazio');
      const n = { id: uid('n'), tipo: String(it.tipo || 'opp'), unidade: String(it.unidade || ''), planner: String(it.planner || ''), pdv: String(it.pdv || '').replace(/\D/g, ''), setor: String(it.setor || '').replace(/\D/g, ''), categoria: String(it.categoria || '').slice(0, 60), regiao: String(it.regiao || '').slice(0, 120),
        texto, status: 'aberta', autor: u.email, autor_nome: u.nome, criado: now(), atualizado: now(), excluida: '' };
      append('Notas', n); return n;
    }));
    log(u.email, 'notas.add', out.length + ' nota(s)'); return { notas: out.map(notaPub_) };
  },
  'notas.set'(b) {
    const u = session(b, ['admin', 'logistica', 'gerente', 'gv', 'sns']);
    return locked(() => {
      const n = rows('Notas').find(x => x.id === String(b.id || '')); if (!n || n.excluida === 'sim') throw new Error('Anotação não encontrada');
      if (!adm_(u) && n.autor !== u.email) throw new Error('Só quem escreveu (ou a Logística) pode mudar esta anotação');
      const p = { atualizado: now() };
      if (b.excluir) p.excluida = 'sim';
      if (b.status) { if (['aberta', 'andamento', 'feita', 'descartada'].indexOf(b.status) < 0) throw new Error('Situação inválida'); p.status = b.status; }
      if (b.texto != null) p.texto = String(b.texto).trim().slice(0, 4000);
      ['categoria', 'regiao', 'unidade'].forEach(k => { if (b[k] != null) p[k] = String(b[k]).slice(0, 120); });
      ['pdv', 'setor'].forEach(k => { if (b[k] != null) p[k] = String(b[k]).replace(/\D/g, ''); });
      update('Notas', n._row, p); log(u.email, 'notas.set', n.id + (b.excluir ? ' excluída' : ' ' + (b.status || 'texto')));
      return { nota: notaPub_(Object.assign(n, p)) };
    });
  },
  'data.list'(b) {
    session(b, ['admin', 'logistica']); const p = String(b.prefix || '');
    return { files: rows('Arquivos').filter(a => a.nome.indexOf(p) === 0).map(a => ({ nome: a.nome, atualizado: a.atualizado, por: a.por, bytes: +a.bytes || 0 })) };
  }
};

function notaPub_(n) { const o = {}; SHEETS.Notas.forEach(k => { if (k !== 'excluida') o[k] = n[k]; }); return o; }


// ===== camada de adaptação: planilha → tabelas (em memória durante a requisição) e Drive → Storage
function rows(name) {
  return (DB[name] || []).map((r, i) => Object.assign({ _row: i + 2 }, r)).filter(o => Object.keys(o).some(k => k !== '_row' && o[k] !== ''));
}
function norm_(name, obj) { const o = {}; SHEETS[name].forEach(k => o[k] = obj[k] == null ? '' : String(obj[k])); return o; }
function pk_(name, r) { const k = TAB[name][1]; const o = {}; k.forEach(c => o[c] = r[c]); return o; }
function append(name, obj) {
  const o = norm_(name, obj);
  if (name !== 'Log') (DB[name] = DB[name] || []).push(o);
  CHG.push(['ins', name, o]);
}
function update(name, row, obj) {
  const r = DB[name][row - 2]; if (!r) return; const p = {};
  SHEETS[name].forEach(k => { if (k in obj) { p[k] = String(obj[k]); } });
  const key = pk_(name, r); Object.assign(r, p); CHG.push(['upd', name, key, p]);
}
function delRows(name, rowNums) {
  rowNums.slice().sort((a, b) => b - a).forEach(n => { const r = DB[name][n - 2]; if (!r) return; CHG.push(['del', name, pk_(name, r)]); DB[name].splice(n - 2, 1); });
}
function readFile(nome) {
  if (!(nome in FILES)) throw new Error('not_found: ' + nome);
  const a = fileRow(nome); return { content: FILES[nome], atualizado: a ? a.atualizado : '' };
}
function writeFile(nome, content, por) {
  WRITES.push([nome, content]);
  const a = fileRow(nome);
  if (a) update('Arquivos', a._row, { atualizado: now(), por, bytes: content.length });
  else append('Arquivos', { nome, file_id: '', atualizado: now(), por, bytes: content.length });
  return { nome, bytes: content.length };
}
function ss() { throw new Error('planilha não existe no Supabase'); }
function folder() { throw new Error('Drive não existe no Supabase'); }

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
function row_(name, o) { const t = TAB[name][0], r = Object.assign({}, o); if (t === 'arquivos') r.bytes = +r.bytes || 0; if (t === 'log') delete r.id; return r; }
async function flush_() {
  for (let i = 0; i < CHG.length; i++) {
    const [op, name] = CHG[i], t = TAB[name][0]; let res;
    if (op === 'ins') { const batch = [row_(name, CHG[i][2])]; while (i + 1 < CHG.length && CHG[i + 1][0] === 'ins' && CHG[i + 1][1] === name) batch.push(row_(name, CHG[++i][2])); res = await SB.from(t).insert(batch); }
    else if (op === 'upd') { const p = row_(name, CHG[i][3]); if (t === 'arquivos' && !('bytes' in CHG[i][3])) delete p.bytes; let q = SB.from(t).update(p); Object.entries(CHG[i][2]).forEach(([k, v]) => q = q.eq(k, v)); res = await q; }
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
  for (;;) { let q = SB.from('criticas').select('*'); Object.entries(filtro).forEach(([k, v]) => q = q.eq(k, v)); const { data, error } = await q.range(from, from + 999);
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
      if (cur) { const { error } = await SB.from('criticas').update({ dados: Object.assign({}, cur.dados, dados, { em: (cur.dados || {}).em || agora }), parecer: it.parecer || cur.parecer || 'Pendente' }).eq('id', cur.id); if (error) throw new Error(error.message); updated++; }
      else { dados.em = dados.em || agora; const { error } = await SB.from('criticas').insert({ id: uid('c'), v, u, code, gv, parecer: it.parecer || 'Pendente', dados }); if (error) throw new Error(error.message); added++; }
    }
    const tirar = atuais.filter(r => !vistos.has(r.u + '|' + r.code) && pendente_(r.parecer)).map(r => r.id);
    if (tirar.length) { const { error } = await SB.from('criticas').delete().in('id', tirar); if (error) throw new Error(error.message); removed = tirar.length; }
    kept += atuais.filter(r => !vistos.has(r.u + '|' + r.code) && !pendente_(r.parecer)).length;
    return { added, updated, removed, kept };
  },
  async 'crit.parecer'(b) {
    const u = session(b, ['admin', 'logistica']); let n = 0;
    for (const p of (b.updates || [])) {
      const { data } = await SB.from('criticas').select('dados').eq('id', String(p.id)).maybeSingle(); if (!data) continue;
      const { error } = await SB.from('criticas').update({ parecer: String(p.parecer || 'Pendente'), dados: Object.assign({}, data.dados, { obs: String(p.obs || ''), parAt: now(), parPor: u.email }) }).eq('id', String(p.id));
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
    if (b.limpar) await SB.from('criticas').delete().eq('v', v);
    const recs = its.map(it => { const dados = Object.assign({}, it); CRIT_KEYS.forEach(x => delete dados[x]);
      return { id: String(it.id || uid('c')), v, u: String(it.u), code: String(it.code), gv: String(it.gv || ''), parecer: String(it.parecer || 'Pendente'), dados }; });
    for (let i = 0; i < recs.length; i += 500) { const { error } = await SB.from('criticas').upsert(recs.slice(i, i + 500)); if (error) throw new Error(error.message); }
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
