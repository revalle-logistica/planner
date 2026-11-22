/* Linha de cliente: [unb, código, nome, status, setorAntes, freqAntes, máscaraAntes, setorDepois, freqDepois, máscaraDepois,
   lat, lon, cidade, ordemAntes[7], ordemDepois[7], endereço, últimaCompra, janela, volumeMês, entregasMês]
   Núcleo de leitura dos arquivos (Planner e relatório de clientes) e montagem de uma versão do planner.
   Usado pela tela de importação (navegador) e pelo script de carga inicial (Node). */
(function (root) {
  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
  const KNOWN = {
    '1031287': { name: 'Alagoinhas', abbr: 'ALA', rev: 'Agreste' },
    '1031295': { name: 'Serrinha', abbr: 'SER', rev: 'Agreste' },
    '826588': { name: 'Ribeira do Pombal', abbr: 'POM', rev: 'Nordeste' },
    '983616': { name: 'Paulo Afonso', abbr: 'PAF', rev: 'Nordeste' },
  };

  function decode(buf) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let t;
    try { t = new TextDecoder('utf-8', { fatal: true }).decode(u8); }
    catch (e) { t = new TextDecoder('windows-1252').decode(u8); }
    return t.replace(/^﻿/, '');
  }

  // CSV com ';' e aspas opcionais
  function parseCSV(text) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"' && f === '') q = true;
      else if (c === ';') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); f = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  function kindOf(rows) {
    const h = (rows[0] || []).map(x => x.trim());
    if (h.includes('Periodicidade') && h.includes('Seg1')) return 'planner';
    if (h.includes('Latitude') && h.includes('Longitude')) return 'clientes';
    if (h.includes('D.Size Total') || (h.includes('Volume') && h.includes('Entregas') && h.includes('Mapa'))) return 'volume';
    return null;
  }

  function parsePlanner(rows) {
    const h = rows[0].map(x => x.trim()); const ix = {}; h.forEach((c, i) => ix[c] = i);
    const recs = new Map(); let unb = null, unbName = '';
    for (const r of rows.slice(1)) {
      if (r.length < h.length) continue;
      const code = parseInt(r[ix['Cliente']], 10); if (!code) continue;
      unb = unb || r[ix['UNB Promax']].trim(); unbName = unbName || r[ix['Nome UNB']].trim();
      let m = ''; const q = [0, 0, 0, 0, 0, 0, 0];
      for (let w = 1; w <= 4; w++) DAYS.forEach((d, di) => { const v = parseInt(r[ix[d + w]], 10) || 0; m += v > 0 ? '1' : '0'; if (v > 0 && !q[di]) q[di] = Math.min(v, 999); });
      recs.set(code, {
        n: r[ix['Nome Cliente']].trim(), st: (r[ix['Status Cliente']] || 'A').trim()[0] || 'A',
        s: r[ix['Setor']].trim(), sn: r[ix['Nome Setor']].trim(), p: r[ix['Periodicidade']].trim(), m, q,
      });
    }
    return { unb, unbName, recs };
  }

  const LAT = /^-?\d{1,2},\d+$/;
  // devolve Map unb -> Map code -> [lat, lon, cidade]
  function parseClientes(rows) {
    const out = new Map(); const best = new Map();
    for (const r of rows.slice(1)) {
      const code = (r[0] || '').trim(); if (!/^\d+$/.test(code)) continue;
      let idx = -1;
      for (let i = 2; i < r.length - 1; i++) if (LAT.test(r[i].trim()) && LAT.test(r[i + 1].trim())) { idx = i; break; }
      if (idx < 0) continue;
      const lat = parseFloat(r[idx].replace(',', '.')), lon = parseFloat(r[idx + 1].replace(',', '.'));
      if (!(lat > -34 && lat < 6 && lon > -75 && lon < -30) || (lat === 0 && lon === 0)) continue;
      let unb = null;
      for (let i = r.length - 1; i > idx; i--) { const v = r[i].trim(); if (/^\d{5,8}$/.test(v)) { unb = v; break; } }
      if (!unb) continue;
      const city = idx >= 2 ? r[idx - 2].trim() : '';
      const clean = v => { v = (v || '').trim().replace(/\s+/g, ' '); return v === '-' ? '' : v; };
      const addr = idx >= 3 ? clean(r[idx - 3]) : '';
      const ult = /^\d{2}\/\d{2}\/\d{4}$/.test((r[idx + 10] || '').trim()) ? r[idx + 10].trim() : '';
      const j1 = (r[idx + 2] || '').trim().slice(0, 5), j2 = (r[idx + 3] || '').trim().slice(0, 5);
      const jan = j1 && j2 && !(j1 === '00:00' && j2 === '23:59') ? j1 + '-' + j2 : '';
      const ativo = (r[idx + 4] || '').trim() === 'Não';
      const key = unb + '|' + code;
      if (best.has(key) && best.get(key) && !ativo) continue;
      best.set(key, ativo);
      if (!out.has(unb)) out.set(unb, new Map());
      out.get(unb).set(+code, [Math.round(lat * 1e6) / 1e6, Math.round(lon * 1e6) / 1e6, city && city !== '-' ? titleCase(city) : '', titleCase(addr), ult, jan]);
    }
    return out;
  }

  // Relatório 03.05.30 (entregas por cliente/mapa): devolve volume e entregas por mês por cliente
  function parseVolume(rows) {
    const h = rows[0].map(x => x.trim()); const iv = h.indexOf('Volume'), ie = h.indexOf('Entregas'), idt = h.findIndex(x => x.startsWith('Data'));
    const acc = new Map(); let dmin = null, dmax = null;
    for (const r of rows.slice(1)) {
      if (r.length <= ie) continue;
      const code = parseInt(r[0], 10); if (!code) continue;
      const v = parseFloat((r[iv] || '').trim().replace(',', '.')) || 0, e = parseInt(r[ie], 10) || 0;
      const m = (r[idt] || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) { const d = new Date(+m[3], +m[2] - 1, +m[1]); if (!dmin || d < dmin) dmin = d; if (!dmax || d > dmax) dmax = d; }
      const x = acc.get(code) || { v: 0, e: 0 }; x.v += v; x.e += e; acc.set(code, x);
    }
    const months = dmin ? Math.max(1, (dmax - dmin) / 864e5 / 30.44) : 1;
    const out = new Map();
    for (const [k, x] of acc) out.set(k, [Math.round(x.v / months * 10) / 10, Math.round(x.e / months * 10) / 10]);
    const iso = d => d ? d.toISOString().slice(0, 10) : '';
    return { vol: out, from: iso(dmin), to: iso(dmax), months: Math.round(months * 10) / 10 };
  }
  // escolhe a unidade cujo planner tem mais códigos em comum com o arquivo de volume
  function guessUnit(vol, unitCodes) {
    let best = null, bn = 0;
    for (const [u, set] of unitCodes) { let n = 0; for (const k of vol.keys()) if (set.has(k)) n++; if (n > bn) { bn = n; best = u; } }
    return { unit: best, match: bn };
  }
  function volFromVersion(ver, unb) {
    const m = new Map(); for (const c of ver.clients) if (c[0] === unb && c[18] != null) m.set(c[1], [c[18], c[19]]); return m;
  }

  function titleCase(s) { return s.toLowerCase().replace(/(^|\s)\S/g, t => t.toUpperCase()); }

  function unitMeta(unb, unbName) {
    const k = KNOWN[unb];
    if (k) return { id: unb, ...k };
    const nm = titleCase((unbName || unb).replace(/^REVALLE\s*-\s*/i, ''));
    return { id: unb, name: nm, abbr: nm.slice(0, 3).toUpperCase(), rev: '' };
  }

  // Recria os registros (pré ou pós) de uma unidade a partir de uma versão já publicada
  function recsFromVersion(ver, unb, side) {
    const recs = new Map(); const names = (ver.sellers || {})[unb] || {};
    for (const c of ver.clients) {
      if (c[0] !== unb) continue;
      const [, code, n, st, sa, pa, ma, sb, pb, mb] = c;
      const s = side === 'pre' ? sa : sb, p = side === 'pre' ? pa : pb, m = side === 'pre' ? ma : mb;
      if (!m) continue;
      const q = (side === 'pre' ? c[13] : c[14]) || [0, 0, 0, 0, 0, 0, 0];
      recs.set(code, { n, st, s, sn: names[s] || '', p, m, q });
    }
    return recs;
  }
  function coordsFromVersion(ver, unb) {
    const m = new Map();
    for (const c of ver.clients) if (c[0] === unb && c[10] != null) m.set(c[1], [c[10], c[11], c[12], c[15] || '', c[16] || '', c[17] || '']);
    return m;
  }

  function buildUnit(meta, pre, pos, coords, src, vol) {
    const names = {};
    for (const d of [pre, pos]) for (const c of d.values()) {
      if (!c.sn) continue;
      const bad = /�|JO O /.test(c.sn);
      if (!names[c.s] || (!bad && /�|JO O /.test(names[c.s]))) names[c.s] = c.sn.replace(/�/g, '?');
    }
    for (const c of pos.values()) if (c.sn && !/�/.test(c.sn)) names[c.s] = c.sn;
    const clients = []; let nc = 0;
    const codes = [...new Set([...pre.keys(), ...pos.keys()])].sort((a, b) => a - b);
    for (const code of codes) {
      const a = pre.get(code), b = pos.get(code), base = b || a;
      const co = coords.get(code); if (co) nc++;
      clients.push([meta.id, code, base.n, base.st, a ? a.s : '', a ? a.p : '', a ? a.m : '', b ? b.s : '', b ? b.p : '', b ? b.m : '',
        co ? co[0] : null, co ? co[1] : null, co ? co[2] : '',
        a ? a.q : null, b ? b.q : null, co ? co[3] || '' : '', co ? co[4] || '' : '', co ? co[5] || '' : '',
        vol && vol.has(code) ? vol.get(code)[0] : (vol ? 0 : null), vol && vol.has(code) ? vol.get(code)[1] : (vol ? 0 : null)]);
    }
    const unit = { ...meta, pre: pre.size, pos: pos.size, coord: nc, nocoord: codes.length - nc, src: src || {} };
    return { unit, clients, sellers: names };
  }

  // Resumo de uma versão para o índice do histórico
  function summarize(ver) {
    const u = {};
    for (const x of ver.units) u[x.id] = { id: x.id, name: x.name, abbr: x.abbr, pre: x.pre, pos: x.pos, n: 0, chg: 0, V: 0, D: 0, F: 0, va: 0, vb: 0 };
    const cnt = m => { let n = 0; if (m) for (const ch of m) if (ch === '1') n++; return n; };
    const days = m => { const s = new Set(); if (m) for (let i = 0; i < 28; i++) if (m[i] === '1') s.add(i % 7); return [...s].sort().join(); };
    for (const c of ver.clients) {
      const [un, , , , sa, pa, ma, sb, pb, mb] = c; const x = u[un]; if (!x || !ma || !mb) continue;
      x.n++; x.va += cnt(ma); x.vb += cnt(mb);
      const v = sa !== sb, d = days(ma) !== days(mb), f = pa !== pb;
      if (v) x.V++; if (d) x.D++; if (f) x.F++;
      if (v || d || f || ma !== mb) x.chg++;
    }
    return { id: ver.id, vig: ver.vig, label: ver.label, created: ver.created, updated: ver.updated, units: ver.units.map(x => u[x.id]) };
  }

  const api = { DAYS, KNOWN, decode, parseCSV, kindOf, parsePlanner, parseClientes, parseVolume, guessUnit, volFromVersion, unitMeta, recsFromVersion, coordsFromVersion, buildUnit, summarize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PlannerCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
