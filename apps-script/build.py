#!/usr/bin/env python3
"""Gera rotina.html (Planner Revalle) a partir do HTML de rotina/checklist 3.4.
Mantém os cálculos e telas originais; troca a casca (menu, tema), o armazenamento
(Drive via Apps Script) e as Oportunidades (anotações compartilhadas)."""
import re, sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tema
SRC = sys.argv[1]; OUT = sys.argv[2]
src = open(SRC, encoding='utf-8').read()
lines = src.split('\n')

# ---------- dados embutidos fora do código
mun_i = next(i for i, l in enumerate(lines) if l.startswith('const MUN='))
open(OUT.rsplit('/', 1)[0] + '/js/rotina-mun.js', 'w', encoding='utf-8').write('// Contornos dos municípios (mapas da rotina)\n' + lines[mun_i] + '\n')
ds_i = next(i for i, l in enumerate(lines) if l.startswith('const DEFAULT_STATE = '))
lines[ds_i] = 'let DEFAULT_STATE={units:{},updated:null};'
lines[mun_i] = '// MUN vem de js/rotina-mun.js'
src = '\n'.join(lines)

css = src[src.index('<style>') + 7:src.index('</style>')]
js = src[src.index('<script>\n', src.index('</style>')) + 9:src.rindex('</script>')]

