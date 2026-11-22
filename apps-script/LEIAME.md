# Instalação do backend (Apps Script) — uma vez só

Conta: **Log Agreste** (gestaologagreste@gmail.com).

1. Abra https://script.google.com logado na conta Log Agreste → **Novo projeto**. Renomeie para **Planner Revalle - Sistema**.
2. Apague o conteúdo de `Código.gs` e cole o conteúdo de `apps-script/Code.gs`. Salve.
3. No menu de funções (ao lado de "Executar"), escolha **setup** e clique em **Executar**. Autorize o acesso (Planilhas e Drive da própria conta).
   Isso cria a planilha **Planner Revalle - Sistema** e a pasta **Planner Revalle - Dados** no Drive.
4. **Implantar → Nova implantação → Tipo: App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
   - Clique em **Implantar** e copie a URL que termina em `/exec`.
5. Cole essa URL em `js/config.js` (no lugar de `COLE_AQUI_A_URL_DO_APPS_SCRIPT`).
6. Abra o site → **Pedir acesso**. O **primeiro cadastro vira administrador** automaticamente.
7. Em **Usuários e equipes → Dados no Drive**, clique em **Trazer os planners do site para o Drive**.
8. Depois de conferir que o painel abre normalmente, apague a pasta `data/` do repositório (e o histórico dela — ver abaixo).

## Atualizar o código depois
Cole o novo `Code.gs`, salve e vá em **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão → Implantar**. A URL continua a mesma.

## Por que tirar `data/` do repositório
O repositório é público: tudo dentro dele pode ser baixado por qualquer pessoa. Os planners (clientes, endereços, coordenadas, volume) passam a ficar só no Drive, e o Apps Script só entrega para quem está logado — ou, no link do vendedor, só os clientes daquele setor.
Apagar a pasta não apaga as versões antigas guardadas no histórico do Git. Para sumir de vez, o caminho mais simples é recriar o repositório (o endereço do site continua o mesmo se o nome for o mesmo).
