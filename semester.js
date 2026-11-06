/* Shared academic period selector: fictional local prototype, not secured for production. */
(() => {
 const state={year:2026,semester:1,loaded:false};
 let saving=false;
 const label=()=>`${state.year}–${state.year+1} · Semester ${state.semester}`;
 const get=()=>({year:state.year,semester:state.semester});
 window.SchoolPeriod={get,label};
 const select=(id,values,chosen)=>`<select id="${id}">${values.map(n=>`<option value="${n}" ${n===chosen?'selected':''}>${n===1?'Semester 1 · Aug–Dec':n===2?'Semester 2 · Jan–Jun':`${n}–${n+1}`}</option>`).join('')}</select>`;
 const previousSettings=settings;
 settings=function(){
  if(role!=='admin')return header('Access denied','Administrator access required.');
  return header('System Settings','Manage the active academic period seen by all school users.')+
   panel('School-wide active semester',`<p>Current active period: <strong>${safe(label())}</strong></p>
   <p class="mini-note">Changing this setting updates the school-wide academic period for all users on their next page load or refresh. Semester 1 is August–December; Semester 2 is January–June of the following year.</p>
   <div class="form-row"><div class="field"><label for="schoolPeriodYear">Academic year</label>${select('schoolPeriodYear',Array.from({length:15},(_,i)=>2021+i),state.year)}</div>
   <div class="field"><label for="schoolPeriodSemester">Semester</label>${select('schoolPeriodSemester',[1,2],state.semester)}</div></div>
   <div class="notice">In this browser-only demo, the active semester is shared between demo accounts in this browser, not between devices. Historical reporting filters initialize from it, but classroom grades and assignments are not yet separated by semester. No automatic transfer or creation of grades occurs when switching.</div>
   <button type="button" class="btn" id="saveSchoolPeriod" ${saving?'disabled':''}>Save active semester for everyone</button><p id="schoolPeriodStatus" role="status" aria-live="polite"></p>`)+
   panel('Demo data',`<p class="mini-note">Resetting fictional classroom data does not reset simulated historical data or the semester selection.</p><button class="btn secondary" id="resetDemo">Reset fictional demo data</button>`);
 };
 const previousRender=render;
 render=function(){previousRender();const badge=document.getElementById('activePeriodBadge');if(badge)badge.textContent=label()};
 document.addEventListener('click',async event=>{
  if(event.target?.id!=='saveSchoolPeriod'||role!=='admin'||page!=='settings'||saving)return;
  const year=Number(document.getElementById('schoolPeriodYear')?.value),semester=Number(document.getElementById('schoolPeriodSemester')?.value);
  if(!Number.isInteger(year)||!Number.isInteger(semester))return;
  saving=true;const button=event.target;button.disabled=true;
  const status=document.getElementById('schoolPeriodStatus');if(status)status.textContent='Saving demo setting…';
  try{
   const response=await fetch('/api/settings/active-period',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({year,semester})});
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const saved=await response.json();state.year=saved.year;state.semester=saved.semester;
   window.dispatchEvent(new CustomEvent('school-period-changed',{detail:get()}));
   render();toast('Active semester updated for all users');
  }catch(err){if(status)status.textContent='Unable to save the browser demo setting.';button.disabled=false;}
  finally{saving=false;}
 });
 async function refresh(){
  try{
   const response=await fetch('/api/settings/active-period',{cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}`);
   const data=await response.json();if(!Number.isInteger(data.year)||![1,2].includes(data.semester))throw Error('Invalid active period');
   const changed=data.year!==state.year||data.semester!==state.semester;
   state.year=data.year;state.semester=data.semester;state.loaded=true;
   window.dispatchEvent(new CustomEvent('school-period-changed',{detail:get()}));
   if(activeUser)render();
  }catch(err){console.warn('Active period unavailable; using the default term.',err);}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  // Always display the current term, including when the user is on a non-settings page.
  const crumb=document.querySelector('.crumb');if(crumb&&!document.getElementById('activePeriodBadge')){
   const span=document.createElement('span');span.id='activePeriodBadge';span.className='period-indicator';span.textContent=label();crumb.append(span);
  }
  refresh();
 });
})();
