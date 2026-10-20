export const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const statuses = [['TODO', 'A fazer'], ['IN_PROGRESS', 'Em andamento'], ['COMPLETED', 'Concluído']];
const priority = [['LOW', 'Baixa'], ['MEDIUM', 'Média'], ['HIGH', 'Alta']];
const f = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });
const title = (key = 'title', label = 'Título', maxLength = 150) => f(key, label, 'text', { required: true, maxLength });
const description = maxLength => f('description', 'Descrição', 'textarea', { maxLength });
const active = f('isActive', 'Ativo', 'checkbox', { default: true });
const state = f('status', 'Status', 'select', { options: statuses, default: 'TODO' });
const schedule = [f('dayOfWeek', 'Dia', 'select', { number: true, options: weekdays.map((label, i) => [i, label]), default: 1 }), f('startTime', 'Início', 'time', { required: true }), f('endTime', 'Fim', 'time', { required: true })];
export const entities = {
 rotinas: { title: 'Rotinas', singular: 'rotina', icon: 'repeat', description: 'Crie constância, um pequeno hábito por vez.', fields: [title('name', 'Nome', 100), f('type', 'Categoria', 'text', { required: true, maxLength: 50, default: 'Organização', list: ['Atividade física', 'Desenvolvimento pessoal', 'Organização', 'Saúde'] }), active], children: { schedules: { title: 'Horários da semana', singular: 'horário', fields: schedule } } },
 metas: { title: 'Metas', singular: 'meta', description: 'Transforme objetivos em tempo reservado na agenda.', fields: [title(), description(1000), f('targetDate', 'Prazo', 'date'), f('weeklyFrequency', 'Sessões por semana', 'number', { min: 1, max: 7, default: 3, required: true }), f('sessionMinutes', 'Minutos por sessão', 'number', { min: 15, max: 240, default: 60, required: true }), f('priority', 'Prioridade', 'select', { options: priority, default: 'MEDIUM' }), f('status', 'Status', 'select', { options: [['ACTIVE','Ativa'], ['PAUSED','Pausada'], ['COMPLETED','Concluída']], default: 'ACTIVE' })], children: { sessions: { title: 'Sessões na agenda', singular: 'sessão', fields: [f('date', 'Data', 'date', { required: true }), ...schedule.slice(1), f('status','Status','select',{ options:[['PENDING','Pendente'],['COMPLETED','Concluída'],['SKIPPED','Pulada']], default:'PENDING' })] } } },
 trabalho: { title: 'Trabalho', singular: 'trabalho', description: 'Seu trabalho, seus horários e suas entregas em um só lugar.', fields: [title('name','Nome',100), f('company','Empresa','text',{maxLength:100}), f('position','Cargo','text',{maxLength:100}), f('workType','Modalidade','select',{ options:[['','Não informado'],['REMOTE','Remoto'],['HYBRID','Híbrido'],['ONSITE','Presencial']] }), f('location','Local','text',{maxLength:200}), active], children: { schedules: { title: 'Jornada e intervalos', singular: 'jornada', fields: [...schedule, f('breakStart','Início da pausa','time'), f('breakEnd','Fim da pausa','time')] }, tasks: { title:'Tarefas do Kanban', singular:'tarefa', fields:[title(),description(2000),state] } } },
 lembretes: { title:'Lembretes', singular:'lembrete', description:'Guarde o que importa e libere espaço na cabeça.', fields:[title(),description(500),f('reminderTime','Horário','time',{required:true}),f('recurrence','Repetição','select',{options:[['NONE','Uma vez'],['DAILY','Todos os dias'],['WEEKLY','Toda semana']],default:'NONE'}),f('date','Data','date',{required:true,when:v=>v.recurrence==='NONE'}),f('dayOfWeek','Dia da semana','select',{number:true,options:weekdays.map((label,i)=>[i,label]),default:1,when:v=>v.recurrence==='WEEKLY'}),f('reminderState','Status','select',{options:[['ACTIVE','Ativo'],['PAUSED','Pausado'],['COMPLETED','Concluído']],default:'ACTIVE'})], children:{} },
 imprevistos: { title:'Imprevistos', singular:'imprevisto', description:'Abra espaço para os planos que mudam.', fields:[title('title','Título',100),description(500),f('date','Data','date',{required:true}),...schedule.slice(1),f('priority','Prioridade','select',{options:priority,default:'MEDIUM'}),f('status','Status','select',{options:[['PENDING','Pendente'],['RESOLVED','Resolvido'],['CANCELLED','Cancelado']],default:'PENDING'})],children:{} },
};
export const defaultValues = fields => Object.fromEntries(fields.map(field => [field.key, field.default ?? (field.type === 'checkbox' ? false : '')]));
export function payload(fields, values) {
 return Object.fromEntries(fields.filter(field=>!field.when || field.when(values)).flatMap(field=>{
  let value=values[field.key];
  if(field.type==='checkbox') value=!!value;
  else if(field.number || field.type==='number') value=value===''?undefined:Number(value);
  else value=String(value??'').trim();
  if ((value === '' || value === undefined) && ['date','time'].includes(field.type) && !field.required) return field.key==='targetDate'?[[field.key,null]]:[];
  return [[field.key,value]];
 }));
}
export function valuesFor(fields,item={}) { item = item || {}; return {...defaultValues(fields),...(fields.some(field=>field.key==='reminderState')?{reminderState:item.isCompleted?'COMPLETED':item.isActive===false?'PAUSED':'ACTIVE'}:{}),...Object.fromEntries(fields.filter(f=>item[f.key]!=null).map(f=>[f.key,f.type==='date'?String(item[f.key]).slice(0,10):f.key==='status'&&item[f.key]==='DONE'?'COMPLETED':item[f.key]]))}; }


