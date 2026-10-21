import { useEffect, useState } from 'react';
import { Bell, ArrowUpRight, Pencil, Clock3, Droplets } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { EntityEditor } from './EntityManager';
import { useUserPreferences } from '../../lib/UserPreferences';
import { localDateKey } from './calendarUtils';

const kinds = { REMINDER:'lembretes', UNEXPECTED_EVENT:'imprevistos', ROUTINE:'rotinas', WORK:'trabalho', GOAL_SESSION:'metas' };
export default function NotificationCenter() {
 const navigate=useNavigate(),{user}=useUserPreferences();
 const [items,setItems]=useState([]),[filter,setFilter]=useState('all'),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[editor,setEditor]=useState(null);
 useEffect(()=>{const refresh=()=>setRevision(value=>value+1);const timer=setInterval(refresh,30000);window.addEventListener('lifeai:notifications-updated',refresh);return()=>{clearInterval(timer);window.removeEventListener('lifeai:notifications-updated',refresh)}},[]);
 useEffect(()=>{let active=true;api.get('/notifications').then(response=>{if(active){setItems(response.data);setError('')}}).catch(()=>{if(active)setError('Não foi possível carregar as notificações.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[revision]);
 const kindOf=item=>kinds[item.entityType]||item.entityType;
 function target(item) {
  const kind=kindOf(item);
  if(item.type==='HYDRATION')return '/planejamento?aba=agua';
  if(item.type==='UPCOMING'&&item.scheduledAt){const date=localDateKey(new Date(item.scheduledAt),user?.profile?.timezone||'America/Sao_Paulo');return `/agenda?data=${date}&tipo=${kind}&item=${item.entityId}`;}
  if(['perfil','ia'].includes(kind))return `/dashboard?painel=${kind}`;
  if(['rotinas','trabalho','metas','lembretes','imprevistos','agua','financas'].includes(kind))return `/planejamento?aba=${kind}`;
  return '/agenda';
 }
 async function view(item) {
  setBusy(true);setError('');
  try { if(!item.isRead)await api.patch(`/notifications/${item.id}/read`);window.dispatchEvent(new Event('lifeai:notifications-updated'));navigate(target(item)); }
  catch{setError('Não foi possível abrir a notificação. Tente novamente.')}
  finally{setBusy(false)}
 }
 async function edit(item) {
  setBusy(true);setError('');
  try{const kind=kindOf(item),response=await api.get(`/planner/${kind}`);const record=response.data.find(row=>row.id===item.entityId);if(!record)throw new Error();setEditor({kind,item:record})}
  catch{setError('Este cadastro não está mais disponível. Abra a área correspondente para conferir.')}
  finally{setBusy(false)}
 }
 async function drink(item){
  if(busy||item.hydrationConfirmedAt)return;
  setBusy(true);setError('');
  try{await api.post(`/notifications/${item.id}/drink`);setItems(current=>current.map(row=>row.id===item.id?{...row,isRead:true,hydrationConfirmedAt:new Date().toISOString()}:row));window.dispatchEvent(new Event('lifeai:water-updated'));window.dispatchEvent(new Event('lifeai:notifications-updated'));}
  catch(e){setError(e.response?.data?.message||'Não foi possível registrar a água. Tente novamente.')}
  finally{setBusy(false)}
 }
 async function readAll(){setBusy(true);try{await api.patch('/notifications/read-all');window.dispatchEvent(new Event('lifeai:notifications-updated'))}catch{setError('Não foi possível marcar os avisos como lidos.')}finally{setBusy(false)}}
 const visible=items.filter(item=>filter==='all'||!item.isRead);
 return <section><div className="studio-section-heading"><div><h2>Suas atualizações</h2><p>Abra a atividade para acompanhar ou concluir na agenda.</p></div></div><div className="notification-toolbar"><nav className="studio-view-toggle" aria-label="Filtrar notificações"><button aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Todas</button><button aria-pressed={filter==='unread'} onClick={()=>setFilter('unread')}>Não lidas</button></nav>
 <button className="studio-button secondary" disabled={busy||!items.some(item=>!item.isRead)} onClick={readAll}>Marcar todas como lidas</button></div>
 {loading&&<p role="status">Carregando...</p>}{error&&<p className="studio-error" role="alert">{error}</p>}{!loading&&!visible.length&&<div className="studio-empty"><Bell size={28}/><h3>Você está em dia.</h3></div>}
 {visible.map(item=><article className="studio-record studio-notification" key={item.id}><span className="studio-badge">{item.type==='UPCOMING'?<><Clock3 size={12}/>Em breve</>:item.isRead?'Lida':'Nova'}</span><h3>{item.title}</h3><p>{item.message}</p><div className="notification-item-actions">{item.type==='HYDRATION'?<button type="button" className="studio-button" disabled={busy||!!item.hydrationConfirmedAt} onClick={()=>drink(item)}><Droplets size={15}/>{item.hydrationConfirmedAt?'Registrado · 250 ml':'Já bebi 250 ml'}</button>:<><button type="button" className="studio-button secondary" disabled={busy} onClick={()=>view(item)}>Ver atividade<ArrowUpRight size={14}/></button>{['lembretes','imprevistos'].includes(kindOf(item))&&item.entityId&&!item.title.includes('Registro excluído')&&<button type="button" className="studio-button secondary" disabled={busy} onClick={()=>edit(item)}><Pencil size={14}/>Editar {kindOf(item)==='lembretes'?'lembrete':'imprevisto'}</button>}</>}</div></article>)}
 {editor&&<EntityEditor {...editor} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);window.dispatchEvent(new Event('lifeai:agenda-updated'));window.dispatchEvent(new Event('lifeai:notifications-updated'))}}/>}
 </section>;
}
