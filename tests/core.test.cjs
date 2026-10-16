const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const core=vm.runInNewContext(fs.readFileSync(path.join(root,'src/core.js'),'utf8')+'\nXingliCore');
const plain=x=>JSON.parse(JSON.stringify(x));
const along=board=>core.flight.map(p=>board[p]).join(',');
const archive=()=>({version:'3.0',progress:{done:[0,6,35],notes:{6:'第七课笔记'},lastLesson:35,quizBest:4},mastery:{l0:[0,1,2],l6:[0,1,2],l35:[0,1,2],v3case_hongcun:[0,1,2],flatDone:[0,1,2,3,4]}});
function memoryStore(initial={}){const data=new Map(Object.entries(initial));return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),data};}
test('bearing input and mountain boundaries stay distinct from supported house angles',()=>{
 for(const value of ['',null,undefined,false,[],{},-1,360,Infinity,'NaN'])assert.equal(core.bearingValue(value).ok,false,String(value));
 assert.equal(core.at(22.4).name,'癸');assert.equal(core.at(22.6).name,'丑');assert.equal(core.at(359.9).name,'子');
 assert.equal(core.at(186).name,'午');assert.equal(core.house(8,186).allowed,false);
 assert.equal(core.house(8,184.5).allowed,true);assert.equal(core.house(8,184.5001).allowed,false);
 assert.equal(core.house(8,225).allowed,false);assert.equal(core.house(0,180).allowed,false);
});
test('fixed golden boards: eight-period south-facing and nine-period east-facing',()=>{
 const r=core.house(8,180);assert.equal(r.allowed,true);
 assert.equal(along(r.luck),'8,9,1,2,3,4,5,6,7');assert.equal(along(r.hill),'4,5,6,7,8,9,1,2,3');assert.equal(along(r.face),'3,2,1,9,8,7,6,5,4');
 assert.equal(r.sDir.mountain,'巽');assert.equal(r.fDir.mountain,'卯');
 const p=core.house(9,90);assert.equal(along(p.luck),'9,1,2,3,4,5,6,7,8');assert.equal(along(p.hill),'2,3,4,5,6,7,8,9,1');assert.equal(along(p.face),'7,6,5,4,3,2,1,9,8');
 const reverse=core.house(8,0);assert.equal(reverse.sStart,3);assert.equal(reverse.sDir.sign,-1);assert.equal(reverse.fStart,4);assert.equal(reverse.fDir.sign,1);
});
test('annual cycle and independently fixed 2026 grid',()=>{
 assert.equal(core.annual(2024).center,3);assert.equal(core.annual(2025).center,2);assert.equal(core.annual(2026).center,1);assert.equal(core.annual(2027).center,9);
 assert.deepEqual(plain(core.annual(2026).board),{c:1,nw:2,w:3,ne:4,s:5,n:6,sw:7,e:8,se:9});
 for(const y of ['',false,2026.1,1899,2101])assert.throws(()=>core.annual(y));
});
test('legacy archive restores all 36 lessons and case mastery; absent new fields stay absent',()=>{
 const a=archive();for(let i=0;i<36;i++)a.mastery['l'+i]=[0,1,2];const next=core.cleanStudyArchive(a,['hongcun']);
 for(let i=0;i<36;i++)assert.deepEqual(plain(next.mastery['l'+i]),[0,1,2]);
 assert.deepEqual(plain(next.mastery.v3case_hongcun),[0,1,2]);assert.equal('visualNotes'in next,false);
 const store=memoryStore({[core.studyKeys.visualNotes]:'{"2":"keep"}'});core.writeStudyArchive(store,next);assert.equal(store.getItem(core.studyKeys.visualNotes),'{"2":"keep"}');
});
test('new archive round trips text notes, lab records and practice without accepting unknown keys',()=>{
 const a={...archive(),version:'5.1',visualNotes:{35:'观察记录'},labs:{'lesson-24':'2026-10-16T00:00:00.000Z',unknown:'ignore'},practice:{answers:{},reason:'草稿'}};
 const clean=core.cleanStudyArchive(a,['hongcun']);assert.equal(clean.visualNotes[35],'观察记录');assert.equal(clean.labs.unknown,undefined);
 const store=memoryStore();core.writeStudyArchive(store,clean);assert.equal(JSON.parse(store.getItem(core.studyKeys.practice)).reason,'草稿');
});
test('invalid archives are rejected before storage writes; repeated quota failure rolls back',()=>{
 for(const change of [a=>a.version='future',a=>a.progress.notes=null,a=>a.progress.done=[36],a=>a.mastery.l35=[3],a=>a.visualNotes={0:12},a=>a.practice={answers:[]}]){const a=archive();change(a);assert.throws(()=>core.cleanStudyArchive(a,['hongcun']));}
 const store=memoryStore({[core.studyKeys.progress]:'old-progress',[core.studyKeys.mastery]:'old-grades'}),write=store.setItem;
 store.setItem=(key,value)=>{if(key===core.studyKeys.mastery)throw Error('QuotaExceededError');return write(key,value);};
 assert.throws(()=>core.writeStudyArchive(store,core.cleanStudyArchive(archive())),/原学习记录未更改/);
 assert.equal(store.getItem(core.studyKeys.progress),'old-progress');assert.equal(store.getItem(core.studyKeys.mastery),'old-grades');
});
test('invalid geometry never becomes NaN and a clamped box remains within the image',()=>{
 for(const value of [null,[],{x:'bad'},{x:null},{y:[]},{w:Infinity},{bearing:360},{notes:{}}])assert.throws(()=>core.cleanProject(value));
 const p=core.cleanProject({x:99,y:99,w:90,h:90});assert.equal(p.x,95);assert.equal(p.x+p.w,100);assert.equal(p.y+p.h,100);
 assert.deepEqual(plain(core.containedImageBox(800,600,1600,800)),{left:0,top:100,width:800,height:400,scale:.5});
});
test('independent practice locates errors and requires explanation plus explicit self-review',()=>{
 const data={answers:{luck:{c:9,nw:1,w:2,ne:3,s:4,n:5,sw:6,e:7,se:8},hill:{c:2,nw:3,w:4,ne:5,s:6,n:7,sw:8,e:9,se:1},face:{c:7,nw:6,w:5,ne:4,s:3,n:2,sw:1,e:9,se:8}},hillDirection:'1',faceDirection:'-1',boundary:'stop',reason:'九运酉山卯向，坐宫取2入中，向宫取7入中，同元龙查表分别为坤阳顺与酉阴逆。186度偏移六度，应停止。',reviewed:true};
 assert.equal(core.evaluatePractice(data).passed,true);data.reviewed=false;assert.equal(core.evaluatePractice(data).passed,false);data.answers.face.se=2;
 const result=core.evaluatePractice(data);assert.equal(result.correct,29);assert.deepEqual(plain(result.errors),['向盘·巽·东南']);
});
test('course data remains complete and the advanced topic has a working curriculum addition',()=>{
 const code=fs.readFileSync(path.join(root,'src/learning.js'),'utf8');
 function array(name){const match=code.match(new RegExp('const '+name+'\\s*=\\s*\\[[\\s\\S]*?\\n\\];'));assert(match,name);return vm.runInNewContext(match[0]+'\n'+name);}
 const lessons=array('lessons'),advanced=[...array('advancedLessons'),...array('v3CourseData')];assert.equal(lessons.length,36);assert.equal(advanced.length,36);assert.equal(array('checkpointBank').flat().length+array('v3QuizRows').flat().length,108);assert.equal(array('cases').length+array('v3ExtraCases').length,30);
 vm.runInNewContext(fs.readFileSync(path.join(root,'src/curriculum.js'),'utf8'),{advancedLessons:advanced});
 for(let i=18;i<24;i++)assert.equal(advanced[i].sections.length,5);assert.match(advanced[29].example,/186°.*停止自动起盘/);
});
test('browser restore handler commits before updating memory, preserves state on invalid import',async()=>{
 const code=fs.readFileSync(path.join(root,'src/learning.js'),'utf8'),start=code.indexOf("document.addEventListener('change',async e=>{\n if(e.target.id!=='restore-study')"),end=code.indexOf("document.addEventListener('keydown'",start);
 assert(start>=0);let handler;const store=memoryStore(),context={XingliCore:core,cases:[{id:'hongcun'}],localStorage:store,document:{addEventListener:(_,fn)=>handler=fn},saved:{original:true},gradeData:{old:[0]},v32VisualNotes:{},state:{},updateProgress(){},renderCourses(){},renderResources(){},window:{dispatchEvent(){}},CustomEvent:function(){},toast(){}};
 vm.runInNewContext(code.slice(start,end),context);
 const send=value=>handler({target:{id:'restore-study',value:'file',files:[{size:300,text:async()=>JSON.stringify(value)}]}});
 await send({version:'5.1'});assert.equal(context.saved.original,true);assert.equal(store.data.size,0);
 await send(archive());assert.deepEqual(plain(context.gradeData.l35),[0,1,2]);assert.deepEqual(plain(context.gradeData.v3case_hongcun),[0,1,2]);assert.equal(context.state.lesson,35);assert.equal(context.gradeData.old,undefined);
});
test('plan import rejects invalid metadata and missing image before mutating the current project',async()=>{
 const source=fs.readFileSync(path.join(root,'src/tools.js'),'utf8'),start=source.indexOf(" q('v5-plan-import').addEventListener('change'"),end=source.indexOf(" q('v5-plan-center').addEventListener('keydown'",start);assert(start>=0&&end>start);
 let handler,message;const context={cleanProject:core.cleanProject,q:()=>({addEventListener:(_,fn)=>handler=fn}),status:t=>message=t,state:{name:'untouched'},objectUrl:null,imageBlob:null};
 vm.runInNewContext(source.slice(start,end),context);
 for(const p of [{app:'xingli-academy-plan',version:2,meta:{x:'invalid'}},{app:'xingli-academy-plan',version:2,meta:{isExample:false},imageData:null},{app:'xingli-academy-plan',version:2,meta:null}]){
  await handler({target:{value:'fixture',files:[{size:300,text:async()=>JSON.stringify(p)}]}});assert.match(message,/导入失败/);assert.equal(context.state.name,'untouched');assert.equal(context.imageBlob,null);
 }
});
