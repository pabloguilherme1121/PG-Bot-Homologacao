# PG Bot | Central de Homologação v1.7

Site independente, em português, para gerenciar a homologação e a operação contínua do **PG Bot**, **PG Estratégia** e **PGA Arcade**. **Não modifica repositórios do GitHub.** O código está em um repositório independente e a publicação usa o mesmo site Wix das versões anteriores.

## Como usar

1. Abra **Liberação e bloqueios** e compare os SHAs da `main` consultados com a versão-alvo que realmente será homologada. A HEAD de uma PR aberta pode ser diferente da `main`.
2. Clique em **Atualizar consulta GitHub** quando desejar conferir a branch `main` e as PRs públicas. O botão faz até dez requisições `GET` à API pública, sem credenciais ou escrita. A API pode limitar requisições ou recusar acesso.
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

A versão estática contém `index.html`, `app.js`, `styles.css`, `manifest.json`, `service-worker.js` e `assets/favicon.svg`.

Teste de regras: `node --test tests/core-tests.cjs` (37 testes na v1.7). Smoke test local Chromium com requisições GET simuladas: `python tests/smoke_v15.py`.

Sem dependências de terceiros em produção. Nenhum arquivo deve ser enviado aos repositórios originais sem solicitação explícita.

## v1.6 · Observação de workflows

- Ao clicar **Atualizar consulta GitHub**, também são consultados os cinco runs mais recentes da `main` de cada projeto, somando até dez solicitações `GET` por atualização. Nenhum status manual é alterado.
- Cada run mostra status, conclusão, link, data, evento e correspondência com o SHA-alvo. Runs em SHA diferente aparecem com aviso.
- Backups de versões anteriores migram sem perder dados; snapshots de workflow são mantidos somente como observações externas.
- Quando o GitHub falha ou limita consultas, o painel preserva a última observação com sua data.

O manifesto PWA usa `manifest.json`, caminho compatível com a hospedagem de produção.

## v1.7 · Proteção dos registros em várias abas

- Uma alteração feita em outra aba **não é sobrescrita** silenciosamente quando esta aba tenta salvar. Aparece um aviso persistente com **Exportar meu rascunho** e **Carregar versão atual**.
- O rascunho ainda está disponível em memória para exportação enquanto a aba ficar aberta. Carregar a versão atual exige confirmação e descarta as edições locais não exportadas.
- A importação e a restauração de backups são bloqueadas quando há conflito com outra aba, evitando sobrescrever dados mais recentes.
- Se o armazenamento do navegador estiver indisponível, o painel continua visível em memória e solicita exportação JSON; não afirma ter salvado.
- **Não é sincronização na nuvem ou entre dispositivos.** A proteção se aplica ao armazenamento da mesma origem do navegador.
- QA: `node --test tests/core-tests.cjs`, `python tests/smoke_v15.py` (Chromium/Firefox/WebKit 320/390) e `python tests/cross_tab_smoke.py` (conflito de abas em 320/390). Para rodar Chromium localmente: `PG_BROWSERS=chromium python tests/smoke_v15.py`.

## v1.8 | Ações locais a partir de bloqueios

- Em **Fila de próximas ações**, use **Criar ações dos bloqueios** para converter o resultado atual da auditoria dos três projetos em tarefas pendentes.
- Pendências da mesma PR são agrupadas numa tarefa; há títulos, prioridade e plano mínimo por categoria (SHA-alvo, Playwright, Android físico, críticos, PR).
- Repetir a operação não duplica tarefas. Tarefas já editadas pelo usuário não são sobrescritas; a fila segue no armazenamento local e participa do backup JSON.
- A criação não consulta repositórios, não executa CI e **não marca revisão, aprovação, merge ou deploy como comprovados**. A confirmação exige evidências próprias, no SHA correto.
- Testes de regressão: `node --test tests/core-tests.cjs`.
