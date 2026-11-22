/* Conexão com o registro da crítica (Google Apps Script + planilha "Planner Revalle - Crítica do planner").
   Leitura: GET ?v=<versão>  ·  Escrita: POST (text/plain, para não exigir preflight de CORS). */
window.PLANNER_API = 'https://script.google.com/macros/s/AKfycbwzX45zmN6QDqWLcpKnwRoTnxMQwyL1nSXHnJUOvLg5EIa9XJ9A-Z686gzvJ4Dqy4eMPA/exec';
window.PlannerAPI = {
  ok: () => /^https:\/\/script\.google\.com\//.test(window.PLANNER_API),
  async list(v) {
    const r = await fetch(`${window.PLANNER_API}?v=${encodeURIComponent(v)}&t=${Date.now()}`, { redirect: 'follow' });
    const j = await r.json(); if (!j.ok) throw new Error(j.error || 'erro ao ler o registro'); return j.items || [];
  },
  async post(body) {
    const r = await fetch(window.PLANNER_API, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    const j = await r.json(); if (!j.ok) throw new Error(j.error || 'erro ao gravar'); return j;
  }
};
