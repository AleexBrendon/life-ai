const {z}=require('zod');
const timingFields={preparationMinutes:z.number().int().min(0).max(180).nullable().optional(),outboundMinutes:z.number().int().min(0).max(180).nullable().optional(),returnMinutes:z.number().int().min(0).max(180).nullable().optional()};
function timing(row={}){const remote=row.locationMode==='REMOTE'||row.workType==='REMOTE';return {beforeMinutes:(row.preparationMinutes||0)+(remote?0:row.outboundMinutes||0),afterMinutes:remote?0:row.returnMinutes||0}}
function timingMissing(row,kind){
 if(row.locationMode==='REMOTE'||row.workType==='REMOTE')return [];
 const physical=kind==='trabalho'?row.workType!=='REMOTE':row.locationMode==='ONSITE'||/culto|igreja|missa|presencial/i.test(row.name||'');
 if(!physical)return [];
 return Object.keys(timingFields).filter(key=>row[key]==null);
}
function timingSummary(records){return records.map(({row,kind})=>({kind,title:row.name,...timing(row),missing:timingMissing(row,kind),travelDuringBreak:row.travelDuringBreak===true&&row.locationMode!=='REMOTE'&&row.workType!=='REMOTE'})).filter(row=>row.beforeMinutes||row.afterMinutes||row.missing.length)}
function workTiming(job,index,length){const value=timing(job),travel=job.travelDuringBreak&&job.locationMode!=='REMOTE'&&job.workType!=='REMOTE';return {beforeMinutes:index===0||travel?value.beforeMinutes:0,afterMinutes:index===length-1||travel?value.afterMinutes:0}}
module.exports={timingFields,timing,timingMissing,timingSummary,workTiming};
