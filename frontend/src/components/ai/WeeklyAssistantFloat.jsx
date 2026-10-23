import { useEffect,useState } from 'react';
import { Sparkles,X,Minus } from 'lucide-react';
import WeeklyPlanner from './WeeklyPlanner';
import { useUserPreferences } from '../../lib/UserPreferences';
import { localDateKey } from '../planner/calendarUtils';
export default function WeeklyAssistantFloat(){
 const {user}=useUserPreferences(),[event,setEvent]=useState(null),[collapsed,setCollapsed]=useState(false);
 useEffect(()=>{const receive=e=>{const record=e.detail;if(!record?.id||!record.date||['RESOLVED','CANCELLED'].includes(record.status))return;const date=record.date.slice(0,10);if(date<localDateKey(new Date(),user?.profile?.timezone||'America/Sao_Paulo'))return;setEvent({...record,date});setCollapsed(false)};window.addEventListener('lifeai:unexpected-saved',receive);return()=>window.removeEventListener('lifeai:unexpected-saved',receive)},[user?.id,user?.profile?.timezone]);
 if(!event)return null;
 if(collapsed)return <button className="weekly-assistant-bubble" onClick={()=>setCollapsed(false)}><Sparkles size={17}/>Sugestões para esta semana</button>;
 return <aside className="weekly-assistant-float" aria-label="Sugestões após imprevisto"><header><span><Sparkles size={18}/>Vamos reorganizar?</span><div><button aria-label="Minimizar sugestões" onClick={()=>setCollapsed(true)}><Minus size={17}/></button><button aria-label="Fechar sugestões" onClick={()=>setEvent(null)}><X size={17}/></button></div></header><div className="weekly-assistant-content"><p className="ai-help">Imprevisto adicionado: <strong>{event.title}</strong>. Vou considerar os compromissos de domingo a sábado.</p><WeeklyPlanner key={`${event.id}-${event.date}-${event.startTime}-${event.endTime}`} initialDate={event.date} unexpectedEventId={event.id} auto onDone={()=>setEvent(null)}/></div></aside>;
}
