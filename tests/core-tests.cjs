const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8').replace(/\r\n/g,'\n');
function env(options={}){
  const elements=new Map();
  const el=selector=>{if(!elements.has(selector))elements.set(selector,{value:selector.startsWith('#filter')?'all':'',textContent:'',innerHTML:'',dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return []},focus(){},close(){},showModal(){},reset(){},setAttribute(){},removeAttribute(){},getAttribute(){return ''}});return elements.get(selector)};
  const storage=options.storage||new Map();
  const listeners={};
  const document={querySelector:el,querySelectorAll:()=>[],addEventListener(){},body:{append(){}}};
  const sandbox={fetch: options.fetch,document,URL,Date,Math,Object,JSON,String,Array,Number,structuredClone,localStorage:{getItem:k=>{if(options.storageBroken)throw new Error('quota indisponível');return storage.get(k)},setItem:(k,v)=>{if(options.storageBroken)throw new Error('quota indisponível');storage.set(k,v)},removeItem:k=>storage.delete(k)},console,location:{protocol:'file:'},navigator:{},window:{scrollTo(){},confirm(){return true},addEventListener(type,listener){(listeners[type] ||= []).push(listener)}},clearTimeout,setTimeout,Blob};
  vm.createContext(sandbox);
  const instrumented=source.replace('  renderAll();\n  if(\'serviceWorker\'', '  globalThis.__test = {get state(){return state},submitCriterion,submitStage,submitAndroid,submitAction,submitQa,submitCheck,submitRun,validateBackup,safeUrl,percent,counts,renderAll,releaseAudit:(...args)=>releaseAudit(...args),normalizeState,submitRelease:(...args)=>submitRelease(...args),importJSON:(...args)=>importJSON(...args),restoreImport:(...args)=>restoreImport(...args),reloadExternal:(...args)=>reloadExternal(...args),githubDrift:(...args)=>githubDrift(...args),refreshGitHub:(...args)=>refreshGitHub(...args)};\n  renderAll();\n  if(\'serviceWorker\'');
  vm.runInContext(instrumented,sandbox);
  return {t:sandbox.__test,el,storage,listeners};
}
function setCriteriaForm(el,opts={}){
 const values={editId:'bot-ui',editTitle:'Painel isolado: preservar contratos dos consumidores',editProject:'bot',editMotor:'Painel de integrações',editCategory:'Legado',editStatus:'comprovado',editPriority:'alta',editRisk:'regressao',editEvidence:'',editSha:'abc12345',editNote:'Teste registrado',newComment:''};Object.assign(values,opts);for(const [k,v] of Object.entries(values))el('#'+k).value=v;
}
test('snapshot inicial contém quatro PRs e não confunde aprovação com merge',()=>{
 const {t}=env();assert.equal(t.state.prs.length,4);
 assert.equal(t.state.prs.find(p=>p.id==='bot-19').stages.merge.status,'pendente');
 for(const id of ['est-5','est-6','arc-295']){const pr=t.state.prs.find(p=>p.id===id);assert.equal(pr.stages.merge.status,'comprovado');assert.equal(pr.stages.approval.status,'pendente');assert.equal(pr.stages.deploy.status,'pendente')}
});
test('status Comprovado não pode ser salvo sem link HTTP/HTTPS',()=>{
 const {t,el}=env();setCriteriaForm(el);t.submitCriterion({preventDefault(){}});assert.match(el('#editError').textContent,/link de evidência válido/);assert.equal(t.state.criteria.find(r=>r.id==='bot-ui').status,'pendente');
});
test('evidência válida altera apenas critério editado e persiste',()=>{
 const {t,el,storage}=env();setCriteriaForm(el,{editEvidence:'https://github.com/example/actions/runs/12',newComment:'Conferi a execução'});t.submitCriterion({preventDefault(){}});assert.equal(t.state.criteria.find(r=>r.id==='bot-ui').status,'comprovado');assert.equal(t.state.criteria.find(r=>r.id==='bot-ui').comments.length,1);assert.ok(storage.size===1);assert.ok(t.state.history[0].title.includes('Critério atualizado'));
});
test('link javascript não é aceito como evidência',()=>{
 const {t}=env();assert.equal(t.safeUrl('javascript:alert(1)'),'');assert.equal(t.safeUrl('https://github.com/test'),'https://github.com/test');
});
test('backup importado não pode conter status comprovado sem evidência',()=>{
 const {t}=env();const copy=structuredClone(t.state);copy.criteria[0].evidence='';assert.equal(t.validateBackup(copy),false);
});
test('registro Android exige URL e não conclui cenários sem testes',()=>{
 const {t,el}=env();for(const [k,v] of Object.entries({androidProject:'bot',androidModel:'Galaxy S24',androidOs:'Android 16',androidBrowser:'Chrome 130',androidDate:'2026-11-06',androidEvidence:'',androidNote:'Teste parcial'}))el('#'+k).value=v;t.submitAndroid({preventDefault(){}});assert.match(el('#androidError').textContent,/Inclua uma evidência/);assert.equal(t.state.android.length,0);
});
test('service worker busca recurso atualizado antes de servir cache offline',async()=>{
 const listeners={};const stale={body:'versão antiga',ok:true,clone(){return this}},fresh={body:'versão nova',ok:true,clone(){return this}};
 const context={URL,Promise,console,self:{location:{origin:'https://example.com'},addEventListener:(kind,fn)=>{listeners[kind]=fn},skipWaiting(){},clients:{claim(){}}},caches:{open:async()=>({addAll:async()=>{},put:async()=>{}}),keys:async()=>[],match:async()=>stale,delete:async()=>true},fetch:async()=>fresh,Response:{error:()=>new Error('offline')}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../service-worker.js','utf8'),context);
 let response;
 listeners.fetch({request:{method:'GET',url:'https://example.com/app.js',mode:'same-origin'},respondWith:promise=>{response=promise}});
 assert.equal((await response).body,'versão nova');
});

test('matriz Playwright inicia com 18 cenários pendentes, separados por projeto, navegador e viewport',()=>{
 const {t}=env();
 assert.equal(t.state.qa.length,18);
 assert.equal(new Set(t.state.qa.map(q=>`${q.project}|${q.browser}|${q.viewport}`)).size,18);
 assert.ok(t.state.qa.every(q=>q.status==='pendente'&&!q.evidence));
});
test('marcar Playwright como comprovado requer evidência e SHA',()=>{
 const {t,el}=env();
 for(const [k,v] of Object.entries({qaId:'qa-bot-chromium-320',qaEditStatus:'comprovado',qaEvidence:'',qaSha:'',qaNote:''}))el('#'+k).value=v;
 t.submitQa({preventDefault(){}});
 assert.match(el('#qaError').textContent,/evidência.*SHA/i);
 assert.equal(t.state.qa.find(q=>q.id==='qa-bot-chromium-320').status,'pendente');
});
test('cenário Playwright comprovado muda só a linha e é salvo com histórico',()=>{
 const {t,el,storage}=env();
 for(const [k,v] of Object.entries({qaId:'qa-bot-chromium-320',qaEditStatus:'comprovado',qaEvidence:'https://github.com/example/actions/runs/123',qaSha:'5dec0bb84321b7ba9a9943a8c09e4790a94dce04',qaNote:'Captura analisada'}))el('#'+k).value=v;
 t.submitQa({preventDefault(){}});
 assert.equal(t.state.qa.filter(q=>q.status==='comprovado').length,1);
 assert.equal(t.state.qa.find(q=>q.id==='qa-bot-chromium-320').status,'comprovado');
 assert.ok(storage.size>0);
 assert.match(t.state.history[0].title,/Playwright/);
});
test('checklists por PR não assumem conclusão por CI verde ou merge',()=>{
 const {t}=env();
 for(const pr of t.state.prs){
   assert.equal(pr.checklist.length,7);
   assert.ok(pr.checklist.every(r=>r.status==='pendente'));
 }
});
test('checklist por PR exige evidência e SHA ao comprovar, sem alterar etapa de merge',()=>{
 const {t,el}=env();
 for(const [k,v] of Object.entries({checkPrId:'bot-19',checkKey:'ids',checkStatus:'comprovado',checkEvidence:'',checkSha:'',checkNote:''}))el('#'+k).value=v;
 t.submitCheck({preventDefault(){}});
 assert.match(el('#checkError').textContent,/evidência.*SHA/i);
 assert.equal(t.state.prs[0].checklist.find(x=>x.key==='ids').status,'pendente');
});
test('run adicional é um link e não muda estados de PR',()=>{
 const {t,el}=env();
 for(const [k,v] of Object.entries({runPrId:'bot-19',runName:'QA do SHA',runEvidence:'https://github.com/pabloguilherme1121/PG-Bot/actions/runs/123',runSha:'5dec0bb84321b7ba9a9943a8c09e4790a94dce04',runNote:'Execução de exemplo'}))el('#'+k).value=v;
 t.submitRun({preventDefault(){}});
 assert.equal(t.state.prs[0].extraRuns.length,1);
 assert.equal(t.state.prs[0].stages.merge.status,'pendente');
 assert.ok(t.state.history[0].title.includes('Run'));
});
test('backup com QA comprovado mas sem SHA é recusado e backups antigos continuam válidos',()=>{
 const {t}=env(),copy=structuredClone(t.state);
 delete copy.qa;
 for(const p of copy.prs){delete p.checklist;delete p.extraRuns}
 assert.equal(t.validateBackup(copy),true);
 copy.qa=structuredClone(t.state.qa);
 copy.qa[0].status='comprovado';copy.qa[0].evidence='https://example.com/qa';copy.qa[0].sha='';
 assert.equal(t.validateBackup(copy),false);
});

test('liberação não é declarada sem SHA-alvo, Playwright e Android real',()=>{
 const {t}=env();
 const result=t.releaseAudit('bot');
 assert.equal(result.complete,false);
 assert.ok(result.blockers.some(x=>x.key==='target'));
 assert.ok(result.blockers.some(x=>x.key==='qa'));
 assert.ok(result.blockers.some(x=>x.key==='android'));
});

test('Playwright registrado em outra HEAD não atende a versão-alvo',()=>{
 const {t}=env();
 const target='a'.repeat(40),older='b'.repeat(40);
 t.state.releaseTargets.bot={sha:target,evidence:'https://github.com/example/actions/runs/10',note:''};
 for(const q of t.state.qa.filter(q=>q.project==='bot'))Object.assign(q,{status:'comprovado',sha:older,evidence:'https://github.com/example/actions/runs/11'});
 const result=t.releaseAudit('bot');
 assert.equal(result.qaOk,0);
 assert.ok(result.blockers.find(x=>x.key==='qa').label.includes('0/6'));
});

test('Android físico exige SHA da versão-alvo e não se confunde com viewport',()=>{
 const {t}=env();
 t.state.releaseTargets.bot={sha:'a'.repeat(40),evidence:'https://example.com/build',note:''};
 t.state.android.push({id:'and-test',project:'bot',model:'Samsung',os:'Android 17',browser:'Chrome',date:'2026-11-06',evidence:'https://example.com/video',scenarios:Object.fromEntries(['Toque e alvos','320 / 390 px','Orientação paisagem','Tela cheia','Offline e retorno','Pausa / reinício'].map(x=>[x,'passou']))});
 assert.equal(t.releaseAudit('bot').androidOk,false);
 t.state.android[0].sha='a'.repeat(40);
 assert.equal(t.releaseAudit('bot').androidOk,true);
});

test('backup legado migra com releases sem perder critérios nem histórico',()=>{
 const {t}=env();const old=structuredClone(t.state);
 delete old.releaseTargets;
 assert.equal(t.validateBackup(old),true);
 const result=t.normalizeState(old);
 assert.equal(result.releaseTargets.bot.sha,'');
 assert.equal(result.criteria.length,t.state.criteria.length);
 assert.equal(result.history.length,t.state.history.length);
});

test('SHA-alvo exige 40 caracteres hex e evidência HTTP/HTTPS',()=>{
 const {t,el}=env();
 for(const [k,v] of Object.entries({releaseProject:'bot',releaseSha:'abcd',releaseEvidence:'https://example.com/run',releaseNote:''}))el('#'+k).value=v;
 t.submitRelease({preventDefault(){}});
 assert.match(el('#releaseError').textContent,/40 caracteres/);
 assert.equal(t.state.releaseTargets.bot.sha,'');
 el('#releaseSha').value='a'.repeat(40);el('#releaseEvidence').value='javascript:bad';
 t.submitRelease({preventDefault(){}});
 assert.match(el('#releaseError').textContent,/HTTP\/HTTPS/);
});

test('importação guarda ponto de recuperação anterior e restaura sem perder o histórico', async()=>{
 const {t,storage}=env();
 const before=t.state.criteria.length, backup=structuredClone(t.state);
 backup.criteria.push({...structuredClone(backup.criteria[1]),id:'extra-123',title:'Critério de backup'});
 await t.importJSON({size:1024,text:async()=>JSON.stringify(backup)});
 assert.equal(t.state.criteria.length,before+1);
 assert.ok(storage.has('pgbot-homologacao-v1-anterior-importacao'));
 t.restoreImport();
 assert.equal(t.state.criteria.length,before);
 assert.match(t.state.history[0].title,/restaurado/);
});

test('mesmo com todas as provas registradas, liberação pede revisão humana',()=>{
 const {t}=env();const sha='a'.repeat(40),link='https://example.com/evidence';
 t.state.releaseTargets.bot={sha,evidence:link,note:''};
 for(const q of t.state.qa.filter(q=>q.project==='bot'))Object.assign(q,{status:'comprovado',sha,evidence:link});
 t.state.android.push({id:'android',project:'bot',model:'Galaxy',os:'Android',browser:'Chrome',date:'2026-11-06',sha,evidence:link,scenarios:Object.fromEntries(['Toque e alvos','320 / 390 px','Orientação paisagem','Tela cheia','Offline e retorno','Pausa / reinício'].map(x=>[x,'passou']))});
 for(const c of t.state.criteria.filter(c=>c.project==='bot'&&c.priority==='critica'))Object.assign(c,{status:'comprovado',sha,evidence:link});
 for(const pr of t.state.prs.filter(p=>p.project==='bot')){
   for(const [kind,st] of Object.entries(pr.stages))Object.assign(st,{status:'comprovado',sha:kind==='deploy'?sha:pr.sha,evidence:link});
   for(const c of pr.checklist)Object.assign(c,{status:'comprovado',sha:pr.sha,evidence:link});
 }
 assert.equal(t.releaseAudit('bot').complete,true);
});


test('snapshot público de GitHub apresenta HEAD por projeto, separado da HEAD da PR',()=>{
 const {t}=env();
 assert.equal(t.state.github.projects.bot.sha,'333a39e6f0963670c320c5c7bedb0ee0123a3084');
 assert.equal(t.state.github.prs['bot-19'].sha,'5dec0bb84321b7ba9a9943a8c09e4790a94dce04');
 assert.equal(t.state.prs[0].stages.merge.status,'pendente');
});

test('deriva entre alvo e main é identificada sem automaticamente invalidar PR em rascunho',()=>{
 const {t}=env();t.state.releaseTargets.bot.sha='5dec0bb84321b7ba9a9943a8c09e4790a94dce04';
 const drift=t.githubDrift('bot');assert.equal(drift.kind,'branch-divergente');
 assert.match(drift.label,/branch|main/i);
 assert.equal(t.releaseAudit('bot').complete,false);
});

test('checklist comprovado em SHA incompatível não satisfaz gate da PR',()=>{
 const {t}=env();const pr=t.state.prs[0];
 for(const item of pr.checklist)Object.assign(item,{status:'comprovado',sha:'f'.repeat(40),evidence:'https://github.com/example/actions/runs/1'});
 const a=t.releaseAudit('bot');
 assert.ok(a.blockers.some(b=>b.key==='pr'&&/7\/7/.test(b.label)));
});

test('consulta pública de leitura atualiza snapshot e não toca estados manuais de PR',async()=>{
 let calls=[];const fake=async url=>{calls.push(url);const repo=String(url).split('/')[5];const isPr=String(url).includes('/pulls/');return {ok:true,status:200,json:async()=>isPr?{number:Number(String(url).split('/').at(-1)),state:'open',draft:true,merged:false,head:{sha:'a'.repeat(40)},html_url:'https://github.com/pabloguilherme1121/PG-Bot/pull/19',updated_at:'2026-11-06T00:00:00Z'}:{sha:'b'.repeat(40),html_url:'https://github.com/pabloguilherme1121/PG-Bot/commit/'+ 'b'.repeat(40),commit:{committer:{date:'2026-11-06T00:00:00Z'}}}}};
 const {t}=env({fetch:fake});
 const result=await t.refreshGitHub();
 assert.ok(result.updated>=3);
 assert.equal(t.state.github.projects.bot.sha,'b'.repeat(40));
 assert.equal(t.state.prs[0].stages.merge.status,'pendente');
 assert.equal(t.state.prs[1].stages.merge.status,'comprovado');
 assert.ok(calls.every(x=>String(x).includes('api.github.com/repos/pabloguilherme1121/')));
});

test('contador visual da checklist não chama de comprovado SHA de outra HEAD',()=>{
 const {t,el}=env();const pr=t.state.prs[0];
 for(const c of pr.checklist)Object.assign(c,{status:'comprovado',sha:'b'.repeat(40),evidence:'https://github.com/example/actions/runs/1'});
 t.renderAll();
 assert.match(el('#prList').innerHTML,/0\/7 comprovados/);
});

test('resumo visual Playwright não reutiliza seis testes de SHA diferente do alvo',()=>{
 const {t,el}=env();t.state.releaseTargets.bot={sha:'a'.repeat(40),evidence:'https://github.com/example/run',note:''};
 for(const q of t.state.qa.filter(x=>x.project==='bot'))Object.assign(q,{status:'comprovado',sha:'b'.repeat(40),evidence:'https://github.com/example/run'});
 t.renderAll();assert.match(el('#qaSummary').innerHTML,/0\/6 combinações no SHA-alvo/);
});

test('falha ou limite da API GitHub preserva último snapshot e não muda gates',async()=>{
 const {t}=env({fetch:async()=>{throw new Error('API indisponível')}});
 const oldSha=t.state.github.projects.bot.sha;
 const result=await t.refreshGitHub();
 assert.equal(result.updated,0);
 assert.equal(t.state.github.projects.bot.sha,oldSha);
 assert.equal(t.state.prs[0].stages.merge.status,'pendente');
 assert.ok(result.errors.length>=1);
});

test('backup v1.4 sem observações do GitHub continua aceito e migra',()=>{
 const {t}=env(),backup=structuredClone(t.state);
 delete backup.github;
 assert.equal(t.validateBackup(backup),true);
 t.normalizeState(backup);
 assert.equal(backup.github.prs['bot-19'].draft,true);
 assert.ok(backup.github.projects.estrategia.sha.length===40);
});

test('consulta de workflows mostra os runs por projeto sem promover gates',async()=>{
 const sha='c'.repeat(40);
 const fake=async url=>({ok:true,status:200,json:async()=>String(url).includes('/actions/runs?')?{workflow_runs:[{id:8123,name:'Qualidade',status:'completed',conclusion:'success',head_sha:sha,html_url:'https://github.com/test/actions/runs/8123',created_at:'2026-11-06T12:00:00Z',event:'push'}]}:String(url).includes('/pulls/')?{number:19,state:'open',draft:true,merged:false,head:{sha},html_url:'https://github.com/test/pull/19'}:{sha,html_url:'https://github.com/test/commit/'+sha,commit:{committer:{date:'2026-11-06T12:00:00Z'}}}});
 const {t}=env({fetch:fake});const r=await t.refreshGitHub();
 assert.equal(r.updated,10);
 assert.equal(t.state.github.runs.bot.length,1);
 assert.equal(t.state.github.runs.arcade[0].headSha,sha);
 assert.equal(t.state.prs[0].stages.approval.status,'pendente');
 assert.equal(t.state.prs[0].stages.deploy.status,'pendente');
});
test('backup rejeita workflow com URL javascript e aceita backup v1.5 sem runs',()=>{
 const {t}=env();const backup=structuredClone(t.state);
 delete backup.github.runs;
 assert.equal(t.validateBackup(backup),true);
 backup.github.runs={bot:[{id:1,name:'Qualidade',status:'completed',conclusion:'success',headSha:'a'.repeat(40),url:'javascript:alert(1)',createdAt:'2026-11-06T12:00:00Z',event:'push'}]};
 assert.equal(t.validateBackup(backup),false);
});
test('run recente em SHA diferente não é sinalizado como pertencente à versão alvo',()=>{
 const {t,el}=env();t.state.releaseTargets.bot={sha:'a'.repeat(40),evidence:'https://github.com/x/build',note:''};
 t.state.github.runs.bot=[{id:8,name:'Qualidade',status:'completed',conclusion:'success',headSha:'b'.repeat(40),url:'https://github.com/x/runs/8',createdAt:'2026-11-06T12:00:00Z',event:'push'}];
 t.renderAll();
 assert.match(el('#githubRuns').innerHTML,/SHA diferente da versão-alvo/);
 assert.equal(t.releaseAudit('bot').complete,false);
});


test('duas abas não sobrescrevem silenciosamente o mesmo armazenamento',()=>{
 const storage=new Map();
 const a=env({storage}), b=env({storage});
 setCriteriaForm(a.el,{editEvidence:'https://github.com/exemplo/a'});
 a.t.submitCriterion({preventDefault(){}});
 const salvo=storage.get('pgbot-homologacao-v1');
 setCriteriaForm(b.el,{editEvidence:'https://github.com/exemplo/b'});
 b.t.submitCriterion({preventDefault(){}});
 assert.equal(storage.get('pgbot-homologacao-v1'),salvo,'segunda aba sobrescreveu o registro da primeira');
 assert.equal(b.t.state.criteria.find(c=>c.id==='bot-ui').evidence,'https://github.com/exemplo/b','rascunho da segunda aba não foi preservado em memória');
 assert.match(b.el('#saveIndicator').textContent,/Conflito|salvo|não salvas/i);
 assert.equal(b.el('#storageConflict').hidden,false);
 assert.doesNotMatch(b.el('#toast').textContent,/alteração salva no navegador/i);
});

test('ao carregar dados atualizados de outra aba, preserva a versão mais recente',()=>{
 const storage=new Map();
 const a=env({storage}), b=env({storage});
 setCriteriaForm(a.el,{editEvidence:'https://github.com/exemplo/a'});
 a.t.submitCriterion({preventDefault(){}});
 setCriteriaForm(b.el,{editEvidence:'https://github.com/exemplo/b'});
 b.t.submitCriterion({preventDefault(){}});
 b.t.reloadExternal();
 assert.equal(b.t.state.criteria.find(c=>c.id==='bot-ui').evidence,'https://github.com/exemplo/a');
 assert.equal(b.el('#storageConflict').hidden,true);
 setCriteriaForm(b.el,{editEvidence:'https://github.com/exemplo/c'});
 b.t.submitCriterion({preventDefault(){}});
 assert.equal(JSON.parse(storage.get('pgbot-homologacao-v1')).criteria.find(c=>c.id==='bot-ui').evidence,'https://github.com/exemplo/c');
});

test('evento storage mostra o aviso sem substituir estado manual',()=>{
 const storage=new Map();
 const a=env({storage}), b=env({storage});
 setCriteriaForm(a.el,{editEvidence:'https://github.com/exemplo/a'});
 a.t.submitCriterion({preventDefault(){}});
 for(const fn of b.listeners.storage||[])fn({key:'pgbot-homologacao-v1',newValue:storage.get('pgbot-homologacao-v1')});
 assert.equal(b.el('#storageConflict').hidden,false);
 assert.equal(b.t.state.criteria.find(c=>c.id==='bot-ui').status,'pendente');
});


test('backup importado em aba desatualizada não substitui versão externa nem ponto de retorno',async()=>{
 const storage=new Map();
 const a=env({storage}), b=env({storage});
 setCriteriaForm(a.el,{editEvidence:'https://github.com/exemplo/novo'});
 a.t.submitCriterion({preventDefault(){}});
 const current=storage.get('pgbot-homologacao-v1');
 const backup=structuredClone(b.t.state);
 backup.criteria.push({...structuredClone(backup.criteria[1]),id:'novo-backup',title:'Não deve entrar'});
 await b.t.importJSON({size:1024,text:async()=>JSON.stringify(backup)});
 assert.equal(storage.get('pgbot-homologacao-v1'),current);
 assert.equal(storage.has('pgbot-homologacao-v1-anterior-importacao'),false);
 assert.equal(b.el('#storageConflict').hidden,false);
});


test('falha do armazenamento não impede renderizar o registro em memória para exportação',()=>{
 const {t,el}=env({storageBroken:true});
 setCriteriaForm(el,{editEvidence:'https://github.com/example/novo'});
 t.submitCriterion({preventDefault(){}});
 assert.equal(t.state.criteria.find(x=>x.id==='bot-ui').status,'comprovado');
 assert.match(el('#saveIndicator').textContent,/não salvo|exporte/i);
 assert.match(el('#historyList').innerHTML,/Critério atualizado/);
});


test('backup Android rejeita SHA numérico e cenários fora do contrato antes de renderizar',()=>{
 const {t}=env();
 const valid=structuredClone(t.state);
 valid.android.push({
  id:'android-audit',project:'bot',model:'Galaxy',os:'Android 16',browser:'Chrome',
  date:'2026-11-06',sha:'a'.repeat(40),evidence:'https://github.com/exemplo/runs/99',
  note:'Validado no dispositivo',scenarios:{
   'Toque e alvos':'passou','320 / 390 px':'passou','Orientação paisagem':'passou',
   'Tela cheia':'passou','Offline e retorno':'passou','Pausa / reinício':'passou'
  }
 });
 assert.equal(t.validateBackup(valid),true,'um registro completo de dispositivo continua válido');
 const badSha=structuredClone(valid);badSha.android[0].sha=42;
 assert.equal(t.validateBackup(badSha),false,'SHA numérico causa erro na interface e não pode entrar pelo backup');
 const badScenario=structuredClone(valid);badScenario.android[0].scenarios=[];
 assert.equal(t.validateBackup(badScenario),false,'lista não equivale ao mapa de cenários');
 const badOutcome=structuredClone(valid);badOutcome.android[0].scenarios['Toque e alvos']={status:'passou'};
 assert.equal(t.validateBackup(badOutcome),false,'um resultado não textual não constitui aprovação');
});
