
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
- `janelas.html` — **Janelas BEES**: lê os relatórios da Central, mantém a **base viva** de cada unidade (`janelas/base/<unb>.json` no Drive: gabarito + ajustes aprovados por nº do pedido + PDVs novos confirmados − inativados), calcula a sinergia dos PDVs novos/reativados (5 vizinhos com janela no mesmo dia em 3 km; sem sinergia = pendente e fechado), pergunta sobre os quinzenais do BEES e gera o CSV de importação (layout ClientsDefaultCSV). Regras em `js/janelas-base.js` e `js/janelas-core.js`.
- `relatorios.html` — **Central de relatórios**: catálogo com frequência e situação por unidade; reconhece o arquivo e a unidade e guarda uma versão enxuta no Drive (`rel/<id>/<unb>`). Regras em `js/relatorios-core.js`.
- `importar.html` — importação de nova versão (pré, pós, clientes e volume 03.05.30).

Volume: média mensal por cliente do relatório 03.05.30 (entregas). O volume por dia de visita é o volume semanal do cliente rateado pelas visitas do ciclo.
