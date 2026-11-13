import { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2, Pencil, Search, ArrowUpRight, CalendarDays } from 'lucide-react';
import api from '../../lib/api';
import { WeekdayPicker, TimePicker, DatePicker } from './ScheduleInputs';
import { entities, defaultValues, payload, valuesFor, weekdays } from './entityConfig';
import useUnsavedChanges from '../../lib/useUnsavedChanges';
import { requestErrorMessage, requestFieldErrors } from '../../lib/requestFeedback';

export function Dialog({ title, subtitle, onClose, busy, children, className = '' }) {
 const ref=useRef(null);
 useEffect(()=>{const el=ref.current;const overflow=document.body.style.overflow;el.showModal();document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=overflow}},[]);
 return <dialog ref={ref} className={`studio-dialog ${className}`} aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><header><div><span className="studio-eyebrow">LIFEAI · PLANEJAMENTO</span><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" onClick={onClose} disabled={busy} aria-label="Fechar"><X size={18}/></button></header>{children}</dialog>;
}
const NEW_CATEGORY='__new__';
// Select with the default categories plus the ones already used in the user's records; "Nova categoria…" switches to free text.
function CategorySelect({id,field,value,onChange}) {
 const [used,setUsed]=useState([]),[typing,setTyping]=useState(false);
 useEffect(()=>{if(!field.listFrom)return;let active=true;const [kind,key]=field.listFrom;api.get(`/planner/${kind}`).then(r=>{if(active)setUsed(r.data.map(row=>String(row[key]||'').trim()).filter(Boolean))}).catch(()=>{});return()=>{active=false}},[field.listFrom]);
 const extras=[...new Set([...used,value].filter(option=>option&&!field.list.includes(option)))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 if(typing)return <><span>{field.label}{field.required&&<small> *</small>}</span><div className="category-input"><input id={id} name={field.key} required={field.required} maxLength={field.maxLength} value={value} autoFocus placeholder="Nome da nova categoria" onChange={e=>onChange(field.key,e.target.value)}/><button type="button" className="studio-button secondary" onClick={()=>{setTyping(false);if(!String(value).trim())onChange(field.key,field.default||field.list[0])}}>Escolher da lista</button></div></>;
 return <><span>{field.label}{field.required&&<small> *</small>}</span><select id={id} name={field.key} required={field.required} value={value} onChange={e=>{if(e.target.value===NEW_CATEGORY){setTyping(true);onChange(field.key,'')}else onChange(field.key,e.target.value)}}>{!value&&<option value="">Selecione uma categoria</option>}<optgroup label="Categorias">{field.list.map(option=><option key={option} value={option}>{option}</option>)}</optgroup>{extras.length>0&&<optgroup label="Suas categorias">{extras.map(option=><option key={option} value={option}>{option}</option>)}</optgroup>}<option value={NEW_CATEGORY}>+ Nova categoria…</option></select></>;
}
function Field({field:definition,values,onChange,prefix}) {
 const field=definition.requiredWhen?{...definition,required:definition.requiredWhen(values)}:definition;
 if(field.when&&!field.when(values))return null;
 const id=`${prefix}-${field.key}`;const value=values[field.key]??'';
 if(field.type==='choice')return <fieldset className="studio-field wide routine-modality"><legend>{field.label}{field.required?' *':''}</legend><div className="studio-view-toggle">{field.options.map(([key,label])=><label key={key}><input type="radio" name={id} value={key} required={field.required} checked={value===key} onChange={()=>onChange(field.key,key)}/><span>{label}</span></label>)}</div>{value==='REMOTE'&&<small>Sem deslocamento. O preparo continua opcional.</small>}{value==='ONSITE'&&<small>Informe o tempo de ida e volta para a IA reservar esses intervalos.</small>}</fieldset>;
 if(field.list)return <label className="studio-field" htmlFor={id}><CategorySelect id={id} field={field} value={value} onChange={onChange}/></label>;
 if(field.key==='dayOfWeek')return <WeekdayPicker id={id} label={field.label} value={value} onChange={value=>onChange(field.key,value)}/>;
 if(['time','date'].includes(field.type)){const Control=field.type==='time'?TimePicker:DatePicker;return <div className="studio-field"><label className="schedule-label" htmlFor={id}>{field.label}{field.required&&<small> *</small>}</label><Control id={id} value={value} required={field.required} min={field.min} max={field.max} onChange={value=>onChange(field.key,value)}/></div>}
 const props={id,name:field.key,required:field.required, maxLength:field.maxLength,min:field.min,max:field.max,value,onChange:e=>onChange(field.key,e.target.value)};
 return <label className={`studio-field ${field.type==='textarea'?'wide':''} ${field.type==='checkbox'?'check':''}`} htmlFor={id}>
 {field.type==='checkbox'?<><input id={id} type="checkbox" checked={!!value} onChange={e=>onChange(field.key,e.target.checked)}/><span>{field.label}</span></>:<><span>{field.label}{field.required&&<small> *</small>}</span>{field.type==='select'?<select {...props}>{field.options.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>:field.type==='textarea'?<textarea {...props} rows={3}/>:<input {...props} type={field.type}/>}</>}
 </label>;
}
const errorMessage=error=>[requestErrorMessage(error),...requestFieldErrors(error).map(issue=>issue.message)].join(' ');
export function EntityEditor({kind,item,onClose,onSaved,initialDate}) {
 const config=entities[kind];
 const [values,setValues]=useState(()=>({...valuesFor(config.fields,item),...(!item&&initialDate?{date:initialDate}:{})}));
 const [children,setChildren]=useState(()=>Object.fromEntries(Object.entries(config.children).map(([key,section])=>[key,(item?.[key]||[]).map(row=>({...valuesFor(section.fields,row),...(row.id?{id:row.id}:{})}))])));
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [issues,setIssues]=useState([]),[confirmDiscard,setConfirmDiscard]=useState(false);
 const errorRef=useRef(null);
 useEffect(()=>{if(error&&!busy)errorRef.current?.focus()},[error,busy]);
 const dirty=useUnsavedChanges({values,children});
 const options=new Set(['isFlexible','autoSchedule','isActive','travelDuringBreak',...(kind==='rotinas'?['weeklyFrequency','sessionMinutes']:[])]);
 const mainFields=config.fields.filter(field=>!options.has(field.key));
 const optionFields=config.fields.filter(field=>options.has(field.key));
 function requestClose(){if(busy)return;if(dirty)setConfirmDiscard(true);else onClose()}
 function focusField(field){const control=document.getElementById(`${kind}-${field}`);const details=control?.closest('details');if(details)details.open=true;control?.focus();control?.scrollIntoView({block:'nearest'})}
 async function save(e){e.preventDefault();if(busy)return;setBusy(true);setError('');setIssues([]);try{
 const body={...payload(config.fields,values),...Object.fromEntries(Object.entries(config.children).map(([key,section])=>[key,children[key].map(row=>({...payload(section.fields,row),...(row.id?{id:row.id}:{})}))]))};
 const result=item?await api.put(`/planner/${kind}/${item.id}`,body):await api.post(`/planner/${kind}`,body);
 onSaved(result.data);
 }catch(err){setError(requestErrorMessage(err));setIssues(requestFieldErrors(err))}finally{setBusy(false)}}
 if(confirmDiscard)return <Dialog title="Descartar alterações?" subtitle="Você tem alterações que ainda não foram salvas." onClose={()=>setConfirmDiscard(false)}><div className="studio-editor-body"><p>Continue editando para manter o que preencheu ou descarte as alterações para fechar.</p></div><footer><button type="button" className="studio-button secondary" autoFocus onClick={()=>setConfirmDiscard(false)}>Continuar editando</button><button type="button" className="studio-button danger" onClick={onClose}>Descartar alterações</button></footer></Dialog>;
 const renderField=field=><Field key={field.key} field={field} values={values} onChange={(key,value)=>setValues(current=>({...current,[key]:value}))} prefix={kind}/>;
 return <Dialog title={`${item?'Editar':'Novo cadastro de'} ${config.singular}`} subtitle="Comece pelos detalhes principais. Campos com * são obrigatórios." onClose={requestClose} busy={busy}>
 <form onSubmit={save}><fieldset disabled={busy} className="studio-editor-body">
 {error&&<div ref={errorRef} tabIndex={-1} role="alert" className="studio-error editor-error-summary"><strong>Não foi possível salvar</strong><p>{error}</p>{issues.length>0&&<ul>{issues.map((issue,index)=><li key={index}>{config.fields.some(field=>field.key===issue.field)?<button type="button" onClick={()=>focusField(issue.field)}>{config.fields.find(field=>field.key===issue.field).label}: {issue.message}</button>:issue.message}</li>)}</ul>}</div>}
 <div className="studio-form-grid">{mainFields.map(renderField)}</div>
 {optionFields.length>0&&<details className="editor-planning-options" open={values.autoSchedule===true}><summary>Opções de planejamento</summary><p>Personalize a organização pela IA e a disponibilidade deste cadastro.</p><div className="studio-form-grid">{optionFields.map(renderField)}</div></details>}
 {Object.entries(config.children).map(([key,section])=><section className="studio-child-section" key={key}><header><div><h3>{section.title}</h3><p>{values.autoSchedule&&['schedules','sessions'].includes(key)?'Pode deixar vazio: na reavaliação da semana a IA sugere horários livres, que só são salvos após sua aprovação.':key==='schedules'?'Defina o dia e o intervalo de cada atividade.':key==='sessions'?'Reserve datas e horários para avançar nesta meta.':'Cada tarefa aparecerá no Kanban do trabalho.'}</p></div><button type="button" className="studio-button secondary" onClick={e=>{const list=e.currentTarget.closest('.studio-child-section').querySelector('.studio-child-rows');setChildren(current=>({...current,[key]:[...current[key],{...defaultValues(section.fields),...(key==='sessions'&&initialDate?{date:initialDate}:{})}]}));requestAnimationFrame(()=>list.scrollTo({top:list.scrollHeight,behavior:'smooth'}))}}><Plus size={14}/>Adicionar</button></header>
 <div className="studio-child-rows">{!children[key].length&&<p className="studio-inline-empty">Nenhum item adicionado. Use “Adicionar” para incluir {section.singular}.</p>}
 {children[key].map((row,index)=><div className="studio-child-row" key={row.id||`new-${index}`}><div className="studio-form-grid">{section.fields.map(field=><Field key={field.key} field={field} values={row} prefix={`${key}-${index}`} onChange={(field,value)=>setChildren(current=>({...current,[key]:current[key].map((r,i)=>i===index?{...r,[field]:value}:r)}))}/>)}</div><button type="button" className="studio-remove" aria-label={`Remover ${section.singular} ${index+1}`} onClick={()=>setChildren(current=>({...current,[key]:current[key].filter((_,i)=>i!==index)}))}><Trash2 size={15}/>Remover</button></div>)}</div></section>)}
 {['rotinas','trabalho'].includes(kind)&&<p className="personal-note">A IA reserva preparo e deslocamento antes e depois do compromisso. Informe 0 quando não houver esse tempo. Campo vazio significa que o tempo ainda precisa ser confirmado.</p>}{kind==='lembretes'&&<p className="personal-note">Pausado suspende o lembrete; Concluído encerra o cadastro. Para concluir só uma ocorrência, use a agenda do dia.</p>}</fieldset><footer><button type="button" className="studio-button secondary" disabled={busy} onClick={requestClose}>Cancelar</button><button type="submit" className="studio-button" disabled={busy}>{busy?'Salvando...':'Salvar alterações'}</button></footer></form></Dialog>;
}
export function DeleteDialog({kind,item,onClose,onDeleted}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function remove(){setBusy(true);try{await api.delete(`/planner/${kind}/${item.id}`);onDeleted()}catch(err){setError(errorMessage(err));setBusy(false)}}
 return <Dialog title={`Excluir ${entities[kind].singular}?`} subtitle={item.name||item.title} busy={busy} onClose={onClose}><div className="studio-editor-body"><p>Este registro e seus horários, sessões ou tarefas vinculadas serão removidos. Essa ação não pode ser desfeita.</p>{error&&<p role="alert" className="studio-error">{error}</p>}</div><footer><button className="studio-button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="studio-button danger" disabled={busy} onClick={remove}>{busy?'Excluindo...':'Excluir registro'}</button></footer></Dialog>;
}
export default function EntityManager({kind}) {
 const config=entities[kind];const [result,setResult]=useState({key:null,kind:null,items:[],error:''}),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[editor,setEditor]=useState(undefined),[deleting,setDeleting]=useState(null),[revision,setRevision]=useState(0);
 const resourceKey=`${kind}:${revision}`,loading=result.key!==resourceKey,error=loading?'':result.error,items=result.kind===kind?result.items:[];
 useEffect(()=>{const reload=()=>setRevision(r=>r+1);window.addEventListener("lifeai:agenda-updated",reload);return()=>window.removeEventListener("lifeai:agenda-updated",reload)},[]);
 useEffect(()=>{const controller=new AbortController();api.get(`/planner/${kind}`,{signal:controller.signal}).then(r=>{if(!controller.signal.aborted)setResult({key:resourceKey,kind,items:r.data,error:''})}).catch(e=>{if(!controller.signal.aborted)setResult({key:resourceKey,kind,items:[],error:errorMessage(e)})});return()=>controller.abort()},[kind,resourceKey]);
 const normalize=v=>String(v||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 const completed=i=>kind!=='trabalho'&&(i.isCompleted||['COMPLETED','RESOLVED','CANCELLED'].includes(i.status));
 const paused=i=>!completed(i)&&(i.isActive===false||i.status==='PAUSED');
 const visible=items.filter(i=>normalize(`${i.name||i.title} ${i.description||''}`).includes(normalize(search))&&(filter==='all'||(filter==='completed'?completed(i):filter==='paused'?paused(i):!paused(i)&&!completed(i))));
 function refresh(){setEditor(undefined);setDeleting(null);setRevision(r=>r+1)}
 return <section className="studio-manager"><div className="studio-section-heading"><div><h2>{config.title}</h2><p>{config.description}</p></div><button className="studio-button" onClick={()=>setEditor(null)}><Plus size={16}/>Adicionar {config.singular}</button></div>
 <div className="studio-toolbar"><nav aria-label={`Filtrar ${config.title}`}>
 { (kind==='trabalho'?[['all','Todos'],['active','Ativos'],['paused','Inativos']]:[['all','Todos'],['active','Ativos'],['paused','Pausados'],['completed','Concluídos']]).filter(([id])=>!['rotinas','imprevistos'].includes(kind)||!['completed','paused'].includes(id)).map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}<span>{items.filter(i=>id==='all'||(id==='completed'?completed(i):id==='paused'?paused(i):!paused(i)&&!completed(i))).length}</span></button>)}
 </nav><label className="studio-search"><Search size={15}/><input type="search" aria-label={`Buscar ${config.title}`} placeholder="Buscar por nome..." value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
 {error&&<div role="alert" className="studio-error">{error}<button onClick={()=>setRevision(r=>r+1)}>Tentar novamente</button></div>}
 {loading?<p role="status" className="studio-empty">Carregando seus registros...</p>:!visible.length?<div className="studio-empty"><CalendarDays size={30}/><h3>{search||filter!=='all'?'Nenhum resultado para este filtro':'Tudo começa com um novo plano'}</h3><p>{search||filter!=='all'?'Experimente outra busca ou selecione Todos.':`Adicione ${config.singular} para começar.`}</p></div>:<div className="studio-record-grid">{visible.map(item=><article className="studio-record" key={item.id}><div className="studio-record-top"><span className={`studio-badge ${completed(item)?'done':''}`}>{kind==='trabalho'?(item.isActive===false?'Inativo':'Ativo'):completed(item)?'Concluído':paused(item)?'Pausado':item.type||config.singular}</span><div><button aria-label={`Editar ${item.name||item.title}`} onClick={()=>setEditor(item)}><Pencil size={16}/></button><button aria-label={`Excluir ${item.name||item.title}`} onClick={()=>setDeleting(item)}><Trash2 size={16}/></button></div></div><h3>{item.name||item.title}</h3><p>{item.description||item.company||'Organize seus detalhes e acompanhe seu progresso.'}</p><div className="studio-record-meta">{item.reminderTime&&<span>{item.reminderTime} · {item.recurrence==='DAILY'?'Todos os dias':item.recurrence==='WEEKLY'?weekdays[item.dayOfWeek]:String(item.date).slice(0,10)}</span>}{item.targetDate&&<span>Prazo · {new Date(item.targetDate).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</span>}{item.schedules&&<span>{item.schedules.length} horários na semana</span>}{item.sessions&&<span>{item.sessions.length} sessões planejadas</span>}{item.tasks&&<span>{item.tasks.length} tarefas</span>}</div><button className="studio-record-link" onClick={()=>setEditor(item)}>Ver e editar detalhes<ArrowUpRight size={15}/></button></article>)}</div>}
 {editor!==undefined&&<EntityEditor key={editor?.id||'new'} kind={kind} item={editor} onClose={()=>setEditor(undefined)} onSaved={()=>refresh('Registro salvo com sucesso.')}/>}{deleting&&<DeleteDialog kind={kind} item={deleting} onClose={()=>setDeleting(null)} onDeleted={()=>refresh('Registro excluído.')}/>}</section>;
}