# ---------- CSS: tudo dentro de .rt (não vaza para o menu e o tema do Planner)
css = css.replace(':root{', '.rt{').replace('html,body{', '.rt{').replace('body{font-size:14px}', '.rt{font-size:14px}')
css = re.sub(r'\.sb(?=[\s{.,:])', '.sgb', css)
def prefix(block):
    out, i = [], 0
    while i < len(block):
        j = block.find('{', i)
        if j < 0: out.append(block[i:]); break
        sel = block[i:j].strip()
        if sel.startswith('@media') or sel.startswith('@supports'):
            depth, k = 1, j + 1
            while depth:
                if block[k] == '{': depth += 1
                elif block[k] == '}': depth -= 1
                k += 1
            out.append(sel + '{' + prefix(block[j + 1:k - 1]) + '}'); i = k; continue
        if sel.startswith('@'):
            depth, k = 1, j + 1
            while depth:
                if block[k] == '{': depth += 1
                elif block[k] == '}': depth -= 1
                k += 1
            out.append(block[i:k]); i = k; continue
        k = block.find('}', j)
        body = block[j:k + 1]
        sels = []
        for s in sel.split(','):
            s = s.strip()
            if not s: continue
            if s.startswith('/*'):
                c = s[:s.index('*/') + 2]; s = s[s.index('*/') + 2:].strip(); out.append(c)
            if s.startswith('.rt') or s in ('from', 'to') or s.endswith('%'): sels.append(s)
            elif s.startswith('.pdfing'): sels.append(s)  # classe no body durante o PDF
            else: sels.append('.rt ' + s)
        out.append(','.join(sels) + body); i = k + 1
    return '\n'.join(out)
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
css = prefix(css)
css = tema.css(css)
css += '''
/* ---- tema do Planner (cores do painel publicado) ---- */
.rt{--bg:#26385a;--slide:#304567;--ink:#f5f8fd;--muted:#b4c0d4;--line:rgba(255,255,255,.10);--hl:rgba(255,255,255,.08);--th:transparent;--th-ink:#9fb0cb;--zebra:rgba(255,255,255,.025);--mapbg:#26385a;--navy:#1d2c47;
  --side:#1d2c47;--side2:#26385a;--hd1:#1d2c47;--hd2:#26385a;--bgc:#26385a;--card:transparent;--blue:#7fb2ff;--good:#3ddc84;--bad:#ff6b6b;--warn:#f5b301;--orange:#ff8a3d;
  --f-body:Inter,system-ui,sans-serif;--f-title:Inter,system-ui,sans-serif;--f-tab:"Roboto Condensed","Arial Narrow",Inter,sans-serif}
.rt .fid{color:#93c5fd!important}
.rt th{font-size:11px!important;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid rgba(255,255,255,.14)!important}
.rt td{border-bottom-color:rgba(255,255,255,.06)!important}
.rt table td,.rt table tr{border-top-color:rgba(255,255,255,.06)!important;border-bottom-color:rgba(255,255,255,.06)!important}
.rt tr.tot td{background:rgba(245,179,1,.10)!important;color:#fde68a!important}.rt tr.sub2 td{background:rgba(255,255,255,.05)!important}
.rt .slide{background:var(--panel,#304567)!important;border:1px solid var(--line)!important;border-radius:18px;box-shadow:0 10px 30px -18px rgba(0,0,0,.6)}
.rt .ctlbar{background:var(--panel,#304567)!important;border:1px solid var(--line)!important}
.rt input,.rt select,.rt textarea{background:#26385a;color:#f5f8fd;border-color:#46608a}
.rt .btn.dark{background:#f5b301!important;color:#111!important;border-color:#f5b301!important}
.rt .tabs button,.rt .btn{background:#26385a;color:#dbe4f3;border-color:#46608a}
.rt .tabs button[aria-pressed="true"],.rt .useg button[aria-pressed="true"],.rt .seg2 button[aria-pressed="true"]{background:#f5b301!important;color:#111!important;border-color:#f5b301!important}
.rt .useg button,.rt .seg2 button{color:#dbe4f3}
/* ---- casca do Planner ---- */
:root{--pos:#f5b301;--pre:#7c879c;--up:#22c55e;--down:#ef4444}
.rhead{font-family:Inter,system-ui,sans-serif}
.rt{background:transparent!important;color:var(--ink)}
.rhead{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;padding:22px 28px 6px}
.rhead h1{margin:0;font:800 24px Inter,system-ui,sans-serif;color:#f5f8fd}.rhead p{margin:4px 0 0;color:#c0cbdd;font-size:13.5px}
.rhead .acts{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.rhead .acts button{font:700 13px Inter,system-ui,sans-serif;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#f5f8fd;border-radius:10px;padding:8px 14px;cursor:pointer}
.rhead .acts button.y{background:#f5b301;color:#111;border-color:#f5b301}
.rt .ctlbar{margin:10px 28px 0;border-radius:14px;border:1px solid #E1E6EF}
.gtabs{display:flex;gap:6px;flex-wrap:wrap;padding:12px 28px 0}.gtabs:empty{display:none}
.gtabs button{font:700 13px Inter,system-ui,sans-serif;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#dbe4f3;border-radius:999px;padding:7px 14px;cursor:pointer}
.gtabs button[aria-pressed="true"]{background:#f5b301;border-color:#f5b301;color:#111}
.rt .stage{padding-top:14px}
html[data-theme] .rt .tbl td,html[data-theme] .rt .fq td{border-bottom-color:#E3E3E3!important}
.rload{padding:60px 20px;text-align:center;color:#c0cbdd;font:600 15px Inter,system-ui,sans-serif}
.rt .pnav{display:none}
/* oportunidades */
.rt .opf{display:grid;grid-template-columns:1fr 150px 120px auto;gap:8px;align-items:start;margin:6px 0 14px}
@media(max-width:800px){.rt .opf{grid-template-columns:1fr 1fr}}
.rt .opf textarea{grid-column:1/-1;min-height:64px;font:14px var(--f-body);border:1px solid #C9CED6;border-radius:10px;padding:9px 11px;resize:vertical}
.rt .opf input{font:14px var(--f-body);border:1px solid #C9CED6;border-radius:10px;padding:8px 10px}
.rt .opl{display:grid;gap:10px}
.rt .opi{border:1px solid #E4E9F2;border-radius:12px;padding:12px 14px;background:#fff;display:grid;gap:6px}
.rt .opi.feita{opacity:.6}.rt .opi .tx{font-size:14.5px;line-height:1.45;white-space:pre-wrap}
.rt .opi .mt{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--muted)}
.rt .opi select{font:600 12.5px var(--f-body);border:1px solid #C9CED6;border-radius:8px;padding:3px 6px}
.rt .opk{display:inline-block;font:700 11.5px var(--f-body);padding:2px 9px;border-radius:999px;background:#E8EEFF;color:#1D4ED8}
.rt .opk.s{background:#F1F4F9;color:#33415C}
.rt .opfl{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
'''

# ---------- JS: troca de armazenamento, navegação e casca
def rep(a, b, n=1):
    global js
    assert js.count(a) >= 1, a[:80]
    js = js.replace(a, b, n)

