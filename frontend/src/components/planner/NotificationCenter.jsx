import { useEffect, useState } from 'react';
import { Bell, ArrowUpRight, Pencil, Clock3, Droplets, CheckCheck, Settings2, Wallet, CalendarDays } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { EntityEditor } from './EntityManager';
import { useUserPreferences } from '../../lib/UserPreferences';
import { localDateKey } from './calendarUtils';
import { notificationCategory, groupNotifications, notificationTime } from './notificationPresentation';

const kinds = { REMINDER:'lembretes', UNEXPECTED_EVENT:'imprevistos', ROUTINE:'rotinas', WORK:'trabalho', GOAL_SESSION:'metas' };
export default function NotificationCenter() {
 const navigate=useNavigate(),{user}=useUserPreferences();
 const [items,setItems]=useState([]),[filter,setFilter]=useState('all'),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[editor,setEditor]=useState(null);
 useEffect(()=>{const refresh=()=>setRevision(value=>value+1);const timer=setInterval(refresh,30000);window.addEventListener('lifeai:notifications-updated',refresh);return()=>{clearInterval(timer);window.removeEventListener('lifeai:notifications-updated',refresh)}},[]);
 useEffect(()=>{const controller=new AbortController();api.get('/notifications',{signal:controller.signal}).then(response=>{if(!controller.signal.aborted){setItems(response.data);setError('')}}).catch(()=>{if(!controller.signal.aborted)setError('Não foi possível carregar as notificações.')}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[revision]);
 const kindOf=item=>kinds[item.entityType]||item.entityType;
 function target(item) {
  const kind=kindOf(item);
  if(item.type==='HYDRATION')return '/planejamento?aba=agua';
  if(item.type==='ROUTINE_CHECKIN')return '/dashboard?painel=ia&assistente=rotina';
  if(kind==='financas')return '/financeiro';
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
 const visible=items.filter(item=>filter==='all'||(filter==='unread'?!item.isRead:notificationCategory(item)===filter));
 const timezone=user?.profile?.timezone||'America/Sao_Paulo';
 const groups=groupNotifications(visible,new Date(),timezone);
 const unread=items.filter(item=>!item.isRead).length;
 return <section className="notification-center"><div className="notification-summary"><span className="notification-summary-icon"><Bell size={22}/></span><div><h2>Seu centro de atenção</h2><p>{unread ? `${unread} ${unread===1?'atualização não lida':'atualizações não lidas'}` : 'Tudo acompanhado por aqui.'}</p></div><Link to="/evolucao?aba=push" aria-label="Preferências de notificações" className="notification-preferences"><Settings2 size={19}/></Link></div><div className="notification-toolbar"><nav className="studio-view-toggle" aria-label="Filtrar notificações">{[['all','Todas'],['unread','Não lidas'],['agenda','Agenda'],['finance','Financeiro'],['system','Sistema']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</nav>
 <button className="notification-read-all" disabled={busy||!unread} onClick={readAll}><CheckCheck size={16}/>Marcar todas como lidas</button></div>
 {loading&&<div className="notification-skeleton" role="status" aria-label="Carregando notificações"><i/><i/><i/></div>}{error&&<p className="studio-error" role="alert">{error}<button onClick={()=>setRevision(value=>value+1)}>Tentar novamente</button></p>}{!loading&&!error&&!visible.length&&<div className="studio-empty"><CheckCheck size={30}/><h3>{filter==='all'||filter==='unread'?'Você está em dia.':'Nenhuma atualização nesta categoria.'}</h3><p>Os próximos avisos aparecem aqui.</p></div>}
 {groups.map(([label,rows])=><section className="notification-group" key={label} aria-label={label}><h3>{label}<span>{rows.length}</span></h3>{rows.map(item=>{const category=notificationCategory(item);const Icon=item.type==='HYDRATION'?Droplets:item.type==='UPCOMING'?Clock3:category==='finance'?Wallet:category==='agenda'?CalendarDays:Bell;return <article className={`notification-row ${item.isRead?'is-read':'is-unread'}`} key={item.id}><span className={`notification-row-icon ${category}`}><Icon size={18}/></span><div className="notification-row-body"><div className="notification-row-meta"><span>{item.type==='UPCOMING'?'Em breve':category==='agenda'?'Agenda':category==='finance'?'Financeiro':'Sistema'}</span><time dateTime={item.createdAt}>{notificationTime(item.createdAt,timezone)}</time>{!item.isRead&&<span className="notification-unread-dot" aria-label="Não lida"/>}</div><h4>{item.title}</h4><p>{item.message}</p><div className="notification-item-actions">{item.type==='HYDRATION'?<button type="button" className="notification-action" disabled={busy||!!item.hydrationConfirmedAt} onClick={()=>drink(item)}><Droplets size={15}/>{item.hydrationConfirmedAt?'Registrado · 250 ml':'Já bebi 250 ml'}</button>:<><button type="button" className="notification-action" disabled={busy} onClick={()=>view(item)}>Ver atividade<ArrowUpRight size={14}/></button>{['lembretes','imprevistos'].includes(kindOf(item))&&item.entityId&&!item.title.includes('Registro excluído')&&<button type="button" className="notification-action muted" disabled={busy} onClick={()=>edit(item)}><Pencil size={14}/>Editar</button>}</>}</div></div></article>})}</section>)}
 {editor&&<EntityEditor {...editor} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);window.dispatchEvent(new Event('lifeai:agenda-updated'));window.dispatchEvent(new Event('lifeai:notifications-updated'))}}/>}
 </section>;
}
