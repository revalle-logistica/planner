/* ===== Casca do Planner Revalle para as telas da rotina =====
   Menu → ?m=<grupo>. Dados da rotina no Drive (rotina/estado.gz + rotina/meta.json),
   com cópia no navegador enquanto não muda. Preferências e plano de ação em rotina/ls.json. */
const GRUPOS={
  sem:{t:'Reunião semanal',ids:['sem']},
  alt:{t:'Alterações',ids:['mon','alt']},
  ind:{t:'Indicadores',ids:['ind','kdia','chk','res']},
  buf:{t:'Buffer',ids:['buf']},
  analise:{t:'Análise do planner',ids:['todos','setor','dia','pdvvol','num']},
  opp:{t:'Oportunidades',ids:['opp']},
  pa:{t:'Plano de ação',ids:['pa']},
  imp:{t:'Bases da rotina',ids:['imp']}};
let M=new URLSearchParams(location.search).get('m')||'sem';if(M==='opp')location.replace('oportunidades.html');if(M==='mon')M='alt';if(!GRUPOS[M])M='sem';
const EU=(window.PlannerAuth&&PlannerAuth.user())||{};
const IS_ADMIN=EU.perfil==='admin';
let LSO={};
function avisoLeitura(){if(avisoLeitura.ok)return;avisoLeitura.ok=1;alertMsg('Só a Logística altera esta parte. Você pode consultar à vontade.')}
function grupoDe(id){for(const g in GRUPOS)if(GRUPOS[g].ids.includes(id))return g;return 'sem'}
function irPara(i){const s=SLIDES[i];if(!s)return;const g=grupoDe(s.id);if(g===M){UI.slide=i;render();window.scrollTo(0,0)}else location.href='rotina.html?m='+g+'&s='+s.id}
function grupoTabs(){const G=GRUPOS[M];const el=document.getElementById('gtabs');if(!el)return;
  const NOMES={mon:'📡 Monitor semanal',alt:'📈 Histórico pós-planner'};
  el.innerHTML=(M==='alt'&&PlannerAuth.can('alteracoes.html')?'<a href="alteracoes.html"><button>📝 Solicitações dos GVs</button></a>':'')+(G.ids.length>1?G.ids.map(id=>{const i=SLIDES.findIndex(s=>s.id===id);return `<button data-s="${i}" aria-pressed="${i===UI.slide}">${NOMES[id]||SLIDES[i].n}</button>`}).join(''):'');
  const t=document.getElementById('pgT');if(t)t.textContent=G.ids.length>1?G.t:SLIDES[UI.slide].n;
  const p=document.getElementById('pgS');if(p)p.textContent=SLIDES[UI.slide].sub}
// ---- gzip + base64 (o estado tem ~10 MB em JSON; comprimido fica ~1,5 MB)
function b64de(buf){const b=new Uint8Array(buf);let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s)}
function b64para(t){const s=atob(t);const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b}
async function gz(str){return b64de(await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer())}
async function gunz(t){return await new Response(new Blob([b64para(t)]).stream().pipeThrough(new DecompressionStream('gzip'))).text()}
function carregando(m){const s=document.getElementById('slide');if(s)s.innerHTML=`<div class="rload">${m}</div>`}
async function carregarEstado(){
  let meta;try{meta=JSON.parse(await PlannerData.text('rotina/meta.json'))}catch(e){return null}
  const c=await IDB.get('rz');if(c&&c.v===meta.v&&c.st)return c.st;
  carregando('Baixando os dados da rotina do Drive… (só na primeira vez ou quando houver atualização)');
  const st=JSON.parse(await gunz(await PlannerData.text('rotina/estado.gz')));IDB.set('rz',{v:meta.v,st});return st}