rep("const __SRC=document.currentScript?document.currentScript.textContent:'';const __APP0=document.getElementById('app').outerHTML;", "")
js = js.replace('class="sb"', 'class="sgb"')
# preferências de tela continuam no navegador; o resto vai para o Drive
rep("localStorage.getItem('planner-ui')", "localStorage.getItem('rotina-ui')")
rep("localStorage.setItem('planner-ui',JSON.stringify(UI))", "localStorage.setItem('rotina-ui',JSON.stringify(UI))")
rep("function getLS(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}",
    "function getLS(k,d){const v=LSO[k];return v==null?d:JSON.parse(JSON.stringify(v))}")
rep("function setLS(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}",
    "function setLS(k,v){if(!IS_ADMIN){avisoLeitura();return}LSO[k]=v;clearTimeout(setLS.t);setLS.t=setTimeout(()=>PlannerData.put('rotina/ls.json',JSON.stringify(LSO)).catch(e=>alertMsg('Não salvou no Drive: '+e.message)),700)}")
# estado: salvar no Drive em vez do navegador
js = js.replace("if(!(await IDB.set('state',ST)))msgs.push('<div class=\"err\">Não consegui salvar no navegador; os dados valem até fechar a página.</div>');",
                "msgs.push(await salvarEstado());")
assert "IDB.set('state'" not in js
rep("$('#reset').onclick=()=>{IDB.del('state');ST=DEFAULT_STATE;render()};", "")
rep("render();$('#impLog').innerHTML=head+msgs.join('')+'<div class=\"note\">Clique em \"Baixar com dados\" para salvar o HTML atualizado.</div>'+dirTable(seen);",
    "render();$('#impLog').innerHTML=head+msgs.join('')+dirTable(seen);")
# render: abas do grupo + oportunidades
rep("function render(){syncCtl();const s=SLIDES[UI.slide];$('#slide').innerHTML=R[s.id]();bind();saveUI()}",
    "function render(){if(!ST||!ST.units||!Object.keys(ST.units).length){$('#slide').innerHTML=semDados();bindSemDados();return}syncCtl();grupoTabs();const s=SLIDES[UI.slide];$('#slide').innerHTML=R[s.id]();bind();bindOpp();saveUI()}")
rep("document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{UI.slide=+b.dataset.go;render();window.scrollTo(0,0)});",
    "document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>irPara(+b.dataset.go));")
# inicialização: espera o Drive
init_old = js[js.index("if(!ST||!ST.units||!Object.keys(ST.units).length){ST={units:{Alagoinhas:emptyUnit()}"):js.index("async function exportHTML(){")]
js = js.replace(init_old, "iniciar();\n")
# botões que não existem mais na casca
rep("$('#bExp').onclick=exportHTML;", "")
rep("$('#menu').onclick=()=>$('#app').classList.toggle('open');", "")
rep("$('#prev').onclick=()=>{UI.slide=Math.max(0,UI.slide-1);render()};$('#next').onclick=()=>{UI.slide=Math.min(SLIDES.length-1,UI.slide+1);render()};", "")
rep("document.addEventListener('keydown',e=>{if(e.target.closest('[contenteditable],input,select'))return;if(e.key==='ArrowRight')$('#next').click();if(e.key==='ArrowLeft')$('#prev').click()});", "")
rep("$('#nav').onclick=e=>{const b=e.target.closest('[data-s]');if(b){UI.slide=+b.dataset.s;$('#app').classList.remove('open');render();window.scrollTo(0,0)}};",
    "$('#gtabs').onclick=e=>{const b=e.target.closest('[data-s]');if(b){UI.slide=+b.dataset.s;render()}};")
rep("$('#bImp').onclick=()=>{UI.slide=SLIDES.findIndex(x=>x.id==='imp');render();window.scrollTo(0,0)};", "$('#bImp').onclick=()=>{location.href='rotina.html?m=imp'};")
rep("$('#bSem').onclick=()=>{const ds=dates();UI.p=ds[ds.length-1];UI.slide=SLIDES.findIndex(x=>x.id==='sem');render();window.scrollTo(0,0)};", "")
rep("if(!DIR_OK){alertMsg('Para conectar uma pasta, abra o arquivo HTML no Chrome ou no Edge do computador (dentro do artifact o navegador não permite).');return}",
    "if(!DIR_OK){alertMsg('Para conectar uma pasta, use o Chrome ou o Edge no computador.');return}")
