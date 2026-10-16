const XingliCore = (() => {
// core/validation.mjs
/** Browser input guards. Core helpers may normalize arbitrary angles; user controls must not. */
function bearingValue(raw){
 if(!['number','string'].includes(typeof raw)||String(raw).trim()==='')return {ok:false,message:'请输入0°至小于360°的角度。'};
 const value=Number(raw);
 if(!Number.isFinite(value)||value<0||value>=360)return {ok:false,message:'角度需在0°（含）至360°（不含）之间。'};
 return {ok:true,value};
}
function safeNumber(raw,min,max,fallback){const x=Number(raw);return Number.isFinite(x)?Math.min(max,Math.max(min,x)):fallback;}
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const escapeHtml=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// core/compass.mjs
/** 传统二十四山数学工具。方位角以北为0°, 顺时针增加。 */
const mountains=['子','癸','丑','艮','寅','甲','卯','乙','辰','巽','巳','丙','午','丁','未','坤','申','庚','酉','辛','戌','乾','亥','壬'];
const sectors=['北','东北','东','东南','南','西南','西','西北'];
const trigrams=['坎','艮','震','巽','离','坤','兑','乾'];
const yuanNames=['地元龙','天元龙','人元龙'];
const normalize=(a)=>((Number(a)%360)+360)%360;
function at(angle){
 if(!Number.isFinite(Number(angle)))throw new TypeError('请输入有效的角度');
 const a=normalize(angle),i=Math.floor((a+7.5)/15)%24,group=Math.floor((a+22.5)/45)%8;
 const center=i*15,centerOffset=((a-center+540)%360)-180,delta=7.5-Math.abs(centerOffset);
 return {angle:a,index:i,name:mountains[i],center,group:sectors[group],trigram:trigrams[group],yuan:yuanNames[(i+1)%3],kind:/^[子丑寅卯辰巳午未申酉戌亥]$/.test(mountains[i])?'地支':/^[艮巽坤乾]$/.test(mountains[i])?'四维卦':'天干',sitting:mountains[(i+12)%24],sittingAngle:normalize(a+180),offset:centerOffset,borderDistance:delta,borderWarning:delta<=0.5,min:normalize(center-7.5),max:normalize(center+7.5)};
}
function mountainSvg(angle,{layers={mountain:true,trigram:true,yuan:true},size=550}={}){
 const center=size/2,r=size*.47;
 const line=(a,rin,rout)=>{let rad=(a-90)*Math.PI/180;return [center+rin*Math.cos(rad),center+rin*Math.sin(rad),center+rout*Math.cos(rad),center+rout*Math.sin(rad)]};
 const result=at(angle);let html=`<svg role="img" aria-label="二十四山交互罗盘" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${center}" cy="${center}" r="${r}" fill="#fbfaf6" stroke="#789285" stroke-width="2"/><circle cx="${center}" cy="${center}" r="${r*.81}" fill="none" stroke="#bccac0"/><circle cx="${center}" cy="${center}" r="${r*.55}" fill="none" stroke="#d3ddd4"/>`;
 for(let i=0;i<24;i++){
 const start=(i*15-7.5-90)*Math.PI/180,end=(i*15+7.5-90)*Math.PI/180;
 const x1=center+r*Math.cos(start),y1=center+r*Math.sin(start),x2=center+r*Math.cos(end),y2=center+r*Math.sin(end);
 if(i===result.index)html+=`<path d="M ${center} ${center} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z" fill="#d4e6d9" fill-opacity=".9"/>`;
 const [lx,ly,rx,ry]=line(i*15-7.5,r*.55,r);html+=`<line x1="${lx}" y1="${ly}" x2="${rx}" y2="${ry}" stroke="#a2b5aa" stroke-width="1"/>`;
 const ar=(i*15-90)*Math.PI/180;
 if(layers.mountain){html+=`<text x="${center+r*.90*Math.cos(ar)}" y="${center+r*.90*Math.sin(ar)+5}" text-anchor="middle" font-size="${size*.026}" font-weight="${i===result.index?800:500}" fill="${i===result.index?'#145239':'#354e40'}">${mountains[i]}</text>`;}
 if(layers.yuan){const y=['地','天','人'][(i+1)%3];html+=`<text x="${center+r*.72*Math.cos(ar)}" y="${center+r*.72*Math.sin(ar)+4}" text-anchor="middle" font-size="${size*.019}" fill="#937d53">${y}</text>`;}
 }
 if(layers.trigram){for(let i=0;i<8;i++){let a=(i*45-90)*Math.PI/180;html+=`<text x="${center+r*.43*Math.cos(a)}" y="${center+r*.43*Math.sin(a)+6}" text-anchor="middle" font-size="${size*.039}" fill="#1f5444" font-weight="700">${trigrams[i]}</text>`;}}
 const ar=(result.angle-90)*Math.PI/180;
 const [ax,ay]=[center+r*.94*Math.cos(ar),center+r*.94*Math.sin(ar)];
 html+=`<line x1="${center}" y1="${center}" x2="${ax}" y2="${ay}" stroke="#ce6b50" stroke-width="4" stroke-linecap="round"/><circle cx="${center}" cy="${center}" r="8" fill="#245d48" stroke="#fff" stroke-width="3"/><text x="${center}" y="${center-r-8}" font-size="14" text-anchor="middle" fill="#245d48">北 0°</text></svg>`;
 return html;
}

// core/flying.mjs


/** 与 V4 同一组示范规则，明确限制特殊格局、兼向与五黄入中。 */
const flight=['c','nw','w','ne','s','n','sw','e','se'];
const palaces=[{id:'se',name:'巽·东南'},{id:'s',name:'离·南'},{id:'sw',name:'坤·西南'},{id:'e',name:'震·东'},{id:'c',name:'中宫'},{id:'w',name:'兑·西'},{id:'ne',name:'艮·东北'},{id:'n',name:'坎·北'},{id:'nw',name:'乾·西北'}];
const sectorIds=['n','ne','e','se','s','sw','w','nw'];
const starGroups={1:[23,0,1],2:[14,15,16],3:[5,6,7],4:[8,9,10],6:[20,21,22],7:[17,18,19],8:[2,3,4],9:[11,12,13]};
const yang=new Set(['乾','坤','艮','巽','甲','庚','壬','丙','寅','申','巳','亥']);
const wrap9=n=>(((n-1)%9+9)%9)+1;
function fly(start,sign=1){return Object.fromEntries(flight.map((p,i)=>[p,wrap9(start+sign*i)]));}
function annual(year){
 const y=Number(year);if(!['number','string'].includes(typeof year)||!Number.isInteger(y)||y<1900||y>2100)throw Error('年份须为1900至2100的整数。');
 const center=wrap9(3-(y-2024));return {year:y,center,board:fly(center)};
}
function flySteps(start,sign=1){return flight.map((id,i)=>({id,step:i,value:wrap9(start+sign*i)}));}
function starDirection(star,mountainIndex){
 if(star===5||!starGroups[star])return null;
 // 选取同元龙山位，按 V4 参考下卦算法映射为顺逆。
 const slot=mountainIndex%3===0?1:mountainIndex%3===1?2:0;
 const mountainName=mountains[starGroups[star][slot]];
 return {mountain:mountainName,sign:yang.has(mountainName)?1:-1,method:yang.has(mountainName)?'顺飞':'逆飞'};
}
function house(period,bearing){
 const check=bearingValue(bearing);
 if(!check.ok)return {period:Number(period),bearing:null,allowed:false,reason:check.message};
 const p=Number(period),a=normalize(check.value),m=at(a),centerOffset=Math.abs(m.offset),g=Math.floor((a+22.5)/45)%8;
 const facing=sectorIds[g],sitting=sectorIds[(g+4)%8],res={period:p,bearing:a,mountain:m.name,sittingMountain:m.sitting,facing,sitting,offset:centerOffset,allowed:false};
 if(!['number','string'].includes(typeof period)||!Number.isInteger(p)||p<1||p>9)return {...res,reason:'元运须为1至9的整数。'};
 if(centerOffset>4.5)return {...res,reason:'角度距离山位中心超过4.5°，可能涉及兼向或替卦；当前仅演示保守的下卦范围。'};
 const luck=fly(p),sStart=luck[sitting],fStart=luck[facing],sDir=starDirection(sStart,(m.index+12)%24),fDir=starDirection(fStart,m.index);
 if(!sDir||!fDir)return {...res,reason:'涉及五黄入中或现有演示规则未覆盖的特殊情况，已停止自动排盘。',luck,sStart,fStart};
 return {...res,allowed:true,luck,sStart,fStart,sDir,fDir,hill:fly(sStart,sDir.sign),face:fly(fStart,fDir.sign)};
}
function explanations(result){
 if(!result.allowed)return [result.reason];
 return [`输入：${result.period}运，朝向${result.bearing}°，${result.mountain}向、${result.sittingMountain}坐。`,`运盘：${result.period}入中，依中→乾→兑→艮→离→坎→坤→震→巽顺飞。`,`山星来源：坐山对应${palaces.find(p=>p.id===result.sitting).name}宫，运盘该宫为${result.sStart}。`,`山盘：按${result.sDir.mountain}（${result.sDir.method}）排列，从中宫${result.sStart}开始。`,`向星来源：朝向对应${palaces.find(p=>p.id===result.facing).name}宫，运盘该宫为${result.fStart}。`,`向盘：按${result.fDir.mountain}（${result.fDir.method}）排列，从中宫${result.fStart}开始。`,`逐宫复核：宫位顺序为中→乾→兑→艮→离→坎→坤→震→巽，三层各自循环赋值。`,`演示结果已完整计算。请对照具体教材核验规则；本工具不作现实吉凶预测。`];
}

// core/plan.mjs

const PROJECT_VERSION=2;
const projectDefaults=()=>({name:'示例户型',mode:'grid',north:0,bearing:180,x:16,y:12,w:68,h:75,centerX:50,centerY:50,notes:'',imageWidth:760,imageHeight:510,isExample:true});
function cleanProject(obj={}){
 if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('项目参数必须是对象');
 const a={...projectDefaults()};
 for(const field of ['north','bearing','x','y','w','h','centerX','centerY','imageWidth','imageHeight']){
  const raw=obj[field];if(raw===undefined)continue;
  if(!['number','string'].includes(typeof raw)||String(raw).trim()===''||!Number.isFinite(Number(raw)))throw Error('项目参数无效：'+field);
  a[field]=Number(raw);
 }
 a.north=clamp(Number.isFinite(a.north)?a.north:0,0,359.9);
 if(!bearingValue(a.bearing).ok)throw Error('项目朝向须在0°至小于360°之间');
 a.x=clamp(a.x,0,95);a.y=clamp(a.y,0,95);
 a.w=clamp(a.w,5,100-a.x);a.h=clamp(a.h,5,100-a.y);
 a.centerX=clamp(a.centerX,0,100);a.centerY=clamp(a.centerY,0,100);
 a.imageWidth=clamp(a.imageWidth,1,10000);a.imageHeight=clamp(a.imageHeight,1,10000);
 for(const field of ['name','notes'])if(obj[field]!==undefined&&typeof obj[field]!=='string')throw Error('项目文字参数无效：'+field);
 a.name=(obj.name||a.name).slice(0,160);
 a.notes=String(obj.notes??'').slice(0,20000);
 a.mode=['plain','grid','direction'].includes(obj.mode)?obj.mode:'grid';a.isExample=obj.isExample===undefined?a.isExample:obj.isExample===true;
 return a;
}
/** Return the exact image pixel box when contained in a fixed frame. */
function containedImageBox(frameW,frameH,imageW,imageH){
 if([frameW,frameH,imageW,imageH].some(n=>!Number.isFinite(n)||n<=0))throw new TypeError('图片与画布宽高必须大于零');
 const scale=Math.min(frameW/imageW,frameH/imageH),w=imageW*scale,h=imageH*scale;
 return {left:(frameW-w)/2,top:(frameH-h)/2,width:w,height:h,scale};
}
function regionPixels(s,w,h){return {left:w*s.x/100,top:h*s.y/100,width:w*s.w/100,height:h*s.h/100,cx:w*s.centerX/100,cy:h*s.centerY/100};}

// Learning archives contain text records only; plan images have their own project export.
const studyKeys={progress:'xingli_school_v1',mastery:'xingli_v2_checkpoint',visualNotes:'xingli-v32-visual-notes',labs:'xingli-v5-lab-records',practice:'xingli-v51-flying-practice'};
function objectRecord(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw Error(label+'须为对象');return value;}
function indexList(value,max,label){if(!Array.isArray(value)||value.some(n=>!Number.isInteger(n)||n<0||n>=max))throw Error(label+'格式无效');return [...new Set(value)];}
function lessonNotes(value){objectRecord(value,'笔记');const result={};for(const [key,text] of Object.entries(value)){
 if(!/^(?:[0-9]|[12][0-9]|3[0-5])$/.test(key))continue;
 if(typeof text!=='string'||text.length>20000)throw Error('笔记须为不超过20000字的文字');result[key]=text;
}return result;}
function cleanPractice(value){
 objectRecord(value,'独立练习');const result={answers:{}};objectRecord(value.answers,'练习答案');
 for(const key of ['luck','hill','face']){const board=value.answers[key]||{};objectRecord(board,'九宫答案');result.answers[key]={};for(const p of flight){const n=board[p];if(n===undefined||n==='')continue;if(!Number.isInteger(n)||n<1||n>9)throw Error('九宫答案须为1至9的整数');result.answers[key][p]=n;}}
 for(const key of ['hillDirection','faceDirection','boundary']){const raw=value[key]??'';if(!(key==='boundary'?['','stop','continue']:['','1','-1']).includes(raw))throw Error('练习选项无效');result[key]=raw;}
 if(value.reason!==undefined&&(typeof value.reason!=='string'||value.reason.length>20000))throw Error('练习说明过长或格式无效');
 result.reason=value.reason||'';result.reviewed=value.reviewed===true;return result;
}
function evaluatePractice(value){
 const data=cleanPractice(value),expected=house(9,90),errors=[];let correct=0;
 for(const key of ['luck','hill','face'])for(const p of palaces){if(data.answers[key][p.id]===expected[key][p.id])correct++;else errors.push(`${{luck:'运盘',hill:'山盘',face:'向盘'}[key]}·${p.name}`);}
 for(const [key,want,label] of [['hillDirection',String(expected.sDir.sign),'山盘顺逆'],['faceDirection',String(expected.fDir.sign),'向盘顺逆'],['boundary','stop','186°支持边界']]){if(data[key]===want)correct++;else errors.push(label);}
 return {correct,total:30,errors,passed:correct===30&&data.reason.trim().length>=20&&data.reviewed};
}
function cleanStudyArchive(obj,caseIds=[]){
 objectRecord(obj,'档案');if(!['3.0','5.1'].includes(obj.version))throw Error('暂不支持此档案版本，请使用学习档案备份文件');
 const p=objectRecord(obj.progress,'课程记录'),mastery=objectRecord(obj.mastery,'检验记录');
 const lastLesson=p.lastLesson??0,quizBest=p.quizBest??0;
 if(!Number.isInteger(lastLesson)||lastLesson<0||lastLesson>35||!Number.isInteger(quizBest)||quizBest<0||quizBest>12)throw Error('课程位置或测验成绩无效');
 const next={progress:{done:indexList(p.done,36,'课程进度'),notes:lessonNotes(p.notes),lastLesson,quizBest},mastery:{}};
 for(const key of [...Array.from({length:36},(_,i)=>'l'+i),...caseIds.map(id=>'v3case_'+id),'flatDone'])next.mastery[key]=indexList(mastery[key]??[],key==='flatDone'?5:3,'检验记录');
 if(obj.visualNotes!==undefined)next.visualNotes=lessonNotes(obj.visualNotes);
 if(obj.labs!==undefined){objectRecord(obj.labs,'实训记录');next.labs={};for(const [key,value] of Object.entries(obj.labs)){
  if(!/^(?:v5-(?:compass|flying|plan)|lesson-(?:[1-9]|[12][0-9]|3[0-6]))$/.test(key))continue;
  if(typeof value!=='string'||value.length>40||!Number.isFinite(Date.parse(value)))throw Error('实训时间格式无效');next.labs[key]=value;
 }}
 if(obj.practice!==undefined)next.practice=cleanPractice(obj.practice);
 return next;
}
function writeStudyArchive(storage,data){
 const entries=Object.entries(data).filter(([key])=>studyKeys[key]).map(([key,value])=>[studyKeys[key],JSON.stringify(value)]);
 const previous=entries.map(([key])=>[key,storage.getItem(key)]);
 try{for(const [key,value] of entries)storage.setItem(key,value);}catch(error){
  let rollbackFailed=false;for(const [key,value] of previous)try{if(storage.getItem(key)===value)continue;if(value===null)storage.removeItem(key);else storage.setItem(key,value);}catch{rollbackFailed=true;}
  throw Error(rollbackFailed?'保存失败且回滚未完成，请保留原备份，释放浏览器空间后重新导入':'浏览器未能保存，原学习记录未更改');
 }
}

return {annual,studyKeys,cleanStudyArchive,writeStudyArchive,cleanPractice,evaluatePractice,bearingValue,safeNumber,clamp,escapeHtml,mountains,sectors,trigrams,yuanNames,normalize,at,mountainSvg,flight,palaces,sectorIds,starGroups,yang,wrap9,fly,flySteps,starDirection,house,explanations,PROJECT_VERSION,projectDefaults,cleanProject,containedImageBox,regionPixels};
})();