async function carregarLS(){try{return JSON.parse(await PlannerData.text('rotina/ls.json'))}catch(e){return {}}}
function statusRotina(){const out={};for(const u in ST.units){const Uu=ST.units[u];const mk=Object.values(Uu.maps||{});
  const ped=Object.values(Uu.ped||{});
  out[u]={'0530':Object.keys(Uu.days||{}).sort().pop()||null,'1142':mk.filter(o=>o.km>0&&o.d).map(o=>o.d).sort().pop()||null,'1120':mk.filter(o=>o.pv>0&&o.d).map(o=>o.d).sort().pop()||null,
    ped:ped.length?dstr(Math.max(...ped.map(x=>x[1]))):null,vis:Object.keys(Uu.vis||{}).sort().pop()||null,jan:Object.keys(Uu.jan||{}).sort().pop()||null,
    cli:Object.keys(Uu.clients||{}).length,planners:Object.keys(Uu.planners||{})}}
  return {units:out,acoes:ST.acoes&&ST.acoes.em||null,impAt:ST.impAt||{},form:(ST.form||[]).length}}
async function salvarEstado(){
  try{ST.updated=new Date().toISOString();const v=ST.updated;const z=await gz(JSON.stringify(ST));
    await PlannerData.put('rotina/estado.gz',z);await PlannerData.put('rotina/meta.json',JSON.stringify({v,status:statusRotina()}));
    IDB.set('rz',{v,st:ST});return `<div class="ok">✓ Salvo no Drive (${(z.length/1048576).toFixed(1)} MB) e já disponível para o time.</div>`}
  catch(e){return `<div class="err">✗ Não salvou no Drive: ${esc(e.message)}. Os números valem só até fechar a página.</div>`}}
async function iniciar(){
  if(M==='imp'&&!IS_ADMIN){location.replace('rotina.html?m=sem');return}
  document.getElementById('bImp').hidden=!IS_ADMIN||M==='imp';document.getElementById('bDir').hidden=!IS_ADMIN;
  document.title=GRUPOS[M].t+' · Planner Revalle';
  try{const [ls,st]=await Promise.all([carregarLS(),carregarEstado()]);LSO=ls||{};if(st)ST=st}
  catch(e){carregando('Não consegui abrir os dados da rotina: '+esc(e.message));return}
  const G=GRUPOS[M];const sp=new URLSearchParams(location.search).get('s');
  let i=SLIDES.findIndex(x=>x.id===sp);
  if(i<0)i=SLIDES[UI.slide]&&G.ids.includes(SLIDES[UI.slide].id)?UI.slide:SLIDES.findIndex(x=>x.id===G.ids[0]);
  UI.slide=i;delete UI.wk; // a semana abre sempre na mais recente
  if(!UI.pInit){for(const u in ST.units){const ds=Object.keys(ST.units[u].planners||{});if(ds.length){UI.p=ds.sort((a,b)=>{const x=pd(a),y=pd(b);return (x.y*1e4+x.m*100+x.d)-(y.y*1e4+y.m*100+y.d)}).pop();UI.pInit=1;break}}}
  render()}
// ---- sem dados ainda: o administrador traz o HTML antigo (todo o histórico) ou importa as bases
function semDados(){grupoTabs();
  if(!IS_ADMIN)return `<div class="cbox" style="padding:18px"><b>Os dados da rotina ainda não foram carregados no sistema.</b><p class="note">Assim que a Logística importar as bases, esta tela aparece aqui.</p></div>`;
  return `<div class="cbox" style="padding:20px"><h3 style="margin:0 0 6px">Trazer o histórico para o sistema</h3>
    <p class="note" style="font-size:14px">Envie o arquivo HTML da rotina (planner-alagoinhas-serrinha.html). Ele traz todo o histórico já importado, o plano de ação, o cronograma e as oportunidades. Depois disso, as atualizações semanais são feitas em <b>Bases da rotina</b>.</p>
    <label class="btn dark" for="migIn" style="display:inline-block;margin-top:6px">Escolher o arquivo HTML</label><input id="migIn" type="file" accept=".html,.htm" hidden>
    <a class="btn" href="rotina.html?m=imp" style="margin-left:6px">Começar do zero importando as bases</a><div id="migLog" class="note" style="margin-top:12px"></div></div>`}
