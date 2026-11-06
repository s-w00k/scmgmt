/* v0.9: fictional browser-local category weighting and grade calculation. */
window.Grading = (() => {
  const DEFAULT = [
    {id:'homework',name:'Homework',weight:30},
    {id:'quizzes',name:'Quizzes',weight:30},
    {id:'tests',name:'Tests',weight:40}
  ];
  const ensure = classId => {
    db.gradeCategories ||= {};
    if (!Array.isArray(db.gradeCategories[classId]) || !db.gradeCategories[classId].length) {
      db.gradeCategories[classId] = structuredClone(DEFAULT);
      // Existing grade records stay intact. Assignments without a category
      // are assigned a deterministic default instead of becoming invisible.
      db.assignments.filter(a=>a.classId===Number(classId)).forEach(a=>{
        if (!a.categoryId) a.categoryId = /quiz/i.test(a.title) ? 'quizzes' : /test|exam/i.test(a.title) ? 'tests' : 'homework';
      });
      save();
    }
    return db.gradeCategories[classId];
  };
  const valid = categories => Array.isArray(categories) && categories.length > 0 &&
    categories.every(c=>c.name?.trim() && Number.isFinite(c.weight) && c.weight>=0 && c.weight<=100) &&
    new Set(categories.map(c=>c.id)).size===categories.length &&
    Math.abs(categories.reduce((n,c)=>n+c.weight,0)-100)<0.000001;
  const result = (studentId,classId) => {
    const categories=ensure(classId), assignments=db.assignments.filter(a=>a.classId===Number(classId));
    let earned=0, covered=0;
    const breakdown=categories.map(c=>{
      const vals=assignments.filter(a=>a.categoryId===c.id).map(a=>{
        const grade=db.grades.find(g=>g.studentId===studentId&&g.assignmentId===a.id);
        const max=Number(a.max||100);
        return grade && max>0 ? 100*Number(grade.score)/max : null;
      }).filter(v=>v!==null && Number.isFinite(v));
      const average=vals.length?vals.reduce((sum,v)=>sum+v,0)/vals.length:null;
      if(average!==null && c.weight>0){earned+=average*c.weight/100;covered+=c.weight;}
      return {...c,average,count:vals.length};
    });
    const complete=valid(categories) && Math.abs(covered-100)<0.000001;
    return {breakdown,covered,complete,final:complete?earned:null,earned,provisional:covered?earned*100/covered:null};
  };
  const fmt=value=>Number(value).toFixed(1)+'%';
  return {ensure,valid,result,fmt};
})();