rep("if(!DIR_OK){alertMsg('Para usar pastas conectadas, abra o arquivo HTML no Chrome ou no Edge do computador (dentro do artifact o navegador não permite).');return}",
    "if(!DIR_OK){alertMsg('Para usar pastas conectadas, use o Chrome ou o Edge no computador.');return}")
rep("if(!D.length){UI.slide=SLIDES.findIndex(x=>x.id==='imp');render();await addDir();return}", "if(!D.length){if(M!=='imp'){location.href='rotina.html?m=imp';return}await addDir();return}")
rep("UI.slide=SLIDES.findIndex(x=>x.id==='imp');render();const log=$('#impLog');", "if(M!=='imp'){location.href='rotina.html?m=imp';return}UI.slide=SLIDES.findIndex(x=>x.id==='imp');render();const log=$('#impLog');")
# textos da tela de importação
js = js.replace("Os arquivos são lidos no seu navegador e não saem do seu computador.", "Os arquivos são lidos no seu navegador e só os números calculados vão para o Drive da Logística.")
js = js.replace("Funciona no Chrome ou Edge, com o HTML aberto no computador.", "Funciona no Chrome ou Edge do computador.")
rep("<button class=\"btn\" id=\"reset\" style=\"margin-top:6px\">Voltar aos dados originais</button>", "<button class=\"btn\" id=\"undo\" onclick=\"desfazer()\" style=\"margin-top:6px\">↩ Desfazer a última importação</button>")
JSC=[('fill="#fff" stroke="${col','fill="#304567" stroke="${col'),('stroke="#fff"','stroke="#26385a"'),('background:#fff;border:2px solid #555','background:#304567;border:2px solid #c0cbdd'),
  ("dark?'#fff':'#333'","dark?'#fff':'#e8eef8'"),("dark?'#bbb':'#555'","dark?'#bbb':'#b4c0d4'"),('fill="#555">','fill="#b4c0d4">'),('stroke="#BBB"','stroke="#5a7499"'),('color:#1E1E1E','color:#f5f8fd'),
  ('stroke="#111"','stroke="#c0cbdd"'),('fill="#111"','fill="#c0cbdd"'),('fill="#6B7280"','fill="#9aa8c0"'),("'Sem cadastro de janela':'#6B7280'","'Sem cadastro de janela':'#9aa8c0'"),("'#7F1D1D','#6B7280']","'#7F1D1D','#9aa8c0']"),
  ('stroke="#CBD5E1"','stroke="#5a7499"'),('stroke="#E4E9F2"','stroke="#3d5373"'),('fill:#444','fill:#dbe4f3'),('color:#444','color:#dbe4f3'),
  ('stroke="#2B3A55"','stroke="#c0cbdd"'),('fill="#2B3A55" style=','fill="#c0cbdd" style='),('fill="#2B3A55"/>','fill="#1d2c47"/>'),
  ('stroke="#EEE"','stroke="#3a5076"'),('fill="#E5E7EB"','fill="#3a5076"'),('stroke="#9A9A9A"','stroke="#9aa8c0"'),('stroke="#64748B"','stroke="#9aa8c0"'),('Fica salvo neste navegador.','Fica salvo para o time; só a Logística altera.'),
  ("'#DCE6EE'","'#1e2d45'"),("'#F4F1E6'","'#3d5373'"),("'#E9EEE3'","'#30435f'"),('stroke="#A9B7A0"','stroke="#5a7499"'),("'#2F3A2A'","'#f5f8fd'"),("'#7D8A76'","'#b4c0d4'")]
for a,b in JSC:
    assert a in js,a
    js=js.replace(a,b)
js=re.sub(r'\b(color|background(?:-color)?|border(?:-[a-z]+)*|outline|fill|stroke)\s*:\s*(#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\))',lambda m:m.group(1)+':'+tema.valor(m.group(1),m.group(2)),js)
# segurança da importação: só aceita visitas/janelas semanais com o nome do relatório da rotina
rep("if(/\\|Seg1\\|/i.test(A)&&/Periodicidade/i.test(A))parseVis(wb,f.name,st,log);",
    "if(/\\|Seg1\\|/i.test(A)&&/Periodicidade/i.test(A)){guardaVis(f.name);parseVis(wb,f.name,st,log)}")
