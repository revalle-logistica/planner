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
  Log: ['quando', 'email', 'acao', 'detalhe']
};

// ---------- infraestrutura
function props() { return PropertiesService.getScriptProperties(); }
function ss() {
  const id = props().getProperty('SS_ID');
  if (id) return SpreadsheetApp.openById(id);
  const s = SpreadsheetApp.create(SS_NAME);
  props().setProperty('SS_ID', s.getId());
  return s;
}
function folder() {
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
function rows(name) {
  const v = sh(name).getDataRange().getValues(); const h = v.shift() || SHEETS[name];
  return v.map((r, i) => { const o = { _row: i + 2 }; h.forEach((k, j) => o[k] = String(r[j] == null ? '' : r[j])); return o; })
    .filter(o => Object.keys(o).some(k => k !== '_row' && o[k] !== ''));
}
function append(name, obj) {
  const s = sh(name), n = SHEETS[name].length, r = s.getLastRow() + 1;
  s.getRange(r, 1, 1, n).setNumberFormat('@').setValues([SHEETS[name].map(k => obj[k] == null ? '' : String(obj[k]))]); // texto: preserva zeros à esquerda
}
function update(name, row, obj) {
  const s = sh(name);
  SHEETS[name].forEach((k, j) => { if (k in obj) s.getRange(row, j + 1).setValue(String(obj[k])); });
}
function delRows(name, rowNums) { const s = sh(name); rowNums.sort((a, b) => b - a).forEach(r => s.deleteRow(r)); }
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
function gvOwns(u, unb, setor) {
  if (u.perfil === 'admin') return true;
  return rows('Equipes').some(e => e.gv_email === u.email && e.unb === String(unb) && e.setor === String(setor));
}

// ---------- arquivos no Drive
function fileRow(nome) { return rows('Arquivos').find(a => a.nome === nome) || null; }
function readFile(nome) {
  const a = fileRow(nome); if (!a) throw new Error('not_found: ' + nome);
  return { content: DriveApp.getFileById(a.file_id).getBlob().getDataAsString('UTF-8'), atualizado: a.atualizado };
}
function writeFile(nome, content, por) {
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
    ['🏠', 'Início', 'Resumo do planner em vigor em cada unidade.'],
    ['📊', 'Antes × Depois', 'Visitas por dia, o que mudou, planificador por vendedor, frequência, mapa e relação de clientes.'],
    ['🧭', 'Minha rota', 'A semana e o roteiro do dia de cada setor, com mapa.'],
    ['✍️', 'Crítica do planner', 'Selecione clientes no mapa e proponha vendedor, dia e frequência. Vai direto para a Logística.'],
    ['🔗', 'Links dos vendedores', 'Gere o link pessoal da Minha rota de cada setor da sua equipe e mande no WhatsApp. O vendedor não precisa de senha.']
  ],
  admin: [
    ['📊', 'Planner', 'Início, Antes × Depois e Minha rota de qualquer unidade e setor.'],
    ['✍️', 'Crítica e Alterações', 'Solicitações dos GVs com o parecer da Logística.'],
    ['🔗', 'Links dos vendedores', 'Links da Minha rota de todos os setores.'],
    ['⬆️', 'Importar planner', 'Publica uma nova versão do planner (visitas, janelas, clientes e volume).'],
    ['🚚', 'Janelas BEES', 'Gera o arquivo semanal de importação das janelas de entrega e guarda o histórico.'],
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
  const perfilTxt = perfil === 'admin' ? 'Administrador' : 'Gerente de Vendas (GV)';
  const F = "font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;";
  let corpo;
  if (ok) {
    const mods = MODULOS[perfil === 'admin' ? 'admin' : 'gv'].map(m =>
      '<tr><td style="padding:0 0 10px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fa;border-radius:12px"><tr>' +
      '<td width="52" valign="top" style="padding:14px 0 14px 14px;font-size:22px;line-height:1">' + m[0] + '</td>' +
      '<td style="padding:13px 16px 13px 4px;' + F + '"><div style="font-size:15px;font-weight:700;color:#152033">' + esc_(m[1]) + '</div>' +
      '<div style="font-size:13.5px;line-height:1.5;color:#55627a;margin-top:2px">' + esc_(m[2]) + '</div></td></tr></table></td></tr>').join('');
    const cuid = CUIDADOS[perfil === 'admin' ? 'admin' : 'gv'].map(c => '<li style="margin:0 0 6px">' + esc_(c) + '</li>').join('');
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
    '<td style="width:44px;height:44px;background:#f5b301;border-radius:12px;text-align:center;' + F + 'font-size:20px;font-weight:900;color:#111111">R</td>' +
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
      ? 'Olá, ' + u.nome + '! Seu acesso ao Planner Revalle foi aprovado (' + (perfil === 'admin' ? 'Administrador' : 'GV') + '). Acesse ' + SITE_URL + ' com o seu e-mail e a senha do cadastro.'
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
  'users.list'(b) { session(b, ['admin']); return { users: rows('Usuarios').map(pub), equipes: rows('Equipes').map(e => ({ unb: e.unb, setor: e.setor, gv: e.gv_email })) }; },
  'users.set'(b) {
    const a = session(b, ['admin']);
    return locked(() => {
      const u = userOf(b.email); if (!u) throw new Error('Usuário não encontrado');
      if (u.email === a.email && (b.status && b.status !== 'ativo' || b.perfil && b.perfil !== 'admin')) throw new Error('Você não pode tirar o seu próprio acesso de administrador');
      const p = {};
      if (b.perfil) { if (['admin', 'gv'].indexOf(b.perfil) < 0) throw new Error('Perfil inválido'); p.perfil = b.perfil; }
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

  // links dos vendedores (administrador: todos · GV: só a equipe)
  'links.list'(b) {
    const u = session(b, ['admin', 'gv']);
    const eq = rows('Equipes').filter(e => u.perfil === 'admin' || e.gv_email === u.email);
    const mine = new Set(eq.map(e => e.unb + '|' + e.setor));
    const links = rows('Links').filter(l => l.ativo === 'sim' && (u.perfil === 'admin' || mine.has(l.unb + '|' + l.setor)))
      .map(l => ({ unb: l.unb, setor: l.setor, token: l.token, criado_em: l.criado_em, criado_por: l.criado_por }));
    return { perfil: u.perfil, equipe: eq.map(e => ({ unb: e.unb, setor: e.setor, gv: e.gv_email })), links };
  },
  'links.generate'(b) {
    const u = session(b, ['admin', 'gv']);
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
    const u = session(b, ['admin', 'gv']);
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
    const u = session(b, ['admin', 'gv']), nome = String(b.name || '');
    if (u.perfil !== 'admin' && !(nome === 'index.json' || /^v\/[\w-]+\.json$/.test(nome))) throw new Error('Sem permissão para este arquivo');
    return readFile(nome);
  },
  'data.put'(b) {
    const u = session(b, ['admin']);
    const nome = String(b.name || ''); if (!/^[\w\-./]+$/.test(nome) || nome.indexOf('..') >= 0) throw new Error('Nome de arquivo inválido');
    const r = writeFile(nome, String(b.content == null ? '' : b.content), u.email); log(u.email, 'data.put', nome); return r;
  },
  'data.list'(b) {
    session(b, ['admin']); const p = String(b.prefix || '');
    return { files: rows('Arquivos').filter(a => a.nome.indexOf(p) === 0).map(a => ({ nome: a.nome, atualizado: a.atualizado, por: a.por, bytes: +a.bytes || 0 })) };
  }
};
