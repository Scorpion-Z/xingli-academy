const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const C=vm.runInNewContext(fs.readFileSync(path.join(root,'src/core.js'),'utf8')+'\nXingliCore');
const plain=x=>JSON.parse(JSON.stringify(x));
const measured=()=>({mean:183.8,low:182.8,high:184.8,facing:'午',sitting:'子',decision:'review',reason:'题设误差区间未跨出午山，但上限超过184.5度；起用年代未知，须复核输入后再判断。',reviewed:true});
const report=()=>({title:'模拟住宅复核报告',sources:'资料来自本地教学题设，所有读数均为模拟。',facts:'三次读数183.6、183.8、184.0度。',inputs:'真北基准，误差界限正负1度，起用时间未知。',method:'取算术平均，再分别与山位边界和支持阈值比较。',analysis:'山位为午，未取得足以直接起盘的完整输入。',limits:'没有实际测绘，也未核实年代。',next:'复核设备、测点和起用资料后再计算。',review:{evidence:2,inputs:2,method:2,analysis:2,limits:2,next:2}});
const archive=version=>({version,progress:{done:[],notes:{},lastLesson:0,quizBest:0},mastery:{}});
test('measurement evaluates the whole uncertainty interval and missing building period',()=>{
 assert.equal(C.evaluateMeasurement(measured()).passed,true);
 for(const [key,value,label] of [['mean',184.5,'平均朝向'],['high',184.5,'误差区间上限'],['facing','丁','朝向山位'],['decision','calculate','下卦支持边界']]){const m=measured();m[key]=value;const result=C.evaluateMeasurement(m);assert.equal(result.correct,5);assert.deepEqual(plain(result.errors),[label]);assert.equal(result.passed,false);}
 const m=measured();m.reviewed=false;assert.equal(C.evaluateMeasurement(m).passed,false);m.reviewed=true;m.reason='短';assert.equal(C.evaluateMeasurement(m).passed,false);
 assert.equal(C.house(8,183.8).allowed,true);assert.equal(C.house(8,184.8).allowed,false);assert.equal(C.at(182.8).name,'午');assert.equal(C.at(184.8).name,'午');
});
test('portfolio validators reject invalid numbers, ratings, unknown case ids and overlong fields',()=>{
 for(const m of [{mean:NaN},{mean:null},{mean:'183.8'},{facing:'unknown'},{decision:'pass'}])assert.throws(()=>C.cleanMeasurement(m));
 for(const r of [null,{title:[]},{sources:'x'.repeat(3001)},{review:{evidence:3}},{review:{evidence:'2'}}])assert.throws(()=>C.cleanReport(r));
 assert.throws(()=>C.cleanPortfolio({reports:{unknown:report()}},['flat']));assert.throws(()=>C.cleanPortfolio({activeCase:'bad'},['flat']));
 assert.deepEqual(plain(C.cleanPortfolio().reports),{});
});
test('report structural completion and subjective self-assessment remain separate',()=>{
 const r=report();let e=C.evaluateReport(r);assert.equal(e.filled,8);assert.equal(e.selfScore,12);assert.equal(e.ready,true);
 r.review.evidence=0;e=C.evaluateReport(r);assert.equal(e.filled,8);assert.equal(e.ready,false);assert.equal(e.selfScore,10);
 r.review.evidence=2;r.sources='  ';e=C.evaluateReport(r);assert.equal(e.ready,false);assert.deepEqual(plain(e.missing),['资料来源与版本']);
});
test('5.2 backup restores multiple reports and measurement while older archives preserve this store',()=>{
 const data={...archive('5.2'),portfolio:{measurement:measured(),activeCase:'flat',reports:{flat:report(),hongcun:{title:'另一份报告'}}}};
 const cleaned=C.cleanStudyArchive(data,['flat','hongcun']);assert.equal(C.evaluateMeasurement(cleaned.portfolio.measurement).passed,true);assert.equal(cleaned.portfolio.reports.hongcun.title,'另一份报告');
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};C.writeStudyArchive(storage,cleaned);const saved=storage.getItem(C.studyKeys.portfolio);
 for(const version of ['3.0','5.1']){C.writeStudyArchive(storage,C.cleanStudyArchive(archive(version)));assert.equal(storage.getItem(C.studyKeys.portfolio),saved);}
 const again=C.cleanPortfolio(JSON.parse(saved),['flat','hongcun']);assert.deepEqual(plain(again),plain(cleaned.portfolio));
});
test('quota failure writing portfolio restores other archive records',()=>{
 const map=new Map([[C.studyKeys.progress,'previous'],[C.studyKeys.portfolio,'previous-portfolio']]);const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>{if(k===C.studyKeys.portfolio)throw Error('quota');map.set(k,v)},removeItem:k=>map.delete(k)};
 assert.throws(()=>C.writeStudyArchive(storage,C.cleanStudyArchive({...archive('5.2'),portfolio:{measurement:measured()}},[])),/原学习记录未更改/);assert.equal(map.get(C.studyKeys.progress),'previous');assert.equal(map.get(C.studyKeys.portfolio),'previous-portfolio');assert.equal(map.has(C.studyKeys.mastery),false);
});
test('stage indicators never infer mastery from completion flags or duplicate quiz answers',()=>{
 const p=C.stageProgress({done:[0,0,6,35,999]},{l0:[0,1,2],l1:[0,0,0],l35:[0,1,2]});assert.deepEqual(plain(p[0]),{completed:1,checked:1,total:6});assert.deepEqual(plain(p[1]),{completed:1,checked:0,total:6});assert.deepEqual(plain(p[5]),{completed:1,checked:1,total:6});
});
test('exported reading report escapes user markup and distinguishes review and training evidence',()=>{
 const r=report();r.title='<img src=x onerror=alert(1)>';r.facts='<script>alert(1)</script>\n第二行';const html=C.reportDocument(r,{caseTitle:'<case>',caseType:'教学模拟',exportedAt:'test',training:'测向6/6'});
 assert(!html.includes('<img src=x'));assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(html.includes('未经过教师或专业审核'));assert(html.includes('与本报告对象无对应关系'));assert(html.includes('white-space:pre-wrap'));assert(html.includes('学习者自评：12/12'));
});
test('shared case links activate the case view from reports, home and the gallery',()=>{
 const source=fs.readFileSync(path.join(root,'src/learning.js'),'utf8');
 const start=source.indexOf('function handleClick(e)'),end=source.indexOf('function handleInput(e)',start);
 assert(start>=0&&end>start);
 for(const origin of ['outcomes','home','cases']){
  const state={view:origin,caseId:null},visited=[];
  const context={state,navigate:view=>{state.view=view;visited.push(view);}};
  vm.runInNewContext(source.slice(start,end),context);
  context.handleClick({target:{closest:selector=>selector==='[data-case]'?{dataset:{case:'hongcun'}}:null}});
  assert.equal(state.caseId,'hongcun');assert.equal(state.view,'cases');assert.deepEqual(visited,['cases']);
 }
});