function bindSemDados(){const fi=document.getElementById('migIn');if(!fi)return;
  fi.onchange=async()=>{const f=fi.files[0];if(!f)return;const log=document.getElementById('migLog');log.innerHTML='Lendo o arquivo…';
    try{const t=await f.text();const a=t.indexOf('const DEFAULT_STATE = ');if(a<0)throw new Error('este arquivo não tem os dados da rotina');
      const b=t.indexOf(';\n',a);const st=JSON.parse(t.slice(a+22,b));if(!st.units||!Object.keys(st.units).length)throw new Error('o arquivo está sem unidades');
      const ls=st._ls||{};delete st._ls;for(const k in ls)if(/^planner-/.test(k)&&k!=='planner-ui'){try{LSO[k]=JSON.parse(ls[k])}catch(e){}}
      ST=st;log.innerHTML='Gravando no Drive… (pode levar alguns segundos)';
      const r=await salvarEstado();if(IS_ADMIN)await PlannerData.put('rotina/ls.json',JSON.stringify(LSO));
      log.innerHTML=r+`<div class="ok">✓ ${Object.keys(ST.units).join(' e ')} · ${Object.values(ST.units).reduce((n,u)=>n+Object.keys(u.planners||{}).length,0)} planners · preferências e plano de ação: ${Object.keys(LSO).length} itens.</div>`;
      setTimeout(()=>location.reload(),1500)}
    catch(e){log.innerHTML=`<div class="err">✗ ${esc(e.message)}</div>`}}}
// ---- Oportunidades: anotações do time (unidade, PDV/setor opcional, situação)
let NOTAS=null,notasErr='',oppF='abertas';
const STN={aberta:'Aberta',andamento:'Em andamento',feita:'Feita'};
function carregarNotas(){if(carregarNotas.busy)return;carregarNotas.busy=1;
  PlannerAuth.call('notas.list',{tipo:'opp'}).then(j=>{NOTAS=j.notas||[];notasErr=''}).catch(e=>{NOTAS=[];notasErr=e.message}).finally(()=>{carregarNotas.busy=0;if(SLIDES[UI.slide].id==='opp')render()})}
function nomePDV(c){let s=null;try{s=SC()}catch(e){}const r=s&&s.rows.find(x=>String(x.c)===String(c).replace(/^0+/,''));return r?r.nm:''}
function oppView(){const u=UI.u;
  if(NOTAS===null){carregarNotas();return title('Revalle '+esc(UI.u),'Oportunidades','list')+'<p class="note">Carregando as anotações…</p>'}
  const L=NOTAS.filter(n=>n.unidade===u);const cnt={abertas:L.filter(n=>n.status!=='feita').length,feitas:L.filter(n=>n.status==='feita').length,todas:L.length};
  const vis=L.filter(n=>oppF==='todas'||(oppF==='feitas'?n.status==='feita':n.status!=='feita'))
    .sort((a,b)=>(a.status==='feita')-(b.status==='feita')||String(b.criado).localeCompare(String(a.criado)));
  const velhas=(getLS('planner-opp-'+u,null)||OPP_DEF[u]||[]).filter(t=>String(t).trim());
  const pode=n=>IS_ADMIN||n.autor===EU.email;
  return title('Revalle '+esc(UI.u),'Oportunidades','list')+
  (notasErr?`<div class="cbox" style="padding:10px 14px;border-color:#E0141E;margin-bottom:10px">Não consegui abrir as anotações: ${esc(notasErr)}</div>`:'')+
  `<p class="note" style="font-size:14px;margin-top:0">Anote aqui o que aparecer durante o processo do planner: ideia, ajuste, problema de cadastro, PDV para olhar de perto. Fica registrado para o time todo.</p>
  <div class="opf"><textarea id="opT" placeholder="Escreva a oportunidade…"></textarea><input id="opP" placeholder="PDV (opcional)" inputmode="numeric"><input id="opS" placeholder="Setor (opcional)" inputmode="numeric"><span></span><button class="btn dark" id="opAdd">+ Registrar</button></div>
  <div class="opfl tabs">${[['abertas','Abertas'],['feitas','Feitas'],['todas','Todas']].map(([k,n])=>`<button data-opf="${k}" aria-pressed="${oppF===k}">${n} (${cnt[k]})</button>`).join('')}</div>
  <div class="opl">${vis.length?vis.map(n=>`<div class="opi ${n.status==='feita'?'feita':''}"><div class="tx">${esc(n.texto)}</div>
    <div class="mt">${n.pdv?`<span class="opk">PDV ${esc(n.pdv)}${nomePDV(n.pdv)?' · '+esc(nomePDV(n.pdv)):''}</span>`:''}${n.setor?`<span class="opk">Setor ${esc(n.setor)}</span>`:''}${n.planner?`<span class="opk s">Planner ${esc(n.planner)}</span>`:''}
    <span>${esc(n.autor_nome||n.autor||'')} · ${n.criado?new Date(n.criado).toLocaleDateString('pt-BR'):''}</span>
    <span style="margin-left:auto"></span>${pode(n)?`<select data-ops="${n.id}">${Object.entries(STN).map(([k,v])=>`<option value="${k}" ${n.status===k?'selected':''}>${v}</option>`).join('')}</select><button class="lk2" data-opdel="${n.id}" title="Excluir">✕</button>`:`<span class="tg">${STN[n.status]||n.status}</span>`}</div></div>`).join(''):'<p class="note">Nenhuma oportunidade aqui.</p>'}</div>
  ${IS_ADMIN&&!L.length&&velhas.length?`<div class="cbox" style="padding:12px 14px;margin-top:14px"><b>${velhas.length} oportunidades do HTML antigo</b><p class="note">Trazer para cá como abertas, em nome da Logística.</p><button class="btn dark" id="opMig">Trazer as ${velhas.length} oportunidades</button></div>`:''}
  <span class="chip">Checklist 3.4 · V2</span>`}
