/* Endereço do App da Web do Apps Script "Planner Revalle - Sistema" (conta Log Agreste).
   Cole aqui a URL que termina em /exec depois de implantar (Implantar → Nova implantação → App da Web). */
// Servidor do sistema: Supabase (projeto "Projetos Log Revalle"). Desde 24/11/2026.
window.PLANNER_SYS_API = 'https://krlkencgakuaisyrxeho.supabase.co/functions/v1/planner-api';
// Reserva (sistema antigo no Google, parado em 24/11/2026): https://script.google.com/macros/s/AKfycbyISEBjWi-M6CzVY7QknghkBf_cUDTYLGw4JTOag7LJQdbPivem_YjcPALSZpFKBqMy/exec
/* Teste do novo servidor (Supabase) só neste navegador: localStorage.plannerApi = '<url>' */
try { if (localStorage.getItem('plannerApi')) window.PLANNER_SYS_API = localStorage.getItem('plannerApi'); } catch (e) {}
window.PLANNER_SUPABASE = /\.supabase\.co\//.test(window.PLANNER_SYS_API);
