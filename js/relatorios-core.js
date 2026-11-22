/* Central de relatórios: catálogo, reconhecimento dos arquivos e formato guardado no Drive.
   Cada relatório vira um arquivo enxuto por unidade em rel/<id>/<unb>.<ext>; o resumo fica em rel/index.json.
   Usa PlannerCore (js/core.js) para o relatório de clientes do roteirizador. */
(function (root) {
  const UNIDADES = { '1031287': 'Alagoinhas', '1031295': 'Serrinha', '826588': 'Ribeira do Pombal', '983616': 'Paulo Afonso' };
  const ORDEM = ['1031287', '1031295', '826588', '983616'];
  const CATALOGO = [
    { id: 'bees', cod: 'BEES', nome: 'Janelas atuais do BEES', desc: 'Exportação das janelas de entrega no BEES (documento do cliente e dias abertos). Baixe e suba direto, sem abrir no Excel.', freq: 'semanal', ext: 'csv', usa: ['Janelas BEES'] },
    { id: '010278', cod: '01.02.78.03', nome: 'Clientes ativos (Promax)', desc: 'Quem está ativo em cada unidade. Cliente fora deste relatório é tratado como inativado; cliente fora da base é PDV novo.', freq: 'semanal', ext: 'json', usa: ['Janelas BEES'] },
    { id: '012011', cod: '01.20.11', nome: 'Cadastro de clientes (CPF/CNPJ)', desc: 'Guarda só o código e o CPF/CNPJ de cada cliente, para completar documentos quebrados no BEES.', freq: 'semanal', ext: 'json', usa: ['Janelas BEES'] },
    { id: 'coord', cod: 'Roteirizador', nome: 'Relatório de clientes (coordenadas)', desc: 'Latitude e longitude de cada cliente, usadas para calcular a sinergia (3 km, 5 vizinhos). Um arquivo traz todas as unidades.', freq: 'semanal', ext: 'json', usa: ['Janelas BEES'] },
    { id: 'ajustes', cod: 'Ajustes', nome: 'Ajustes de janelas fixas', desc: 'Planilha do sistema de alteração de dia de janela (aba Ajustes). Um arquivo traz todas as unidades.', freq: 'semanal', ext: 'json', usa: ['Janelas BEES'] },
    { id: 'gabarito', cod: 'Gabarito', nome: 'Gabarito visão entrega 2ª janela', desc: 'Base das janelas de entrega. Só quando sair um planner novo.', freq: 'planner', ext: 'csv', usa: ['Janelas BEES'] }
  ];
  const FREQ = { semanal: 'Semanal', planner: 'A cada planner', mensal: 'Mensal' };
  const semAc = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const normCod = v => { v = String(v || '').trim(); v = /^\d{1,3}(\.\d{3})+$/.test(v) ? v.replace(/\./g, '') : v.replace(/[.,]0+$/, ''); return /^\d+$/.test(v) ? v.replace(/^0+(?=\d)/, '') : ''; };
  const normDoc = v => { v = String(v || '').trim(); if (/e[+-]?\d/i.test(v)) return ''; v = v.replace(/[.,]0+$/, '').replace(/\D/g, '').replace(/^0+(?=\d)/, ''); return v === '0' ? '' : v; };

  function splitCSV(txt) {
    txt = txt.replace(/^﻿/, '');
    const L = txt.split(/\r?\n/).filter(l => l.trim() !== '');
    const sep = (L[0] || '').includes(';') ? ';' : ',';
    return { head: (L[0] || '').split(sep).map(h => h.trim()), rows: L.slice(1).map(l => l.split(sep)), lines: L, sep };
  }

  /* Reconhece o relatório. Retorna [{id, unb, dados, linhas, conteudo}] — um item por unidade.
     ctx.codigos: Map unb -> Set de códigos (do planner publicado), para descobrir a unidade do cadastro. */
  function ler(nome, txt, ctx) {
    const P = root.PlannerCore;
    const t = splitCSV(txt), h = t.head.join(';'), hs = semAc(h);
    // BEES
    if (h.includes('ERP_POC_ID') && h.includes('Vendor_Account_ID')) {
      const by = {}; const iD = t.head.indexOf('DDC_ID');
      t.rows.forEach((r, i) => { const u = String(r[iD] || '').trim(); (by[u] = by[u] || []).push(t.lines[i + 1]); });
      return Object.keys(by).map(u => ({ id: 'bees', unb: u, linhas: by[u].length, conteudo: [t.lines[0], ...by[u]].join('\r\n') + '\r\n' }));
    }
    // gabarito visão entrega
    if (/semana 1/.test(hs) && /codigo cliente/.test(hs) && /unidade/.test(hs)) {
      const iU = t.head.findIndex(x => /Unidade/.test(x)); const by = {};
      t.rows.forEach((r, i) => { const u = String(r[iU] || '').trim(); (by[u] = by[u] || []).push(t.lines[i + 1]); });
      return Object.keys(by).map(u => ({ id: 'gabarito', unb: u, linhas: by[u].length, conteudo: [t.lines[0], ...by[u]].join('\r\n') + '\r\n' }));
    }
    // 01.02.78.03 (formato planner do Promax)
    if (h.includes('UNB Promax') && h.includes('Seg1') && h.includes('Cliente')) {
      const ix = {}; t.head.forEach((c, i) => ix[c] = i); const by = {};
      t.rows.forEach(r => {
        const u = String(r[ix['UNB Promax']] || '').trim(), c = normCod(r[ix['Cliente']]); if (!u || !c) return;
        (by[u] = by[u] || []).push([c, String(r[ix['Status Cliente']] || '').trim(), String(r[ix['Setor']] || '').trim()]);
      });
      return Object.keys(by).map(u => ({ id: '010278', unb: u, linhas: by[u].length, conteudo: JSON.stringify({ clientes: by[u] }) }));
    }
    // 01.20.11 cadastro (cabeçalho com CNPJ repetido: usa a 1ª coluna CNPJ)
    if (/razao social/.test(hs) && /cnpj/.test(hs) && /codigo cliente/.test(hs)) {
      const ic = t.head.findIndex(x => semAc(x) === 'codigo cliente'), id = t.head.findIndex(x => semAc(x) === 'cnpj');
      const m = {}; let n = 0;
      t.rows.forEach(r => { const c = normCod(r[ic]), d = normDoc(r[id]); if (c && d) { m[c] = d; n++; } });
      let unb = '', best = 0;
      for (const [u, set] of (ctx && ctx.codigos) || []) { let k = 0; for (const c in m) if (set.has(c)) k++; if (k > best) { best = k; unb = u; } }
      if (!unb) { const s = semAc(nome); unb = /alagoinhas/.test(s) ? '1031287' : /serrinha/.test(s) ? '1031295' : /pombal/.test(s) ? '826588' : /paulo/.test(s) ? '983616' : ''; }
      return [{ id: '012011', unb, linhas: n, conteudo: JSON.stringify(m) }];
    }
    // relatório de clientes do roteirizador (coordenadas)
    if (P && P.kindOf(P.parseCSV(txt.slice(0, 5000))) === 'clientes') {
      const map = P.parseClientes(P.parseCSV(txt));
      return [...map].map(([u, mm]) => { const o = {}; for (const [c, v] of mm) o[c] = [v[0], v[1]]; return { id: 'coord', unb: u, linhas: mm.size, conteudo: JSON.stringify(o) }; });
    }
    return null;
  }

  /* Planilha de ajustes (.xlsx): aba "Ajustes" → itens por unidade */
  function lerAjustes(wb) {
    const XLSX = root.XLSX;
    const ws = wb.Sheets['Ajustes'] || wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    const head = rows[0].map(x => semAc(x));
    const col = re => head.findIndex(x => re.test(x));
    const iU = col(/^cdd$/), iC = col(/cod/), iP = col(/^pdv$/), iA = col(/^ajuste$/), iPed = col(/pedido/), iR = col(/requisit/), iAp = col(/aprovado/);
    const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map(d => head.indexOf(d));
    if (iU < 0 || iC < 0 || dias[0] < 0) return null;
    const by = {};
    rows.slice(1).forEach(r => {
      const u = String(r[iU] || '').trim(), c = normCod(r[iC]); if (!u || !c) return;
      const d = dias.map(i => i >= 0 && String(r[i] || '').trim() !== '');
      (by[u] = by[u] || []).push({ pedido: String(r[iPed] || '').trim(), cod: c, pdv: String(r[iP] || '').trim(), ajuste: String(r[iA] || '').trim(), dias: d, req: String(r[iR] || '').trim(), aprovado: String(r[iAp] || '').trim() });
    });
    // a planilha traz todas as unidades: unidade sem linha = sem ajuste na semana (também conta como enviado)
    return ORDEM.map(u => ({ id: 'ajustes', unb: u, linhas: (by[u] || []).length, conteudo: JSON.stringify({ itens: by[u] || [] }) }));
  }

  /* situação de um relatório numa unidade */
  function segunda(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function situacao(freq, em, hoje) {
    hoje = hoje || new Date();
    if (!em) return 'nunca';
    const d = new Date(em);
    if (freq === 'semanal') { const s = segunda(hoje); if (d >= s) return 'ok'; const s1 = new Date(s); s1.setDate(s1.getDate() - 7); return d >= s1 ? 'atualizar' : 'atrasado'; }
    if (freq === 'mensal') return (hoje - d) / 864e5 <= 31 ? 'ok' : 'atrasado';
    return 'ok';
  }
  const caminho = (id, unb, ext) => `rel/${id}/${unb}.${ext}`;

  const api = { UNIDADES, ORDEM, CATALOGO, FREQ, ler, lerAjustes, situacao, caminho, normCod, normDoc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Relatorios = api;
})(typeof window !== 'undefined' ? window : globalThis);
