/* Janelas BEES — base viva e análise semanal.
   Base viva (Drive: janelas/base/<unb>.json):
     clientes: { cod: { d:'1000100' (Seg..Dom), o:'g'|'a'|'n'|'r' (gabarito/ajuste/novo/reativado), em:'AAAA-MM-DD', p?:pedido } }
     pend:     { cod: { desde, tipo:'novo'|'reativado', motivo } }   PDV novo/reativado sem sinergia: fica NO até decidir
     inat:     { cod: { em, d } }                                   inativados (saíram do 01.02.78.03)
     pedidos:  { pedido: 'AAAA-MM-DD' }                             ajustes já aplicados (não reaplica)
   Regras: sinergia = pelo menos 5 PDVs da base com janela no mesmo dia num raio de 3 km. */
(function (root) {
  const RAIO = 3, MIN = 5;
  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const hoje = () => new Date().toISOString().slice(0, 10);
  const vazia = unb => ({ unb, criado: new Date().toISOString(), atualizado: '', origem: null, clientes: {}, pend: {}, inat: {}, pedidos: {} });
  const mask = arr => arr.map(x => x ? '1' : '0').join('');
  const abertos = d => [...d].map((c, i) => c === '1' ? i : -1).filter(i => i >= 0);
  const txtDias = d => abertos(d).map(i => DIAS[i]).join('/') || '—';

  // base a partir do gabarito (CSV "Segunda - Semana 1"...): valor > 0 = aberto
  function deGabarito(unb, txt) {
    const L = txt.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
    const h = L[0].split(';').map(x => x.trim());
    const ic = h.findIndex(x => /digo Cliente/.test(x)), ks = h.map((x, i) => /Semana 1$/.test(x) ? i : -1).filter(i => i >= 0).slice(0, 7);
    const b = vazia(unb); b.origem = { tipo: 'gabarito', em: new Date().toISOString() };
    for (const l of L.slice(1)) {
      const c = l.split(';'), cod = String(c[ic] || '').trim().replace(/^0+(?=\d)/, ''); if (!cod) continue;
      b.clientes[cod] = { d: mask(ks.map(k => (parseFloat(String(c[k] || '0').replace(',', '.')) || 0) > 0)), o: 'g', em: hoje() };
    }
    return b;
  }
  // base a partir das janelas pós do planner publicado (cliente[21], semana 1)
  function deVersao(unb, ver) {
    const b = vazia(unb); b.origem = { tipo: 'planner', em: new Date().toISOString(), versao: ver.id };
    for (const c of ver.clients) if (c[0] === unb && c[21]) b.clientes[String(c[1])] = { d: c[21].slice(0, 7), o: 'g', em: hoje() };
    return b;
  }

  // ---- distância e vizinhança (grade de ~3 km para não comparar todo mundo com todo mundo)
  function km(a, b) { const R = 6371, t = x => x * Math.PI / 180; const dl = t(b[0] - a[0]), dn = t(b[1] - a[1]); const h = Math.sin(dl / 2) ** 2 + Math.cos(t(a[0])) * Math.cos(t(b[0])) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
  function grade(pontos) { // pontos: [{cod, c:[lat,lon], d}]
    const G = new Map(), k = (i, j) => i + '|' + j, S = 0.03;
    for (const p of pontos) { const i = Math.floor(p.c[0] / S), j = Math.floor(p.c[1] / S); const kk = k(i, j); if (!G.has(kk)) G.set(kk, []); G.get(kk).push(p); }
    return {
      perto(c, excl) {
        const i0 = Math.floor(c[0] / S), j0 = Math.floor(c[1] / S), out = [];
        for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const p of G.get(k(i, j)) || []) if (p.cod !== excl && km(c, p.c) <= RAIO) out.push(p);
        return out;
      }
    };
  }
  function contagem(g, c, excl) { const n = [0, 0, 0, 0, 0, 0, 0]; for (const p of g.perto(c, excl)) for (const i of abertos(p.d)) n[i]++; return n; }
  /* Sinergia = o carro não ir à mesma região em dois dias diferentes.
     Um dia d do PDV tem sinergia se: tem MIN vizinhos naquele dia, OU nenhum outro dia da região
     (fora os dias do próprio PDV) tem mais clientes que d. Região sem nenhum outro cliente = isolado (ok). */
  function okDia(n, d, proprios) { if (n[d] >= MIN) return true; for (let i = 0; i < 7; i++) if (i !== d && !proprios.includes(i) && n[i] > n[d]) return false; return true; }
  function total(n) { return n.reduce((a, b) => a + b, 0); }
  function diaRegiao(n, proprios) { let b = -1; for (let i = 0; i < 7; i++) if (!(proprios || []).includes(i) && n[i] > 0 && (b < 0 || n[i] > n[b])) b = i; return b; }
  function sugestao(n) { let best = -1; for (let i = 0; i < 7; i++) if (n[i] >= MIN && (best < 0 || n[i] > n[best])) best = i; if (best < 0 && total(n)) { best = diaRegiao(n, []); if (best >= 0 && !okDia(n, best, [])) best = -1; } return best; }

  /* Análise da semana. Não altera a base.
     ent: { base, ativos:[[cod,status,setor]], coords:{cod:[lat,lon]}, ajustes:[{pedido,cod,dias[7],...}], bees: rows do arquivo do BEES }
     Retorna o que vai acontecer, para revisão na tela. */
  function analisar(ent) {
    const B = ent.base, ativos = new Map((ent.ativos || []).map(a => [String(a[0]), a])), C = ent.coords || {};
    const cli = {}; for (const k in B.clientes) cli[k] = Object.assign({}, B.clientes[k]);
    // 1) ajustes aprovados (por nº do pedido; o que já foi aplicado é ignorado)
    const ajustes = [];
    for (const it of ent.ajustes || []) {
      const ja = it.pedido && B.pedidos[it.pedido];
      const r = { item: it, aplicar: false, motivo: '' };
      if (ja) r.motivo = 'já aplicado em ' + ja.split('-').reverse().join('/');
      else if (ativos.size && !ativos.has(it.cod)) r.motivo = 'cliente não está ativo no 01.02.78.03';
      else if (!it.dias.some(Boolean)) r.motivo = 'ajuste sem nenhum dia marcado';
      else { r.aplicar = true; r.antes = cli[it.cod] ? cli[it.cod].d : null; cli[it.cod] = { d: mask(it.dias), o: 'a', em: hoje(), p: it.pedido }; }
      ajustes.push(r);
    }
    // 2) inativados: estavam na base e não aparecem no 01.02.78.03
    const inativos = [];
    if (ativos.size) for (const k of Object.keys(cli)) if (!ativos.has(k)) { inativos.push({ cod: k, d: cli[k].d }); delete cli[k]; }
    // grade da base ativa com coordenada
    const pts = []; for (const k in cli) if (C[k]) pts.push({ cod: k, c: C[k], d: cli[k].d });
    const g = grade(pts);
    // janelas que o BEES tem hoje (para avisar PDV novo aberto sem sinergia)
    const beesDias = {}; for (const r of ent.bees || []) { const k = String(r.ERP_POC_ID || '').trim(); if (k) beesDias[k] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => r[d] === 'FREE' ? '1' : '0').join(''); }
    // 3) PDVs novos / reativados / pendentes de semanas anteriores
    const novos = [];
    for (const [k, a] of ativos) {
      if (cli[k]) continue;
      const tipo = B.inat[k] ? 'reativado' : 'novo', pend = B.pend[k];
      const c = C[k] || null, n = c ? contagem(g, c, k) : null, s = n ? sugestao(n) : -1;
      const bd = beesDias[k] && beesDias[k].includes('1') ? beesDias[k] : null;
      novos.push({ cod: k, tipo, status: a[1], setor: a[2], coord: c, cont: n, sug: s, desde: pend ? pend.desde : hoje(), pendente: !!pend,
        motivo: !c ? 'sem coordenada' : s < 0 ? (total(n) ? 'região dividida entre dias, sem dia dominante' : 'isolado: nenhum cliente da base em ' + RAIO + ' km (confira a coordenada)') : '',
        beesDias: bd, beesSemSinergia: bd && n ? abertos(bd).filter(i => !okDia(n, i, abertos(bd))).map(i => DIAS[i]) : [],
        antes: B.inat[k] ? B.inat[k].d : null });
    }
    // 4) aviso: clientes da base cujos dias abertos ficaram sem sinergia (ex.: coordenada mudou)
    const semSinergia = [];
    for (const p of pts) { const n = contagem(g, p.c, p.cod), ab = abertos(p.d); const fr = ab.filter(i => !okDia(n, i, ab)); if (fr.length && fr.length === ab.length) semSinergia.push({ cod: p.cod, d: p.d, cont: n, regiao: diaRegiao(n, ab) }); }
    const ajSemSin = ajustes.filter(r => r.aplicar && C[r.item.cod]).map(r => { const n = contagem(g, C[r.item.cod], r.item.cod), ab = abertos(mask(r.item.dias)); return { r, fr: ab.filter(i => !okDia(n, i, ab)).map(i => DIAS[i]) }; }).filter(x => x.fr.length);
    ajSemSin.forEach(x => { x.r.semSinergia = x.fr; });
    return { cli, ajustes, inativos, novos, semSinergia, comCoord: pts.length, temAtivos: ativos.size > 0 };
  }

  /* Aplica as decisões (decisao[cod] = índice do dia 0..6 ou -1 para deixar pendente) e devolve a nova base. */
  function aplicar(B, A, decisao) {
    const N = JSON.parse(JSON.stringify(B));
    N.clientes = A.cli;
    for (const r of A.ajustes) if (r.aplicar && r.item.pedido) N.pedidos[r.item.pedido] = hoje();
    for (const x of A.inativos) { N.inat[x.cod] = { em: hoje(), d: x.d }; delete N.pend[x.cod]; }
    for (const x of A.novos) {
      const dia = decisao[x.cod];
      if (dia != null && dia >= 0) {
        N.clientes[x.cod] = { d: mask([0, 1, 2, 3, 4, 5, 6].map(i => i === dia)), o: x.tipo === 'reativado' ? 'r' : 'n', em: hoje() };
        delete N.pend[x.cod]; delete N.inat[x.cod];
      } else N.pend[x.cod] = { desde: x.desde, tipo: x.tipo, motivo: x.motivo || 'aguardando definição' };
    }
    for (const k of Object.keys(N.pend)) if (!A.novos.some(x => x.cod === k)) delete N.pend[k]; // saiu do Promax ou já está na base
    N.atualizado = new Date().toISOString();
    return N;
  }
  // mapa código → [7 bool] para o gerador do CSV
  function mapa(base) { const m = new Map(); for (const k in base.clientes) m.set(k, [...base.clientes[k].d].map(c => c === '1')); return m; }

  const api = { RAIO, MIN, DIAS, okDia, diaRegiao, vazia, deGabarito, deVersao, analisar, aplicar, mapa, txtDias, abertos, km };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.JanelasBase = api;
})(typeof window !== 'undefined' ? window : globalThis);
