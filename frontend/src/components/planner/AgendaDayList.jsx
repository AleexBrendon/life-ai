import { ChevronRight, CalendarDays } from 'lucide-react';
import { Dialog } from './EntityManager';
import { entities } from './entityConfig';

export default function AgendaDayList({date,events,onClose,onOpen}) {
 const label=new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
 return <Dialog className="agenda-day-list-dialog" title="Atividades do dia" subtitle={label} onClose={onClose}>
 <div className="agenda-day-list-intro"><span><CalendarDays size={15}/>{events.length} {events.length===1?'atividade':'atividades'}</span><p>Selecione um compromisso para ver os detalhes e as ações.</p></div>
 <ul className="agenda-day-list" aria-label={`Compromissos de ${label}`}>
 {events.map(event=><li key={event.key}><button type="button" className={`agenda-day-list-item ${event.kind}`} onClick={()=>onOpen(event)}><time>{event.time}{event.end&&<small>até {event.end}</small>}</time><span className="agenda-day-list-info"><strong>{event.title}</strong><span><i/>{entities[event.kind]?.singular||'Financeiro'}</span></span><ChevronRight size={17}/></button></li>)}
 {!events.length&&<li className="studio-inline-empty">Nenhuma atividade nesta data.</li>}
 </ul><footer><button type="button" className="studio-button secondary" onClick={onClose}>Fechar</button></footer></Dialog>;
}
