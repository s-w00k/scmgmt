/* Offline demonstration adapter for the original v2.4 UI. Only fictional records.
   All API-shaped requests are handled here; no network service is needed. */
(() => {
'use strict';
const ACCOUNT_KEY='school-management-browser-demo-users-v1';
const PERIOD_KEY='school-management-browser-demo-period-v1';
const SESSION_KEY='school-management-demo-session';
const defaults=[
 {username:'schoolteacher',name:'Michael Teacher',role:'teacher',password:'123456',active:true,classIds:[1,2,3]},
 {username:'schoolcoordinator',name:'School Coordinator',role:'coordinator',password:'123456',active:true,classIds:[]},
 {username:'alexstudent',name:'Alex Student',role:'student',password:'123456',active:true,classIds:[1]},
 {username:'schooladministrator',name:'School Administrator',role:'admin',password:'123456',active:true,classIds:[]}
];
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const getAccounts=()=>{
 const all=read(ACCOUNT_KEY,defaults.map(a=>({...a}))).map(a=>({...a,classIds:a.classIds||[]}));
 // Migrate the previous default teacher login without replacing customized users.
 const old=all.find(a=>a.username==='michaelhong'&&a.role==='teacher');
 if(old&&!all.some(a=>a.username==='schoolteacher')){
   old.username='schoolteacher';
   localStorage.setItem(ACCOUNT_KEY,JSON.stringify(all));
 }
 if(sessionStorage.getItem(SESSION_KEY)==='michaelhong'&&old?.username==='schoolteacher')sessionStorage.setItem(SESSION_KEY,'schoolteacher');
 return all;
};
const saveAccounts=a=>localStorage.setItem(ACCOUNT_KEY,JSON.stringify(a));
const pub=a=>{const {password,...rest}=a;return rest};
const response=(data,status=200)=>Promise.resolve(new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}));
const error=(message,status=400)=>response({error:message},status);
const current=()=>getAccounts().find(a=>a.username===sessionStorage.getItem(SESSION_KEY)&&a.active);
const period=()=>read(PERIOD_KEY,{year:2026,semester:1});
const subjects=['Mathematics','English','Science','Humanities'];
const names=['Hugo Moore','Grace Bennett','Hugo Park','Nora Patel','Maya Collins','Ava Chen','Leo Rivera','Jamie Wilson','Ethan Lee','Sofia Martinez','Emma Brooks','Noah Taylor'];
const studentsInGrade=(grade,year)=>{
 const g=Number(grade),y=Number(year);
 if(!Number.isInteger(g)||g<1||g>12||y<2021||y>2026)return [];
 return names.map((name,i)=>({id:g*1000+i+1,code:`DEMO-${g}-${String(i+1).padStart(3,'0')}`,name,grade:g}));
};
function gradesFor(g,y,sem,subject,student){
 const sIdx=Math.max(0,subjects.indexOf(subject));
 const special=y===2026&&sem===1&&(
  (g===4&&student.name==='Hugo Moore'&&subject==='Mathematics')||
  (g===8&&student.name==='Grace Bennett'&&subject==='Science')||
  (g===10&&student.name==='Hugo Park'&&subject==='English'));
 const target=special?({4:32,8:39,10:44})[g]:Math.max(40,Math.min(95,64+(student.id%12)*2+Math.round(Math.sin(g+y+sIdx+sem)*6)));
 const offsets=[-3,1,2,0];const results=[0,1,2,3].map((i)=>({
  id:`${y}-${sem}-${g}-${sIdx}-${i}`,title:[`Formative Practice 1`,`Summative Assessment 1`,`Formative Practice 2`,`Summative Assessment 2`][i],
  type:i%2?'Summative':'Formative',category:i%2?'Tests':'Homework',max:100,
  earned:Math.max(0,Math.min(100,target+(special?0:offsets[i])))}));
 // Homework and Tests average yield target for special examples; all records are demo-only.
 return results;
}
function subjectDetail(g,y,sem,subject,student){
 const assignments=gradesFor(g,y,sem,subject,student);
 const cats=[{name:'Homework',weight:30,average:(assignments[0].earned+assignments[2].earned)/2},
             {name:'Quizzes',weight:30,average:assignments[1].earned},
             {name:'Tests',weight:40,average:assignments[3].earned}];
 const score=Math.round(cats.reduce((sum,c)=>sum+c.weight*c.average/100,0)*10)/10;
 return {name:subject,semesterPercent:score,provisionalPercent:score,coverage:100,complete:true,summativeCount:2,
  categories:cats,assignments,criteria:{A:null,B:null,C:null,D:null},comment:null,credits:null};
}
function handleHistory(url){
 const q=url.searchParams,year=Number(q.get('year')||2026),semester=Number(q.get('semester')||1),grade=Number(q.get('grade'));
 const absent=(year===2026&&semester===2);
 if(url.pathname==='/api/history/report-students')return response({students:absent?[]:studentsInGrade(grade,year)});
 if(url.pathname==='/api/history/reportcards'){
  const ids=(q.get('students')||'').split(',').filter(Boolean).map(Number);
  return response({year,semester,grade,fictional:true,students:absent?[]:studentsInGrade(grade,year).filter(s=>ids.includes(s.id)).map(st=>({...st,studentCode:st.code,subjects:subjects.map(sub=>subjectDetail(grade,year,semester,sub,st))}))});
 }
 if(url.pathname==='/api/history/risk'){
  const gFilter=q.get('grade')||'All',subFilter=q.get('subject')||'All Subjects';
  const grades=gFilter==='All'?Array.from({length:12},(_,i)=>i+1):[Number(gFilter)];
  const subs=subFilter==='All Subjects'?subjects:[subFilter];let rows=[];let assessed=0;
  if(!absent)for(const g of grades)for(const student of studentsInGrade(g,year))for(const sub of subs){
    const score=subjectDetail(g,year,semester,sub,student).semesterPercent;assessed++;
    if(score<50)rows.push({studentId:student.id,name:student.name,grade:g,subject:sub,average:score,belowBy:Math.round((50-score)*10)/10,summatives:2});
  }
  rows.sort((a,b)=>a.average-b.average||a.name.localeCompare(b.name));
  return response({students:rows,summary:{atRisk:new Set(rows.map(r=>r.studentId)).size,flaggedResults:rows.length,assessed,incomplete:0}});
 }
 if(url.pathname==='/api/history/trends'){
  const cohort=Number(q.get('cohort')),subject=q.get('subject')||'Mathematics',start=2026-cohort+1,points=[];
  for(let y=Math.max(2021,start);y<=2026;y++)for(let sem=1;sem<=2;sem++){
   if(y===2026&&sem===2)continue;
   const g=cohort-(2026-y);if(g<1||g>12)continue;
   const subs=subject==='All Subjects'?subjects:[subject];let sum=0,n=0;
   for(const student of studentsInGrade(g,y))for(const sb of subs){sum+=subjectDetail(g,y,sem,sb,student).semesterPercent;n++}
   points.push({year:y,semester:sem,grade:g,average:n?Math.round(sum/n*10)/10:0,sample:12,summative_grade_records:n*2});
  }
  return response({cohort,subject,points});
 }
 if(url.pathname==='/api/history/gradebook'){
  const cohort=Number(q.get('cohort')),g=cohort-(2026-year),subject=q.get('subject')||'Mathematics';
  if(absent||g<1||g>12)return response({gradeLevel:g,assignments:[],students:[]});
  const assignments=gradesFor(g,year,semester,subject,studentsInGrade(g,year)[0]).map(a=>({id:a.id,title:a.title,assessmentType:a.type,category:a.category,maxPoints:100}));
  const students=studentsInGrade(g,year).map(s=>({id:s.id,name:s.name,grades:Object.fromEntries(gradesFor(g,year,semester,subject,s).map(a=>[a.id,a.earned]))}));
  return response({gradeLevel:g,assignments,students});
 }
 return error('Unknown demo history endpoint',404);
}
const makeBody=options=>{try{return JSON.parse(options.body||'{}')}catch{return {}}};
function handleAccounts(url,options){
 const path=url.pathname.replace('/api/account',''),method=(options.method||'GET').toUpperCase(),body=makeBody(options),user=current();
 if(path==='/login'&&method==='POST'){
  const found=getAccounts().find(a=>a.username===String(body.username||'').trim().toLowerCase()&&a.password===body.password&&a.active);
  if(!found)return error('Incorrect username or password.',401);
  sessionStorage.setItem(SESSION_KEY,found.username);return response({user:pub(found)});
 }
 if(path==='/logout'&&method==='POST'){sessionStorage.removeItem(SESSION_KEY);return response({ok:true})}
 if(path==='/me')return user?response({user:pub(user)}):error('Not signed in.',401);
 if(!user||user.role!=='admin')return error('Administrator access required.',403);
 if(path==='/users'&&method==='GET')return response({users:getAccounts().map(pub)});
 if(path==='/users'&&method==='POST'){
  const all=getAccounts();if(all.some(a=>a.username===body.username))return error('Username already exists.',409);
  if(!/^[a-z0-9._-]{3,32}$/.test(body.username)||!body.name||!['teacher','student','coordinator','admin'].includes(body.role)||String(body.password||'').length<6)return error('Check account details.');
  all.push({...body,active:true,classIds:['teacher','student'].includes(body.role)?(body.classIds||[]):[]});saveAccounts(all);return response({ok:true},201);
 }
 const match=path.match(/^\/users\/([^/]+)(\/status)?$/);if(match){
  const old=decodeURIComponent(match[1]),all=getAccounts(),idx=all.findIndex(a=>a.username===old);
  if(idx<0)return error('Account not found.',404);
  if(match[2]&&method==='PATCH'){
   if(all[idx].role==='admin'&&!body.active&&all.filter(a=>a.active&&a.role==='admin').length<=1)return error('Keep one active administrator.');
   if(old===user.username&&!body.active)return error('Cannot deactivate your own account.');
   all[idx].active=!!body.active;saveAccounts(all);return response({ok:true});
  }
  if(method==='PUT'){
   if(all.some((a,i)=>i!==idx&&a.username===body.username))return error('Username already exists.',409);
   if(old===user.username&&(body.username!==old||body.role!=='admin'))return error('Cannot change your own administrator role.');
   if(all[idx].role==='admin'&&body.role!=='admin'&&all.filter(a=>a.active&&a.role==='admin').length<=1)return error('Keep one active administrator.');
   all[idx]={...all[idx],name:body.name,username:body.username,role:body.role,classIds:['teacher','student'].includes(body.role)?(body.classIds||[]):[],password:body.password||all[idx].password};
   if(old===user.username)sessionStorage.setItem(SESSION_KEY,body.username);
   saveAccounts(all);return response({ok:true});
  }
 }
 return error('Unknown account action.',404);
}
const originalFetch=window.fetch?.bind(window);
window.fetch=(input,options={})=>{
 const str=typeof input==='string'?input:input.url;
 const parsed=new URL(str,location.href);
 // file:///C:/demo/index.html + /api/... becomes file:///C:/api/... on Windows.
 const normalized=parsed.pathname.replace(/^\/[A-Za-z]:/,'');
 const url=new URL('https://offline.demo'+normalized+parsed.search);
 if(url.pathname.startsWith('/api/account/'))return handleAccounts(url,options);
 if(url.pathname.startsWith('/api/history/'))return handleHistory(url);
 if(url.pathname==='/api/settings/active-period'){
  if((options.method||'GET').toUpperCase()==='PUT'){
   if(current()?.role!=='admin')return error('Administrator only',403);
   const p=makeBody(options);if(!Number.isInteger(p.year)||![1,2].includes(p.semester))return error('Invalid semester');
   localStorage.setItem(PERIOD_KEY,JSON.stringify(p));return response(p);
  }
  return response(period());
 }
 if(url.pathname==='/api/health')return response({ok:true,mode:'offline browser demo'});
 return originalFetch?originalFetch(input,options):error('Offline demo: network unavailable',404);
};
window.OfflineSchoolDemo={mode:'browser',reset:()=>{localStorage.removeItem(ACCOUNT_KEY);localStorage.removeItem(PERIOD_KEY);sessionStorage.removeItem(SESSION_KEY)}};
})();
