/* Criterion based assessment: independent of percentage category weighting. */
window.Criteria = (()=>{
 const letters=a=>Array.isArray(a.criteria)&&a.criteria.length?a.criteria.filter(x=>['A','B','C','D'].includes(x)):['A','B','C','D'];
 const target=(a,g)=>Math.round(Math.max(0,Math.min(1,Number(g.score)/Number(a.max||100)))*8*letters(a).length);
 const suggest=(a,g)=>{const keys=letters(a),sum=target(a,g),base=Math.floor(sum/keys.length),extra=sum%keys.length;return Object.fromEntries(keys.map((k,i)=>[k,base+(i<extra?1:0)]));};
 const validate=(a,g,marks)=>{
   const keys=letters(a),sum=keys.reduce((n,k)=>n+Number(marks[k]),0),wanted=target(a,g);
   if(keys.some(k=>!Number.isInteger(marks[k])||marks[k]<(wanted===0?0:1)||marks[k]>8))return {ok:false,message:'Each assessed criterion must be a whole number from 1 to 8 (zero only for a zero-score assignment).'};
   if(sum!==wanted)return {ok:false,message:`Criterion scores must total exactly ${wanted} / ${keys.length*8} based on the recorded assignment score. Current total: ${sum}.`};
   return {ok:true};
 };
 const state=(sid,a,g)=>{if(!g)return {marks:{},target:null};const existing=db.criterionMarks?.[`${sid}:${a.id}`];const marks=existing&&Number(existing.score)===Number(g.score)&&Number(existing.max)===Number(a.max||100)&&validate(a,g,existing.marks).ok?existing.marks:suggest(a,g);return {marks,target:target(a,g)};};
 const summary=(sid,cid)=>{const values={A:null,B:null,C:null,D:null},lists={A:[],B:[],C:[],D:[]};db.assignments.filter(a=>a.classId===Number(cid)).forEach(a=>{const g=db.grades.find(x=>x.studentId===sid&&x.assignmentId===a.id);if(!g)return;const marks=state(sid,a,g).marks;letters(a).forEach(k=>lists[k].push(marks[k]));});for(const k of Object.keys(values))if(lists[k].length)values[k]=lists[k].reduce((a,b)=>a+b,0)/lists[k].length;const nums=Object.values(values).filter(x=>x!=null);return {values,overall:nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null};};
 return {letters,target,suggest,validate,state,summary};
})();
