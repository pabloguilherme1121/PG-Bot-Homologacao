# PG Bot | Central de Homologação v1.6

Site independente, em português, para gerenciar a homologação e a operação contínua do **PG Bot**, **PG Estratégia** e **PGA Arcade**. **Não modifica repositórios do GitHub.** A atualização da v1.4 foi publicada no mesmo Wix Headless existente.

## Como usar

1. Abra **Liberação e bloqueios** e compare os SHAs da `main` consultados com a versão-alvo que realmente será homologada. A HEAD de uma PR aberta pode ser diferente da `main`.
2. Clique em **Atualizar consulta GitHub** quando desejar conferir a branch `main` e as PRs públicas. O botão faz exclusivamente sete requisições `GET` à API pública, sem credenciais ou escrita. A API pode limitar requisições ou recusar acesso.
3. Defina manualmente a versão-alvo com SHA completo e URL de build. O painel **não preenche** essa referência com o SHA da `main`, pois uma PR em teste pode apontar a outra branch.
4. Registre Playwright 320/390 px nos três navegadores, a validação em aparelho Android real e os checklists das PRs **com evidências do SHA correto**.
5. Exporte um backup JSON após cada rodada importante. Os registros editáveis permanecem em `localStorage` no dispositivo e **não sincronizam automaticamente** entre navegadores ou com o GitHub.

## Recursos e salvaguardas

- Estados **Comprovado**, **Pendente**, **Bloqueado**, **Hipótese**; filtros por projeto, motor, prioridade e risco.
- Matriz de liberação por SHA e PRs com quatro etapas independentes: revisão, aprovação, merge, deploy.
- Playwright: 18 combinações, seis por projeto (Chromium/Firefox/WebKit em 320/390 px).
- Checklist técnico de sete itens por PR, histórico, comentários, links de runs, evidências e ações prioritárias.
- Android físico: aparelho, sistema, navegador, data, SHA, seis cenários e evidência externa.
- **v1.5:** comparação da versão-alvo com HEAD da `main`, estado público das quatro PRs, alerta se HEAD remota diferir da registrada manualmente, e contadores que não reutilizam testes do SHA errado.
- Os dados públicos do GitHub têm data da última consulta, não são usados para marcar gates como concluídos. Histórico de PRs e resultados anteriores são preservados.
- Backup JSON importável, cópia recuperável antes de importação, relatório TXT por projeto, cache offline rede-primeiro.
- A chave `pgbot-homologacao-v1` permanece inalterada para preservar os dados locais de versões anteriores.

## Limitações e proteção contra conclusões incorretas

- A API do GitHub é consultada **somente ao clicar** no botão; um snapshot antigo é identificado como tal. Não há polling ou automação remota.
- A versão-alvo e os links são cadastrados manualmente. O painel não atesta autenticidade das evidências nem inspeciona logs em profundidade.
- A URL de produção não é automaticamente verificada. CI verde, review `COMMENTED` e merge não comprovam deploy.
- Divergência entre SHA-alvo e `main` **não é necessariamente defeito**, especialmente em PR aberta. É um alerta para conferir a branch correta.
- Uma PR pode ter SHA próprio e um deploy utilizar SHA de merge da branch principal. O gate exige SHA apropriado para cada etapa.
- O painel não executa Playwright nos projetos externos, nem Android físico. Não altera motores ou IDs.
- A visualização local foi testada em Chromium em 320/390/1280 px e com respostas simuladas da API; isso **não substitui** teste do site hospedado, Firefox, WebKit ou aparelho físico.

## Arquivos

A versão estática contém `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `service-worker.js` e `assets/favicon.svg`.

Teste de regras: `node --test tests/core-tests.cjs` (32 testes aprovados na entrega). Smoke test local Chromium com requisições GET simuladas: `python tests/smoke_v15.py`.

Sem dependências de terceiros em produção. Nenhum arquivo deve ser enviado aos repositórios originais sem solicitação explícita.

## v1.6 · Observação de workflows

- Ao clicar **Atualizar consulta GitHub**, também são consultados os cinco runs mais recentes da `main` de cada projeto, somando até dez solicitações `GET` por atualização. Nenhum status manual é alterado.
- Cada run mostra status, conclusão, link, data, evento e correspondência com o SHA-alvo. Runs em SHA diferente aparecem com aviso.
- Backups de versões anteriores migram sem perder dados; snapshots de workflow são mantidos somente como observações externas.
- Quando o GitHub falha ou limita consultas, o painel preserva a última observação com sua data.
