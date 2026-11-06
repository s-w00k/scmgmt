/* v0.8 extensions: expanded fictional rosters, CSV exports, coordinator historical cohort visualizations. */
(() => {
  const samples = [
    'Avery Brooks','Noah Williams','Mia Thompson','Liam Carter','Sophia Nguyen','Ethan Patel',
    'Isabella Wong','Oliver Wilson','Amelia Scott','Lucas Martin','Harper Brown','Elijah Davis',
    'Charlotte Lee','Benjamin Young','Emma Robinson','Daniel Park','Grace Taylor','Henry Kim',
    'Zoe Johnson','Mason Reed','Sofia Garcia','Leo Anderson','Chloe Miller','Jack Evans',
    'Ruby Campbell','Isaac Moore','Ella Cooper','Nathan Brooks','Aria Bennett','Oscar Turner',
    'Lily Phillips','Finn Mitchell','Hannah Flores','Aaron Foster','Eva Peterson','Caleb Jenkins',
    'Nora Price','Dylan Murphy','Stella Ross','Owen Bailey','Ivy Morgan','Theo Richardson',
    'Layla Hayes','Max Sullivan','Alice Rivera','Adam Clark','Sara Ahmed','Kai Lewis',
    'Maya Nelson','Hugo Wright','Olivia Chen','James Parker','Emily Reed','Ryan Walker',
    'Freya Howard','David Hughes','Nina Shah','Logan Baker','Jasmine Bell','Sebastian Ward'
  ];
  // Idempotent migration: never remove students or overwrite any existing records.
  const demoClasses = db.classes.filter(c=>[1,2,3].includes(c.id));
  demoClasses.forEach((c,index)=>{
    const existing=db.students.filter(st=>st.classId===c.id).length;
    const target=[24,22,20][index];
    for(let i=existing;i<target;i++){
      const used = new Set(db.students.map(st=>st.name));
      let name=samples[(index*23+i)%samples.length];
      if(used.has(name))name=`${name} ${c.grade}`;
      db.students.push({id:nextId(db.students),name,classId:c.id});
    }
    c.students=db.students.filter(st=>st.classId===c.id).length;
  });
  save();

  // Spreadsheet-safe CSV: protect against Excel formula injection from names and titles.
  const spreadsheetCell = v => {
    let raw=String(v??'');
    if(/^\s*[=+@\-\t\r]/.test(raw) && !/^\s*-?\d+(?:\.\d+)?\s*$/.test(raw))raw="'"+raw;
    return '"'+raw.replace(/"/g,'""')+'"';
  };
  function downloadCSV(filename,rows){
    const csv='\uFEFF'+rows.map(row=>row.map(spreadsheetCell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  const dateSlug=()=>new Date().toISOString().slice(0,10);
  function classExport(type, classId, attendanceDate){
    const c=cl(classId);if(!c)return;
    const roster=db.students.filter(st=>st.classId===c.id).slice().sort((a,b)=>a.name.localeCompare(b.name));
    const slug=(c.name||'class').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    if(type==='gradebook'){
      const assignments=db.assignments.filter(a=>a.classId===c.id);
      const submissions=db.submissions||[];
      const rows=[['Student ID','Student',...assignments.flatMap(a=>[`${a.title} [${Grading.ensure(c.id).find(cat=>cat.id===a.categoryId)?.name||"Uncategorized"}] - Grade / ${a.max||100}`,`${a.title} - Submission`]),'Raw Average (%)','Weighted Final Grade (%)','Weighted Grade Status']];
      roster.forEach(st=>{
        const scored=[];const cells=assignments.flatMap(a=>{
          const grade=db.grades.find(g=>g.studentId===st.id&&g.assignmentId===a.id);
          const submitted=submissions.some(sub=>sub.studentId===st.id&&sub.assignmentId===a.id);
          if(grade)scored.push(Number(grade.score)/Number(a.max||100)*100);
          return [grade?.score??'',submitted?'Submitted':'Not submitted'];
        });
        rows.push([st.id,st.name,...cells,scored.length?(scored.reduce((sum,v)=>sum+v,0)/scored.length).toFixed(1):'',Grading.result(st.id,c.id).complete?Grading.result(st.id,c.id).final.toFixed(1):'',Grading.result(st.id,c.id).complete?'Final':'Provisional / pending']);
      });
      downloadCSV(`gradebook-${slug}-${dateSlug()}.csv`,rows);
    }else{
      // Export ALL recorded dates for this class, making the export useful for attendance history.
      const dateRecords=db.attendance.filter(r=>roster.some(st=>st.id===r.studentId));
      const dates=[...new Set([...dateRecords.map(r=>r.date),attendanceDate].filter(Boolean))].sort();
      const rows=[['Student ID','Student',...dates,'Present','Absent','Excused','TBC']];
      roster.forEach(st=>{
        const statuses=dates.map(date=>db.attendance.find(r=>r.studentId===st.id&&r.date===date)?.status||'tbc');
        rows.push([st.id,st.name,...statuses,...['present','absent','excused','tbc'].map(status=>statuses.filter(v=>v===status).length)]);
      });
      downloadCSV(`attendance-${slug}-${dateSlug()}.csv`,rows);
    }
    toast(`${type==='gradebook'?'Gradebook':'Attendance'} CSV downloaded`);
  }

  let trendSubject='All Subjects',trendCohort=4,trendMode='cohort';
  const subjects=['All Subjects','Mathematics','English','Science','Humanities'];
  // Deterministic fictional sample: illustrative longitudinal measurements, not current DB grades.
  const offsets={Mathematics:-2,English:3,Science:1,Humanities:0};
  function historyPoint(cohort,grade,subject){
    const year=2026-(cohort-grade);
    const base=64+grade*1.65+Math.sin(grade*1.3+cohort*.67)*3.8 +(cohort-7)*.45;
    const avg=subject==='All Subjects'?base+.5:base+offsets[subject]+Math.sin(grade*1.9+subjects.indexOf(subject))*1.6;
    const mean=Math.max(0,Math.min(100,avg));
    return {grade,year,average:Number(mean.toFixed(1)),high:Math.max(0,Math.min(100,Math.round(15+(mean-65)*.8))),meeting:Math.round(58+Math.sin(grade*.74+cohort)*4),sample:19+(cohort*7+grade*3)%11};
  }
  function historySeries(){return Array.from({length:trendCohort},(_,i)=>historyPoint(trendCohort,i+1,trendSubject));}
  function svgTrend(points){
    const w=780,h=300,pad={l:52,r:20,t:22,b:50};const plotW=w-pad.l-pad.r,plotH=h-pad.t-pad.b;
    const x=i=>pad.l+(points.length===1?plotW/2:i*plotW/(points.length-1));
    const y=value=>pad.t+(100-value)*plotH/100;
    const grid=[0,20,40,60,80,100].map(v=>`<line x1="${pad.l}" y1="${y(v)}" x2="${w-pad.r}" y2="${y(v)}" stroke="#e5eaf2"/><text x="${pad.l-12}" y="${y(v)+4}" fill="#7b8797" font-size="12" text-anchor="end">${v}%</text>`).join('');
    const pts=points.map((p,i)=>`${x(i)},${y(p.average)}`).join(' ');
    return `<svg class="trend-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Average grades from Grade 1 through Grade ${trendCohort}">${grid}<polyline points="${pts}" fill="none" stroke="#4267d5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>${points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.average)}" r="5" fill="#4267d5" stroke="white" stroke-width="2"><title>Grade ${p.grade}: ${p.average}% (${p.year})</title></circle><text x="${x(i)}" y="${h-20}" text-anchor="middle" font-size="12" fill="#536174">G${p.grade}</text>`).join('')}</svg>`;
  }
  function trendsPage(){
    const series=historySeries(),first=series[0],last=series.at(-1),change=(last.average-first.average).toFixed(1);
    const subjectOpts=subjects.map(s=>`<option value="${safe(s)}" ${s===trendSubject?'selected':''}>${safe(s)}</option>`).join('');
    const cohortOpts=Array.from({length:12},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===trendCohort?'selected':''}>Currently Grade ${n}</option>`).join('');
    return header('Academic Performance Trends','Track a student cohort across past grade levels and compare subjects.')+
      `<div class="notice"><strong>Illustrative historical data only.</strong> These values are simulated to demonstrate the coordinator dashboard. They are not calculated from student records or historical school data.</div>`+
      panel('Explore performance',`<div class="trend-filters"><div class="field"><label for="trendCohort">Student cohort (current grade)</label><select id="trendCohort">${cohortOpts}</select></div><div class="field"><label for="trendSubject">Subject</label><select id="trendSubject">${subjectOpts}</select></div></div><p class="mini-note">Selecting Grade 4 traces that same fictional cohort through Grades 1, 2, 3 and 4; the academic year changes accordingly.</p>`)+
      `<div class="stats">${stat('Current cohort','Grade '+trendCohort,'Tracked from Grade 1')}${stat('Latest average',last.average+'%',trendSubject)}${stat('Change since Grade 1',(Number(change)>0?'+':'')+change+' pts','Percentage-point change')}${stat('Latest year',String(last.year),'Illustrative history')}</div>`+
      panel(`Average grade trend · ${trendSubject}`,`<div class="trend-plot">${svgTrend(series)}</div><p class="mini-note">Hover over data points to see the grade, academic year and average. All values are percentages.</p><div class="action-row"><button class="btn secondary" data-export-trends>Export trend CSV</button></div>`)+
      panel('Historical performance by grade',`<div class="table-scroll"><table><thead><tr><th>GRADE</th><th>ACADEMIC YEAR</th><th>AVERAGE</th><th>PERFORMANCE LEVEL</th><th>SAMPLE SIZE</th></tr></thead><tbody>${series.map(p=>`<tr><td><b>Grade ${p.grade}</b></td><td>${p.year}–${p.year+1}</td><td><strong>${p.average}%</strong></td><td><span class="pill ${p.average>=75?'green':p.average>=60?'orange':''}">${p.average>=85?'Excellent':p.average>=75?'Proficient':p.average>=60?'Developing':'Needs support'}</span></td><td>${p.sample} simulated students</td></tr>`).join('')}</tbody></table></div><p class="mini-note">Performance level thresholds are illustrative and can be aligned to the school's actual assessment framework later.</p>`);
  }

  menu.coordinator.push(['trends','Performance Trends','↗']);
  // Prevent duplicated menu item if already included in core menu.
  menu.coordinator=menu.coordinator.filter((v,i,arr)=>arr.findIndex(x=>x[0]===v[0])===i);
  const previousRender=render;
  render=function(){
    if(page==='trends'&&role==='coordinator'){
      $('#signedInName').textContent=activeUser?.name||roleName();
      $('#avatar').textContent=(activeUser?.name||'U').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
      $('#nav').innerHTML=menu[role].map(m=>`<button class="nav-item ${m[0]===page?'active':''}" data-nav="${m[0]}"><span class="glyph">${m[2]}</span>${m[1]}</button>`).join('');
      $('#crumbPage').textContent='Performance Trends';$('#content').innerHTML=trendsPage();
      const bell=$('#feedbackBell');if(bell)bell.hidden=true;
    }else{
      previousRender();
      if(page==='classroom'&&role!=='student'){
        const tabs=document.querySelector('.class-tabs');
        if(tabs){
          const selected=tabs.querySelector('[aria-selected="true"]')?.dataset.tab;
          if(['gradebook','attendance'].includes(selected)){
            const root=document.querySelector('.tab-content > .panel');
            if(root){const b=document.createElement('button');b.type='button';b.className='btn secondary class-export-btn';b.textContent=selected==='gradebook'?'↓ Export gradebook CSV':'↓ Export attendance CSV';b.dataset.exportClass=selected;
              const heading=root.querySelector('.panel-title');if(heading)heading.appendChild(b);else root.prepend(b);
            }
          }
        }
      }
    }
  };
  document.addEventListener('change',e=>{
    if(page==='trends'&&role==='coordinator'&&e.target.id==='trendCohort'){trendCohort=Number(e.target.value);render()}
    if(page==='trends'&&role==='coordinator'&&e.target.id==='trendSubject'){trendSubject=e.target.value;render()}
  });
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-export-class]');
    if(btn&&page==='classroom'&&role!=='student'){e.preventDefault();e.stopImmediatePropagation();classExport(btn.dataset.exportClass,currentClass,document.querySelector('#classAttendanceDate')?.value);return;}
    if(e.target.closest('[data-export-trends]')&&role==='coordinator'){
      e.preventDefault();e.stopImmediatePropagation();const rows=[['Grade','Academic Year','Cohort','Subject','Average (%)','Performance Level','Simulated Students'],...historySeries().map(p=>[p.grade,`${p.year}-${p.year+1}`,`Grade ${trendCohort}`,trendSubject,p.average,p.average>=85?'Excellent':p.average>=75?'Proficient':p.average>=60?'Developing':'Needs support',p.sample])];downloadCSV(`cohort-grade-${trendCohort}-${trendSubject.toLowerCase().replace(/\s+/g,'-')}-SIMULATED.csv`,rows);return;
    }
  },true);
  // Repaint only if already signed in; otherwise the original login screen remains untouched.
  if(activeUser)render();
})();
