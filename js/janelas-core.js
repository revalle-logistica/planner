/* Módulo Janelas BEES — monta o arquivo de importação de janelas de entrega (layout ClientsDefaultCSV).
   Regras:
   - Base (gabarito de janelas ou janelas pós do planner publicado): dia com valor > 0 = FREE, 0 = NO (Semana 1).
   - PDV do arquivo atual do BEES fora da base: NO em todos os dias.
   - Cliente da base fora do arquivo do BEES: entra com o CPF/CNPJ do cadastro, janela da base, semanal.
   - Documento quebrado no BEES (ex.: 5,19E+13): completado pelo cadastro de clientes (Promax 01.20.11).
   - Quinzenal já no BEES: mantido só se o usuário confirmar, com a data de referência que já tem.
   - Novos quinzenais: BIWEEKLY com a data de referência informada. Semanal: data vazia.
   - Pedido mínimo e taxa sempre 0; Click_And_Collect e Reset_To_DDC_Default = NO. */
const UNIDADES={"1031287":"Alagoinhas","1031295":"Serrinha","826588":"Rib. Pombal","983616":"Paulo Afonso"};
const DIAS_PT=["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
const DIAS_EN=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const HEADER=["DDC_ID","Vendor_Account_ID",...DIAS_EN,...DIAS_EN.map(d=>"Minimum_Order_Value_"+d),...DIAS_EN.map(d=>"Additional_Fee_"+d),"Click_And_Collect","Delivery_Frequency","Reference_Date","Reset_To_DDC_Default"];
const semAcento=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();

function parseCSV(txt){
  txt=txt.replace(/^﻿/,"");
  const lines=txt.split(/\r?\n/).filter(l=>l.trim()!=="");
  const sep=(lines[0]||"").includes(";")?";":(lines[0]||"").includes("\t")?"\t":",";
  const head=(lines[0]||"").split(sep).map(h=>h.trim());
  const raw=lines.slice(1).map(l=>l.split(sep).map(c=>c.trim()));
  return {head,raw,rows:raw.map(c=>{const o={};head.forEach((h,i)=>{if(!(h in o))o[h]=c[i]??"";});return o;})};
}
/* qual revenda: código DDC ou nome */
function unidadeDe(v){
  v=semAcento(v).replace(/\D+$/,"").trim();const d=v.replace(/\D/g,"");
  if(UNIDADES[d]) return d;
  if(/alagoinhas/.test(v)) return "1031287"; if(/serrinha/.test(v)) return "1031295";
  if(/pombal/.test(v)) return "826588"; if(/paulo/.test(v)) return "983616";
  return "";
}
function classificar(p){
  const h=p.head.join(";"),hs=semAcento(h);
  if(h.includes("ERP_POC_ID")&&h.includes("Vendor_Account_ID")) return {tipo:"planner",ddc:p.rows[0]?.DDC_ID||""};
  if(/cliente/.test(hs)&&/semana 1/.test(hs)){const k=p.head.find(x=>/Unidade/.test(x));return {tipo:"gabarito",ddc:p.rows[0]?.[k]||""};}
  if(/razao social/.test(hs)&&/cnpj/.test(hs)&&/codigo cliente/.test(hs)) return {tipo:"cadastro",ddc:""};
  const iu=p.head.findIndex(x=>/unidade|revenda|ddc/.test(semAcento(x))),ic=p.head.findIndex(x=>/cod|cliente/.test(semAcento(x)));
  if(iu>=0&&ic>=0&&iu!==ic) return {tipo:"quinzenais",ddc:"",iu,ic};
  return {tipo:"desconhecido",ddc:""};
}
function normCod(v){v=String(v||"").trim();v=/^\d{1,3}(\.\d{3})+$/.test(v)?v.replace(/\./g,""):v.replace(/[.,]0+$/,"");return /^\d+$/.test(v)?v.replace(/^0+(?=\d)/,""):"";}
function normDoc(v){
  v=String(v||"").trim();
  if(/e[+-]?\d/i.test(v)) return {ok:false,v};
  v=v.replace(/[.,]0+$/,"").replace(/\D/g,"").replace(/^0+(?=\d)/,"");
  return v&&v!=="0"?{ok:true,v}:{ok:false,v:""};
}
function parseCodigos(t){return [...new Set(String(t||"").split(/[\s,;]+/).map(normCod).filter(Boolean))];}
/* cadastro Promax: código (col "Codigo Cliente") -> 1º CNPJ */
function mapaCadastro(p){
  const ic=p.head.findIndex(x=>semAcento(x)==="codigo cliente"),id=p.head.findIndex(x=>semAcento(x)==="cnpj");
  const m=new Map();
  for(const c of p.raw){const cod=normCod(c[ic]),d=normDoc(c[id]);if(cod&&d.ok)m.set(cod,d.v);}
  return m;
}
/* quinzenais por arquivo com coluna de unidade */
function quinzPorUnidade(p,iu,ic){
  const r={};
  for(const c of p.raw){const u=unidadeDe(c[iu]),cod=normCod(c[ic]);if(u&&cod)(r[u]=r[u]||[]).push(cod);}
  return r;
}
/* códigos de um arquivo simples: coluna com "cod"/"cliente", senão 1ª coluna */
function codigosDeArquivo(txt){
  const p=parseCSV(txt);
  let i=p.head.findIndex(x=>/cod|cliente/.test(semAcento(x)));
  if(i<0){return parseCodigos([p.head[0],...p.raw.map(c=>c[0])].join("\n"));}
  return parseCodigos(p.raw.map(c=>c[i]).join("\n"));
}

function gerarUnidade(ddc,gab,plan,quinz,ref,cad,manter){
  cad=cad||new Map();manter=manter||new Set();
  const base=gab instanceof Map?gab:new Map();
  if(!(gab instanceof Map)) for(const r of gab){
    const cod=normCod(r["Código Cliente"]??Object.entries(r).find(([k])=>/digo Cliente/.test(k))?.[1]);
    if(!cod) continue;
    const ks=Object.keys(r).filter(x=>/Semana 1$/.test(x));
    base.set(cod,ks.slice(0,7).map(k=>(parseFloat(String(r[k]||"0").replace(",","."))||0)>0));
  }
  const qset=new Set(quinz);
  const porDoc=new Map(),docInvalido=[],recuperados=[],vistosBase=new Set(),vistosCod=new Set();
  for(const r of plan){
    const cod=normCod(r.ERP_POC_ID);let d=normDoc(r.Vendor_Account_ID);
    if(cod) vistosCod.add(cod);
    if(!d.ok&&cod&&cad.has(cod)){d={ok:true,v:cad.get(cod)};recuperados.push(cod);}
    if(!d.ok){docInvalido.push({cod:cod||"(sem código)",doc:d.v||"(vazio)",naBase:base.has(cod)});continue;}
    const naBase=base.has(cod);
    const biAtual=String(r.Delivery_Frequency).toUpperCase()==="BIWEEKLY"?String(r.Reference_Date||"").trim():null;
    const atual=porDoc.get(d.v);
    if(!atual||(naBase&&!atual.naBase)) porDoc.set(d.v,{cod,doc:d.v,naBase,biAtual});
  }
  /* clientes da base que não estão no arquivo do BEES: entram com o documento do cadastro, janela da base, semanal */
  const incluidos=[],semDocCadastro=[];
  for(const c of base.keys()){
    if(vistosCod.has(c)) continue;
    const d=cad.get(c);
    if(!d){semDocCadastro.push(c);continue;}
    const ex=porDoc.get(d);
    if(!ex){porDoc.set(d,{cod:c,doc:d,naBase:true,biAtual:null});incluidos.push(c);}
    else if(!ex.naBase){ex.cod=c;ex.naBase=true;incluidos.push(c);} /* mesmo documento já no BEES sem o código: aplica a janela da base */
  }
  const linhas=[],cont={total:0,base:0,fora:0,quinzNovo:0,quinzMantido:0,recuperados:recuperados.length,incluidos:incluidos.length,dias:[0,0,0,0,0,0,0]};
  const mantidos=[];
  for(const p of porDoc.values()){
    const dias=p.naBase?base.get(p.cod):[false,false,false,false,false,false,false];
    if(p.naBase){vistosBase.add(p.cod);cont.base++;}else cont.fora++;
    let freq="WEEKLY",dt="";
    if(p.naBase&&qset.has(p.cod)){freq="BIWEEKLY";dt=ref;cont.quinzNovo++;}
    else if(p.biAtual!==null&&manter.has(p.cod)){freq="BIWEEKLY";dt=p.biAtual;cont.quinzMantido++;mantidos.push(p.cod);}
    dias.forEach((o,i)=>{if(o)cont.dias[i]++;});
    linhas.push([ddc,p.doc,...dias.map(o=>o?"FREE":"NO"),...Array(14).fill("0"),"NO",freq,dt,"NO"]);
    cont.total++;
  }
  const baseSemBees=semDocCadastro;
  const quinzForaBase=quinz.filter(c=>!base.has(c));
  const quinzNaoGerado=quinz.filter(c=>base.has(c)&&!vistosBase.has(c));
  const csv=[HEADER,...linhas].map(l=>l.join(";")).join("\r\n")+"\r\n";
  return {csv,linhas,cont,docInvalido,recuperados,mantidos,incluidos,baseSemBees,quinzForaBase,quinzNaoGerado};
}
/* clientes que já estão quinzenais no arquivo do BEES */
function quinzenaisBees(plan){
  const m=new Map();
  for(const r of plan){if(String(r.Delivery_Frequency).toUpperCase()==="BIWEEKLY"){const c=normCod(r.ERP_POC_ID);if(c)m.set(c,String(r.Reference_Date||"").trim());}}
  return m;
}
/* janelas do planner publicado (cliente[21] = máscara pós de 28 posições, semana 1 = posições 0–6) */
function baseDaVersao(ver,unb){
  const m=new Map();
  for(const c of (ver&&ver.clients)||[]){if(c[0]!==unb||!c[21]) continue;m.set(String(c[1]),[...Array(7)].map((_,i)=>c[21][i]==="1"));}
  return m;
}
const API={quinzenaisBees,parseCSV,classificar,gerarUnidade,parseCodigos,mapaCadastro,quinzPorUnidade,codigosDeArquivo,unidadeDe,baseDaVersao,UNIDADES,HEADER,DIAS_EN,DIAS_PT};
if(typeof module!=="undefined") module.exports=API; else window.JanelasCore=API;
