/* Browser demo historical reporting. Every historical result is simulated from fictional data. */
(() => {
 const years=[2021,2022,2023,2024,2025,2026];
 const subjects=['Mathematics','English','Science','Humanities'];
 let selectedSubject='Mathematics',selectedCohort=null;
 let gradeYear=2021,gradeSemester=1,gradeSubject='Mathematics',gradeCohort=10;
 const trendCache=new Map();let trendRequest=0,bookRequest=0;
 const filterOptions=(list,selected)=>list.map(x=>`<option value="${safe(x)}" ${String(x)===String(selected)?'selected':''}>${safe(x)}</option>`).join('');
 const qs=o=>new URLSearchParams(o);
 function message(t){return `<div class="notice">${safe(t)}</div>`}
 function trendChart(points){
  const x=i=>points.length<=1?360:70+i*640/(points.length-1),y=v=>240-(v*1.9);
  const poly=points.map((p,i)=>`${x(i)},${y(p.average)}`).join(' ');
  return `<svg class="trend-svg" viewBox="0 0 780 285" role="img" aria-label="Historical semester mean grades">
   ${[0,25,50,75,100].map(n=>`<line x1="65" y1="${y(n)}" x2="720" y2="${y(n)}" stroke="#e1e8f2"/><text x="49" y="${y(n)+4}" text-anchor="end" font-size="12" fill="#748093">${n}%</text>`).join('')}
   <polyline points="${poly}" fill="none" stroke="#4267d5" stroke-width="3"/>
   ${points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.average)}" r="4" fill="#4267d5"><title>${p.year}-${p.year+1} · Semester ${p.semester} · Grade ${p.grade}: ${p.average}%</title></circle><text x="${x(i)}" y="265" font-size="10" fill="#607086" text-anchor="middle">${p.year}S${p.semester}</text>`).join('')}
  </svg>`;
 }
 function trendPage(){
   return header('Academic Performance Trends','Semester-by-semester cohort history, sourced from fictional browser data assessment grades.')+
   message('FICTIONAL HISTORICAL RECORDS · Stored in this browser. Cohort denotes the students currently in the selected grade (2026–2027). Semester 1 = Aug–Dec; Semester 2 = Jan–Jun of the following calendar year.')+
   panel('Explore performance',`<div class="form-row"><div class="field"><label>Current cohort (2026)</label><select id="historicalCohort"><option value="" ${selectedCohort==null?'selected':''} disabled>Select a grade level</option>${filterOptions(Array.from({length:12},(_,i)=>i+1),selectedCohort)}</select></div><div class="field"><label>Subject</label><select id="historicalSubject">${filterOptions(['All Subjects',...subjects],selectedSubject)}</select></div></div>`)+
   `<div id="historicalTrendResults">${message(selectedCohort==null?'Choose a grade level to view performance trends.':'Loading recorded historical grades from fictional browser data…')}</div>`;
 }
 async function loadTrend(){
  if(page!=='trends'||(role!=='coordinator'&&role!=='admin'))return;
  const req=++trendRequest,root=document.querySelector('#historicalTrendResults');if(!root)return;
  if(selectedCohort==null){root.innerHTML=message('Choose a grade level to view performance trends.');return}
  root.innerHTML=message('Loading fictional grade history…');
  try{
   const key=JSON.stringify([selectedCohort,selectedSubject]);let json=trendCache.get(key);
   if(!json){const resp=await fetch(`/api/history/trends?${qs({cohort:selectedCohort,subject:selectedSubject})}`);if(!resp.ok)throw Error(`HTTP ${resp.status}`);json=await resp.json();trendCache.set(key,json)}
   if(req!==trendRequest||!root.isConnected)return;
   const ps=json.points;
   if(!ps.length){root.innerHTML=message('No recorded semesters for this cohort yet. The earliest seeded semester is 2021 S1.');return}
   const first=ps[0],last=ps[ps.length-1],delta=(last.average-first.average).toFixed(1);
   root.innerHTML=`<div class="stats">${stat('Latest grade',`Grade ${last.grade}`,'Cohort grade in '+last.year)}${stat('Latest average',last.average+'%',`Semester ${last.semester}`)}${stat('Change from first',(delta>0?'+':'')+delta+' pts','Average percentage points')}${stat('Students',last.sample,'Fictional records')}</div>`+
    panel('Semester average trend',`<div class="trend-plot">${trendChart(ps)}</div><p class="mini-note">Each plotted point is calculated from fictional browser data assessment grades. Both semesters are shown separately; 2026 Semester 2 has not yet started.</p>`)+
    panel('Recorded semester averages',`<div class="table-scroll"><table><thead><tr><th>ACADEMIC YEAR</th><th>SEMESTER</th><th>GRADE</th><th>AVERAGE</th><th>STUDENTS</th><th>GRADE RECORDS</th></tr></thead><tbody>${ps.map(p=>`<tr><td>${p.year}-${p.year+1}</td><td>Semester ${p.semester}</td><td>Grade ${p.grade}</td><td>${p.average}%</td><td>${p.sample}</td><td>${p.summative_grade_records} summative marks</td></tr>`).join('')}</tbody></table></div>`);
  }catch(e){if(req===trendRequest&&root.isConnected)root.innerHTML=message('Unable to load fictional history. Refresh the page.')} 
 }
 function bookPage(){
  const c=cl(currentClass),g=Number(c?.grade);if(!Number.isNaN(g)&&g>=1&&g<=12&&gradeCohort!==g)gradeCohort=g;
  if(c&&subjects.includes(c.subject)&&gradeSubject!==c.subject)gradeSubject=c.subject;
  return `<div class="panel"><div class="panel-title"><h2>Historical gradebooks</h2></div><p class="mini-note">Read-only fictional history from fictional browser data. Tracks a 2026 cohort backwards; these historical students are separate demonstration records from the current classroom roster.</p>
   <div class="form-row"><div class="field"><label>Academic year starts</label><select id="historyYear">${filterOptions(years,gradeYear)}</select></div><div class="field"><label>Semester</label><select id="historySemester"><option value="1" ${gradeSemester===1?'selected':''}>1 · Aug–Dec</option><option value="2" ${gradeSemester===2?'selected':''}>2 · Jan–Jun (following year)</option></select></div></div>
   <div class="form-row"><div class="field"><label>2026 cohort grade</label><select id="historyCohort">${filterOptions(Array.from({length:12},(_,i)=>i+1),gradeCohort)}</select></div><div class="field"><label>Subject</label><select id="historyBookSubject">${filterOptions(subjects,gradeSubject)}</select></div></div>
   <div id="historyGradebookResults">${message('Loading historical gradebook…')}</div></div>`;
 }
 async function loadGradebook(){
  const req=++bookRequest,root=document.getElementById('historyGradebookResults');if(!root)return;
  root.innerHTML=message('Loading fictional gradebook…');
  try{
   const response=await fetch(`/api/history/gradebook?${qs({cohort:gradeCohort,subject:gradeSubject,year:gradeYear,semester:gradeSemester})}`);
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const data=await response.json();if(req!==bookRequest||!root.isConnected)return;
   if(!data.assignments.length){root.innerHTML=message('No recorded assessments for that cohort in the selected semester. Try a later academic year (2021 is the earliest seeded year), or Semester 1 of 2026.');return}
   const summ=data.assignments.filter(a=>a.assessmentType==='Summative').length;
   root.innerHTML=`<div class="notice"><strong>Grade ${data.gradeLevel} · ${gradeYear}-${gradeYear+1} · Semester ${gradeSemester}</strong> — ${data.assignments.length} assignments, ${summ} summative assessments, ${data.students.length} students. Historical grades are read-only.</div>`+
    `<div class="table-scroll"><table><thead><tr><th>STUDENT</th>${data.assignments.map(a=>`<th>${safe(a.title)}<div><span class="pill ${a.assessmentType==='Summative'?'blue':'green'}">${safe(a.assessmentType)}</span></div><small>${safe(a.category)} / ${a.maxPoints}</small></th>`).join('')}<th>MEAN %</th></tr></thead><tbody>${data.students.map(s=>{
     const scores=[];const cells=data.assignments.map(a=>{const n=s.grades[a.id];if(n!=null)scores.push(n/a.maxPoints*100);return `<td>${n!=null?`${n} / ${a.maxPoints}`:'—'}</td>`}).join('');
     return `<tr><td><b>${safe(s.name)}</b></td>${cells}<td><b>${scores.length?(scores.reduce((x,y)=>x+y,0)/scores.length).toFixed(1)+'%':'—'}</b></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }catch(e){if(req===bookRequest&&root.isConnected)root.innerHTML=message('fictional browser history is unavailable. Start the backend and run npm run seed.')} 
 }
 window.HistoricalGradebook={view:bookPage};
 const originalRender=render;
 render=function(){
  if(page==='trends'&&(role==='coordinator'||role==='admin')){
   originalRender();document.getElementById('content').innerHTML=trendPage();loadTrend();
  }else{originalRender();if(page==='classroom'&&document.getElementById('historyGradebookResults'))loadGradebook();}
 };
 document.addEventListener('change',e=>{
  const id=e.target?.id;
  if(id==='historicalCohort'){selectedCohort=Number(e.target.value);render()}
  if(id==='historicalSubject'){selectedSubject=e.target.value;render()}
  if(id==='historyYear'){gradeYear=Number(e.target.value);loadGradebook()}
  if(id==='historySemester'){gradeSemester=Number(e.target.value);loadGradebook()}
  if(id==='historyCohort'){gradeCohort=Number(e.target.value);loadGradebook()}
  if(id==='historyBookSubject'){gradeSubject=e.target.value;loadGradebook()}
 });
})();
