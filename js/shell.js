/* Navegação comum (barra lateral no computador, barra inferior no celular) e tema.
   Carregado no <head> de todas as telas: aplica o tema antes de desenhar a página. */
(function () {
  var html = document.documentElement;
  var get = function (k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  html.setAttribute('data-theme', 'medio'); // tom único
  html.classList.add('has-side');
  if (get('plannerSideMini', '0') === '1') html.classList.add('side-mini');

  var I = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12" y="7" width="3" height="10" rx="1"/><rect x="17" y="13" width="3" height="4" rx="1"/>',
    route: '<circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="5" r="2.2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
    pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
    list: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
    up: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    meet: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    radar: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12 18 6"/>',
    kpi: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-6"/>',
    box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    check: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="m8 12 3 3 5-6"/>',
    truck: '<path d="M3 6.5h11v9H3z"/><path d="M14 9.5h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    out: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4"/><path d="M6 12h10"/>',
    file: '<path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z"/><path d="M14 3.5V8h4"/><path d="M9 13h6M9 16.5h4"/>',
    chev: '<path d="m15 6-6 6 6 6"/>'
  };
  var svg = function (k) { return '<svg viewBox="0 0 24 24">' + I[k] + '</svg>'; };

  var NAV = [
    { sec: 'Planner de visitas' },
    { id: 'home', href: './', ic: 'home', t: 'Início' },
    { id: 'painel', href: 'painel.html', ic: 'chart', t: 'Antes × Depois' },
    { id: 'rota', href: 'rota.html', ic: 'route', t: 'Minha rota', cls: 'rota' },
    { id: 'r-analise', href: 'rotina.html?m=analise', ic: 'kpi', t: 'Análise do planner' },
    { sec: 'Crítica do planner' },
    { id: 'critica', href: 'critica.html', ic: 'pen', t: 'Crítica (GV)' },
    { id: 'alteracoes', href: 'alteracoes.html', ic: 'list', t: 'Alterações', badge: true },
    { id: 'links', href: 'links.html', ic: 'link', t: 'Links dos vendedores' },
    { sec: 'Logística' },
    { id: 'janelas', href: 'janelas.html', ic: 'truck', t: 'Janelas BEES', badge3: true },
    { sec: 'Rotina e indicadores' },
    { id: 'r-sem', href: 'rotina.html?m=sem', ic: 'meet', t: 'Reunião semanal' },
    { id: 'r-mon', href: 'rotina.html?m=mon', ic: 'radar', t: 'Monitor' },
    { id: 'r-ind', href: 'rotina.html?m=ind', ic: 'kpi', t: 'Indicadores' },
    { id: 'r-buf', href: 'rotina.html?m=buf', ic: 'box', t: 'Buffer' },
    { sec: 'Ações' },
    { id: 'r-opp', href: 'rotina.html?m=opp', ic: 'star', t: 'Oportunidades' },
    { id: 'r-pa', href: 'rotina.html?m=pa', ic: 'check', t: 'Plano de ação' },
    { sec: 'Administração' },
    { id: 'relatorios', href: 'relatorios.html', ic: 'file', t: 'Central de relatórios', badge2: true },
    { id: 'importar', href: 'importar.html', ic: 'up', t: 'Importar planner' },
    { id: 'r-imp', href: 'rotina.html?m=imp', ic: 'up', t: 'Bases da rotina', adm: 1 },
    { id: 'usuarios', href: 'usuarios.html', ic: 'users', t: 'Usuários e equipes' }
  ];
  var MOBILE = ['home', 'painel', 'rota', 'critica', 'alteracoes'];
  var SHORT = { home: 'Início', painel: 'Painel', rota: 'Minha rota', critica: 'Crítica', alteracoes: 'Alterações' };

  function current() {
    var p = location.pathname.split('/').pop() || 'index.html';
    var m = { 'index.html': 'home', 'painel.html': 'painel', 'rota.html': 'rota', 'critica.html': 'critica', 'alteracoes.html': 'alteracoes', 'importar.html': 'importar', 'janelas.html': 'janelas', 'links.html': 'links', 'usuarios.html': 'usuarios', 'relatorios.html': 'relatorios' };
    if (p === 'critica.html' && /reg=1/.test(location.hash)) return 'alteracoes';
    if (p === 'rotina.html') return 'r-' + (new URLSearchParams(location.search).get('m') || 'sem');
    return m[p] || '';
  }

  var A = window.PlannerAuth;
  function allowed(n) { if (n.adm && !(A && A.user() && A.user().perfil === 'admin')) return false; return !n.href || !A || !A.configured() || A.can(n.href.replace('./', 'index.html').split(/[?#]/)[0]); }
  function build() {
    if (A && A.linkK) { html.classList.remove('has-side'); return; } // vendedor pelo link: só a Minha rota
    var cur = current();
    var VIS = NAV.filter(function (n, i) {
      if (n.sec) { for (var j = i + 1; j < NAV.length && !NAV[j].sec; j++) if (allowed(NAV[j]) && !NAV[j].soon) return true; return n.sec === 'Próximos módulos' && A && A.user() && A.user().perfil === 'admin'; }
      return n.soon ? (A && A.user() && A.user().perfil === 'admin') : allowed(n);
    });
    var h = '<a class="sb-top" href="./"><div class="sb-logo">R</div><div class="sb-name"><b>Planner <span>Revalle</span></b><small>Logística · Agreste e Nordeste</small></div></a><nav class="sb-nav">';
    VIS.forEach(function (n) {
      if (n.sec) { h += '<div class="sb-sec">' + n.sec + '</div>'; return; }
      var cls = 'sb-a' + (n.cls ? ' ' + n.cls : '') + (n.id === cur ? ' on' : '') + (n.soon ? ' soon' : '');
      var tail = n.soon ? '<em class="sb-tag">breve</em>' : (n.badge ? '<b class="sb-badge" data-badge hidden></b>' : n.badge2 ? '<b class="sb-badge" data-badge2 hidden style="background:#ef4444;color:#fff"></b>' : n.badge3 ? '<b class="sb-badge" data-badge3 hidden></b>' : '');
      h += n.soon
        ? '<a class="' + cls + '" data-tip="' + n.t + ' · em breve">' + svg(n.ic) + '<span>' + n.t + '</span>' + tail + '</a>'
        : '<a class="' + cls + '" href="' + n.href + '" data-tip="' + n.t + '">' + svg(n.ic) + '<span>' + n.t + '</span>' + tail + '</a>';
    });
    var me = A && A.user();
    h += '</nav><div class="sb-foot">' + (me ? '<div class="sb-me" title="' + me.email + '"><div class="sb-av">' + me.nome.split(' ').map(function (x) { return x[0]; }).slice(0, 2).join('').toUpperCase() + '</div><div class="sb-mn"><b>' + me.nome.split(' ')[0] + '</b><small>' + (me.perfil === 'admin' ? 'Administrador' : 'GV') + '</small></div><button class="sb-out" title="Sair">' + svg('out') + '</button></div>' : '') + '<div class="sb-theme" title="Tom das telas"><button data-th="medio">Médio</button><button data-th="escuro">Escuro</button><button class="sb-th1" title="Trocar o tom (médio / escuro)"><svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;vertical-align:middle"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg></button></div>' +
      '<button class="sb-min" title="Recolher / expandir a barra">' + svg('chev') + '<span>Recolher menu</span></button></div>';
    var sb = document.createElement('aside'); sb.className = 'sb'; sb.innerHTML = h;
    document.body.appendChild(sb);

    var bn = document.createElement('nav'); bn.className = 'bn';
    bn.innerHTML = MOBILE.filter(function (id) { return allowed(NAV.filter(function (x) { return x.id === id; })[0]); }).map(function (id) {
      var n = NAV.filter(function (x) { return x.id === id; })[0];
      return '<a href="' + n.href + '" class="' + (n.cls || '') + (id === cur ? ' on' : '') + '">' + svg(n.ic) + SHORT[id] + (n.badge ? '<b class="sb-badge" data-badge hidden></b>' : '') + '</a>';
    }).join('');
    document.body.appendChild(bn);

    var paintTheme = function () {
      var t = html.getAttribute('data-theme');
      sb.querySelectorAll('[data-th]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-th') === t); });
      var mc = document.querySelector('meta[name=theme-color]'); if (mc) mc.content = '#26385a';
    };
    sb.querySelectorAll('[data-th]').forEach(function (b) {
      b.onclick = function () { html.setAttribute('data-theme', b.getAttribute('data-th')); set('plannerTheme', b.getAttribute('data-th')); paintTheme(); };
    });
    sb.querySelector('.sb-th1').onclick = function () { var t = html.getAttribute('data-theme') === 'medio' ? 'escuro' : 'medio'; html.setAttribute('data-theme', t); set('plannerTheme', t); paintTheme(); };
    paintTheme();
    var so = sb.querySelector('.sb-out'); if (so) so.onclick = function () { A.logout(); };
    sb.querySelector('.sb-min').onclick = function () {
      html.classList.toggle('side-mini'); set('plannerSideMini', html.classList.contains('side-mini') ? '1' : '0');
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 300); // mapas se ajustam
    };

    // Dica com o nome quando a barra está recolhida
    var tip = document.createElement('div'); tip.className = 'sb-tip'; document.body.appendChild(tip);
    sb.querySelectorAll('[data-tip]').forEach(function (a) {
      a.addEventListener('mouseenter', function () {
        if (!html.classList.contains('side-mini')) return;
        var r = a.getBoundingClientRect(); tip.textContent = a.getAttribute('data-tip');
        tip.style.left = (r.right + 10) + 'px'; tip.style.top = (r.top + r.height / 2 - 14) + 'px'; tip.classList.add('on');
      });
      a.addEventListener('mouseleave', function () { tip.classList.remove('on'); });
    });

    pendingBadge(); relBadge();
  }

  // Nº de solicitações aguardando parecer (cache de 3 min para não pesar)
  function pendingBadge() {
    if (!window.PlannerAPI) return;
    var show = function (n) {
      document.querySelectorAll('[data-badge]').forEach(function (b) { b.textContent = n > 99 ? '99+' : n; b.hidden = !n; b.title = n + ' aguardando parecer'; });
    };
    try {
      var c = JSON.parse(sessionStorage.getItem('plannerPend') || 'null');
      if (c && Date.now() - c.t < 180000) { show(c.n); return; }
    } catch (e) {}
    window.PlannerData.json('index.json').then(function (ix) {
      var v = ix.versions.sort(function (a, b) { return b.vig.localeCompare(a.vig); })[0].id;
      return window.PlannerAPI.list(v);
    }).then(function (items) {
      var n = items.filter(function (i) { return !i.parecer || /pendente/i.test(i.parecer); }).length;
      try { sessionStorage.setItem('plannerPend', JSON.stringify({ t: Date.now(), n: n })); } catch (e) {}
      show(n); window.PlannerPending = n;
    }).catch(function () {});
  }
  // Relatórios semanais que faltam atualizar nesta semana (só administrador)
  function relBadge() {
    if (!A || !A.user() || A.user().perfil !== 'admin' || !window.PlannerData) return;
    var show = function (n) { document.querySelectorAll('[data-badge2]').forEach(function (b) { b.textContent = n; b.hidden = !n; b.title = n + ' relatórios para atualizar'; }); };
    try { var c = JSON.parse(sessionStorage.getItem('plannerRelPend') || 'null'); if (c && Date.now() - c.t < 300000) { show(c.n); return; } } catch (e) {}
    window.PlannerData.text('rel/index.json').then(function (t) { return JSON.parse(t); }).catch(function () { return { r: {} }; }).then(function (ix) {
      var seg = new Date(); seg.setHours(0, 0, 0, 0); seg.setDate(seg.getDate() - ((seg.getDay() + 6) % 7));
      var n = 0; ['bees', '010278', '012011', 'coord', 'ajustes'].forEach(function (id) { ['1031287', '1031295', '826588', '983616'].forEach(function (u) { var x = (ix.r[id] || {})[u]; if (!x || new Date(x.em) < seg) n++; }); });
      try { sessionStorage.setItem('plannerRelPend', JSON.stringify({ t: Date.now(), n: n })); } catch (e) {}
      show(n);
    });
    // PDVs novos pendentes de definição no Janelas BEES
    var show3 = function (n) { document.querySelectorAll('[data-badge3]').forEach(function (b) { b.textContent = n; b.hidden = !n; b.title = n + ' PDVs novos aguardando o dia da janela'; }); };
    try { var c3 = JSON.parse(sessionStorage.getItem('plannerJanPend') || 'null'); if (c3 && Date.now() - c3.t < 300000) { show3(c3.n); return; } } catch (e) {}
    window.PlannerData.text('janelas/index.json').then(function (t) { var p = JSON.parse(t).pendentes || {}; var n = 0; for (var k in p) n += +p[k] || 0; try { sessionStorage.setItem('plannerJanPend', JSON.stringify({ t: Date.now(), n: n })); } catch (e) {} show3(n); }).catch(function () {});
  }
  window.PlannerShell = { refreshBadge: function () { try { sessionStorage.removeItem('plannerPend'); } catch (e) {} pendingBadge(); } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
