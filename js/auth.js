/* Acesso ao sistema: sessão (usuário e senha), permissão por tela e leitura dos dados pelo Apps Script.
   Os dados (planner, relatórios, janelas) ficam no Drive da conta Log Agreste — nada sensível no repositório.
   Carregado no <head> de todas as telas, depois de js/config.js e antes de js/shell.js. */
(function () {
  var KEY = 'plannerSess';
  // telas e perfis que podem abrir (admin pode tudo)
  var PERM = { 'index.html': ['gv', 'gerente', 'sns'], 'painel.html': ['gv', 'gerente', 'sns'], 'rota.html': ['gv', 'gerente', 'sns'], 'critica.html': ['gv', 'gerente', 'sns'], 'links.html': ['gv', 'gerente', 'sns'], 'rotina.html': ['gv', 'gerente', 'sns'], 'oportunidades.html': ['gv', 'gerente', 'sns'], 'sns.html': ['gv', 'gerente', 'sns'] };
  var PUBLIC = { 'login.html': 1 };
  var page = location.pathname.split('/').pop() || 'index.html';
  var params = new URLSearchParams(location.search);
  var linkK = page === 'rota.html' ? params.get('k') : null;

  function sess() { try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.expira > new Date().toISOString() ? s : null; } catch (e) { return null; } }
  function setSess(s) { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch (e) {} }
  function can(p, s) { s = s || sess(); if (!s) return false; if (s.user.perfil === 'admin') return true; if (s.user.perfil === 'logistica') return p !== 'usuarios.html'; return (PERM[p] || []).indexOf(s.user.perfil) >= 0; }
  function goLogin() { location.replace('login.html?next=' + encodeURIComponent(page + location.search + location.hash)); }
  function configured() { return /^https:\/\/(script\.google\.com|[a-z0-9]+\.supabase\.co)\//.test(window.PLANNER_SYS_API || ''); }

  // guarda da tela (antes de desenhar)
  var s0 = sess();
  if (!PUBLIC[page] && !linkK) {
    if (!configured()) { /* sem backend configurado: deixa abrir para a instalação inicial */ }
    else if (!s0) { goLogin(); document.documentElement.style.visibility = 'hidden'; }
    else if (!can(page, s0)) { location.replace('./'); document.documentElement.style.visibility = 'hidden'; }
  }
  if (linkK) document.documentElement.classList.add('link-mode');

  async function call(action, body) {
    if (!configured()) throw new Error('O sistema ainda não foi conectado ao Apps Script (js/config.js).');
    var s = sess();
    var r = await fetch(window.PLANNER_SYS_API, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action, token: s && s.token }, body || {})) });
    var j = await r.json();
    if (!j.ok) {
      if (j.error === 'auth') { setSess(null); if (!PUBLIC[page] && !linkK) goLogin(); throw new Error('Sua sessão expirou. Entre de novo.'); }
      throw new Error(j.error || 'Erro no servidor');
    }
    return j;
  }

  // confere a sessão no servidor uma vez por aba (bloqueio/troca de perfil vale na hora)
  if (s0 && !PUBLIC[page] && !linkK && configured()) {
    try {
      if (!sessionStorage.getItem('plannerMe')) call('me').then(function (j) {
        s0.user = j.user; setSess(s0); sessionStorage.setItem('plannerMe', '1');
        if (!can(page, s0)) location.replace('./');
      }).catch(function () {});
    } catch (e) {}
  }

  // ---- dados
  var MEM = {}, UPD = {};
  function rememberIndex(ix) { (ix.versions || []).forEach(function (v) { UPD['v/' + v.id + '.json'] = v.updated || v.created || ''; }); }
  // cache dos arquivos no navegador (IndexedDB), por versão: abrir de novo não baixa o arquivo outra vez
  var idbP = null;
  function idb() { if (!idbP) idbP = new Promise(function (ok) { try { var r = indexedDB.open('plannerFiles', 1); r.onupgradeneeded = function () { r.result.createObjectStore('f'); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ok(null); }; } catch (e) { ok(null); } }); return idbP; }
  async function cacheGet(k) { var d = await idb(); if (!d) return null; return new Promise(function (ok) { try { var q = d.transaction('f').objectStore('f').get(k); q.onsuccess = function () { ok(q.result || null); }; q.onerror = function () { ok(null); }; } catch (e) { ok(null); } }); }
  async function cachePut(k, v) { var d = await idb(); if (!d) return; try { d.transaction('f', 'readwrite').objectStore('f').put(v, k); } catch (e) {} }
  var VOLTA = {};
  async function text(name) {
    if (MEM[name] != null) return MEM[name];
    if (VOLTA[name]) return VOLTA[name];
    return (VOLTA[name] = (async function () {
      try {
        if (linkK) { var l = await call('link.get', { k: linkK, name: name }); if (name !== 'index.json') MEM[name] = l.content; return l.content; }
        var ck = 'u:' + ((sess() || {}).user || {}).email + ':' + name, c0 = window.PLANNER_SUPABASE ? await cacheGet(ck) : null;
        var j = await call('data.get', c0 ? { name: name, tem: c0.at } : { name: name });
        var c = j.same ? c0.c : j.url ? await fetch(j.url).then(function (r) { if (!r.ok) throw new Error('not_found: ' + name); return r.text(); }) : j.content;
        if (!j.same && window.PLANNER_SUPABASE && j.atualizado) cachePut(ck, { at: j.atualizado, c: c });
        if (name !== 'index.json') MEM[name] = c;
        return c;
      } finally { delete VOLTA[name]; }
    })());
  }
  async function json(name) { var o = JSON.parse(await text(name)); if (name === 'index.json' || /index\.json$/.test(name) && o.versions) rememberIndex(o); return o; }
  async function put(name, content) { var r = await call('data.put', { name: name, content: content }); delete MEM[name]; return r; }

  window.PlannerAuth = {
    page: page, linkK: linkK, sess: sess, can: can, call: call, configured: configured,
    user: function () { var s = sess(); return s && s.user; },
    async login(email, senha) { var j = await call('login', { email: email, senha: senha }); setSess({ token: j.token, expira: j.expira, user: j.user }); try { sessionStorage.setItem('plannerMe', '1'); } catch (e) {} return j.user; },
    async logout() { try { await call('logout'); } catch (e) {} setSess(null); try { sessionStorage.clear(); indexedDB.deleteDatabase('plannerFiles'); } catch (e) {} location.replace('login.html'); },
    signup: function (d) { return call('signup', d); }
  };
  window.PlannerData = { text: text, json: json, put: put, list: function (p) { return call('data.list', { prefix: p || '' }).then(function (j) { return j.files; }); } };
})();