function bindOpp(){const add=document.getElementById('opAdd');if(!add)return;
  document.querySelectorAll('[data-opf]').forEach(b=>b.onclick=()=>{oppF=b.dataset.opf;render()});
  add.onclick=async()=>{const t=document.getElementById('opT').value.trim();if(!t){document.getElementById('opT').focus();return}
    add.disabled=true;add.textContent='Registrando…';
    try{const j=await PlannerAuth.call('notas.add',{itens:[{tipo:'opp',unidade:UI.u,planner:UI.p?UI.p.replace(/\./g,'/'):'',pdv:document.getElementById('opP').value.trim(),setor:document.getElementById('opS').value.trim(),texto:t}]});NOTAS=NOTAS.concat(j.notas);render()}
    catch(e){alertMsg('Não registrou: '+e.message);add.disabled=false;add.textContent='+ Registrar'}};
  document.querySelectorAll('[data-ops]').forEach(s=>s.onchange=async()=>{try{const j=await PlannerAuth.call('notas.set',{id:s.dataset.ops,status:s.value});const i=NOTAS.findIndex(n=>n.id===s.dataset.ops);NOTAS[i]=j.nota;render()}catch(e){alertMsg('Não salvou: '+e.message)}});
  document.querySelectorAll('[data-opdel]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir esta oportunidade?'))return;try{await PlannerAuth.call('notas.set',{id:b.dataset.opdel,excluir:true});NOTAS=NOTAS.filter(n=>n.id!==b.dataset.opdel);render()}catch(e){alertMsg('Não excluiu: '+e.message)}});
  const mg=document.getElementById('opMig');if(mg)mg.onclick=async()=>{mg.disabled=true;mg.textContent='Trazendo…';const u=UI.u;const velhas=(getLS('planner-opp-'+u,null)||OPP_DEF[u]||[]).filter(t=>String(t).trim());
    try{const j=await PlannerAuth.call('notas.add',{itens:velhas.map(t=>({tipo:'opp',unidade:u,planner:'',pdv:'',setor:'',texto:String(t).trim()}))});NOTAS=NOTAS.concat(j.notas);render()}catch(e){alertMsg('Não trouxe: '+e.message);mg.disabled=false}}}
