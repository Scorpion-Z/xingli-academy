(function(){
 const C=XingliCore,escape=C.escapeHtml,caseIds=cases.map(c=>c.id),key=C.studyKeys.portfolio;
 const root=document.createElement('section');root.className='view v5-view v52-outcomes';root.id='view-outcomes';document.querySelector('#main').append(root);
 let portfolio=null,loadError='',unsaved=false,panel='overview';
 const q=id=>root.querySelector('#'+id);
 function load(force=false){if(unsaved&&!force)return;try{portfolio=C.cleanPortfolio(JSON.parse(localStorage.getItem(key)||'{}'),caseIds);loadError='';unsaved=false;}catch(error){portfolio=null;loadError=error.message;}}
 function persist(next){portfolio=C.cleanPortfolio(next,caseIds);unsaved=true;localStorage.setItem(key,JSON.stringify(portfolio));unsaved=false;q('v52-unsaved-notice')?.remove();}
 function flyingResult(){try{return C.evaluatePractice(JSON.parse(localStorage.getItem(C.studyKeys.practice)||'{"answers":{}}'));}catch{return {passed:false,correct:0,total:30};}}
 function status(text){const el=q('v52-save-status');if(el)el.textContent=text;}
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
 function open(next='overview'){
  panel=['overview','measurement','report'].includes(next)?next:'overview';load();render();
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v===root));state.view='outcomes';v4SyncNav('courses');
  document.querySelectorAll('[data-v5-target]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-current','false');});
  document.body.classList.remove('v4-index-open','v4-focused');v4Options.index=false;v4Options.focus=false;
  document.getElementById('v4-mobile-menu')?.classList.remove('open');document.getElementById('v4-mobile-toggle')?.setAttribute('aria-expanded','false');
  document.getElementById('top-current').textContent='学习成果';window.scrollTo({top:0,behavior:'instant'});
 }
 function render(){
  root.innerHTML=`<button class="v5-tool-back" data-v4-nav="courses">← 返回课程</button><div class="v5-heading"><span class="v5-kicker">LEARNING PORTFOLIO · V5.2</span><h1>让学习留下可复核的成果</h1><p>课程完成、知识检验与实训作品分别记录，回到薄弱环节继续练习。</p></div><div class="v5-togglebar v5-tabs v52-tabs" role="group" aria-label="学习成果栏目">${[['overview','成果总览'],['measurement','测向误差实训'],['report','综合案例报告']].map(([id,label])=>`<button data-outcomes="${id}" class="${panel===id?'active':''}" aria-pressed="${panel===id}">${label}</button>`).join('')}</div>${unsaved?'<p id="v52-unsaved-notice" class="v5-alert">当前成果尚未写入浏览器。请重试保存，或先导出学习档案保留当前草稿。</p>':''}<div id="v52-content"></div><div class="v52-backup"><p>测向答案和全部案例报告包含在学习档案中。每个案例保留一份草稿；更换案例会切换到各自的草稿。户型图片仍需另存完整项目 JSON。</p><button class="v5-btn v5-btn-outline" data-export-study>导出全部学习档案 ↓</button><button class="v5-btn v5-btn-outline" data-v4-nav="resources">导入档案 / 查看备份说明 →</button></div>`;
  if(loadError){q('v52-content').innerHTML=`<p class="v5-alert" role="alert">成果读取失败：${escape(loadError)}。原数据未覆盖，请在文献页导入之前的有效学习档案。</p>`;return;}
  q('v52-content').innerHTML=panel==='overview'?overview():panel==='measurement'?measurement():reportEditor();
  if(panel==='report')refreshReport();
 }
 function overview(){
  const progress=C.stageProgress(saved,gradeData),measurement=C.evaluateMeasurement(portfolio.measurement),flying=flyingResult(),reports=Object.values(portfolio.reports),ready=reports.filter(r=>C.evaluateReport(r).ready).length;
  const goals=['能记录北向基准、读数和误差，判断山位与支持边界。','能区分环境事实、来源和传统解释，在案例报告中留下观察记录。','能区分固定宫位、元运与坐向，说明计算输入的作用。','能独立填出三盘，复核顺逆与工具不支持的条件。','先明确文本版本、来龙输入与起排步骤，再比较不同解释。','形成有来源、过程、局限和下一步的综合报告。'];
  return `<div class="v52-metrics"><div><strong>${progress.reduce((s,p)=>s+p.completed,0)} / 36</strong><span>课程完成标记</span></div><div><strong>${progress.reduce((s,p)=>s+p.checked,0)} / 36</strong><span>课内三题已通过</span></div><div><strong>${Number(measurement.passed)+Number(flying.passed)} / 2</strong><span>独立实训已通过</span></div><div><strong>${ready} / ${reports.length}</strong><span>报告已自检 / 已建草稿</span></div></div><p class="v5-muted">两项独立实训指测向误差与飞星三盘。报告自检属于学习者自评，不与机器检查合并为“精通率”。</p><div class="v52-stage-grid">${stages.map((stage,i)=>`<article class="v5-surface"><span class="v5-kicker">STAGE ${i+1}</span><h2>${stage.name}</h2><p>${goals[i]}</p><dl><div><dt>课程完成</dt><dd>${progress[i].completed} / 6</dd></div><div><dt>知识检验</dt><dd>${progress[i].checked} / 6</dd></div></dl><p>${i===0?`测向实训：${measurement.passed?'已通过':'待练习或复核'}`:i===3?`三盘实训：${flying.passed?'已通过':'待练习或复核'}`:i===5?`已自检报告：${ready}份（未经教师审核）`:'本阶段成果可写入案例报告，暂无独立自动考核。'}</p><div class="v5-actions"><button class="v5-btn v5-btn-outline" data-v4-lesson="${i*6}">进入本阶段课程</button>${i===0?'<button class="v5-btn" data-outcomes="measurement">测向实训 →</button>':i===3?'<button class="v5-btn" data-v52-flying>三盘练习 →</button>':'<button class="v5-btn" data-outcomes="report">写案例报告 →</button>'}</div></article>`).join('')}</div>`;
 }
 function measurement(){
  const data=portfolio.measurement;
  return `<div class="v52-two-cols"><section class="v5-surface"><span class="v5-kicker">TRANSFER TASK · 测向迁移练习</span><h2>山位稳定，就一定可以起盘吗？</h2><p>某模拟住宅以主立面为研究对象，同一测点、真北基准，三次朝向读数为 <strong>183.6°、183.8°、184.0°</strong>。</p><p>题设要求用算术平均数作为记录值，并按“记录值 ± 1.0°”保留判断区间。该±1.0°是教学给定的综合误差界限，不能因取平均而自行缩小。</p><p>比较两个边界：午山范围172.5°—187.5°；本站下卦仅支持距山位中心不超过4.5°。还未确认建筑起用年代。</p><p class="v5-muted">这是给定真北基准的模拟练习，无需另做磁偏角换算。真实测量仍须记录设备、测点、基准、校准与时间；跨0°的读数不能直接套用本题的普通平均。</p><button class="v5-btn v5-btn-outline" data-v4-lesson="5">回看第6课 · 真北与测向</button><button class="v5-btn v5-btn-outline" data-v4-lesson="17">回看第18课 · 输入与误差</button></section><section class="v5-surface"><h2>填写你的测向记录</h2><form id="v52-measure-form"><div class="v52-form-grid">${[['mean','平均朝向'],['low','误差区间下限'],['high','误差区间上限']].map(([id,label])=>`<label for="v52-${id}">${label}（°）<input id="v52-${id}" name="${id}" type="number" min="0" max="359.9" step="0.1" value="${data[id]}"></label>`).join('')}${[['facing','朝向山位'],['sitting','相对坐山']].map(([id,label])=>`<label for="v52-${id}">${label}<select id="v52-${id}" name="${id}"><option value="">请选择</option>${C.mountains.map(m=>`<option ${data[id]===m?'selected':''}>${m}</option>`).join('')}</select></label>`).join('')}</div><label for="v52-decision">当前应怎样处理下卦推演？</label><select id="v52-decision" name="decision">${[['','请选择'],['review','保留区间并复测，补齐时间输入后再判断'],['calculate','均值在支持范围内，直接自动起盘'],['switch','跨了4.5°阈值，所以一定改判为丁山']].map(([id,label])=>`<option value="${id}" ${data.decision===id?'selected':''}>${label}</option>`).join('')}</select><label for="v52-measure-reason">依据与待核实事项（至少20字）</label><textarea id="v52-measure-reason" name="reason" rows="5" maxlength="3000" placeholder="说明误差区间与两个边界的关系，以及还缺什么输入。">${escape(data.reason)}</textarea><label class="v51-review"><input id="v52-measure-reviewed" type="checkbox" ${data.reviewed?'checked':''}> 我已检查计算过程，区分题设与现场事实</label><button class="v5-btn" type="submit">检查并保存测向记录</button></form><p id="v52-save-status" role="status">${unsaved?'尚未写入浏览器，请先导出档案保留草稿。':'填写时自动保存到当前浏览器。'}</p><div id="v52-measure-result" aria-live="polite"></div></section></div>`;
 }
 function readMeasurement(){const data={};for(const field of ['mean','low','high']){const raw=q('v52-'+field).value;data[field]=raw===''?'':Number(raw);}for(const field of ['facing','sitting','decision'])data[field]=q('v52-'+field).value;data.reason=q('v52-measure-reason').value;data.reviewed=q('v52-measure-reviewed').checked;return C.cleanMeasurement(data);}
 function checkMeasurement(){
  try{persist({...portfolio,measurement:readMeasurement()});const result=C.evaluateMeasurement(portfolio.measurement);q('v52-measure-result').innerHTML=`<h3>确定答案：${result.correct} / ${result.total}</h3><p>${result.errors.length?'请复核：'+result.errors.map(escape).join('、'):'数值和边界判断均正确。区间仍在午山内，但上限超出本站下卦支持范围；起用时间也尚未确认。'}</p><p>${result.passed?'测向实训已通过，文字依据仍需人工复核。':'完成六项答案、至少20字依据及自检后，可以通过本次实训。'}</p>`;status('测向记录已保存。');}catch(error){status('未保存：'+error.message);}
 }
 function reportEditor(){
  const id=portfolio.activeCase,data=portfolio.reports[id]||C.cleanReport(),c=cases.find(c=>c.id===id);
  const hints={title:'例如：模拟住宅测向复核记录',sources:'逐条写出处、作者或机构、版本/日期/页码或链接，并注明支持哪项材料。',facts:'只记可观察或可查证的事实；本站模拟案例中的数字请明确标注为题设。',inputs:'研究对象与范围、北向基准、测点与时间、读数与误差、元运条件；未知项写待核实。',method:'按顺序记录采用的规则、对应版本、取值和中间计算。输入不足时说明在哪一步停止。',analysis:'分别说明事实、教学推演和传统解释，指出每个判断依赖哪些材料。',limits:'缺失资料、测量误差、版本差异及无法推出的结论。',next:'列出需要补的证据和下一次复核的具体方法。'};
  return `<div class="v5-surface v52-report-top"><label for="v52-report-case">选择研习对象（各自保存一份草稿）</label><select id="v52-report-case"><option value="custom">自选对象 · 需自行提供资料</option>${cases.map(c=>`<option value="${c.id}" ${id===c.id?'selected':''}>${c.type==='real'?'文献案例':'模拟练习'} · ${escape(c.title)}</option>`).join('')}</select><p>${c?escape(c.summary):'自选对象没有预设资料；请注明观察范围和来源。'}</p><p class="v5-muted">${c?.type==='real'?'此为真实建筑文化案例；本站并未提供其完整实测坐向或起用输入，请勿套用模拟宅盘。':c?'此为教学模拟案例，给定条件不能写成真实现场测量成果。':'不要在公开分享的报告中包含住户身份或精确私人地址。'}</p>${c?`<button class="v5-btn v5-btn-outline" data-case="${c.id}">查看案例材料 →</button>`:''}<details><summary>查看一份“停止推演”的报告示范</summary><p>对象：本页测向练习的模拟住宅（不同于案例馆186°住宅）。来源：题设三次读数及±1.0°误差界限。记录：均值183.8°，区间182.8°—184.8°，坐子向午。方法：先判24山，再将整个区间与本站下卦阈值比较。解释：午山判定稳定，但区间上限超出184.5°，不能只用均值直接起盘。局限：起用时间未知、非真实测绘。下一步：复核测向条件，补齐起用资料，再决定是否适用下卦演示。</p><p>示范只展示组织方法，不会自动填入你的报告。</p></details></div><div class="v52-report-layout"><section class="v5-surface"><h2>写出材料、过程与判断</h2><p>允许先导出未完成稿。结构填写数只检查是否非空，不代表内容正确。</p><form id="v52-report-form">${C.reportFields.map(([field,label,max])=>`<label for="v52-report-${field}">${label}</label>${field==='title'?`<input id="v52-report-${field}" data-report-field="${field}" maxlength="${max}" value="${escape(data[field])}" placeholder="${hints[field]}">`:`<textarea id="v52-report-${field}" data-report-field="${field}" rows="4" maxlength="${max}" placeholder="${hints[field]}">${escape(data[field])}</textarea>`}`).join('')}</form></section><aside class="v5-surface"><h2>六项成果自评</h2><p>0＝待补充；1＝部分满足；2＝已按标准自查。修改正文后会清除自评，便于重新检查。</p>${C.reportRubric.map(([field,label,description])=>`<div class="v52-rubric-item"><label for="v52-review-${field}">${label}</label><p>${description}</p><select id="v52-review-${field}" data-report-review="${field}">${[[0,'待补充'],[1,'部分满足'],[2,'已按标准自查']].map(([score,text])=>`<option value="${score}" ${data.review[field]===score?'selected':''}>${score} · ${text}</option>`).join('')}</select></div>`).join('')}<div id="v52-report-result" aria-live="polite"></div><div class="v5-actions"><button class="v5-btn" id="v52-save-report">保存并检查结构</button><button class="v5-btn v5-btn-outline" id="v52-export-report">导出阅读稿 HTML</button></div><p id="v52-save-status" role="status">${unsaved?'尚未写入浏览器，请先导出档案保留草稿。':'填写时自动保存。导出的阅读稿可打印或另存为PDF。'}</p></aside></div>`;
 }
 function readReport(){const data={review:{}};root.querySelectorAll('[data-report-field]').forEach(el=>data[el.dataset.reportField]=el.value);root.querySelectorAll('[data-report-review]').forEach(el=>data.review[el.dataset.reportReview]=Number(el.value));return C.cleanReport(data);}
 function saveReport(){const report=readReport();persist({...portfolio,reports:{...portfolio.reports,[portfolio.activeCase]:report}});return report;}
 function refreshReport(){const data=readReport(),result=C.evaluateReport(data);q('v52-report-result').innerHTML=`<h3>结构填写：${result.filled} / ${result.total}</h3><p>学习者自评：${result.selfScore} / ${result.selfTotal}</p><p>${result.missing.length?'待填写：'+result.missing.map(escape).join('、'):result.ready?'结构齐备，六项已自查；尚未经过教师审核。':'结构齐备，请继续逐项自查。'}</p>`;}
 root.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='v52-measure-form')checkMeasurement();});
 root.addEventListener('input',e=>{
  if(panel==='measurement'&&e.target.closest('#v52-measure-form')){
   if(e.target.id!=='v52-measure-reviewed')q('v52-measure-reviewed').checked=false;
   q('v52-measure-result').textContent='记录已修改，请重新检查。';
   try{persist({...portfolio,measurement:readMeasurement()});status('测向草稿已保存。');}catch(error){status('草稿未保存：'+error.message);}return;
  }
  if(panel==='report'&&(e.target.matches('[data-report-field]')||e.target.matches('[data-report-review]'))){
   if(e.target.matches('[data-report-field]'))root.querySelectorAll('[data-report-review]').forEach(el=>el.value='0');
   try{saveReport();status('报告草稿已保存。');}catch(error){status('草稿未保存：'+error.message);}refreshReport();
  }
 });
 root.addEventListener('change',e=>{if(e.target.id==='v52-report-case'){
  let message='';try{persist({...portfolio,activeCase:e.target.value});}catch(error){message='切换尚未写入浏览器：'+error.message;}render();if(message)status(message);
 }});
 root.addEventListener('click',e=>{
  if(e.target.closest('#v52-save-report')){try{saveReport();refreshReport();status('报告已保存；结构检查不等同于内容审核。');}catch(error){status('未保存：'+error.message);}}
  if(e.target.closest('#v52-export-report')){try{
   const report=readReport();try{saveReport();status('报告已保存并导出。');}catch{status('已导出阅读稿，但浏览器保存失败；请另导出学习档案保留可编辑稿。');}
   const c=cases.find(c=>c.id===portfolio.activeCase),m=C.evaluateMeasurement(portfolio.measurement),f=flyingResult();
   const text=C.reportDocument(report,{caseTitle:c?.title||'自选对象',caseType:c?.type==='real'?'真实建筑文献观察':c?'教学模拟':'学习者自选；来源自行说明',exportedAt:new Date().toLocaleString('zh-CN'),training:`测向练习：${m.correct}/${m.total}，${m.passed?'已通过':'待复核'}；飞星练习：${f.correct}/${f.total}，${f.passed?'已通过':'待复核'}`});
   download(new Blob([text],{type:'text/html;charset=utf-8'}),'形理书院_案例研习报告.html');
  }catch(error){status('导出失败：'+error.message);}}
 });
 document.addEventListener('click',e=>{const link=e.target.closest('[data-outcomes]');if(link){e.preventDefault();open(link.dataset.outcomes);return;}if(e.target.closest('[data-v52-flying]')){e.preventDefault();XingliV5.openV5('v5-flying');document.querySelector('#view-v5-flying').dispatchEvent(new CustomEvent('xingli-flying-mode',{detail:'practice'}));}},true);
 window.addEventListener('xingli-study-restored',e=>{load(e.detail?.portfolioRestored===true);if(root.classList.contains('active'))render();});
 window.addEventListener('beforeunload',e=>{if(unsaved){e.preventDefault();e.returnValue='';}});
 window.XingliOutcomes={open,snapshot:()=>{if(!portfolio)load();if(loadError)throw Error(loadError);return C.cleanPortfolio(portfolio,caseIds);}};
 if(location.hash.startsWith('#study/'))open(location.hash.split('/')[1]);
})();
