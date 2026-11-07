/* PG Bot · Central de homologação | independente, sem alterações no GitHub */
(() => {
  'use strict';
  const STORAGE = 'pgbot-homologacao-v1'; // chave estável: não apagar dados antigos
  const PREVIOUS_IMPORT = STORAGE + '-anterior-importacao';
  const PROJECT = {bot:'PG Bot',estrategia:'PG Estratégia',arcade:'PGA Arcade'};
  const PRIORITY = {critica:'Crítica',alta:'Alta',media:'Média',baixa:'Baixa'};
  const STATUS = {comprovado:'Comprovado',pendente:'Pendente',bloqueado:'Bloqueado',hipotese:'Hipótese'};
  const RISK = {regressao:'Regressão',mobile:'Mobile',integracao:'Integração',seguranca:'Segurança',publicacao:'Publicação',dados:'Dados'};
  const CATEGORIES = ['Qualidade','Mobile','Legado','Telemetria','Offline','Sincronização','Integração','Publicação','Android físico','Segurança'];
  const SCENARIOS = ['Toque e alvos','320 / 390 px','Orientação paisagem','Tela cheia','Offline e retorno','Pausa / reinício'];
  const BROWSERS = ['Chromium','Firefox','WebKit'];
  const VIEWPORTS = [320,390];
  const SHA40 = /^[a-f0-9]{40}$/i;
  const CHECK_DEFS = [
    ['scope','Escopo, diff e regressões revisados'],
    ['ids','IDs e contratos legados preservados'],
    ['unit','Testes unitários e de integração'],
    ['mobile','Playwright 320/390 nos três navegadores'],
    ['offline','Offline, telemetria e sincronização'],
    ['android','Android físico documentado'],
    ['rollback','Correção mínima e plano de retorno']
  ];
  const buildQa = () => Object.keys(PROJECT).flatMap(project => BROWSERS.flatMap(browser => VIEWPORTS.map(viewport => ({
    id:`qa-${project}-${browser.toLowerCase()}-${viewport}`,project,browser,viewport,status:'pendente',evidence:'',sha:'',note:'',updated:''
  }))));
  const buildChecklist = () => CHECK_DEFS.map(([key,title])=>({key,title,status:'pendente',evidence:'',sha:'',note:''}));
  const GH = 'https://github.com/pabloguilherme1121/';
  const REPO = {bot:'PG-Bot',estrategia:'PG-Estrategia',arcade:'PG-Arcade'};
  const GH_API = 'https://api.github.com/repos/pabloguilherme1121/';
  const INITIAL_GITHUB = {
    checkedAt:'2026-11-06T04:11:05Z',
    projects:{
      bot:{sha:'333a39e6f0963670c320c5c7bedb0ee0123a3084',branch:'main',observedAt:'2026-11-06T04:11:05Z',commitDate:'2026-11-02T18:00:08Z',url:GH+'PG-Bot/commit/333a39e6f0963670c320c5c7bedb0ee0123a3084'},
      estrategia:{sha:'279e825423cd416b9ee4caf704ab49dbe9ede62c',branch:'main',observedAt:'2026-11-06T04:11:05Z',commitDate:'2026-11-02T17:58:44Z',url:GH+'PG-Estrategia/commit/279e825423cd416b9ee4caf704ab49dbe9ede62c'},
      arcade:{sha:'39b787a1a3ea2296001791caa49a0fea1a4c21c5',branch:'main',observedAt:'2026-11-06T04:11:05Z',commitDate:'2026-11-02T19:13:36Z',url:GH+'PG-Arcade/commit/39b787a1a3ea2296001791caa49a0fea1a4c21c5'}
    },
    prs:{
      'bot-19':{sha:'5dec0bb84321b7ba9a9943a8c09e4790a94dce04',state:'open',draft:true,merged:false,observedAt:'2026-11-06T04:11:05Z',url:GH+'PG-Bot/pull/19'},
      'est-5':{sha:'61fba58f3f6d45f95ae8272a9a5105a8377cc55c',state:'closed',draft:false,merged:true,observedAt:'2026-11-06T04:11:05Z',url:GH+'PG-Estrategia/pull/5'},
      'est-6':{sha:'f66df3cad701707522817eb82425b01af66db353',state:'closed',draft:false,merged:true,observedAt:'2026-11-06T04:11:05Z',url:GH+'PG-Estrategia/pull/6'},
      'arc-295':{sha:'269003b1f4d7c358cf3bbe5f450db0181bc03c54',state:'closed',draft:false,merged:true,observedAt:'2026-11-06T04:11:05Z',url:GH+'PG-Arcade/pull/295'}
    },
    errors:[],runs:{bot:[],estrategia:[],arcade:[]}
  };

  const dateObserved = '2026-11-06';
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const escape = (v) => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = v => {try {const u=new URL(String(v??'').trim());return ['https:','http:'].includes(u.protocol) ? u.href : ''}catch{return ''}};
  const fmtTime = v => {try {return new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}catch{return String(v||'')}};
  const clampText = (v,n=2000) => String(v??'').slice(0,n);
  const href = (url,label) => safeUrl(url)?`<a href="${escape(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>`:'';
  const statusChip = s => `<span class="state-badge state-${escape(STATUS[s]?s:'hipotese')}">${escape(STATUS[s]||'Hipótese')}</span>`;
  const priorityChip = p => `<span class="priority-badge ${escape(p==='critica'?'':p)}">${escape(PRIORITY[p]||'Média')}</span>`;
  const projectTag = p => `<span class="tag project-${escape(p)}">${escape(PROJECT[p]||'Não definido')}</span>`;
  const percent = list => !list.length?0:Math.round(100*list.filter(x=>x.status==='comprovado'&&safeUrl(x.evidence)).length/list.length);
  const counts = list => Object.fromEntries(Object.keys(STATUS).map(k=>[k,list.filter(x=>x.status===k).length]));
  const uid = () => ('r'+Math.random().toString(36).slice(2,9)+Date.now().toString(36));
  const now = () => new Date().toISOString();
  const seedCriteria = [
    ['bot-ci','Workflow de qualidade da PR #19 na HEAD consultada','bot','PG Bot núcleo','Qualidade','comprovado','alta','regressao','https://github.com/pabloguilherme1121/PG-Bot/actions/runs/41581257714','5dec0bb84321b7ba9a9943a8c09e4790a94dce04','Conclusão success observada em workflow. Não equivale à aprovação ou ao merge.'],
    ['bot-ui','Painel isolado: preservar contratos dos consumidores','bot','Painel de integrações','Legado','pendente','alta','regressao','','','Validar importação de registros, acesso e efeitos colaterais nos jogos.'],
    ['bot-sync','Mensagens entre projetos: origem e versão do protocolo','bot','BroadcastChannel','Sincronização','pendente','alta','integracao','','','Validar mesma origem, reconexão de abas, eventos duplicados e fallback.'],
    ['bot-telemetry','Normalização de eventos de partida e placares','bot','Adaptadores de telemetria','Telemetria','hipotese','alta','dados','','','Hipótese de cobertura: identificar por motor quais eventos já são emitidos.'],
    ['bot-offline','Guias offline e integridade após reinício','bot','Guias offline','Offline','pendente','media','integracao','','','Conferir versão do cache, queda de rede, atualização e acesso offline real.'],
    ['bot-ids','Compatibilidade de IDs e contratos de eventos legados','bot','Adaptadores de telemetria','Legado','pendente','critica','regressao','','','Comparar IDs e esquemas existentes; exigir contrato retrocompatível.'],
    ['bot-mob','Interface do Bot: Chromium / Firefox / WebKit 320 e 390','bot','Painel de integrações','Mobile','pendente','alta','mobile','','','Anexar runs Playwright do SHA final e capturas para cada viewport.'],
    ['bot-and','PG Bot validado em Android físico','bot','PG Bot núcleo','Android físico','pendente','critica','mobile','','','Sem evidência física registrada neste painel.'],
    ['bot-pub','Site do PG Bot validado em produção no SHA correto','bot','PG Bot núcleo','Publicação','pendente','alta','publicacao','','','Merge e CI não provam publicação. Registrar URL, SHA e verificação HTTP.'],
    ['est-ci5','Qualidade do 37º jogo (PR #5)','estrategia','Gravidade dos Cristais','Qualidade','comprovado','media','regressao','https://github.com/pabloguilherme1121/PG-Estrategia/actions/runs/41474109349','61fba58f3f6d45f95ae8272a9a5105a8377cc55c','Workflow de qualidade com conclusão success no commit consultado.'],
    ['est-ci6','Qualidade do 38º jogo (PR #6)','estrategia','Domínio Territorial','Qualidade','comprovado','media','regressao','https://github.com/pabloguilherme1121/PG-Estrategia/actions/runs/41483380212','f66df3cad701707522817eb82425b01af66db353','Workflow de qualidade com conclusão success no commit consultado.'],
    ['est-mobile-ci6','Workflow mobile e offline da PR #6','estrategia','Domínio Territorial','Mobile','comprovado','alta','mobile','https://github.com/pabloguilherme1121/PG-Estrategia/actions/runs/41483379920','f66df3cad701707522817eb82425b01af66db353','Run success; ainda é necessário checar cobertura explícita 320/390 dos três engines e Android físico.'],
    ['est-ids','Preservação de IDs do catálogo de jogos','estrategia','Catálogo de motores','Legado','pendente','critica','regressao','','','Comparação automatizada antes/depois; 37º e 38º jogos sem renomear IDs existentes.'],
    ['est-hooks','Eventos de turno separados de jogadas/movimentos','estrategia','Domínio Territorial','Telemetria','pendente','alta','dados','','','Documentar schema de turnos, placar, vitória/derrota e granularidade.'],
    ['est-gravity','Eventos por movimento e resultado','estrategia','Gravidade dos Cristais','Telemetria','hipotese','alta','dados','','','Verificar se eventos de movimentos são emitidos e interpretados pelo Bot.'],
    ['est-touch','Touch 48px e área de jogo sem scroll indesejado','estrategia','Domínio Territorial','Mobile','pendente','alta','mobile','','','Playwright 320/390 + Firefox e WebKit; toque real separadamente.'],
    ['est-off','Missões e guias disponíveis sem internet','estrategia','Catálogo de motores','Offline','pendente','media','integracao','','','Abrir jogos já visitados sem rede e após reinício.'],
    ['est-and','Estratégia homologado em Android real','estrategia','Catálogo de motores','Android físico','pendente','critica','mobile','','','Aparelho, OS, navegador, cenários e evidências pendentes.'],
    ['est-deploy','Publicação do 37º e 38º jogos conferida em produção','estrategia','Catálogo de motores','Publicação','pendente','alta','publicacao','','','Merge conhecido; conteúdo efetivamente servido ainda não comprovado nesta consulta.'],
    ['arc-audit','Auditoria individual dos 150 jogos: workflow','arcade','Catálogo 150 jogos','Qualidade','comprovado','alta','regressao','https://github.com/pabloguilherme1121/PG-Arcade/actions/runs/41485595313','269003b1f4d7c358cf3bbe5f450db0181bc03c54','Workflow com conclusão success no SHA da PR #295.'],
    ['arc-codeql','CodeQL na PR #295','arcade','Catálogo 150 jogos','Segurança','comprovado','alta','seguranca','https://github.com/pabloguilherme1121/PG-Arcade/actions/runs/41485595367','269003b1f4d7c358cf3bbe5f450db0181bc03c54','Workflow CodeQL success; não substitui outras verificações de segurança.'],
    ['arc-validator','Validate and publish: execução CI da PR #295','arcade','Catálogo 150 jogos','Qualidade','comprovado','media','regressao','https://github.com/pabloguilherme1121/PG-Arcade/actions/runs/41485595341','269003b1f4d7c358cf3bbe5f450db0181bc03c54','Run success; nome da workflow não comprova URL publicada.'],
    ['arc-ids','Contratos e IDs de todos os motores permanecem estáveis','arcade','Motores clássicos','Legado','pendente','critica','regressao','','','Comparar IDs legados e comportamento dos motores sem mudar regras.'],
    ['arc-webkit','Regression suite Chromium / Firefox / WebKit 320 e 390','arcade','Motores clássicos','Mobile','pendente','alta','mobile','','','Confirmar na HEAD final, não reutilizar run antigo de outra HEAD.'],
    ['arc-bot','PG Bot entende pausa, reinício e fim da partida','arcade','Adaptador de arena','Integração','hipotese','alta','integracao','','','Hipótese até cobrir motores e registrar provas por jogo.'],
    ['arc-telemetry','Telemetria normalizada de partidas do Arcade','arcade','Adaptador de arena','Telemetria','pendente','alta','dados','','','Definir campos estáveis e fallback quando canal não existir.'],
    ['arc-offline','Guias e arenas offline sem falha de navegação','arcade','Motores clássicos','Offline','pendente','media','integracao','','','Validar cache em cold e warm start.'],
    ['arc-and','PGA Arcade homologado em Android físico','arcade','Motores clássicos','Android físico','pendente','critica','mobile','','','Sem teste de aparelho com documentação neste snapshot.'],
    ['arc-deploy','Publicação em GitHub Pages conferida no mesmo SHA','arcade','Catálogo 150 jogos','Publicação','pendente','alta','publicacao','','','Confirmar URL, SHA e navegação real após o merge.']
  ].map(([id,title,project,motor,category,status,priority,risk,evidence,sha,note])=>({id,title,project,motor,category,status,priority,risk,evidence,sha,note,source:status==='comprovado'?'Workflow GitHub · observado em 06/11/2026':'Critério de homologação proposto; sem validação final',comments:[]}));
  const s = (status,evidence='',sha='',note='') => ({status,evidence,sha,note});
  const initialPrs = [
    {id:'bot-19',project:'bot',number:19,repo:'PG-Bot',title:'Painel auditável para integrações Estratégia e Arcade',sha:'5dec0bb84321b7ba9a9943a8c09e4790a94dce04',draft:true,updated:'2026-11-03T04:59:38Z',url:GH+'PG-Bot/pull/19',runs:[['Qualidade PG Bot',41581257714]],stages:{review:s('pendente'),approval:s('pendente'),merge:s('pendente'),deploy:s('pendente')}},
    {id:'est-5',project:'estrategia',number:5,repo:'PG-Estrategia',title:'Gravidade dos Cristais como 37º jogo independente',sha:'61fba58f3f6d45f95ae8272a9a5105a8377cc55c',draft:false,updated:'2026-11-02T16:36:55Z',url:GH+'PG-Estrategia/pull/5',runs:[['Qualidade Estratégia',41474109349]],stages:{review:s('comprovado',GH+'PG-Estrategia/pull/5','61fba58f3f6d45f95ae8272a9a5105a8377cc55c','Review COMMENTED, não aprovado.'),approval:s('pendente'),merge:s('comprovado',GH+'PG-Estrategia/pull/5','61fba58f3f6d45f95ae8272a9a5105a8377cc55c','Merged true observado na API do GitHub.'),deploy:s('pendente')}},
    {id:'est-6',project:'estrategia',number:6,repo:'PG-Estrategia',title:'Domínio Territorial com Hex Conquest, SVG e PG Bot contextual',sha:'f66df3cad701707522817eb82425b01af66db353',draft:false,updated:'2026-11-02T16:43:19Z',url:GH+'PG-Estrategia/pull/6',runs:[['Mobile e offline',41483379920],['Qualidade Estratégia',41483380212]],stages:{review:s('comprovado',GH+'PG-Estrategia/pull/6','f66df3cad701707522817eb82425b01af66db353','Review COMMENTED, não aprovado.'),approval:s('pendente'),merge:s('comprovado',GH+'PG-Estrategia/pull/6','f66df3cad701707522817eb82425b01af66db353','Merged true observado na API do GitHub.'),deploy:s('pendente')}},
    {id:'arc-295',project:'arcade',number:295,repo:'PG-Arcade',title:'Auditoria automatizada e individual dos 150 jogos',sha:'269003b1f4d7c358cf3bbe5f450db0181bc03c54',draft:false,updated:'2026-11-02T17:16:19Z',url:GH+'PG-Arcade/pull/295',runs:[['CodeQL',41485595367],['Auditoria 150 jogos',41485595313],['Validate and publish',41485595341]],stages:{review:s('comprovado',GH+'PG-Arcade/pull/295','269003b1f4d7c358cf3bbe5f450db0181bc03c54','Review COMMENTED, não aprovado.'),approval:s('pendente'),merge:s('comprovado',GH+'PG-Arcade/pull/295','269003b1f4d7c358cf3bbe5f450db0181bc03c54','Merged true observado na API do GitHub.'),deploy:s('pendente')}}
  ];
  const seedActions = [
    {id:'a1',title:'Comparar IDs e contratos legados antes de qualquer mudança',project:'bot',priority:'critica',status:'pendente',owner:'Engenharia',evidence:'',plan:'Gerar inventário de IDs, tópicos, payloads e assinaturas por motor. Adicionar teste de contrato antes de alterar adaptador.'},
    {id:'a2',title:'Homologar PG Bot em Android físico com evidência',project:'bot',priority:'critica',status:'pendente',owner:'QA mobile',evidence:'',plan:'Testar toque, viewport, modo paisagem, offline, sincronização de abas e retorno da aplicação em aparelho real.'},
    {id:'a3',title:'Validar Playwright final do Bot nas seis combinações',project:'bot',priority:'alta',status:'pendente',owner:'QA web',evidence:GH+'PG-Bot/pull/19',plan:'Rodar Chromium, Firefox e WebKit em 320/390 na mesma HEAD da PR #19; anexar links de runs e falhas.'},
    {id:'a4',title:'Confirmar sincronização BroadcastChannel e fallback',project:'bot',priority:'alta',status:'pendente',owner:'Integração',evidence:'',plan:'Medir atualização entre abas na mesma origem; prevenir mensagens duplicadas e nunca travar arena caso o canal falhe.'},
    {id:'a5',title:'Validar eventos por motor no PG Estratégia',project:'estrategia',priority:'alta',status:'pendente',owner:'Integração',evidence:GH+'PG-Estrategia/pull/6',plan:'Comparar turnos do Domínio Territorial com movimentos de Gravidade dos Cristais e mapear eventos no PG Bot.'},
    {id:'a6',title:'Checar mobile WebKit e Android dos motores do PGA Arcade',project:'arcade',priority:'alta',status:'pendente',owner:'QA mobile',evidence:GH+'PG-Arcade/pull/295',plan:'Executar regressão sem afrouxar asserções. Depois homologar em Android físico e registrar artefatos.'},
    {id:'a7',title:'Confirmar publicação das integrações no SHA de produção',project:'bot',priority:'alta',status:'pendente',owner:'Entrega',evidence:'',plan:'Separar merge da execução de deploy, verificar URL HTTP e confirmar build publicado e navegação.'},
    {id:'a8',title:'Verificar guias offline com cold e warm start',project:'arcade',priority:'media',status:'pendente',owner:'QA offline',evidence:'',plan:'Instalar/abrir site, desconectar a rede, reiniciar e conferir guias e jogo sem falha.'}
  ];
  const seedHistory = [{id:uid(),date:'2026-11-06T03:19:00Z',title:'Snapshot inicial importado da consulta ao GitHub',detail:'PR #19 aberta em rascunho; PRs #5, #6 e #295 integradas. Workflows listados com conclusão success. Aprovação, Android físico e deploy não inferidos.',type:'snapshot'}];
  const emptyState=()=>normalizeState({version:1,createdAt:now(),updatedAt:now(),criteria:structuredClone(seedCriteria),prs:structuredClone(initialPrs),android:[],actions:structuredClone(seedActions),history:structuredClone(seedHistory)});
  // Migração aditiva: mantém histórico, estados, comentários e PRs do mesmo localStorage.
  function normalizeState(v){
    if(!Array.isArray(v.qa))v.qa=[];
    for(const item of buildQa())if(!v.qa.some(q=>q.id===item.id))v.qa.push(item);
    for(const pr of v.prs){
      if(!Array.isArray(pr.checklist))pr.checklist=[];
      for(const item of buildChecklist())if(!pr.checklist.some(c=>c.key===item.key))pr.checklist.push(item);
      if(!Array.isArray(pr.extraRuns))pr.extraRuns=[];
    }
    if(!v.github||typeof v.github!=='object'||Array.isArray(v.github))v.github=structuredClone(INITIAL_GITHUB);
    if(!v.github.projects||typeof v.github.projects!=='object'||Array.isArray(v.github.projects))v.github.projects={};
    if(!v.github.prs||typeof v.github.prs!=='object'||Array.isArray(v.github.prs))v.github.prs={};
    if(!Array.isArray(v.github.errors))v.github.errors=[];
    if(!v.github.runs||typeof v.github.runs!=='object'||Array.isArray(v.github.runs))v.github.runs={};
    for(const p of Object.keys(PROJECT))if(!Array.isArray(v.github.runs[p]))v.github.runs[p]=[];
    if(!v.releaseTargets||typeof v.releaseTargets!=='object'||Array.isArray(v.releaseTargets))v.releaseTargets={};
    for(const p of Object.keys(PROJECT)){
      const r=v.releaseTargets[p];
      v.releaseTargets[p]=r&&typeof r==='object'&&!Array.isArray(r)?{
        sha:typeof r.sha==='string'?r.sha:'',
        evidence:typeof r.evidence==='string'?r.evidence:'',
        note:typeof r.note==='string'?r.note:'',
        updated:typeof r.updated==='string'?r.updated:''
      }:{sha:'',evidence:'',note:'',updated:''};
    }
    return v;
  }
  let knownStorageRaw = null;
  function load(){try {const raw=localStorage.getItem(STORAGE)??null;knownStorageRaw=raw;if(raw){const parsed=JSON.parse(raw);if(validateBackup(parsed))return normalizeState(parsed)}}catch(e){console.warn('Storage indisponível:',e)}return emptyState()}
  function validGithubRuns(gh){
    if(!('runs' in gh))return true; // backups v1.5
    if(!gh.runs||typeof gh.runs!=='object'||Array.isArray(gh.runs))return false;
    return Object.entries(gh.runs).every(([p,rs])=>PROJECT[p]&&Array.isArray(rs)&&rs.length<=10&&rs.every(r=>r&&Number.isSafeInteger(r.id)&&r.id>0&&typeof r.name==='string'&&r.name.length<=150&&['queued','in_progress','completed','requested','waiting','pending'].includes(r.status)&&['success','failure','cancelled','timed_out','skipped','action_required','neutral','stale',null].includes(r.conclusion)&&SHA40.test(r.headSha)&&!!safeUrl(r.url)&&typeof r.createdAt==='string'&&r.createdAt.length<=50&&typeof r.event==='string'&&r.event.length<=70));
  }
  function validateBackup(v){
    const validEvidence=(r,requireSha=false)=>r.status!=='comprovado'||(safeUrl(r.evidence)&&(!requireSha||typeof r.sha==='string'&&r.sha.length>=7));
    return !!(v&&v.version===1&&Array.isArray(v.criteria)&&Array.isArray(v.prs)&&Array.isArray(v.android)&&Array.isArray(v.actions)&&Array.isArray(v.history)&&v.criteria.length<=3000&&v.android.length<=500&&v.history.length<=5000&&v.prs.length<=500&&v.actions.length<=3000
      &&v.criteria.every(r=>r&&typeof r.id==='string'&&typeof r.title==='string'&&typeof r.motor==='string'&&(!r.sha||typeof r.sha==='string')&&PROJECT[r.project]&&STATUS[r.status]&&validEvidence(r)&&(!r.evidence||safeUrl(r.evidence))&&(!r.comments||Array.isArray(r.comments)))
      &&v.prs.every(r=>r&&PROJECT[r.project]&&typeof r.sha==='string'&&typeof r.title==='string'&&typeof r.repo==='string'&&Array.isArray(r.runs)&&r.runs.every(x=>Array.isArray(x)&&x.length===2)&&r.stages&&['review','approval','merge','deploy'].every(k=>r.stages[k]&&STATUS[r.stages[k].status]&&validEvidence(r.stages[k],true)))
      &&v.actions.every(r=>r&&PROJECT[r.project]&&STATUS[r.status]&&validEvidence(r)&&(!r.evidence||safeUrl(r.evidence)))
      &&v.android.every(r=>r&&PROJECT[r.project]&&typeof r.model==='string'&&typeof r.os==='string'&&typeof r.browser==='string'
        &&typeof r.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)
        &&(r.sha===undefined||(typeof r.sha==='string'&&(!r.sha||SHA40.test(r.sha))))
        &&(r.note===undefined||typeof r.note==='string')&&safeUrl(r.evidence)
        &&r.scenarios&&typeof r.scenarios==='object'&&!Array.isArray(r.scenarios)
        &&Object.entries(r.scenarios).every(([name,result])=>SCENARIOS.includes(name)&&['passou','falhou','nao_testado'].includes(result)))
      &&v.history.every(r=>r&&typeof r.title==='string'&&typeof r.date==='string')
    &&(!('releaseTargets' in v)||(v.releaseTargets&&typeof v.releaseTargets==='object'&&!Array.isArray(v.releaseTargets)&&Object.entries(v.releaseTargets).every(([p,r])=>PROJECT[p]&&r&&typeof r.sha==='string'&&typeof r.evidence==='string'&&typeof r.note==='string'&&(!r.sha||SHA40.test(r.sha))&&(!r.evidence||safeUrl(r.evidence)))))
    &&(!('qa' in v)||(Array.isArray(v.qa)&&v.qa.length<=50&&v.qa.every(q=>q&&PROJECT[q.project]&&BROWSERS.includes(q.browser)&&VIEWPORTS.includes(q.viewport)&&STATUS[q.status]&&typeof q.id==='string'&&typeof q.sha==='string'&&(!q.evidence||safeUrl(q.evidence))&&validEvidence(q,true))))
    &&v.prs.every(pr=>(!('checklist' in pr)||(Array.isArray(pr.checklist)&&pr.checklist.length<=20&&pr.checklist.every(c=>c&&CHECK_DEFS.some(([k])=>k===c.key)&&STATUS[c.status]&&(!c.evidence||safeUrl(c.evidence))&&validEvidence(c,true))))&&(!('extraRuns' in pr)||(Array.isArray(pr.extraRuns)&&pr.extraRuns.length<=100&&pr.extraRuns.every(r=>r&&typeof r.name==='string'&&typeof r.sha==='string'&&safeUrl(r.url))))))
    &&(!('github' in v)||(v.github&&typeof v.github==='object'&&!Array.isArray(v.github)
      &&typeof v.github.checkedAt==='string'&&v.github.checkedAt.length<=50
      &&v.github.projects&&typeof v.github.projects==='object'&&!Array.isArray(v.github.projects)
      &&Object.entries(v.github.projects).every(([p,o])=>PROJECT[p]&&o&&SHA40.test(o.sha)&&typeof o.observedAt==='string'&&o.observedAt.length<=50&&(!o.url||safeUrl(o.url)))
      &&v.github.prs&&typeof v.github.prs==='object'&&!Array.isArray(v.github.prs)
      &&Object.entries(v.github.prs).every(([id,o])=>v.prs.some(pr=>pr.id===id)&&o&&SHA40.test(o.sha)&&['open','closed'].includes(o.state)&&typeof o.merged==='boolean'&&typeof o.draft==='boolean'&&typeof o.observedAt==='string'&&o.observedAt.length<=50&&(!o.url||safeUrl(o.url)))
      &&Array.isArray(v.github.errors)&&v.github.errors.length<=20&&v.github.errors.every(e=>typeof e==='string'&&e.length<=200)
      &&validGithubRuns(v.github)))
  }
  let state=load();
  let currentPage='overview';
  let toastTimer;
  const priorityOrder={critica:0,alta:1,media:2,baixa:3};
  function notify(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2900)}
  // Evita perda silenciosa de alterações em múltiplas abas. Não há sincronização em nuvem.
  function hasStorageConflict(){try{return (localStorage.getItem(STORAGE)??null)!==knownStorageRaw}catch{return false}}
  function showStorageConflict(){
    $('#storageConflict').hidden=false;
    $('#saveIndicator').textContent='Conflito: alterações não salvas';
  }
  function save(title,detail){
    if(hasStorageConflict()){showStorageConflict();notify('Outra aba alterou os registros. Exporte seu rascunho antes de recarregar.');return false}
    state.updatedAt=now();
    if(title)state.history.unshift({id:uid(),date:now(),title:clampText(title,180),detail:clampText(detail),type:'manual'});
    state.history=state.history.slice(0,2000);
    try{
      const value=JSON.stringify(state);
      localStorage.setItem(STORAGE,value);
      knownStorageRaw=value;
      $('#saveIndicator').innerHTML='<span class="save-dot"></span> Salvo localmente';
      $('#storageConflict').hidden=true;
      renderAll();
      return true;
    }catch(e){
      $('#saveIndicator').textContent='Não salvo: exporte JSON';
      notify('O navegador não permitiu salvar. Exporte o rascunho JSON antes de sair.');
      renderAll();
      return false;
    }
  }
  function reloadExternal(){
    if(!window.confirm('Carregar os registros mais recentes deste navegador? As alterações não salvas nesta aba serão descartadas. Você pode exportar o rascunho em JSON antes de continuar.'))return false;
    try{
      const raw=localStorage.getItem(STORAGE)??null;
      const fresh=raw?JSON.parse(raw):emptyState();
      if(raw&&!validateBackup(fresh))throw new Error('Backup local inválido');
      state=normalizeState(fresh);
      knownStorageRaw=raw;
      $('#storageConflict').hidden=true;
      $('#saveIndicator').innerHTML='<span class="save-dot"></span> Dados atuais carregados';
      renderAll();
      notify('Registros mais recentes carregados desta origem.');
      return true;
    }catch(e){showStorageConflict();notify('Não foi possível carregar os dados. Exporte o rascunho e confira o armazenamento.');return false}
  }


  // O quadro de liberação é conservador: links são declarações manuais, não inspeções automáticas.
  function releaseAudit(project){
    const target=state.releaseTargets[project]||{sha:'',evidence:''};
    const targetOk=SHA40.test(target.sha)&&!!safeUrl(target.evidence);
    const sha=targetOk?target.sha.toLowerCase():'';
    const qa=state.qa.filter(q=>q.project===project);
    const qaOk=qa.filter(q=>q.status==='comprovado'&&safeUrl(q.evidence)&&SHA40.test(q.sha)&&q.sha.toLowerCase()===sha&&sha).length;
    const androidOk=!!sha&&state.android.some(a=>a.project===project&&a.sha?.toLowerCase()===sha&&safeUrl(a.evidence)&&a.model&&a.os&&a.browser&&a.date&&SCENARIOS.every(k=>a.scenarios?.[k]==='passou'));
    const critical=state.criteria.filter(r=>r.project===project&&r.priority==='critica');
    const unproven=critical.filter(r=>r.status!=='comprovado'||!safeUrl(r.evidence)||!SHA40.test(r.sha||'')||!sha||r.sha.toLowerCase()!==sha);
    const prs=state.prs.filter(pr=>pr.project===project);
    const prsIncomplete=prs.flatMap(pr=>{
      const observation=state.github?.prs?.[pr.id];
      const expected=SHA40.test(observation?.sha||'')?observation.sha.toLowerCase():pr.sha.toLowerCase();
      const headChanged=observation&&expected!==pr.sha.toLowerCase();
      const allowedMergeShas=[expected,observation?.mergeSha?.toLowerCase()].filter(Boolean);
      const stageValid=k=>{
        const st=pr.stages?.[k];
        if(!st||st.status!=='comprovado'||!safeUrl(st.evidence)||!SHA40.test(st.sha||''))return false;
        const submittedSha=st.sha.toLowerCase();
        if(k==='deploy')return !!sha&&submittedSha===sha;
        if(k==='merge')return allowedMergeShas.includes(submittedSha);
        return submittedSha===expected;
      };
      const badStages=['review','approval','merge','deploy'].filter(k=>!stageValid(k));
      const badChecks=(pr.checklist||[]).filter(c=>c.status!=='comprovado'||!safeUrl(c.evidence)||!SHA40.test(c.sha||'')||c.sha.toLowerCase()!==expected);
      return (headChanged?[`PR #${pr.number}: HEAD mudou no GitHub; revisar snapshot manual e todos os testes`]:[])
        .concat(badStages.map(k=>`PR #${pr.number}: ${stageName[k].toLowerCase()} sem evidência no SHA adequado`))
        .concat(badChecks.length?[`PR #${pr.number}: ${badChecks.length}/7 itens técnicos sem evidência no SHA da HEAD`]:[]);
    });
    const blockers=[];
    if(!targetOk)blockers.push({key:'target',label:'Definir SHA-alvo de 40 caracteres e evidência do build',page:'liberacao'});
    if(qaOk!==6)blockers.push({key:'qa',label:`Playwright na versão-alvo: ${qaOk}/6 combinações`,page:'qa'});
    if(!androidOk)blockers.push({key:'android',label:'Android físico sem seis cenários comprovados no SHA-alvo',page:'android'});
    if(unproven.length)blockers.push({key:'critical',label:`${unproven.length} critério(s) críticos sem evidência no SHA-alvo`,page:'criterios'});
    for(const label of prsIncomplete)blockers.push({key:'pr',label,page:'prs'});
    return {project,sha,targetOk,qaOk,androidOk,criticalOpen:unproven.length,prOpen:prsIncomplete.length,blockers,complete:blockers.length===0};
  }
  // GitHub API pública: GET exclusivamente, por ação explícita da pessoa usuária.
  // O snapshot consultado não altera checklists, PRs manuais, status de merge nem de deploy.
  function githubDrift(project){
    const observed=state.github?.projects?.[project];const target=state.releaseTargets?.[project]?.sha;
    if(!observed||!SHA40.test(observed.sha))return {kind:'sem-consulta',label:'GitHub ainda não consultado'};
    if(!SHA40.test(target||''))return {kind:'sem-alvo',label:'SHA-alvo não definido'};
    if(target.toLowerCase()===observed.sha.toLowerCase())return {kind:'alinhado',label:'SHA-alvo igual à main observada'};
    return {kind:'branch-divergente',label:'SHA-alvo diferente da main. Conferir branch/PR; não significa falha automaticamente.'};
  }
  function renderGitHub(){
    const snapshot=state.github||{projects:{},prs:{},errors:[]};
    const cards=Object.keys(PROJECT).map(p=>{
      const o=snapshot.projects[p];const drift=githubDrift(p);
      return `<article class="github-card"><div class="github-card-title">${projectTag(p)} <span class="tag">main</span></div>
        <p class="github-sha"><strong>${o&&SHA40.test(o.sha)?escape(o.sha.slice(0,12)):'Não consultado'}</strong>${o?href(o.url,'Ver commit ↗'):''}</p>
        <p class="github-status github-${escape(drift.kind)}">${escape(drift.label)}</p>
        <small>Leitura: ${o?.observedAt?escape(fmtTime(o.observedAt)):'indisponível'}${o?.commitDate?' · Commit: '+escape(fmtTime(o.commitDate)):''}</small></article>`;
    }).join('');
    $('#githubProjectCards').innerHTML=cards;
    $('#githubPrCards').innerHTML=state.prs.map(pr=>{
      const o=snapshot.prs[pr.id];const changed=!!(o&&SHA40.test(o.sha)&&o.sha.toLowerCase()!==pr.sha.toLowerCase());
      const label=!o?'Sem consulta':o.merged?'Integrada':o.draft?'Aberta · rascunho':o.state==='open'?'Aberta':'Fechada sem merge';
      return `<div class="github-pr"><div>${projectTag(pr.project)} <strong>PR #${pr.number}</strong><span class="tag">${escape(label)}</span>
        ${changed?'<span class="github-warning">HEAD alterada: revalidar evidências</span>':''}</div>
        <small>HEAD pública: ${o&&SHA40.test(o.sha)?escape(o.sha.slice(0,12)):'não disponível'} · ${o?escape(fmtTime(o.observedAt)):'Sem data'}</small></div>`;
    }).join('');
    $('#githubRuns').innerHTML=Object.keys(PROJECT).map(p=>{
      const runs=snapshot.runs?.[p]||[];const target=state.releaseTargets[p]?.sha;
      return `<article class="github-runs-project"><h3>${escape(PROJECT[p])}</h3>${runs.length?runs.map(r=>{
        const match=SHA40.test(target||'')&&r.headSha.toLowerCase()===target.toLowerCase();
        const comparison=!SHA40.test(target||'')?'SHA-alvo ainda não registrado':match?'SHA igual à versão-alvo (não comprova deploy)':'SHA diferente da versão-alvo';
        return `<div class="github-run"><div><strong>${escape(r.name)}</strong><small>${escape(r.event)} · ${escape(fmtTime(r.createdAt))}</small><small class="${match?'github-alinhado':'github-warning'}">${escape(comparison)}</small></div><div class="github-run-side"><span class="github-run-status">${escape(r.status==='completed'?(r.conclusion||'sem conclusão'):r.status)}</span>${href(r.url,'Ver run ↗')}</div></div>`;
      }).join(''):'<p class="github-note">Nenhum run consultado para este projeto.</p>'}</article>`;
    }).join('');
    $('#githubTimestamp').textContent=snapshot.checkedAt?'Última tentativa de consulta: '+fmtTime(snapshot.checkedAt):'Sem consulta registrada';
    $('#githubErrors').textContent=(snapshot.errors||[]).length?'Consulta parcial: '+snapshot.errors.join(' · '):'Dados observados, sem alteração automática de qualquer gate.';
  }
  async function refreshGitHub(){
    const button=$('#refreshGithub');button.disabled=true;button.textContent='Consultando GitHub…';
    const repoTasks=Object.keys(REPO).map(p=>({type:'project',id:p,url:GH_API+REPO[p]+'/commits/main'}));
    const prTasks=state.prs.map(pr=>({type:'pr',id:pr.id,url:GH_API+pr.repo+'/pulls/'+pr.number}));
    const runTasks=Object.keys(REPO).map(p=>({type:'runs',id:p,url:GH_API+REPO[p]+'/actions/runs?branch=main&per_page=5'}));
    const queries=[...repoTasks,...prTasks,...runTasks];let updated=0;const errors=[];
    try{
      const results=await Promise.allSettled(queries.map(async job=>{
        const response=await fetch(job.url,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
        if(!response.ok)throw new Error('HTTP '+response.status);
        const data=await response.json();
        if(job.type==='runs'){
          if(!Array.isArray(data?.workflow_runs))throw new Error('Lista de workflows inválida');
          const runs=data.workflow_runs.slice(0,5).map(r=>({id:r.id,name:clampText(r.name||'Workflow',150),status:r.status,conclusion:r.conclusion??null,headSha:r.head_sha,url:safeUrl(r.html_url),createdAt:r.created_at||'',event:clampText(r.event||'desconhecido',70)}));
          if(runs.some(r=>!Number.isSafeInteger(r.id)||!SHA40.test(r.headSha)||!r.url||!['queued','in_progress','completed','requested','waiting','pending'].includes(r.status)||!['success','failure','cancelled','timed_out','skipped','action_required','neutral','stale',null].includes(r.conclusion)))throw new Error('Workflow com dados incompletos');
          return {job,data:runs};
        }
        const sha=job.type==='project'?data?.sha:data?.head?.sha;
        if(!SHA40.test(sha||''))throw new Error('Resposta sem SHA válido');
        if(job.type==='pr'&&(!['open','closed'].includes(data.state)||typeof data.merged!=='boolean'||typeof data.draft!=='boolean'))throw new Error('Resposta de PR incompleta');
        return {job,data,sha:sha.toLowerCase()};
      }));
      const fetchedAt=now();
      for(let i=0;i<results.length;i++){
        const result=results[i],job=queries[i];
        if(result.status!=='fulfilled'){errors.push((job.type==='pr'?'PR ':job.type==='runs'?'Runs ':'Repo ')+job.id+': '+clampText(result.reason?.message||'falha de rede',100));continue}
        const {data,sha}=result.value;
        if(job.type==='runs')state.github.runs[job.id]=data;
        else if(job.type==='project')state.github.projects[job.id]={sha,branch:'main',observedAt:fetchedAt,commitDate:data.commit?.committer?.date||'',url:safeUrl(data.html_url)||GH+REPO[job.id]+'/commit/'+sha};
        else state.github.prs[job.id]={sha,state:data.state,draft:data.draft,merged:data.merged,observedAt:fetchedAt,url:safeUrl(data.html_url)||GH+state.prs.find(p=>p.id===job.id)?.repo+'/pull/'+data.number,mergeSha:SHA40.test(data.merge_commit_sha||'')?data.merge_commit_sha:''};
        updated++;
      }
      state.github.checkedAt=fetchedAt;state.github.errors=errors;
      if(updated)save('Consulta pública ao GitHub',`${updated}/${queries.length} recursos GET recebidos. Nenhum status de homologação ou PR foi alterado. ${errors.join(' | ')}`);
      else{renderGitHub();notify('GitHub indisponível. Mantido último snapshot; nenhuma conclusão foi alterada.');}
      return {updated,errors};
    }finally{button.disabled=false;button.textContent='Atualizar consulta GitHub';}
  }

  function renderRelease(){
    $('#releaseBoard').innerHTML=Object.keys(PROJECT).map(p=>{
      const a=releaseAudit(p), t=state.releaseTargets[p];
      const outstanding=a.blockers.slice(0,9).map(b=>`<li><button type="button" data-page="${escape(b.page)}">${escape(b.label)} ↗</button></li>`).join('');
      return `<article class="release-card" data-release-project="${escape(p)}"><div class="release-card-head">${projectTag(p)}<span class="release-state ${a.complete?'ready':''}">${a.complete?'Evidências completas para revisão':'Não liberado'}</span></div>
      <div class="release-target"><span>SHA-alvo informado</span><code title="${escape(t.sha)}">${escape(t.sha||'Não definido')}</code><small class="github-status">${escape(githubDrift(p).label)}</small></div>
      <div class="release-stats"><span><strong>${a.qaOk}/6</strong> Playwright no SHA</span><span><strong>${a.androidOk?'1':'0'}</strong> Android físico</span><span><strong>${a.criticalOpen}</strong> críticos pendentes</span><span><strong>${a.prOpen}</strong> pendências de PR</span></div>
      <div class="release-evidence">${safeUrl(t.evidence)?href(t.evidence,'Ver evidência do build ↗'):'Evidência da versão-alvo não cadastrada.'}${t.note?`<p>${escape(t.note)}</p>`:''}</div>
      <details ${a.complete?'':'open'} class="release-blockers"><summary>${a.blockers.length} bloqueador(es) para auditoria</summary>${outstanding?`<ul>${outstanding}</ul>`:'<p>Registros preenchidos. Falta conferir manualmente a autenticidade, a origem e a publicação.</p>'}${a.blockers.length>9?`<p>Mais ${a.blockers.length-9} pendências. Use os checklists das PRs.</p>`:''}</details>
      <div class="release-actions"><button class="item-edit" type="button" data-open-release="${escape(p)}">Definir versão-alvo</button><button class="item-edit" type="button" data-report-release="${escape(p)}">Relatório TXT</button></div></article>`;
    }).join('');
    const audit=Object.keys(PROJECT).map(releaseAudit);
    $('#releaseMini').innerHTML=`<div><strong>${audit.filter(a=>a.complete).length} de 3</strong><span>projetos com evidências completas para auditoria</span></div><button type="button" class="link-button" data-page="liberacao">Ver bloqueadores e SHA-alvo ↗</button>`;
  }
  function openRelease(p){if(!PROJECT[p])return;const r=state.releaseTargets[p];$('#releaseForm').reset();$('#releaseError').textContent='';
    [['releaseProject',p],['releaseSha',r.sha],['releaseEvidence',r.evidence],['releaseNote',r.note]].forEach(([k,v])=>setValue(k,v));
    $('#releaseDialogTitle').textContent=`Definir versão-alvo · ${PROJECT[p]}`;openDialog('#releaseDialog');
  }
  function submitRelease(ev){ev.preventDefault();const p=$('#releaseProject').value;if(!PROJECT[p])return;
    const sha=$('#releaseSha').value.trim(),evidence=$('#releaseEvidence').value.trim(),note=$('#releaseNote').value.trim(),error=$('#releaseError');
    if(!SHA40.test(sha)){error.textContent='Informe o SHA completo com 40 caracteres hexadecimais.';return}
    if(!safeUrl(evidence)){error.textContent='Informe um link de evidência HTTP/HTTPS válido.';return}
    state.releaseTargets[p]={sha:sha.toLowerCase(),evidence:safeUrl(evidence),note:clampText(note),updated:now()};
    closeDialog('#releaseDialog');if(save('SHA-alvo definido: '+PROJECT[p],`SHA ${sha} | ${evidence}. Testes e etapas não foram concluídos automaticamente.`))notify('Versão-alvo registrada; confira os bloqueadores.');
  }
  function releaseReport(p){const a=releaseAudit(p),t=state.releaseTargets[p];
    return [`PG BOT | RELATÓRIO DE HOMOLOGAÇÃO`, `Projeto: ${PROJECT[p]}`,`Gerado: ${new Date().toLocaleString('pt-BR')}`,`SHA-alvo: ${t.sha||'não definido'}`,`Evidência build: ${t.evidence||'não registrada'}`,`HEAD da main pública (última consulta): ${state.github.projects[p]?.sha||'indisponível'}`,`Consultada: ${state.github.projects[p]?.observedAt||'sem data'}`,`Comparação: ${githubDrift(p).label}`,
      `Estado: ${a.complete?'EVIDÊNCIAS COMPLETAS, EXIGE REVISÃO HUMANA':'NÃO LIBERADO'}`,`Playwright no SHA: ${a.qaOk}/6`,`Android físico no SHA: ${a.androidOk?'registrado':'não comprovado'}`,`Críticos pendentes: ${a.criticalOpen}`,`Pendências de PR: ${a.prOpen}`,
      '', 'BLOQUEADORES',...(a.blockers.map((b,i)=>`${i+1}. ${b.label}`)), '', 'Este relatório é local e NÃO atesta revisão formal, deploy, aprovação ou autenticação dos links.'].join('\n');
  }
  function downloadText(file,text){const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=file;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
  }

  function projectList(p){return state.criteria.filter(x=>x.project===p)}
  function renderMetrics(){const c=counts(state.criteria);const data=[['Comprovados',c.comprovado,'Prova vinculada ao critério','◉','#6bd4b8'],['Pendentes',c.pendente,'Aguardam validação','◷','#eabb74'],['Bloqueados',c.bloqueado,'Impedimentos registrados','⊘','#ec8faa'],['Hipóteses',c.hipotese,'Ainda sem confirmação','◇','#ac9dff']];$('#metrics').innerHTML=data.map(([label,value,sub,ico,color])=>`<div class="metric" style="--metric-color:${color}"><div class="metric-label"><span class="metric-icon">${ico}</span>${label}</div><div class="metric-value">${value}</div><div class="metric-sub">${sub}</div></div>`).join('');$('#navCriteriaCount').textContent=state.criteria.length}
  function projectCard(p,compact=false){const l=projectList(p),c=counts(l),per=percent(l);const theme=p==='estrategia'?['#8cb7ff','#232d45','#43618f','rgba(70,92,170,.21)','♜']:p==='arcade'?['#64d7bd','#1d353c','#3a6861','rgba(38,148,134,.16)','▦']:['#ac9bff','#2a2347','#5f508e','rgba(121,96,214,.17)','◇'];const [fg,bg,border,glow,icon]=theme;return `<div class="project-card ${compact?'compact-card':''}" style="--project-fg:${fg};--project-bg:${bg};--project-border:${border};--project-glow:${glow}"><div class="project-head"><div class="project-symbol">${icon}</div><div><h3>${PROJECT[p]}</h3><p>${l.length} critérios monitorados</p></div><span class="project-state">${per}% verificado</span></div><div class="readiness-row"><span>Com evidência registrada</span><strong>${l.filter(r=>r.status==='comprovado'&&safeUrl(r.evidence)).length}<span style="font-size:14px;color:#7e8ca9;font-weight:500"> / ${l.length}</span></strong></div><div class="progress-track"><div class="progress-fill" style="width:${per}%"></div></div><div class="project-foot"><div class="status-mini"><span><i class="mini-dot" style="--dot:#82d9b7"></i>${c.comprovado} comprovados</span><span><i class="mini-dot" style="--dot:#e3bd82"></i>${c.pendente} pendentes</span><span><i class="mini-dot" style="--dot:#ed93ab"></i>${c.bloqueado} bloqueados</span></div>${href(GH+(p==='bot'?'PG-Bot':p==='estrategia'?'PG-Estrategia':'PG-Arcade'), 'GitHub ↗')}</div></div>`}
  function renderProjects(){$('#projectCards').innerHTML=projectCard('estrategia')+projectCard('arcade')+projectCard('bot');$('#comparisonCards').innerHTML=projectCard('estrategia',true)+projectCard('arcade',true)+projectCard('bot',true)}
  function sortedActions(){return [...state.actions].sort((a,b)=>(a.status==='comprovado'?1:0)-(b.status==='comprovado'?1:0)|| (priorityOrder[a.priority]??3)-(priorityOrder[b.priority]??3))}
  function renderQueue(){$('#shortQueue').innerHTML=sortedActions().filter(a=>a.status!=='comprovado').slice(0,5).map((a,i)=>`<div class="queue-item"><div class="queue-rank">${String(i+1).padStart(2,'0')}</div><div class="queue-copy"><strong>${escape(a.title)}</strong><small>${escape(PROJECT[a.project])} · ${escape(a.owner||'Sem responsável')}</small></div>${priorityChip(a.priority)}</div>`).join('')||'<div class="empty">Sem ações abertas.</div>';$('#allActions').innerHTML=sortedActions().map((a,i)=>`<article class="action-item"><div class="action-number">${String(i+1).padStart(2,'0')}</div><div><h3 class="action-title">${escape(a.title)}</h3><div class="action-meta">${projectTag(a.project)} ${priorityChip(a.priority)} ${statusChip(a.status)} <span class="tag">${escape(a.owner||'Sem responsável')}</span></div><p class="action-desc">${escape(a.plan||'Plano não registrado.')}</p>${a.evidence?href(a.evidence,'Abrir PR / evidência ↗'):''}</div><div class="action-side"><button class="item-edit" data-open-action="${escape(a.id)}">Editar</button></div></article>`).join('')||'<div class="empty">Sem ações cadastradas.</div>'}
  function renderHistory(){const act=[...state.history].sort((a,b)=>String(b.date).localeCompare(String(a.date)));$('#shortHistory').innerHTML=act.slice(0,5).map(x=>`<div class="activity-entry"><span class="activity-symbol">${x.type==='snapshot'?'◇':'✓'}</span><div><strong>${escape(x.title)}</strong><p>${escape(fmtTime(x.date))}</p></div></div>`).join('');$('#historyList').innerHTML=act.map(x=>`<article class="history-entry"><span class="history-dot"></span><div><h4>${escape(x.title)}</h4><p>${escape(x.detail||'')}</p><time datetime="${escape(x.date)}">${escape(fmtTime(x.date))}</time></div></article>`).join('');$('#historyCount').textContent=act.length+' registros';let recoverable=false;try{recoverable=!!localStorage.getItem(PREVIOUS_IMPORT)}catch{}$('#restoreBtn').disabled=!recoverable}
  function updateMotorFilters(){const sel=$('#filterMotor'),old=sel.value;const motors=[...new Set(state.criteria.map(x=>x.motor))].sort((a,b)=>a.localeCompare(b,'pt-BR'));sel.innerHTML='<option value="all">Todos os motores</option>'+motors.map(m=>`<option value="${escape(m)}">${escape(m)}</option>`).join('');sel.value=motors.includes(old)?old:'all'}
  function renderCriteria(){const search=$('#searchCriteria').value.trim().toLocaleLowerCase('pt-BR');const filters={project:$('#filterProject').value,motor:$('#filterMotor').value,priority:$('#filterPriority').value,risk:$('#filterRisk').value,status:$('#filterStatus').value};const matches=state.criteria.filter(r=>Object.entries(filters).every(([k,v])=>v==='all'||String(r[k])===v)&&(!search||[r.title,r.motor,r.category,r.note,r.evidence,r.sha].join(' ').toLocaleLowerCase('pt-BR').includes(search)));$('#criteriaResultCount').textContent=`${matches.length} de ${state.criteria.length} critérios`;$('#criteriaList').innerHTML=matches.map(r=>`<article class="criterion" data-record-project="${escape(r.project)}"><div><div class="criterion-top">${projectTag(r.project)}<span class="tag">${escape(r.motor)}</span><span class="tag">${escape(r.category)}</span>${priorityChip(r.priority)}</div><h3>${escape(r.title)}</h3><p>${escape(r.note||'Sem observações cadastradas.')}</p>${r.evidence?`<p class="criterion-evidence">${href(r.evidence, 'Ver evidência ↗')} ${r.sha?' · SHA '+escape(r.sha.slice(0,9)):''}</p>`:''}<p style="margin-top:6px;font-size:9px">Risco: ${escape(RISK[r.risk]||'Não informado')} · ${r.comments?.length||0} comentário(s)</p></div><div class="criterion-side">${statusChip(r.status)}<button class="item-edit" data-open-record="${escape(r.id)}">Editar / comentar</button></div></article>`).join('')||'<div class="empty">Nenhum critério encontrado. Altere os filtros.</div>'}
  function renderComparison(){const trs=CATEGORIES.map(category=>{const parts=['estrategia','arcade','bot'].map(p=>{const l=projectList(p).filter(x=>x.category===category),good=l.filter(x=>x.status==='comprovado'&&safeUrl(x.evidence)).length,pct=l.length?Math.round(good/l.length*100):0;return `<td><div class="cell-meter"><div class="bar"><i style="width:${pct}%"></i></div><span>${good} / ${l.length}</span></div></td>`});return `<tr><td>${escape(category)}</td>${parts.join('')}</tr>`});$('#comparisonTable').innerHTML=trs.join('')}
  function renderIntegrations(){const unique=[...new Map(state.criteria.map(r=>[r.project+'||'+r.motor,{project:r.project,motor:r.motor}])).values()];$('#integrationList').innerHTML=unique.map((item,i)=>{const l=state.criteria.filter(x=>x.project===item.project&&x.motor===item.motor),good=l.filter(r=>r.status==='comprovado'&&safeUrl(r.evidence)).length;return `<article class="integration"><div class="integration-icon">${item.project==='estrategia'?'♜':item.project==='arcade'?'▦':'◇'}</div><h3>${escape(item.motor)}</h3><div class="integration-meta">${projectTag(item.project)} <span class="tag">${good}/${l.length} com evidência</span></div><p>${escape(l.map(r=>r.category).filter((v,i,a)=>a.indexOf(v)===i).join(' · '))}. Contratos e IDs existentes permanecem como fonte de verdade.</p><div class="integration-footer"><span>Itens: ${l.map(r=>r.status==='comprovado'?'✓':'○').join(' ')}</span><button data-filter-integration="${escape(item.project)}" data-motor="${escape(item.motor)}">Abrir critérios ↗</button></div></article>`}).join('')}
  const stageName={review:'Revisão',approval:'Aprovação',merge:'Merge',deploy:'Deploy'};
  function renderQa(){
    const project=$('#qaProject').value||'all',browser=$('#qaBrowser').value||'all',status=$('#qaStatus').value||'all';
    const items=state.qa.filter(q=>(project==='all'||q.project===project)&&(browser==='all'||q.browser===browser)&&(status==='all'||q.status===status));
    $('#qaSummary').innerHTML=['bot','estrategia','arcade'].map(p=>{
      const all=state.qa.filter(q=>q.project===p),target=state.releaseTargets[p]?.sha||'',ok=all.filter(q=>q.status==='comprovado'&&safeUrl(q.evidence)&&SHA40.test(q.sha)&&SHA40.test(target)&&q.sha.toLowerCase()===target.toLowerCase()).length;
      const shas=[...new Set(all.filter(q=>q.status==='comprovado').map(q=>q.sha))];
      return `<div class="qa-summary-card"><strong>${escape(PROJECT[p])}</strong><span>${ok}/6 combinações no SHA-alvo</span><small>${!SHA40.test(target)?'Defina um SHA-alvo para contar os testes desta versão.':ok===6?'Seis combinações no SHA-alvo. Revise manualmente os runs e artefatos.':'Ainda faltam provas para esta versão-alvo.'}</small></div>`;
    }).join('');
    $('#qaCounter').textContent=`${items.length} de ${state.qa.length} combinações`;
    $('#qaList').innerHTML=items.map(q=>`<article class="qa-row"><div class="qa-row-main">${projectTag(q.project)}<strong>${escape(q.browser)} · ${q.viewport} px</strong><small>${q.sha?'SHA '+escape(q.sha.slice(0,12)):'SHA não registrado'}${state.releaseTargets[q.project]?.sha&&q.sha&&state.releaseTargets[q.project].sha.toLowerCase()!==q.sha.toLowerCase()?' · SHA diferente da versão-alvo':''}${q.updated?' · '+escape(fmtTime(q.updated)):''}</small>${q.note?`<p>${escape(q.note)}</p>`:''}${safeUrl(q.evidence)?href(q.evidence,'Abrir evidência ↗'):''}</div><div class="qa-row-actions">${statusChip(q.status)}<button class="item-edit" data-open-qa="${escape(q.id)}">Registrar teste</button></div></article>`).join('')||'<div class="panel empty">Nenhuma combinação corresponde aos filtros.</div>';
  }
  function renderPrs(){
    $('#prList').innerHTML=state.prs.map(pr=>{
      const checks=pr.checklist||[];
      const observed=state.github?.prs?.[pr.id];
      const prExpectedSha=SHA40.test(observed?.sha||'')?observed.sha:pr.sha;
      const completed=checks.filter(c=>c.status==='comprovado'&&safeUrl(c.evidence)&&SHA40.test(c.sha||'')&&c.sha.toLowerCase()===prExpectedSha.toLowerCase()).length;
      const headChanged=!!(observed&&SHA40.test(observed.sha)&&observed.sha.toLowerCase()!==pr.sha.toLowerCase());
      const baseRuns=(pr.runs||[]).map(([name,id])=>href(GH+pr.repo+'/actions/runs/'+id,'✓ '+name+' #'+id)).join('');
      const newRuns=(pr.extraRuns||[]).map(run=>`<div class="extra-run">${href(run.url,run.name)} <small>SHA ${escape(run.sha.slice(0,12))} · Manual (resultado não verificado)</small></div>`).join('');
      return `<article class="pr-card" data-pr="${escape(pr.id)}">
        <div class="pr-head"><div>${projectTag(pr.project)} <span class="tag">PR #${escape(pr.number)}</span>${pr.draft?'<span class="tag">Rascunho</span>':'<span class="tag">Fora de rascunho</span>'}<h3>${escape(pr.title)}</h3><p>HEAD manual: <code>${escape(pr.sha?.slice(0,12)||'desconhecida')}</code> · Snapshot: ${escape(fmtTime(pr.updated))}</p>${headChanged?'<p class="github-warning">A HEAD pública mudou. Revisar runs/checklist desta PR antes de marcar como comprovado.</p>':''}</div>${href(pr.url,'Abrir PR ↗')}</div>
        <div class="pr-stages">${Object.entries(stageName).map(([name,label])=>{const item=pr.stages[name];return `<div class="pr-stage"><small>${label}</small>${statusChip(item.status)}${(name==='merge'||name==='deploy')&&item.status!=='comprovado'?`<span class="stage-pending">${label} não comprovado</span>`:''}<button data-pr-stage="${escape(pr.id)}" data-stage="${name}">Registrar evidência</button></div>`}).join('')}</div>
        <details class="pr-checklist"><summary><span>Checklist técnico da PR</span><strong>${completed}/${checks.length} comprovados</strong></summary><div class="pr-checklist-items">${checks.map(c=>`<div class="pr-check-item"><div><strong>${escape(c.title)}</strong><div>${statusChip(c.status)} ${safeUrl(c.evidence)?href(c.evidence,'Evidência ↗'):''}</div></div><button class="item-edit" data-open-check="${escape(pr.id)}" data-check-key="${escape(c.key)}">Atualizar</button></div>`).join('')}</div></details>
        <div class="pr-runs"><span>RUNS DO SNAPSHOT</span>${baseRuns}</div>${newRuns?`<div class="pr-extra-runs">${newRuns}</div>`:''}<div class="pr-run-action"><button class="item-edit" data-add-run="${escape(pr.id)}">+ Adicionar link de run</button></div>
        <div class="pr-footer">Checklist e links são registros locais. Revisão, aprovação, merge, deploy e execução de testes permanecem independentes. A consulta ao GitHub é manual e de leitura.</div>
      </article>`;
    }).join('');
  }
  function renderAndroid(){const items=state.android;$('#androidList').innerHTML=items.length?items.map(a=>{const passed=SCENARIOS.every(k=>a.scenarios?.[k]==='passou');const isValid=passed&&SHA40.test(a.sha||'')&&safeUrl(a.evidence)&&a.model&&a.os&&a.browser&&a.date;return `<article class="android-entry"><div class="entry-title"><h3>${escape(PROJECT[a.project])} · ${escape(a.model)}</h3>${statusChip(isValid?'comprovado':Object.values(a.scenarios||{}).includes('falhou')?'bloqueado':'pendente')}</div><p>${escape(a.os)} · ${escape(a.browser)} · ${escape(a.date)} · SHA: ${escape(a.sha?.slice(0,12)||'não informado')}</p><div class="scenario-pills">${SCENARIOS.map(k=>`<span class="${a.scenarios?.[k]==='passou'?'pass':a.scenarios?.[k]==='falhou'?'fail':''}">${escape(k)}: ${escape(a.scenarios?.[k]||'Não testado')}</span>`).join('')}</div><p>${escape(a.note||'Sem observações.')}</p>${href(a.evidence,'Abrir evidência ↗')}</article>`}).join(''):'<div class="panel empty"><strong>Nenhuma homologação física registrada</strong><p>Os projetos continuam pendentes em Android real até que testes, dispositivo e evidência sejam cadastrados.</p></div>'}
  function renderEvidences(){const evidence=[];
    state.qa.forEach(q=>{if(safeUrl(q.evidence))evidence.push({title:`Playwright: ${q.browser} ${q.viewport}px`,project:q.project,link:q.evidence,source:'Teste Playwright registrado manualmente',sha:q.sha})});
    state.prs.forEach(pr=>{(pr.checklist||[]).forEach(c=>{if(safeUrl(c.evidence))evidence.push({title:`Checklist ${c.title} · PR #${pr.number}`,project:pr.project,link:c.evidence,source:'Checklist técnico',sha:c.sha})});(pr.extraRuns||[]).forEach(r=>{if(safeUrl(r.url))evidence.push({title:`Run ${r.name} · PR #${pr.number}`,project:pr.project,link:r.url,source:'Link registrado manualmente',sha:r.sha})})});state.criteria.forEach(r=>{if(safeUrl(r.evidence))evidence.push({title:r.title,project:r.project,link:r.evidence,source:r.source,sha:r.sha})});state.prs.forEach(pr=>{Object.entries(pr.stages).forEach(([kind,s])=>{if(safeUrl(s.evidence))evidence.push({title:stageName[kind]+' · PR #'+pr.number,project:pr.project,link:s.evidence,source:'Etapa registrada da PR',sha:s.sha})})});state.android.forEach(a=>{if(safeUrl(a.evidence))evidence.push({title:'Android físico: '+a.model,project:a.project,link:a.evidence,source:'Validação em dispositivo real',sha:''})});state.actions.forEach(a=>{if(safeUrl(a.evidence))evidence.push({title:a.title,project:a.project,link:a.evidence,source:'Plano de ação',sha:''})});$('#evidenceCount').textContent=evidence.length+' links';$('#evidenceList').innerHTML=evidence.map(x=>`<div class="evidence-entry"><div>${projectTag(x.project)}<strong>${escape(x.title)}</strong><p>${escape(x.source||'Registrado manualmente')}${x.sha?' · SHA '+escape(x.sha.slice(0,12)):''}</p>${href(x.link,clampText(x.link,120))}</div><span class="evidence-source">LINK EXTERNO ↗</span></div>`).join('')||'<div class="empty">Ainda não há links de evidência.</div>'}
  function renderAll(){renderGitHub();renderRelease();renderMetrics();renderProjects();renderQueue();renderHistory();updateMotorFilters();renderCriteria();renderComparison();renderIntegrations();renderPrs();renderQa();renderAndroid();renderEvidences()}
  function go(page){if(!$('.page[data-section="'+page+'"]'))return;currentPage=page;$$('.page').forEach(p=>p.classList.toggle('active',p.dataset.section===page));$$('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);if(b.classList.contains('nav-item')){if(b.dataset.page===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}});$('#breadcrumbCurrent').textContent=({overview:'Visão geral',criterios:'Critérios',comparativo:'Comparativo',integracoes:'Integrações',prs:'Pull requests',liberacao:'Liberação',qa:'Matriz Playwright',android:'Android físico',acoes:'Próximas ações',evidencias:'Evidências',historico:'Histórico'})[page];closeMenu();window.scrollTo({top:0,behavior:'instant'})}
  function closeMenu(){$('#sidebar').classList.remove('is-open');$('#menuScrim').classList.remove('visible')}
  function openDialog(sel){const d=$(sel);d.showModal();const first=d.querySelector('input:not([type=hidden]),select,textarea,button');if(first)first.focus()}
  function closeDialog(sel){$(sel).close()}
  function setValue(id,v){$('#'+id).value=v??''}
  function openCriterion(id){const r=state.criteria.find(x=>x.id===id);$('#editForm').reset();$('#editError').textContent='';setValue('editId',r?.id||'');setValue('editTitle',r?.title||'');setValue('editProject',r?.project||'bot');setValue('editMotor',r?.motor||'PG Bot núcleo');setValue('editCategory',r?.category||'Integração');setValue('editStatus',r?.status||'pendente');setValue('editPriority',r?.priority||'media');setValue('editRisk',r?.risk||'integracao');setValue('editEvidence',r?.evidence||'');setValue('editSha',r?.sha||'');setValue('editNote',r?.note||'');$('#editDialogTitle').textContent=r?'Editar critério':'Novo critério';$('#commentBlock').style.display=r?'block':'none';$('#commentsList').innerHTML=(r?.comments||[]).map(c=>`<div class="comment">${escape(c.text)}<small>${escape(fmtTime(c.date))}</small></div>`).join('')||'<p class="hint">Nenhum comentário registrado.</p>';openDialog('#editDialog')}
  function submitCriterion(ev){ev.preventDefault();const id=$('#editId').value;const record={id:id||uid(),title:$('#editTitle').value.trim(),project:$('#editProject').value,motor:$('#editMotor').value.trim(),category:$('#editCategory').value,status:$('#editStatus').value,priority:$('#editPriority').value,risk:$('#editRisk').value,evidence:$('#editEvidence').value.trim(),sha:$('#editSha').value.trim(),note:$('#editNote').value.trim()};const error=$('#editError');if(!record.title||!record.motor){error.textContent='Informe nome e motor.';return}if(record.evidence&&!safeUrl(record.evidence)){error.textContent='Informe um link de evidência válido (HTTP/HTTPS).';return}if(record.status==='comprovado'&&!safeUrl(record.evidence)){error.textContent='Informe um link de evidência válido antes de marcar Comprovado.';return}const comment=$('#newComment').value.trim();const current=state.criteria.find(x=>x.id===id);record.comments=[...(current?.comments||[])];if(comment)record.comments.push({date:now(),text:clampText(comment,3000)});record.source=current?.source||'Registro manual';if(current)Object.assign(current,record);else state.criteria.push(record);closeDialog('#editDialog');if(save((current?'Critério atualizado: ':'Novo critério: ')+record.title,STATUS[record.status]+' | '+PROJECT[record.project]+(comment?' | Comentário: '+comment:'')+(record.evidence?' | '+record.evidence:'')))notify('Alteração salva no navegador')}
  function openStage(prid,name){const pr=state.prs.find(x=>x.id===prid);if(!pr||!stageName[name])return;const item=pr.stages[name];$('#stageForm').reset();$('#stageError').textContent='';$('#stageTitle').textContent=stageName[name]+' · PR #'+pr.number;setValue('stagePrId',prid);setValue('stageName',name);setValue('stageValue',item.status);setValue('stageEvidence',item.evidence);setValue('stageSha',item.sha||pr.sha);setValue('stageNote',item.note);openDialog('#stageDialog')}
  function submitStage(ev){ev.preventDefault();const pr=state.prs.find(x=>x.id===$('#stagePrId').value),name=$('#stageName').value;if(!pr)return;const st={status:$('#stageValue').value,evidence:$('#stageEvidence').value.trim(),sha:$('#stageSha').value.trim(),note:$('#stageNote').value.trim()},error=$('#stageError');if(st.evidence&&!safeUrl(st.evidence)){error.textContent='O link de evidência deve começar com HTTP/HTTPS.';return}if(st.status==='comprovado'&&(!safeUrl(st.evidence)||!SHA40.test(st.sha))){error.textContent='Para Comprovado, informe URL de evidência e SHA completo de 40 caracteres.';return}pr.stages[name]=st;closeDialog('#stageDialog');if(save('PR #'+pr.number+' · '+stageName[name]+' atualizado',STATUS[st.status]+' | SHA '+st.sha+' | '+st.evidence+' | '+st.note))notify('Etapa registrada; outras etapas não foram alteradas.')}
  function openQa(id){const q=state.qa.find(x=>x.id===id);if(!q)return;
    $('#qaForm').reset();$('#qaError').textContent='';
    $('#qaTitle').textContent=PROJECT[q.project]+' · '+q.browser+' '+q.viewport+' px';
    [['qaId',q.id],['qaEditStatus',q.status],['qaEvidence',q.evidence],['qaSha',q.sha],['qaNote',q.note]].forEach(([k,v])=>setValue(k,v));openDialog('#qaDialog');
  }
  function submitQa(ev){ev.preventDefault();const q=state.qa.find(x=>x.id===$('#qaId').value);if(!q)return;
    const status=$('#qaEditStatus').value,evidence=$('#qaEvidence').value.trim(),sha=$('#qaSha').value.trim(),note=$('#qaNote').value.trim();
    const err=$('#qaError');if(evidence&&!safeUrl(evidence)){err.textContent='Informe um URL HTTP/HTTPS válido.';return}
    if(status==='comprovado'&&(!safeUrl(evidence)||!SHA40.test(sha))){err.textContent='Comprovado exige evidência e SHA completo de 40 caracteres.';return}
    Object.assign(q,{status,evidence,sha,note,updated:now()});closeDialog('#qaDialog');if(save(`Playwright: ${PROJECT[q.project]} · ${q.browser} ${q.viewport}px`,`${STATUS[status]} | SHA ${sha} | ${evidence} | ${note}`))notify('Resultado registrado neste navegador.');
  }
  function openCheck(prId,key){const pr=state.prs.find(x=>x.id===prId);const c=pr?.checklist?.find(x=>x.key===key);if(!c)return;
    $('#checkForm').reset();$('#checkError').textContent='';$('#checkTitle').textContent=`PR #${pr.number} · ${c.title}`;
    [['checkPrId',prId],['checkKey',key],['checkStatus',c.status],['checkEvidence',c.evidence],['checkSha',c.sha||pr.sha],['checkNote',c.note]].forEach(([k,v])=>setValue(k,v));openDialog('#checkDialog');
  }
  function submitCheck(ev){ev.preventDefault();const pr=state.prs.find(x=>x.id===$('#checkPrId').value);const c=pr?.checklist?.find(x=>x.key===$('#checkKey').value);if(!c)return;
    const status=$('#checkStatus').value,evidence=$('#checkEvidence').value.trim(),sha=$('#checkSha').value.trim(),note=$('#checkNote').value.trim();const err=$('#checkError');
    if(evidence&&!safeUrl(evidence)){err.textContent='O URL da evidência precisa usar HTTP/HTTPS.';return}
    if(status==='comprovado'&&(!safeUrl(evidence)||!SHA40.test(sha))){err.textContent='Comprovado exige evidência e SHA completo de 40 caracteres.';return}
    Object.assign(c,{status,evidence,sha,note});closeDialog('#checkDialog');if(save(`Checklist PR #${pr.number}: ${c.title}`,`${STATUS[status]} | SHA ${sha} | ${evidence} | ${note}`))notify('Checklist atualizado sem alterar etapas da PR.');
  }
  function openRun(prId){const pr=state.prs.find(x=>x.id===prId);if(!pr)return;
    $('#runForm').reset();$('#runError').textContent='';$('#runTitle').textContent=`Adicionar run · PR #${pr.number}`;
    setValue('runPrId',prId);setValue('runSha',pr.sha);openDialog('#runDialog');
  }
  function submitRun(ev){ev.preventDefault();const pr=state.prs.find(x=>x.id===$('#runPrId').value);if(!pr)return;
    const name=$('#runName').value.trim(),url=$('#runEvidence').value.trim(),sha=$('#runSha').value.trim(),note=$('#runNote').value.trim(),err=$('#runError');
    if(!name||!safeUrl(url)||sha.length<7){err.textContent='Informe nome, URL HTTP/HTTPS e SHA de pelo menos 7 caracteres.';return}
    if((pr.extraRuns||[]).some(r=>r.url===safeUrl(url))){err.textContent='Este link já foi registrado para a PR.';return}
    pr.extraRuns.push({id:uid(),name:clampText(name,100),url:safeUrl(url),sha:clampText(sha,80),note:clampText(note,1500),date:now()});
    closeDialog('#runDialog');if(save(`Run adicionado à PR #${pr.number}`,`${name} | SHA ${sha} | ${url} | ${note} | Resultado não verificado automaticamente`))notify('Link registrado; não implica aprovação ou deploy.');
  }
  function renderScenarioFields(){const holder=$('#androidScenarioFields');holder.innerHTML=SCENARIOS.map((name,i)=>`<label>${escape(name)}<select data-scenario="${escape(name)}" id="androidScenario${i}"><option value="nao_testado">Não testado</option><option value="passou">Passou</option><option value="falhou">Falhou</option></select></label>`).join('')}
  function openAndroid(){renderScenarioFields();$('#androidForm').reset();$('#androidError').textContent='';setValue('androidDate',new Date().toLocaleDateString('en-CA'));openDialog('#androidDialog')}
  function submitAndroid(ev){ev.preventDefault();const data={id:uid(),project:$('#androidProject').value,model:$('#androidModel').value.trim(),os:$('#androidOs').value.trim(),browser:$('#androidBrowser').value.trim(),date:$('#androidDate').value,sha:$('#androidSha').value.trim(),evidence:$('#androidEvidence').value.trim(),note:$('#androidNote').value.trim(),scenarios:Object.fromEntries($$('[data-scenario]', $('#androidScenarioFields')).map(el=>[el.dataset.scenario,el.value]))};const err=$('#androidError');if(!data.model||!data.os||!data.browser||!data.date){err.textContent='Informe aparelho, Android, navegador e data.';return}if(!safeUrl(data.evidence)){err.textContent='Inclua uma evidência (URL HTTP/HTTPS) para registrar o teste físico.';return}if(data.sha&&!SHA40.test(data.sha)){err.textContent='SHA do Android deve ter 40 caracteres hexadecimais.';return}state.android.unshift(data);closeDialog('#androidDialog');const completed=SCENARIOS.every(k=>data.scenarios[k]==='passou');if(save('Validação física: '+data.model+' · '+PROJECT[data.project],completed&&SHA40.test(data.sha)?'Todos os cenários marcados como passou, com SHA e evidência: '+data.evidence:'Registro parcial ou sem SHA; homologação permanece pendente. '+data.evidence))notify('Validação registrada')}
  function openAction(id){const a=state.actions.find(x=>x.id===id);$('#actionForm').reset();$('#actionError').textContent='';$('#actionDialogTitle').textContent=a?'Editar ação':'Nova ação';[['actionId',a?.id||''],['actionTitle',a?.title||''],['actionProject',a?.project||'bot'],['actionPriority',a?.priority||'alta'],['actionStatus',a?.status||'pendente'],['actionOwner',a?.owner||''],['actionEvidence',a?.evidence||''],['actionPlan',a?.plan||'']].forEach(([id,v])=>setValue(id,v));openDialog('#actionDialog')}
  function submitAction(ev){ev.preventDefault();const id=$('#actionId').value;const a={id:id||uid(),title:$('#actionTitle').value.trim(),project:$('#actionProject').value,priority:$('#actionPriority').value,status:$('#actionStatus').value,owner:$('#actionOwner').value.trim(),evidence:$('#actionEvidence').value.trim(),plan:$('#actionPlan').value.trim()};const error=$('#actionError');if(!a.title){error.textContent='Informe o título da ação.';return}if(a.evidence&&!safeUrl(a.evidence)){error.textContent='Informe um URL HTTP/HTTPS válido.';return}if(a.status==='comprovado'&&!safeUrl(a.evidence)){error.textContent='Informe URL de evidência antes de concluir a ação.';return}const current=state.actions.find(x=>x.id===id);if(current)Object.assign(current,a);else state.actions.push(a);closeDialog('#actionDialog');if(save('Ação '+(current?'atualizada: ':'adicionada: ')+a.title,PROJECT[a.project]+' | '+STATUS[a.status]+' | '+a.plan))notify('Ação salva no navegador')}
  function exportJSON(){const data=JSON.stringify(state,null,2);const blob=new Blob([data],{type:'application/json;charset=utf-8'});const u=URL.createObjectURL(blob);const link=document.createElement('a');link.href=u;link.download='pg-bot-homologacao-'+new Date().toLocaleDateString('en-CA')+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(u),500);notify('Backup gerado')}
  async function importJSON(file){if(!file)return;if(file.size>2*1024*1024){notify('Backup maior que 2 MB. Importação recusada.');return}try{
    const loaded=JSON.parse(await file.text());if(!validateBackup(loaded))throw new Error('Formato ou versão incompatível');
    if(hasStorageConflict()){showStorageConflict();notify('Conflito de abas: exporte seu rascunho e recarregue antes de importar.');return}
    if(!window.confirm('Importar este backup? Isso substituirá os dados locais atuais. Uma cópia dos dados anteriores será mantida para recuperação.'))return;
    try{localStorage.setItem(PREVIOUS_IMPORT,JSON.stringify(state))}catch{throw new Error('Não foi possível salvar a recuperação anterior. Importação cancelada.')}
    state=normalizeState(loaded);if(save('Backup JSON importado','Dados locais substituídos; versão anterior disponível na seção Histórico.'))notify('Backup importado. A versão anterior pode ser recuperada em Histórico.');
  }catch(err){notify('Não foi possível importar: '+err.message)}finally{$('#importInput').value=''}}
  function restoreImport(){let old;
    try{const raw=localStorage.getItem(PREVIOUS_IMPORT);if(!raw){notify('Nenhuma versão anterior disponível.');return}old=JSON.parse(raw);if(!validateBackup(old))throw new Error('Cópia de recuperação inválida')}
    catch{notify('A cópia de recuperação não está disponível ou é inválida.');return}
    if(hasStorageConflict()){showStorageConflict();notify('Conflito de abas: carregue o estado mais recente antes de restaurar.');return}
    if(!window.confirm('Restaurar os dados anteriores à última importação? O estado atual será substituído.'))return;
    try{localStorage.setItem(PREVIOUS_IMPORT,JSON.stringify(state))}catch{notify('Não foi possível garantir retorno ao estado atual. Restauração cancelada.');return}
    state=normalizeState(old);if(save('Backup anterior restaurado','Restauração manual dos dados que existiam antes da última importação.'))notify('Versão anterior restaurada.');
  }

  // Delegação: nenhum evento altera GitHub, executa workflow ou publica site.
  document.addEventListener('click',ev=>{const rel=ev.target.closest('[data-open-release]');if(rel){openRelease(rel.dataset.openRelease);return}const report=ev.target.closest('[data-report-release]');if(report){const p=report.dataset.reportRelease;if(PROJECT[p])downloadText('pg-bot-homologacao-'+p+'.txt',releaseReport(p));return}const nav=ev.target.closest('[data-page]');if(nav){go(nav.dataset.page);return}const criteria=ev.target.closest('[data-open-record]');if(criteria){openCriterion(criteria.dataset.openRecord);return}const qa=ev.target.closest('[data-open-qa]');if(qa){openQa(qa.dataset.openQa);return}const check=ev.target.closest('[data-open-check]');if(check){openCheck(check.dataset.openCheck,check.dataset.checkKey);return}const run=ev.target.closest('[data-add-run]');if(run){openRun(run.dataset.addRun);return}const st=ev.target.closest('[data-pr-stage]');if(st){openStage(st.dataset.prStage,st.dataset.stage);return}const action=ev.target.closest('[data-open-action]');if(action){openAction(action.dataset.openAction);return}const integration=ev.target.closest('[data-filter-integration]');if(integration){setValue('filterProject',integration.dataset.filterIntegration);setValue('filterMotor',integration.dataset.motor);go('criterios');renderCriteria();return}const close=ev.target.closest('[data-close]');if(close){closeDialog('#'+close.closest('dialog').id);return}});
  $('#openMenu').addEventListener('click',()=>{$('#sidebar').classList.add('is-open');$('#menuScrim').classList.add('visible')});$('#closeMenu').addEventListener('click',closeMenu);$('#menuScrim').addEventListener('click',closeMenu);
  $('#releaseForm').addEventListener('submit',submitRelease);$('#qaForm').addEventListener('submit',submitQa);$('#checkForm').addEventListener('submit',submitCheck);$('#runForm').addEventListener('submit',submitRun);$('#editForm').addEventListener('submit',submitCriterion);$('#stageForm').addEventListener('submit',submitStage);$('#androidForm').addEventListener('submit',submitAndroid);$('#actionForm').addEventListener('submit',submitAction);
  [$('#newCriteriaBtn'),$('#addCriterionInPage')].forEach(btn=>btn.addEventListener('click',()=>openCriterion('')));$('#newAndroidBtn').addEventListener('click',openAndroid);$('#newActionBtn').addEventListener('click',()=>openAction(''));
  $('#refreshGithub').addEventListener('click',refreshGitHub);
  $('#exportUnsavedBtn').addEventListener('click',exportJSON);
  $('#reloadLocalBtn').addEventListener('click',reloadExternal);
  if(typeof window.addEventListener==='function')window.addEventListener('storage',event=>{
    if(event.key===STORAGE&&event.newValue!==knownStorageRaw)showStorageConflict();
  });
  [$('#exportBtn'),$('#exportFromHistory')].forEach(b=>b.addEventListener('click',exportJSON));$('#restoreBtn').addEventListener('click',restoreImport);$('#importBtn').addEventListener('click',()=>$('#importInput').click());$('#importInput').addEventListener('change',e=>importJSON(e.target.files[0]));
  ['#qaProject','#qaBrowser','#qaStatus'].forEach(sel=>$(sel).addEventListener('input',renderQa));
  ['#searchCriteria','#filterProject','#filterMotor','#filterPriority','#filterRisk','#filterStatus'].forEach(sel=>$(sel).addEventListener('input',renderCriteria));$('#resetFilters').addEventListener('click',()=>{setValue('searchCriteria','');['filterProject','filterMotor','filterPriority','filterRisk','filterStatus'].forEach(x=>setValue(x,'all'));renderCriteria()});
  $$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
  renderAll();
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('service-worker.js').catch(()=>{});
})();
