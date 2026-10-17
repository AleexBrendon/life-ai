import { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2, Pencil, Search, ArrowUpRight, CalendarDays } from 'lucide-react';
import api from '../../lib/api';
import { entities, defaultValues, payload, valuesFor, weekdays } from './entityConfig';

export function Dialog({ title, subtitle, onClose, busy, children }) {
 const ref=useRef(null);
 useEffect(()=>{const el=ref.current;const overflow=document.body.style.overflow;el.showModal();document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=overflow}},[]);
 return <dialog ref={ref} className="studio-dialog" aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><header><div><span className="studio-eyebrow">LIFEAI · PLANEJAMENTO</span><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" onClick={onClose} disabled={busy} aria-label="Fechar"><X size={18}/></button></header>{children}</dialog>;
}
function Field({field,values,onChange,prefix}) {
 if(field.when&&!field.when(values))return null;
 const id=`${prefix}-${field.key}`;const value=values[field.key]??'';
 const props={id,name:field.key,required:field.required, maxLength:field.maxLength,min:field.min,max:field.max,value,onChange:e=>onChange(field.key,e.target.value)};
 return <label className={`studio-field ${field.type==='textarea'?'wide':''} ${field.type==='checkbox'?'check':''}`} htmlFor={id}>
 {field.type==='checkbox'?<><input id={id} type="checkbox" checked={!!value} onChange={e=>onChange(field.key,e.target.checked)}/><span>{field.label}</span></>:<><span>{field.label}{field.required&&<small> *</small>}</span>{field.type==='select'?<select {...props}>{field.options.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>:field.type==='textarea'?<textarea {...props} rows={3}/>:<input {...props} type={field.type} list={field.list?`${id}-options`:undefined}/>} {field.list&&<datalist id={`${id}-options`}>{field.list.map(option=><option key={option}>{option}</option>)}</datalist>}</>}
 </label>;
}
const errorMessage=error=>[error.response?.data?.message||'Não foi possível salvar. Tente novamente.',...(Array.isArray(error.response?.data?.errors)?error.response.data.errors:[])].join(' ');
export function EntityEditor({kind,item,onClose,onSaved,initialDate}) {
 const config=entities[kind];
 const [values,setValues]=useState(()=>({...valuesFor(config.fields,item),...(!item&&initialDate?{date:initialDate}:{})}));
 const [children,setChildren]=useState(()=>Object.fromEntries(Object.entries(config.children).map(([key,section])=>[key,(item?.[key]||[]).map(row=>({...valuesFor(section.fields,row),...(row.id?{id:row.id}:{})}))])));
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function save(e){e.preventDefault();setBusy(true);setError('');try{
 const body={...payload(config.fields,values),...Object.fromEntries(Object.entries(config.children).map(([key,section])=>[key,children[key].map(row=>({...payload(section.fields,row),...(row.id?{id:row.id}:{})}))]))};
 const result=item?await api.put(`/planner/${kind}/${item.id}`,body):await api.post(`/planner/${kind}`,body);
 onSaved(result.data);
 }catch(err){setError(errorMessage(err))}finally{setBusy(false)}}
 return <Dialog title={`${item?'Editar':'Novo cadastro de'} ${config.singular}`} subtitle="Preencha os detalhes e mantenha tudo organizado. Campos com * são obrigatórios." onClose={onClose} busy={busy}>
 <form onSubmit={save}><fieldset disabled={busy} className="studio-editor-body"><div className="studio-form-grid">{config.fields.map(field=><Field key={field.key} field={field} values={values} onChange={(key,value)=>setValues(current=>({...current,[key]:value}))} prefix={kind}/>)}</div>
 {Object.entries(config.children).map(([key,section])=><section className="studio-child-section" key={key}><header><div><h3>{section.title}</h3><p>{key==='schedules'?'Defina o dia e o intervalo de cada atividade.':key==='sessions'?'Reserve datas e horários para avançar nesta meta.':'Cada tarefa aparecerá no Kanban do trabalho.'}</p></div><button type="button" className="studio-button secondary" onClick={()=>setChildren(current=>({...current,[key]:[...current[key],{...defaultValues(section.fields),...(key==='sessions'&&initialDate?{date:initialDate}:{})}]}))}><Plus size={14}/>Adicionar</button></header>
 {!children[key].length&&<p className="studio-inline-empty">Nenhum item adicionado. Use “Adicionar” para incluir {section.singular}.</p>}
 {children[key].map((row,index)=><div className="studio-child-row" key={row.id||`new-${index}`}><div className="studio-form-grid">{section.fields.map(field=><Field key={field.key} field={field} values={row} prefix={`${key}-${index}`} onChange={(field,value)=>setChildren(current=>({...current,[key]:current[key].map((r,i)=>i===index?{...r,[field]:value}:r)}))}/>)}</div><button type="button" className="studio-remove" aria-label={`Remover ${section.singular} ${index+1}`} onClick={()=>setChildren(current=>({...current,[key]:current[key].filter((_,i)=>i!==index)}))}><Trash2 size={15}/>Remover</button></div>)}</section>)}
 {error&&<p role="alert" className="studio-error">{error}</p>}</fieldset><footer><button type="button" className="studio-button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className="studio-button" disabled={busy}>{busy?'Salvando...':'Salvar alterações'}</button></footer></form></Dialog>;
}
export function DeleteDialog({kind,item,onClose,onDeleted}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function remove(){setBusy(true);try{await api.delete(`/planner/${kind}/${item.id}`);onDeleted()}catch(err){setError(errorMessage(err));setBusy(false)}}
 return <Dialog title={`Excluir ${entities[kind].singular}?`} subtitle={item.name||item.title} busy={busy} onClose={onClose}><div className="studio-editor-body"><p>Este registro e seus horários, sessões ou tarefas vinculadas serão removidos. Essa ação não pode ser desfeita.</p>{error&&<p role="alert" className="studio-error">{error}</p>}</div><footer><button className="studio-button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="studio-button danger" disabled={busy} onClick={remove}>{busy?'Excluindo...':'Excluir registro'}</button></footer></Dialog>;
}
export default function EntityManager({kind}) {
 const config=entities[kind];const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[editor,setEditor]=useState(undefined),[deleting,setDeleting]=useState(null),[revision,setRevision]=useState(0),[notice,setNotice]=useState('');
 useEffect(()=>{let active=true;setLoading(true);setError('');api.get(`/planner/${kind}`).then(r=>{if(active)setItems(r.data)}).catch(e=>{if(active)setError(errorMessage(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[kind,revision]);
 const normalize=v=>String(v||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 const completed=i=>i.isCompleted||['COMPLETED','RESOLVED','CANCELLED'].includes(i.status);
 const paused=i=>i.isActive===false||i.status==='PAUSED';
 const visible=items.filter(i=>normalize(`${i.name||i.title} ${i.description||''}`).includes(normalize(search))&&(filter==='all'||(filter==='completed'?completed(i):filter==='paused'?paused(i):!paused(i)&&!completed(i))));
 function refresh(message){setEditor(undefined);setDeleting(null);setNotice(message);setRevision(r=>r+1)}
 return <section className="studio-manager"><div className="studio-section-heading"><div><h2>{config.title}</h2><p>{config.description}</p></div><button className="studio-button" onClick={()=>setEditor(null)}><Plus size={16}/>Adicionar {config.singular}</button></div>
 <div className="studio-toolbar"><nav aria-label={`Filtrar ${config.title}`}>
 { [['all','Todos'],['active','Ativos'],['paused','Pausados'],['completed','Concluídos']].filter(([id])=>!['rotinas','imprevistos'].includes(kind)||!['completed','paused'].includes(id)).map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}<span>{items.filter(i=>id==='all'||(id==='completed'?completed(i):id==='paused'?paused(i):!paused(i)&&!completed(i))).length}</span></button>)}
 </nav><label className="studio-search"><Search size={15}/><input type="search" aria-label={`Buscar ${config.title}`} placeholder="Buscar por nome..." value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
 {notice&&<p className="studio-notice" role="status">{notice}</p>}{error&&<div role="alert" className="studio-error">{error}<button onClick={()=>setRevision(r=>r+1)}>Tentar novamente</button></div>}
 {loading?<p role="status" className="studio-empty">Carregando seus registros...</p>:!visible.length?<div className="studio-empty"><CalendarDays size={30}/><h3>{search||filter!=='all'?'Nenhum resultado para este filtro':'Tudo começa com um novo plano'}</h3><p>{search||filter!=='all'?'Experimente outra busca ou selecione Todos.':`Adicione ${config.singular} para começar.`}</p></div>:<div className="studio-record-grid">{visible.map(item=><article className="studio-record" key={item.id}><div className="studio-record-top"><span className={`studio-badge ${completed(item)?'done':''}`}>{completed(item)?'Concluído':paused(item)?'Pausado':item.type||config.singular}</span><div><button aria-label={`Editar ${item.name||item.title}`} onClick={()=>setEditor(item)}><Pencil size={16}/></button><button aria-label={`Excluir ${item.name||item.title}`} onClick={()=>setDeleting(item)}><Trash2 size={16}/></button></div></div><h3>{item.name||item.title}</h3><p>{item.description||item.company||'Organize seus detalhes e acompanhe seu progresso.'}</p><div className="studio-record-meta">{item.reminderTime&&<span>{item.reminderTime} · {item.recurrence==='DAILY'?'Todos os dias':item.recurrence==='WEEKLY'?weekdays[item.dayOfWeek]:String(item.date).slice(0,10)}</span>}{item.targetDate&&<span>Prazo · {new Date(item.targetDate).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</span>}{item.schedules&&<span>{item.schedules.length} horários na semana</span>}{item.sessions&&<span>{item.sessions.length} sessões planejadas</span>}{item.tasks&&<span>{item.tasks.length} tarefas</span>}</div><button className="studio-record-link" onClick={()=>setEditor(item)}>Ver e editar detalhes<ArrowUpRight size={15}/></button></article>)}</div>}
 {editor!==undefined&&<EntityEditor key={editor?.id||'new'} kind={kind} item={editor} onClose={()=>setEditor(undefined)} onSaved={()=>refresh('Registro salvo com sucesso.')}/>}{deleting&&<DeleteDialog kind={kind} item={deleting} onClose={()=>setDeleting(null)} onDeleted={()=>refresh('Registro excluído.')}/>}</section>;
}
