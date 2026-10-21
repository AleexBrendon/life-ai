import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, Check, SkipForward, RotateCcw, Pencil } from 'lucide-react';
import api from '../../lib/api';
import { Dialog } from './EntityManager';
import { entities } from './entityConfig';

const labels={PENDING:'Pendente',COMPLETED:'Concluída',SKIPPED:'Pulada neste dia',MISSED:'Não realizada'};
export default function AgendaEventCard({event,date,onClose,onUpdated,onEdit}){
 const [status,setStatus]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[skip,setSkip]=useState(false),[reason,setReason]=useState('');
 useEffect(()=>{let active=true;api.get('/activity-status',{params:{date}}).then(response=>{if(!active)return;const occurrence=response.data.find(row=>row.kind===event.kind&&row.sourceId===event.sourceId);if(!occurrence)throw new Error('Esta atividade não está mais disponível nesta data.');setStatus(occurrence.status)}).catch(e=>{if(active)setError(e.response?.data?.message||e.message||'Não foi possível carregar a atividade.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[date,event.kind,event.sourceId]);
 async function update(next){
  if(busy||loading||!status)return;
  setBusy(true);setError('');
  try{await api.put('/activity-status',{kind:event.kind,sourceId:event.sourceId,date,status:next,...(next==='SKIPPED'?{skipReason:reason}:{})});setStatus(next);setSkip(false);setReason('');onUpdated()}
  catch(e){setError(e.response?.data?.message||'Não foi possível atualizar a atividade.')}
  finally{setBusy(false)}
 }
 async function edit(){
  setBusy(true);setError('');
  try{const response=await api.get(`/planner/${event.kind}`);const record=response.data.find(row=>row.id===event.parent.id);if(!record)throw new Error('Este cadastro não está mais disponível.');onEdit(record)}
  catch(e){setError(e.response?.data?.message||e.message||'Não foi possível carregar o cadastro.')}
  finally{setBusy(false)}
 }
 return <Dialog className="agenda-preview-dialog" title={event.title} subtitle={entities[event.kind].singular} busy={busy} onClose={onClose}><div className={`studio-editor-body agenda-event-preview ${event.kind}`}>
 <div className="agenda-preview-facts"><span><CalendarDays size={16}/>{new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'})}</span><span><Clock3 size={16}/>{event.time}{event.end&&` – ${event.end}`}</span></div>
 {loading?<p role="status">Carregando status…</p>:status&&<span className={`agenda-preview-status ${status.toLowerCase()}`}>{labels[status]||'Pendente'}</span>}
 {event.parent.description&&<p className="agenda-preview-description">{event.parent.description}</p>}
 <dl className="agenda-preview-details">{[['Categoria',event.parent.type],['Empresa',event.parent.company],['Cargo',event.parent.position],['Local',event.parent.location]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
 <p className="agenda-preview-hint">As ações abaixo valem apenas para este dia.</p>
 {skip&&<form id="agenda-preview-skip" onSubmit={e=>{e.preventDefault();update('SKIPPED')}}><label className="studio-field"><span>Motivo para pular (opcional)</span><textarea autoFocus maxLength={500} rows={3} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)} placeholder="Ex.: preciso reorganizar meu dia"/></label></form>}
 {error&&<p className="studio-error" role="alert">{error}</p>}
 <div className="agenda-preview-actions">{skip?<><button type="submit" form="agenda-preview-skip" className="studio-button" disabled={busy}><SkipForward size={15}/>Confirmar skip neste dia</button><button type="button" className="studio-button secondary" disabled={busy} onClick={()=>setSkip(false)}>Cancelar</button></>:<>
 {status!=='COMPLETED'&&<button type="button" className="studio-button" disabled={busy||loading||!status} onClick={()=>update('COMPLETED')}><Check size={16}/>{busy?'Salvando…':'Concluir'}</button>}
 {status!=='SKIPPED'&&<button type="button" className="studio-button secondary" disabled={busy||loading||!status} onClick={()=>setSkip(true)}><SkipForward size={15}/>Pular neste dia</button>}
 {status!=='PENDING'&&<button type="button" className="studio-button secondary" disabled={busy||loading||!status} onClick={()=>update('PENDING')}><RotateCcw size={15}/>Voltar a pendente</button>}
 </>}</div></div><footer><button type="button" className="studio-button secondary" disabled={busy} onClick={edit}><Pencil size={14}/>Editar cadastro</button><button type="button" className="studio-button secondary" disabled={busy} onClick={onClose}>Fechar</button></footer></Dialog>;
}
