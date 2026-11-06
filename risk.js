/* Coordinator-only navigation view (demo client role gating, not server authorization). */
(() => {
 let year=2026,semester=1,grade='All',subject='All Subjects',request=0;
 const subjects=['All Subjects','Mathematics','English','Science','Humanities'];
 const opts=(items,chosen)=>items.map(v=>`<option value="${safe(v)}" ${String(v)===String(chosen)?'selected':''}>${safe(v)}</option>`).join('');
 function pageHtml(){
  return header('Students At Risk','Students with a completed weighted semester grade below 50%.')+
   `<div class="notice">FICTIONAL DATA · fictional browser history · Risk threshold: strictly below 50%. Semester grades are calculated from category averages (Homework 30%, Quizzes 30%, Tests 40%). Incomplete terms are excluded from the risk list.</div>`+
   panel('Review semester',`<div class="risk-filters">
    <div class="field"><label for="riskYear">Academic year</label><select id="riskYear">${opts([2021,2022,2023,2024,2025,2026],year)}</select></div>
    <div class="field"><label for="riskSemester">Semester</label><select id="riskSemester">${opts([1,2],semester)}</select></div>
    <div class="field"><label for="riskGrade">Grade level</label><select id="riskGrade">${opts(['All',...Array.from({length:12},(_,i)=>i+1)],grade)}</select></div>
    <div class="field"><label for="riskSubject">Subject</label><select id="riskSubject">${opts(subjects,subject)}</select></div>
   </div><p class="mini-note">Semester 1: August–December. Semester 2: January–June of the following year.</p>`)+
   `<div id="riskResults" aria-live="polite"><div class="notice">Loading student performance from fictional browser data…</div></div>`;
 }
 async function load(){
  const root=document.getElementById('riskResults');if(!root)return;
  const id=++request;root.innerHTML='<div class="notice">Checking recorded semester grades…</div>';
  try{
   const q=new URLSearchParams({year,semester,grade,subject});const response=await fetch('/api/history/risk?'+q);
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();if(id!==request||!root.isConnected)return;
   const summary=data.summary;
   const heading=`<div class="stats risk-stats">${stat('Students at risk',summary.atRisk,'Unique students with failing grades')}${stat('Completed results',summary.assessed,'Student–subject results')}${stat('Incomplete results',summary.incomplete,'Not classified as failing')}</div>`;
   if(!data.students.length){root.innerHTML=heading+panel('At-risk register','<div class="risk-empty"><strong>No failing completed results for these filters.</strong><p>Change the year, semester, subject or grade to review other records.</p></div>');return}
   const lines=data.students.map(item=>`<tr><td><strong>${safe(item.name)}</strong></td><td>Grade ${item.grade}</td><td>${safe(item.subject)}</td><td><span class="risk-grade">${item.average.toFixed(1)}%</span></td><td>${item.belowBy.toFixed(1)} points</td><td>${item.summatives}</td></tr>`).join('');
   root.innerHTML=heading+panel('At-risk register',`<div class="table-scroll"><table class="risk-table"><thead><tr><th>STUDENT</th><th>GRADE</th><th>SUBJECT</th><th>SEMESTER GRADE</th><th>BELOW 50% BY</th><th>SUMMATIVES GRADED</th></tr></thead><tbody>${lines}</tbody></table></div><p class="mini-note">A student may appear more than once when multiple subjects fall below 50%. Values are generated from fictional historical demo records. Current classroom grades are stored separately in this browser.</p>`);
  }catch(err){if(id===request&&root.isConnected)root.innerHTML='<div class="notice">Could not load the fictional risk register. Reload this demo page.</div>'}
 }
 window.addEventListener('school-period-changed',event=>{year=event.detail.year;semester=event.detail.semester;if(page==='risk'&&(role==='admin'||role==='coordinator'))render();});
 const original=render;
 render=function(){if(page==='risk'&&(role==='coordinator'||role==='admin')){original();const root=document.getElementById('content');if(root){root.innerHTML=pageHtml();load()}}else original()};
 document.addEventListener('change',event=>{
  const ids={riskYear:'year',riskSemester:'semester',riskGrade:'grade',riskSubject:'subject'};
  if(!Object.hasOwn(ids,event.target?.id)||(role!=='coordinator'&&role!=='admin')||page!=='risk')return;
  const key=ids[event.target.id];const value=event.target.value;
  if(key==='year')year=Number(value);else if(key==='semester')semester=Number(value);else if(key==='grade')grade=value;else subject=value;
  load();
 });
})();
