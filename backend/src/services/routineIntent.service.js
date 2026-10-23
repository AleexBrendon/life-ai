// Deterministic reading of routine requests in Portuguese: which activities, on which days,
// at what times, how often and for how long — linked to the user's existing records.
const normalize=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const DAYS={domingo:0,dom:0,segunda:1,seg:1,terca:2,ter:2,quarta:3,qua:3,quinta:4,qui:4,sexta:5,sex:5,sabado:6,sab:6};
const NUMBERS={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7};
const DAY='(domingo|segunda|terca|quarta|quinta|sexta|sabado|dom|seg|ter|qua|qui|sex|sab)(?:s)?(?:-feira|\\s+feira)?';
const clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const number=value=>NUMBERS[value]??Number(value);
const CATALOG=[
 {re:/\bfreela\w*/,kind:'trabalho',name:'Freelancer',category:'Trabalho'},
 {re:/\b(?:trabalh(?:o|ar|a|ando)|emprego|expediente|clt|servico|plantao)\b/,kind:'trabalho',name:'Trabalho',category:'Trabalho'},
 {re:/\bcorr(?:er|ida|idas|o)\b/,name:'Corrida',category:'Atividade física'},
 {re:/\bcaminh(?:ar|ada|adas)\b/,name:'Caminhada',category:'Atividade física'},
 {re:/\b(?:academia|musculacao|malhar|treino de forca)\b/,name:'Academia',category:'Atividade física'},
 {re:/\b(?:natacao|nadar)\b/,name:'Natação',category:'Atividade física'},
 {re:/\b(?:bike|pedalar|pedal|ciclismo)\b/,name:'Pedal',category:'Atividade física'},
 {re:/\b(?:crossfit|funcional)\b/,name:'Treino funcional',category:'Atividade física'},
 {re:/\byoga\b/,name:'Yoga',category:'Saúde'},
 {re:/\bpilates\b/,name:'Pilates',category:'Saúde'},
 {re:/\bfutebol\b/,name:'Futebol',category:'Lazer'},
 {re:/\bflauta\b/,name:'Treino de flauta',category:'Música'},
 {re:/\bviolao\b/,name:'Treino de violão',category:'Música'},
 {re:/\bpiano\b/,name:'Treino de piano',category:'Música'},
 {re:/\bguitarra\b/,name:'Treino de guitarra',category:'Música'},
 {re:/\b(ingles|espanhol|frances|alemao|italiano|japones)\b/,name:m=>`Estudar ${{ingles:'inglês',espanhol:'espanhol',frances:'francês',alemao:'alemão',italiano:'italiano',japones:'japonês'}[m[1]]}`,category:'Estudos'},
 {re:/\bfaculdade\b/,name:'Estudar faculdade',category:'Estudos'},
 {re:/\b(?:leitura|ler)\b/,name:'Leitura',category:'Desenvolvimento pessoal'},
 {re:/\b(?:meditar|meditacao)\b/,name:'Meditação',category:'Saúde'},
 {re:/\b(?:culto|igreja|missa)\b/,name:'Culto',category:'Espiritualidade'},
 {re:/\b(?:descanso|descansar|pausa)\b/,name:'Pausa e descanso',category:'Descanso'},
 {re:/\bestud(?:ar|o|os)\b/,name:'Estudos',category:'Estudos',generic:true},
];
// Words too generic to identify one specific record by name.
const GENERIC=new Set(['treino','treinar','rotina','rotinas','estudar','estudo','estudos','trabalho','aulas','sessao','pratica','tempo','minha','meus','minhas','programacao','novos','novas','itens','atividade','atividades','horario','horarios','semana','diario','diaria','geral','pessoal']);
const tokens=text=>normalize(text).split(/[^a-z0-9]+/).filter(word=>word.length>=5&&!GENERIC.has(word));
function dayList(text){
 const out=[];const add=d=>{if(!out.includes(d))out.push(d)};
 for(const m of text.matchAll(new RegExp(`\\b${DAY}\\s+(?:a|ate)\\s+${DAY}`,'g'))){let d=DAYS[m[1]];for(let n=0;n<7;n++){add(d);if(d===DAYS[m[2]])break;d=(d+1)%7}}
 if(/\b(?:dias uteis|dia util)\b/.test(text))[1,2,3,4,5].forEach(add);
 if(/\b(?:todos os dias|todo dia|diariamente|todos os dia)\b/.test(text))[0,1,2,3,4,5,6].forEach(add);
 if(/\b(?:fim de semana|fins de semana|finais de semana|final de semana)\b/.test(text))[6,0].forEach(add);
 const stripped=text.replace(new RegExp(`\\b${DAY}\\s+(?:a|ate)\\s+${DAY}`,'g'),' ');
 for(const m of stripped.matchAll(new RegExp(`\\b${DAY}\\b`,'g')))add(DAYS[m[1]]);
 return out;
}
const HOUR='(\\d{1,2})(?:(?::|h)(\\d{2}))?\\s*(?:h(?:oras?|rs?)?)?';
function hourValue(h,m){const value=Number(h)*60+Number(m||0);return Number(h)<=23&&Number(m||0)<60?value:null}
function timeRanges(text){
 const ranges=[];
 const patterns=[new RegExp(`\\b(?:das?|de|entre|do)\\s+${HOUR}\\s*(?:as|ate|a|e)\\s+(?:as\\s+)?${HOUR}`,'g'),/\b(\d{1,2})(?::(\d{2})|h(\d{2})?)\s*(?:-|–|as|ate|a)\s*(\d{1,2})(?::(\d{2})|h(\d{2})?)?/g];
 for(const m of text.matchAll(patterns[0])){const start=hourValue(m[1],m[2]),end=hourValue(m[3],m[4]);if(start!=null&&end!=null&&end>start)ranges.push({index:m.index,end:m.index+m[0].length,start,finish:end})}
 for(const m of text.matchAll(patterns[1])){if(ranges.some(r=>m.index>=r.index&&m.index<r.end))continue;const start=hourValue(m[1],m[2]||m[3]),end=hourValue(m[4],m[5]||m[6]);if(start!=null&&end!=null&&end>start)ranges.push({index:m.index,end:m.index+m[0].length,start,finish:end})}
 return ranges.sort((a,b)=>a.index-b.index);
}
function singleStart(text,ranges){
 for(const m of text.matchAll(new RegExp(`\\b(?:as|a partir das?|comecando as)\\s+${HOUR}`,'g'))){if(ranges.some(r=>m.index>=r.index&&m.index<r.end))continue;const start=hourValue(m[1],m[2]);if(start!=null)return {index:m.index,start}}
 return null;
}
function frequency(text){
 const m=text.match(/\b(\d|um|uma|dois|duas|tres|quatro|cinco|seis|sete)\s*(?:x|vez(?:es)?)\s*(?:por|na|a|ao|por)?\s*semana/)||text.match(/\b(\d)\s*x\b/);
 if(m)return Math.min(7,Math.max(1,number(m[1])));
 if(/\b(?:todos os dias|todo dia|diariamente)\b/.test(text))return 7;
 if(/\bdia sim,? dia nao\b/.test(text))return 4;
 return null;
}
function duration(text,ranges){
 const free=ranges.reduceRight((value,r)=>value.slice(0,r.index)+' '.repeat(r.end-r.index)+value.slice(r.end),text);
 let m=free.match(/\b(\d{1,3})\s*(?:min|mins|minuto|minutos)\b/);
 if(m&&!/\b(?:h|hora|horas)\s*(?:e\s*)?$/.test(free.slice(0,m.index)))return Number(m[1]);
 m=free.match(/\b(\d|uma|duas|meia)\s*hora(?:s)?(?:\s*e\s*(?:(\d{1,2})\s*min\w*|meia))?/);
 if(m)return (m[1]==='meia'?30:number(m[1])*60)+(m[2]?Number(m[2]):/e\s*meia/.test(m[0])?30:0);
 m=free.match(/\b(?:por|durante|de|sessoes? de|cada uma de)\s+(\d)h(\d{2})?\b/);
 if(m)return Number(m[1])*60+Number(m[2]||0);
 return null;
}
function window(text){
 if(/\b(?:de manha|pela manha|cedo|manhas)\b/.test(text))return [360,720];
 if(/\b(?:a tarde|de tarde|pela tarde|tardes)\b/.test(text))return [720,1080];
 if(/\b(?:a noite|de noite|pela noite|noites)\b/.test(text))return [1080,1320];
 if(/\bantes de dormir\b/.test(text))return [1200,1350];
 return null;
}
// Pairs each time range with the day expressions written next to it.
function slotsFor(text,ranges){
 const slots=[];
 ranges.forEach((range,i)=>{
  const before=text.slice(i?ranges[i-1].end:0,range.end),after=text.slice(range.end,ranges[i+1]?.index??text.length);
  let days=dayList(before);if(!days.length)days=dayList(after);
  slots.push({days,start:range.start,end:range.finish,index:range.index});
 });
 return slots;
}
function mentions(text,existing){
 const found=[];
 for(const record of existing){
  const words=tokens(record.name);
  for(const word of words){const at=text.search(new RegExp(`\\b${word}`));if(at>=0){found.push({index:at,length:word.length,existing:record,name:record.name,kind:record.kind,category:record.category});break}}
 }
 for(const entry of CATALOG){
  const m=text.match(entry.re);if(!m)continue;
  if(entry.generic&&found.some(f=>f.category==='Estudos'||/estud|faculdade|ingles|idioma/.test(normalize(f.name))))continue;
  // "correr" refers to the existing "Corrida" when both match the same activity.
  const record=existing.find(row=>entry.re.test(normalize(row.name))&&(entry.kind||'rotinas')===(row.kind==='metas'?'rotinas':row.kind));
  if(record&&found.some(f=>f.existing===record))continue;
  if(found.some(f=>m.index<f.index+f.length&&m.index+m[0].length>f.index))continue;
  found.push(record?{index:m.index,length:m[0].length,existing:record,name:record.name,kind:record.kind,category:record.category}:{index:m.index,length:m[0].length,name:typeof entry.name==='function'?entry.name(m):entry.name,kind:entry.kind||'rotinas',category:entry.category});
 }
 return found.sort((a,b)=>a.index-b.index).filter((item,i,list)=>list.findIndex(other=>normalize(other.name)===normalize(item.name))===i);
}
const DEFAULTS={'Atividade física':[3,45],Música:[3,30],Estudos:[3,45],Descanso:[7,30],Saúde:[3,30],Lazer:[1,60],'Desenvolvimento pessoal':[3,30],Espiritualidade:[1,90]};
// Returns the activities described in the message; an empty list means it is not a routine description.
function interpret(message,existing=[]){
 const text=normalize(message);
 if(/\b(?:tirar|tire|remov\w*|exclu\w*|apag\w*|cancel\w*|deixar de)\b/.test(text))return {activities:[],removal:true};
 const found=mentions(text,existing);
 const activities=found.map((mention,i)=>{
  let clause=text.slice(mention.index,found[i+1]?.index??text.length);
  // "correr e nadar 3x por semana": a bare mention borrows the attributes of the next one.
  const rest=clause.slice(mention.length).replace(/[\s,e]+/g,'');
  if(rest.length<3&&found[i+1])clause+=text.slice(found[i+1].index+found[i+1].length,found[i+2]?.index??text.length);
  const ranges=timeRanges(clause),breakRange=ranges.find(r=>/(?:pausa|almoco|intervalo)\s*(?:de|das|do)?\s*$/.test(clause.slice(0,r.index).slice(-25)));
  const workRanges=ranges.filter(r=>r!==breakRange);
  const slots=slotsFor(clause,workRanges).filter(slot=>slot.days.length);
  if(breakRange&&mention.kind==='trabalho')for(const slot of slots)if(breakRange.start>slot.start&&breakRange.finish<slot.end)Object.assign(slot,{breakStart:breakRange.start,breakEnd:breakRange.finish});
  const start=!slots.length?singleStart(clause,ranges):null,minutes=duration(clause,ranges),days=dayList(clause);
  const [defaultTimes,defaultMinutes]=DEFAULTS[mention.category]||[3,30];
  const sessionMinutes=minutes||mention.existing?.sessionMinutes||defaultMinutes;
  if(start&&days.length)slots.push({days,start:start.start,end:Math.min(1439,start.start+sessionMinutes)});
  const kind=/\b(?:meta|objetivo|prazo)\b/.test(clause)&&mention.kind!=='trabalho'?'metas':mention.kind;
  const times=frequency(clause)||(slots.length?null:days.length||null);
  return {
   name:mention.name,kind:mention.existing?mention.existing.kind:kind,category:mention.category||mention.existing?.category||'Organização',existingId:mention.existing?.id||null,
   fixed:slots.length>0&&!/\b(?:flexivel|pode mudar|qualquer horario)\b/.test(clause),
   slots:slots.map(slot=>({days:slot.days,startTime:clock(slot.start),endTime:clock(slot.end),...(slot.breakStart!=null?{breakStart:clock(slot.breakStart),breakEnd:clock(slot.breakEnd)}:{})})),
   timesPerWeek:times||(slots.length?null:mention.existing?.weeklyFrequency||defaultTimes),sessionMinutes,
   allowedDays:!slots.length&&days.length?days:null,preferredWindow:window(clause),
  };
 });
 return {activities};
}
function intentOf(message){
 const text=normalize(message);
 if(/\b(?:comprar|compra|parcel\w*|cartao|orcamento)\b/.test(text))return 'shopping';
 if(/\b(?:semana|imprevisto)\b/.test(text)&&/\b(?:organiz\w*|reorganiz\w*|ajust\w*|replanej\w*|encaix\w*|reorden\w*)\b/.test(text))return 'week';
 if(/\b(?:mont\w*|remont\w*|organiz\w*|reorganiz\w*|refa[cz]\w*|refazer|planej\w*|cri[ae]\w*|melhor\w*|avali\w*|reavali\w*|revis\w*|otimiz\w*|ajust\w*|arrum\w*|gera\w*|sugir\w*|sugest\w*)\b[^.?!]{0,60}\b(?:rotina|agenda|planejamento|dia a dia|semana|horarios|meu dia|meus dias)\b/.test(text))return 'build';
 return 'other';
}
module.exports={normalize,interpret,intentOf,dayList,timeRanges,duration,frequency};
