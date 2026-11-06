/* Coordinator report-card builder – fictional fictional browser records only.
   Client role selection is NOT access control. Never expose real student data via these routes. */
(() => {
 let year=2025, semester=2, grade=null, students=[],selected=new Set(), sequence=0;
 const option=(values,current)=>values.map(v=>`<option value="${v}" ${String(v)===String(current)?'selected':''}>${v}</option>`).join('');
 const allYears=[2021,2022,2023,2024,2025,2026];
 const $id=id=>document.getElementById(id);
 const e=safe; // escaping from original application
 function pageHtml(){
  return header('Gradebook & Report Cards','Choose a grade and students to prepare semester report cards.')+
  `<div class="notice">DEMO · Fictional fictional browser records. Reports are previews, not official report cards. Historical grade percentages are available; official A–D criterion levels, subject credits, GPA and teacher comments have not yet been saved in this browser.</div>`+
  `<section class="panel"><div class="panel-title"><h2>Report selection</h2><small>Academic year & student cohort</small></div>
  <div class="report-filters">
  <div class="field"><label for="reportYear">Academic year (starts in August)</label><select id="reportYear">${option(allYears,year)}</select></div>
  <div class="field"><label for="reportSemester">Semester</label><select id="reportSemester"><option value="1" ${semester===1?'selected':''}>Semester 1 · Aug–Dec</option><option value="2" ${semester===2?'selected':''}>Semester 2 · Jan–Jun</option></select></div>
  <div class="field"><label for="reportGrade">Grade level</label><select id="reportGrade"><option value="" ${grade===null?'selected':''}>Select a grade level</option>${option(Array.from({length:12},(_,i)=>i+1),grade)}</select></div>
  </div><div class="report-student-heading"><strong>Select students</strong><div><button class="btn secondary" type="button" id="reportSelectAll">Select all</button> <button class="btn secondary" type="button" id="reportClear">Clear</button></div></div>
  <div id="reportStudents" aria-live="polite"><p>Loading student list…</p></div>
  <div class="report-footer"><span id="reportCount">0 selected</span><button type="button" class="btn" id="reportGenerate" disabled>Generate report cards</button></div></section>`;
 }
 function showStudents(){
  const root=$id('reportStudents');if(!root)return;
  if(grade===null){root.innerHTML='<p class="empty">Select a grade level to load students.</p>'; }
  else if(!students.length){root.innerHTML='<p class="empty">No fictional enrollments for this academic year, semester and grade.</p>';}
  else root.innerHTML=`<div class="report-student-list">${students.map(st=>`<label class="report-student"><input type="checkbox" data-report-student="${Number(st.id)}" ${selected.has(Number(st.id))?'checked':''}><span><strong>${e(st.name)}</strong><small>${e(st.code)}</small></span></label>`).join('')}</div>`;
  showCount();
 }
 function showCount(){const counter=$id('reportCount'),generate=$id('reportGenerate');if(counter)counter.textContent=selected.size+' student'+(selected.size===1?'':'s')+' selected';if(generate)generate.disabled=!selected.size||selected.size>30;}
 async function loadStudents(){
  const token=++sequence;const root=$id('reportStudents');if(!root)return;
  root.innerHTML='<p>Loading fictional student records from fictional browser data…</p>';selected.clear();showCount();
  if(grade===null||(year===2026&&semester===2)){students=[];showStudents();return;}
  try{
   const response=await fetch('/api/history/report-students?'+new URLSearchParams({year,semester,grade}));
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();if(token!==sequence||!root.isConnected)return;
   students=data.students||[];showStudents();
  }catch(err){if(token!==sequence||!root.isConnected)return;root.innerHTML='<div class="notice">Could not load fictional students. Try refreshing the page.</div>';}
 }
 const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pct=n=>n===null||n===undefined?'Not available':Number(n).toFixed(1)+'%';
 function reportHtml(data){
 const studentHtml=data.students.map(student=>{
  const subjects=student.subjects||[];
  const summaryRows=subjects.map(sub=>`<tr><td>${escapeHtml(sub.name)}</td><td>${pct(sub.semesterPercent)}${sub.semesterPercent===null?' <small>(incomplete)</small>':''}</td><td>${sub.summativeCount}</td><td>Not recorded</td></tr>`).join('');
  const subjectPages=subjects.map(sub=>{
   const categoryRows=sub.categories.map(cat=>`<tr><td>${escapeHtml(cat.name)}</td><td>${cat.weight}%</td><td>${pct(cat.average)}</td></tr>`).join('');
   const assignments=sub.assignments.map(a=>`<tr><td>${escapeHtml(a.title)}</td><td>${escapeHtml(a.type)}</td><td>${escapeHtml(a.category)}</td><td>${a.earned===null?'Not graded':`${a.earned} / ${a.max}`}</td></tr>`).join('');
   return `<section class="sheet subject-page"><header class="sheet-header"><div><span class="eyebrow">STUDENT REPORT CARD</span><h2>${escapeHtml(sub.name)}</h2><p>AY ${data.year}–${data.year+1} · Semester ${data.semester}</p></div><div class="sheet-student">${escapeHtml(student.name)}<br><small>${escapeHtml(student.studentCode)}</small></div></header>
   <div class="summary-tiles"><div>Semester result<strong>${pct(sub.semesterPercent)}</strong></div><div>Graded summatives<strong>${sub.summativeCount}</strong></div><div>Category coverage<strong>${sub.coverage}%</strong></div></div>
   <h3>Assessment category results</h3><table><thead><tr><th>Category</th><th>Weight</th><th>Average</th></tr></thead><tbody>${categoryRows}</tbody></table>
   <h3>Recorded assignments</h3><table><thead><tr><th>Assignment</th><th>Type</th><th>Category</th><th>Mark</th></tr></thead><tbody>${assignments}</tbody></table>
   <h3>MYP assessment criteria</h3><div class="unavailable">A: Not recorded &nbsp;·&nbsp; B: Not recorded &nbsp;·&nbsp; C: Not recorded &nbsp;·&nbsp; D: Not recorded<br><small>The database does not yet store official achievement levels or subject-specific rubric descriptors.</small></div>
   <h3>Teacher's semester comment</h3><div class="comment">No semester comment has been recorded for this historical subject.</div>
   <footer>${escapeHtml(student.name)} · Grade ${student.grade} · ${escapeHtml(sub.name)} <span>Fictional demo only</span></footer></section>`;
  }).join('');
  return `<section class="sheet cover-page"><div class="eyebrow">STUDENT REPORT CARD</div><h1>Semester academic report</h1><p>Academic Year ${data.year}–${data.year+1} · Semester ${data.semester}</p><div class="profile"><div><small>Student name</small><strong>${escapeHtml(student.name)}</strong></div><div><small>Student ID</small><strong>${escapeHtml(student.studentCode)}</strong></div><div><small>Grade level</small><strong>Grade ${student.grade}</strong></div></div><div class="demo-banner">Fictional demonstration report · Not an official school record</div><h2>Subjects grade summary</h2><table><thead><tr><th>Subject</th><th>Semester score</th><th>Summatives graded</th><th>Official MYP grade</th></tr></thead><tbody>${summaryRows}</tbody></table><div class="unavailable"><strong>GPA:</strong> Not available · Credits and the school's official letter-grade conversion rules have not been configured.</div><footer>School Management · Prototype <span>Fictional data</span></footer></section>${subjectPages}`;
 }).join('');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Semester report cards · Grade ${data.grade}</title><style>
 :root{font-family:Arial,Helvetica,sans-serif;color:#1d2b49}*{box-sizing:border-box}body{background:#e9edf4;margin:0;padding:24px}.toolbar{max-width:850px;margin:0 auto 20px;display:flex;justify-content:space-between;align-items:center;gap:12px}.toolbar button{background:#334bd0;color:white;border:0;padding:12px 24px;border-radius:8px;font-size:15px;cursor:pointer}.toolbar p{margin:0;color:#4b5b71}.sheet{background:white;width:min(100%,850px);min-height:1100px;padding:48px 45px;margin:0 auto 24px;border:1px solid #cad3e9;box-shadow:0 2px 10px #aab5c33b;break-after:page;page-break-after:always;position:relative}.sheet:last-child{break-after:auto;page-break-after:auto}.eyebrow{font-weight:700;letter-spacing:2px;color:#344cb2;font-size:13px}.sheet h1{font-size:28px;margin:12px 0 2px}.sheet h2{font-size:20px;color:#1e357e;margin:28px 0 14px}.sheet h3{font-size:14px;color:#273b8d;border-bottom:1px solid #c9d3e9;padding-bottom:7px;margin:26px 0 12px}.sheet p{color:#66738e;font-size:14px}.profile{background:#f2f5fa;border-radius:12px;padding:22px;display:grid;grid-template-columns:2fr 1.2fr 1fr;gap:12px;margin-top:36px}.profile small{display:block;color:#6d7890;margin-bottom:8px}.profile strong{font-size:15px}.demo-banner{background:#edf2ff;color:#293c8b;border-radius:8px;margin:26px 0 6px;padding:13px;font-weight:bold;font-size:13px}table{width:100%;border-collapse:collapse;font-size:12.5px}th{text-align:left;color:#293e92;background:#f0f3fa}th,td{border-bottom:1px solid #d7dfed;padding:10px 8px;vertical-align:top}td small{color:#6b7486}.sheet-header{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #2c448b;padding-bottom:16px}.sheet-header h2{margin:8px 0 0}.sheet-student{text-align:right;font-weight:700}.sheet-student small{font-weight:normal;color:#64748b}.summary-tiles{display:flex;gap:12px;margin-top:24px}.summary-tiles div{flex:1;padding:13px;background:#f3f5fc;border-radius:8px;font-size:12px;color:#64708c}.summary-tiles strong{display:block;color:#1c3275;font-size:19px;margin-top:7px}.unavailable,.comment{background:#f6f7fa;border-left:3px solid #a7b6d8;padding:14px;color:#536278;font-size:12px;margin-top:20px}.comment{min-height:60px}.sheet footer{position:absolute;bottom:30px;left:45px;right:45px;border-top:1px solid #d5dcec;padding-top:12px;font-size:10px;color:#718096}.sheet footer span{float:right}@page{size:A4;margin:8mm}@media print{body{background:white;padding:0}.toolbar{display:none}.sheet{margin:0;width:100%;min-height:275mm;padding:15mm 12mm;box-shadow:none;border:0}.sheet footer{left:12mm;right:12mm;bottom:13mm}}@media(max-width:700px){.sheet{min-height:unset;padding:25px 18px}.profile{grid-template-columns:1fr}.sheet footer{position:static;margin-top:40px}.summary-tiles{flex-wrap:wrap}}
 </style></head><body><div class="toolbar"><p>${data.students.length} fictional student report(s) · Preview</p><button onclick="window.print()">Print / Save as PDF</button></div>${studentHtml}</body></html>`;
 }
 async function generate(){
  if(!selected.size||selected.size>30)return;
  const button=$id('reportGenerate');if(button){button.disabled=true;button.textContent='Preparing reports…';}
  // Open synchronously from user gesture to avoid popup blocking.
  const preview=window.open('','_blank');
  if(!preview){toast('Allow pop-ups for this browser demo to open the report preview.');showCount();if(button)button.textContent='Generate report cards';return;}
  preview.document.write('<title>Preparing report cards…</title><p style="font-family:Arial;padding:30px">Preparing fictional report cards from fictional browser data…</p>');preview.document.close();
  try{
   const response=await fetch('/api/history/reportcards?'+new URLSearchParams({year,semester,grade,students:[...selected].join(',')}));
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();if(!data.students?.length)throw Error('No matching fictional records found.');
   preview.document.open();preview.document.write(reportHtml(data));preview.document.close();
  }catch(err){preview.document.body.textContent='Could not prepare reports: '+err.message;}
  finally{if(button)button.textContent='Generate report cards';showCount();}
 }
 window.addEventListener('school-period-changed',event=>{year=event.detail.year;semester=event.detail.semester;grade=null;students=[];selected.clear();if(page==='reports'&&(role==='admin'||role==='coordinator'))render();});
 const previousRender=render;
 render=function(){previousRender();if(page==='reports'&&(role==='coordinator'||role==='admin')){
  const root=$id('content');if(root){root.innerHTML=pageHtml();loadStudents();}
 }};
 document.addEventListener('change',event=>{
  if(page!=='reports'||(role!=='coordinator'&&role!=='admin'))return;
  const t=event.target;
  if(t.id==='reportYear'){year=Number(t.value);loadStudents();}
  if(t.id==='reportSemester'){semester=Number(t.value);loadStudents();}
  if(t.id==='reportGrade'){grade=t.value===''?null:Number(t.value);loadStudents();}
  if(t.matches('[data-report-student]')){const id=Number(t.dataset.reportStudent);if(t.checked)selected.add(id);else selected.delete(id);showCount();}
 });
 document.addEventListener('click',event=>{
  if(page!=='reports'||(role!=='coordinator'&&role!=='admin'))return;
  if(event.target?.id==='reportSelectAll'){selected=new Set(students.slice(0,30).map(s=>Number(s.id)));showStudents();}
  if(event.target?.id==='reportClear'){selected.clear();showStudents();}
  if(event.target?.id==='reportGenerate')generate();
 });
})();