rep("if(/ERP_POC_ID/i.test(h))parseJan(t,f.name,st,log);",
    "if(/ERP_POC_ID/i.test(h)){guardaJan(f.name);parseJan(t,f.name,st,log)}")
rep("else if(/Seg1/i.test(h)&&/Periodicidade/i.test(h))parseVis(",
    "else if(/Seg1/i.test(h)&&/Periodicidade/i.test(h)&&(guardaVis(f.name)||1))parseVis(")
# Bases da rotina: planners vêm do Importar planner e clientes da Central (uma importação só)
rep(",\n     ['Relatório de clientes','Relatorio-cliente_Unidade.csv',`Coordenadas e município dos PDVs (${nCli.toLocaleString('pt-BR')} hoje)`,'Mapas, municípios e PDVs novos',null,'cli',31]]},", "]},")
a0=js.index("   {f:'A cada planner'");a1=js.index("]}];",a0)+4
js=js[:a0]+"   {f:'Virada do planner',sub:'Os planners vêm do Importar planner. Aqui só a conferência do histórico para os KPIs pré × pós',ic:'flow',pk:true,items:[]}];"+js[a1:]
rep("const L=[['Pré-Planner '+p.slice(0,5).replace('.','/'),!!P.pre,'cenário anterior'],['Pós-Planner '+p.slice(0,5).replace('.','/'),!!P.pos,'cenário pós e PDVs saneados'],['Crítica do planner',!!(Uu.crit&&Uu.crit[p]),'pedidos de Vendas antes da virada'],",
    "const L=[['Planner '+p.slice(0,5).replace('.','/')+' (Importar planner)',!!(P.pre&&P.pos),'cenário anterior e pós'],")
rep(",['Formulário de alterações',fr.length>0,'pedidos após a virada (depois da virada)']];","];")
# Oportunidades: anotações compartilhadas (unidade, PDV/setor opcional, situação)
opp_old = js[js.index("R.opp=()=>"):js.index("\n", js.index("R.opp=()=>"))]
js = js.replace(opp_old, "R.opp=()=>oppView();")

shell_js = open(sys.argv[3], encoding='utf-8').read()
js = shell_js + '\n' + js

html = '''<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rotina e indicadores · Planner Revalle</title>
<meta name="theme-color" content="#26385a">
<script src="js/config.js"></script>
<script src="js/auth.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Figtree:wght@400;500;600;700;800&family=Roboto+Condensed:wght@400;700&display=swap" rel="stylesheet">
<script src="vendor/xlsx.full.min.js"></script>
<script src="js/rotina-mun.js"></script>
<style>
''' + css + '''
</style>
<link rel="stylesheet" href="css/theme.css">
<script src="js/shell.js"></script>
</head><body>
<div class="rhead"><div><h1 id="pgT">Rotina e indicadores</h1><p id="pgS"></p></div>
  <div class="acts"><button id="bDir" title="Lê as pastas conectadas e importa só os arquivos novos ou alterados" hidden>⟳ Atualizar da pasta</button><button id="bImp" hidden>Importar bases</button></div></div>
<div class="gtabs" id="gtabs"></div>
<div class="rt">
<div class="ctlbar"><div class="useg" id="uTabs" role="group" aria-label="Unidade"></div>
  <div class="ctl2"><label for="selP">Planner</label><select id="selP"></select></div>
  <div class="seg2" role="group" aria-label="Cenário"><button id="bPre">Cenário anterior</button><button id="bPos">Pós-planner</button></div></div>
<main class="stage"><section class="slide" id="slide" aria-live="polite"><div class="rload">Carregando os dados da rotina…</div></section>
<div class="pnav"><button class="btn" id="prev">← Anterior</button><button class="btn" id="next">Próximo →</button></div></main>
<div hidden><nav id="nav"></nav><div id="sfoot"></div><button id="menu"></button><button id="bSem"></button><button id="bExp"></button></div>
</div>
<script>
''' + js + '''
</script>
</body></html>
'''
open(OUT, 'w', encoding='utf-8').write(html)
print('ok', len(html))
