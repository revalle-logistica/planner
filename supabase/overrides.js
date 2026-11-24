
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
