
## Acesso e dados

- Login com usuário e senha (perfis **Administrador** e **GV**); o vendedor abre a Minha rota por um **link pessoal do setor**, sem senha. Ver `login.html`, `usuarios.html`, `links.html` e `js/auth.js`.
- Os dados ficam no Drive da conta Log Agreste e são servidos pelo Apps Script em `apps-script/Code.gs` (instalação em `apps-script/LEIAME.md`). A URL do Apps Script vai em `js/config.js`.

## Histórico e importação

- Cada planner é uma versão em `data/v/AAAA-MM-DD.json` (data de vigência); o índice fica em `data/index.json`.
- A tela **Importar planner** (`importar.html`) lê os CSVs (pré, pós e relatório de clientes), reconhece a unidade pelo código UNB e publica a versão direto no repositório usando uma chave de acesso do GitHub (Contents: read/write neste repositório).
- O que faltar é reaproveitado: pré = pós do planner anterior; coordenadas = última versão da unidade. Reimportar na mesma data atualiza só as unidades com arquivo novo.
- O leitor dos arquivos é o mesmo no navegador e na carga inicial: `js/core.js`.

## Páginas

- `index.html` — painel do gestor (antes × depois, planificador, frequência por vendedor, mapa, consulta, lista, histórico).
- `rota.html` — **Minha rota**, para o vendedor (celular): semana com datas reais, roteiro do dia na ordem do planner com mapa e links do Google Maps, e mensagens prontas para avisar clientes.
- `critica.html` — **Crítica do planner** (GV): seleção de PDVs com laço no mapa, destino (vendedor, dia, frequência), mapa antes × depois e Excel da solicitação. As alterações ficam salvas no navegador do GV.
- `alteracoes.html` — **Alterações / crítica**: registro das solicitações dos GVs (importadas do Excel da crítica), parecer da Logística, gráficos por tipo/setor/GV e publicação em `data/criticas/<versão>.json`. "Ver no mapa" abre a crítica em modo registro (antes × depois).
- `janelas.html` — **Janelas BEES**: gera o CSV semanal de importação das janelas de entrega no BEES (layout ClientsDefaultCSV), a partir do arquivo atual do BEES, do cadastro de clientes 01.20.11 (CPF/CNPJ) e do gabarito de janelas (ou das janelas pós do planner publicado). Pergunta se mantém os quinzenais que já estão no BEES e recebe os novos. Cada semana salva vai para `data/janelas/<AAAA-MM-DD>/` com o resumo em `data/janelas/index.json`. Regras em `js/janelas-core.js`.
- `importar.html` — importação de nova versão (pré, pós, clientes e volume 03.05.30).

Volume: média mensal por cliente do relatório 03.05.30 (entregas). O volume por dia de visita é o volume semanal do cliente rateado pelas visitas do ciclo.
