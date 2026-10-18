// Local Portuguese schedule parsing and deterministic placement of flexible activities.
// Unknown descriptions return null and continue through the AI extraction flow.
const normalize=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const daysMap={domingo:0,segunda:1,terca:2,quarta:3,quinta:4,sexta:5,sabado:6};
const dayPattern='(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:s)?(?:-feira)?';
const minute=value=>{const [h,m]=value.split(':').map(Number);return h*60+m};
const clock=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
function readDays(text){
 text=normalize(text);
 const range=text.match(new RegExp(dayPattern+'\\s+(?:a|ate)\\s+'+dayPattern));
 if(range){const result=[];let day=daysMap[range[1]];for(let n=0;n<7;n++){result.push(day);if(day===daysMap[range[2]])break;day=(day+1)%7}return result;}
 return [...new Set(Array.from(text.matchAll(new RegExp('\\b'+dayPattern+'\\b','g')),match=>daysMap[match[1]]))];
}
function extractFixedCommitments(description){
 const text=normalize(description);
 const hours=/(?:das?|as)\s*(\d{1,2})(?:(?::|h)(\d{2}))?\s*(?:h(?:rs?|oras?)?)?\s*(?:ate|as|a|-)\s*(?:as\s*)?(\d{1,2})(?:(?::|h)(\d{2}))?\s*(?:h(?:rs?|oras?)?)?/g;
 const matches=Array.from(text.matchAll(hours));if(matches.length<2)return null;
 const records=new Map();let previousEnd=0,days=[],kind=null;
 const company=description.match(/\bna\s+([\p{L}\d_-]+)/u)?.[1];
 for(const match of matches){
  const prefix=text.slice(previousEnd,match.index),explicit=readDays(prefix);previousEnd=match.index+match[0].length;
  if(explicit.length)days=explicit;if(!days.length)return null;
  const start=Number(match[1])*60+Number(match[2]||0),end=Number(match[3])*60+Number(match[4]||0);
  if(start>=end||end>1440||Number(match[2]||0)>59||Number(match[4]||0)>59)return null;
  if(/dou aula|aula de musica|ministro|oficina/.test(prefix))kind='class';
  else if(/culto|igreja|atividade pessoal/.test(prefix))kind='personal';
  else if(/freelanc/.test(prefix))kind='freelance';
  else if(/trabalh/.test(prefix))kind='work';
  if(!kind)return null;
  const names={work:company?`Trabalho na ${company}`:'Trabalho principal',freelance:'Programação freelancer',class:/musica/.test(prefix)?'Aulas de música':'Aulas e oficinas',personal:/culto/.test(prefix)?'Culto':'Atividade pessoal'};
  if(!records.has(kind))records.set(kind,{kind:['work','freelance'].includes(kind)?'trabalho':'rotinas',data:{name:names[kind],...(kind==='work'&&company?{company}:{}),...(['work','freelance'].includes(kind)?{tasks:[],status:'IN_PROGRESS'}:{type:'Pessoal'}),isActive:true,schedules:[]}});
  const record=records.get(kind);for(const dayOfWeek of days){const row={dayOfWeek,startTime:clock(start),endTime:clock(end)};if(!record.data.schedules.some(s=>JSON.stringify(s)===JSON.stringify(row)))record.data.schedules.push(row);}
 }
 return [...records.values()];
}
function buildFlexiblePlan(fixed,description,today,existing=[]){
 const text=normalize(description),items=JSON.parse(JSON.stringify(fixed));
 const busy=Array.from({length:7},()=>[]),assumptions=['Os compromissos fixos foram lidos localmente dos dias e intervalos informados. Confira os nomes, dias e horários antes de confirmar.'];
 const addBusy=(day,start,end)=>busy[day].push([minute(start),minute(end)]);
 for(const item of [...fixed,...existing]){
  if(item.data.isActive===false)continue;
  for(const row of item.data.schedules||[]){if(row.breakStart&&row.breakEnd){addBusy(row.dayOfWeek,row.startTime,row.breakStart);addBusy(row.dayOfWeek,row.breakEnd,row.endTime)}else addBusy(row.dayOfWeek,row.startTime,row.endTime)}
  for(const row of item.data.sessions||[]){const day=new Date(`${row.date}T12:00:00Z`).getUTCDay();addBusy(day,row.startTime,row.endTime)}
 }
 const find=(day,duration,preferences)=>{for(const [low,high]of preferences)for(let start=low;start+duration<=high;start+=15){if(busy[day].every(([a,b])=>start+duration<=a-15||start>=b+15)){busy[day].push([start,start+duration]);return {startTime:clock(start),endTime:clock(start+duration)}}}return null};
 if(/correr|corrida/.test(text)){
  const schedules=[];for(const day of [2,4,6,0,1,3,5]){const slot=find(day,30,[[7*60,8*60],[17*60,20*60],[9*60,17*60]]);if(slot)schedules.push({dayOfWeek:day,...slot});if(schedules.length===3)break;}
  if(schedules.length){items.push({kind:'rotinas',data:{name:'Corrida',type:'Atividade física',isActive:true,schedules}});assumptions.push(`Sugestão: ${schedules.length} corridas semanais de 30 minutos. Dias e duração podem ser alterados na revisão.`);}
 }
 if(/faculdade|ead|estud|curso/.test(text)){
  const sessions=[];for(let offset=1;offset<=7;offset++){const date=new Date(`${today}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+offset);const day=date.getUTCDay();const slot=find(day,45,[[18*60,22*60],[12*60,14*60],[8*60,12*60],[14*60,18*60]]);if(slot)sessions.push({date:date.toISOString().slice(0,10),...slot,status:'PENDING'});if(sessions.length===3)break;}
  if(sessions.length){items.push({kind:'metas',data:{title:/faculdade|ead/.test(text)?'Estudar faculdade EAD':'Estudo e aprendizado',description:'Sugestão de planejamento em janelas livres; revise horários e duração.',weeklyFrequency:sessions.length,sessionMinutes:45,priority:'MEDIUM',status:'ACTIVE',sessions}});assumptions.push(`Sugestão: ${sessions.length} sessões de estudo de 45 minutos nos próximos sete dias, sem usar horários dos compromissos fixos.`);}
 }
 if(/descans|lazer/.test(text)){
  const schedules=[];for(let day=0;day<7;day++){const slot=find(day,30,[[18*60,22*60],[12*60,14*60],[8*60,12*60],[14*60,18*60]]);if(slot)schedules.push({dayOfWeek:day,...slot});}
  if(schedules.length){items.push({kind:'rotinas',data:{name:'Pausa e descanso',type:'Saúde',isActive:true,schedules}});assumptions.push('Sugestão: blocos de descanso de 30 minutos. Eles não representam todo o tempo de sono necessário.');}
 }
 assumptions.push('As sugestões usam intervalos de 15 minutos entre atividades e não estimam deslocamentos. Somente estudo, corrida e pausas flexíveis receberam horários novos.');
 return {items,assumptions};
}
function localSchedulePlan(description,today,existing=[]){
 if(!/encaix|melhor rotina|organize|mont.*rotina|sugir/.test(normalize(description)))return null;
 const fixed=extractFixedCommitments(description);if(!fixed)return null;
 return buildFlexiblePlan(fixed,description,today,existing);
}
module.exports={readDays,extractFixedCommitments,buildFlexiblePlan,localSchedulePlan};



