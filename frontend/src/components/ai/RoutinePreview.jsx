import { useState } from 'react';
import { CalendarDays, Clock3, ArrowRight } from 'lucide-react';
import { Dialog } from '../planner/EntityManager';
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const minute = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const stateLabel = { new: 'Novo', moved: 'Horário alterado', same: 'Mantido', fixed: 'Fixo' };

// Everything that will be on the week once this option is approved, plus the old position of what moves.
export function previewBlocks(plan, option) {
 const changes = new Map(option.changes.map(change => [change.key, change]));
 const state = (key, slot) => { const change = changes.get(key); if (!change) return 'same'; if (!change.old) return 'new'; return change.old.dayOfWeek !== slot.dayOfWeek || change.old.startTime !== slot.startTime ? 'moved' : 'same'; };
 const blocks = [
  ...(plan.fixed || []).map(row => ({ ...row, kind: ['rotinas','metas','trabalho','lembretes','imprevistos'].includes(row.kind) ? row.kind : 'fixo', state: 'fixed' })),
  ...option.template.routines.map(row => ({ ...row, kind: 'rotinas', state: state(row.key, row) })),
  ...option.template.goals.map(row => ({ ...row, kind: 'metas', state: state(row.key, row) })),
 ];
 const clock=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
 const travel=blocks.flatMap(row=>[
  ...(row.beforeMinutes?[{...row,key:row.key+':before',title:'Preparo e ida · '+row.title,kind:'fixo',state:'fixed',startTime:clock(Math.max(0,minute(row.startTime)-row.beforeMinutes)),endTime:row.startTime}]:[]),
  ...(row.afterMinutes?[{...row,key:row.key+':after',title:'Volta · '+row.title,kind:'fixo',state:'fixed',startTime:row.endTime,endTime:clock(minute(row.endTime)+row.afterMinutes)}]:[])
 ]);
 blocks.push(...travel);
 const ghosts = option.changes.filter(change => change.old && blocks.some(block => block.key === change.key && block.state === 'moved')).map(change => ({ key: `old:${change.key}`, title: change.title, kind: change.kind, ...change.old, state: 'old' }));
 return { blocks, ghosts };
}

const fullDate = date => new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
const kindLabel = {rotinas:'Rotina',metas:'Meta',trabalho:'Trabalho',fixo:'Preparo e deslocamento',lembretes:'Lembrete',imprevistos:'Imprevisto'};
function DayDetails({title,rows,onClose}) {
 return <Dialog title={title} subtitle={rows.length+' atividades previstas nesta sugestão'} onClose={onClose} className="routine-day-dialog">
  <div className="studio-editor-body"><div className="routine-detail-list">{rows.map((row,i)=><article key={row.key+':'+i} className={'routine-detail-card '+row.kind}>
   <div className="routine-detail-time"><Clock3 size={14}/><time>{row.startTime} – {row.endTime}</time><span>{Math.max(0,minute(row.endTime)-minute(row.startTime))} min</span></div>
   <h3>{row.title}</h3><div className="routine-card-meta"><span className="routine-type-badge">{kindLabel[row.kind]||'Atividade'}</span><span>{stateLabel[row.state]}</span></div>
   {row.description&&<p>{row.description}</p>}
  </article>)}{!rows.length&&<div className="routine-day-empty"><CalendarDays size={28}/><p>Nenhuma atividade prevista para este dia.</p></div>}</div></div>
  <footer><button type="button" className="studio-button secondary" onClick={onClose}>Voltar ao calendário</button></footer>
 </Dialog>;
}
function placeEvents(rows) {
 const sorted=[...rows].sort((a,b)=>minute(a.startTime)-minute(b.startTime));
 const groups=[];
 for(const row of sorted){const last=groups.at(-1);if(!last||minute(row.startTime)>=last.end)groups.push({end:minute(row.endTime),rows:[row]});else{last.rows.push(row);last.end=Math.max(last.end,minute(row.endTime))}}
 return groups.flatMap(group=>{const lanes=[];const placed=group.rows.map(row=>{let lane=lanes.findIndex(end=>end<=minute(row.startTime));if(lane<0)lane=lanes.length;lanes[lane]=minute(row.endTime);return {...row,lane}});return placed.map(row=>({...row,lanes:lanes.length}))});
}
export function WeekPreview({ blocks, ghosts = [] }) {
 const [selected,setSelected]=useState(null);
 const top=Math.floor(Math.min(360,...blocks.map(row=>minute(row.startTime)))/60)*60;
 const bottom=Math.ceil(Math.max(1380,...blocks.map(row=>minute(row.endTime)))/60)*60;
 const scale=2;
 const hours=Array.from({length:(bottom-top)/60+1},(_,i)=>top+i*60);
 const rowsFor=day=>blocks.filter(row=>row.dayOfWeek===day).sort((a,b)=>a.startTime.localeCompare(b.startTime));
 return <><p className="routine-calendar-hint"><Clock3 size={14}/> Horários da semana · clique em uma atividade para ver os detalhes</p>
 <div className="routine-timeline-scroll" tabIndex={0} aria-label="Calendário semanal, role para consultar horários e dias"><div className="routine-timeline">
  <div className="routine-timeline-head"><span>Horário</span>{WEEK.map(day=><button type="button" key={day} onClick={()=>setSelected(day)}><strong>{DAY_NAMES[day]}</strong><small>{rowsFor(day).length} atividades</small></button>)}</div>
  <div className="routine-timeline-body" style={{height:(bottom-top)*scale}}><div className="routine-timeline-axis">{hours.map(hour=><span key={hour} style={{top:(hour-top)*scale}}>{String(hour/60).padStart(2,'0')}:00</span>)}</div>
   {WEEK.map(day=><div className="routine-timeline-day" key={day}>{hours.map(hour=><i key={hour} style={{top:(hour-top)*scale}}/>)}
    {placeEvents(rowsFor(day)).map((row,i)=><button type="button" key={row.key+':'+i} className={'routine-timeline-event '+row.kind+' '+row.state} style={{top:(minute(row.startTime)-top)*scale+2,height:Math.max(24,(minute(row.endTime)-minute(row.startTime))*scale-4),left:'calc('+row.lane/row.lanes*100+'% + 3px)',width:'calc('+100/row.lanes+'% - 6px)'}} onClick={()=>setSelected({row})} title={row.startTime+' – '+row.endTime+' · '+row.title}>
     <time>{row.startTime} – {row.endTime}</time><strong>{row.title}</strong>{minute(row.endTime)-minute(row.startTime)>=45&&<small>{kindLabel[row.kind]} · {stateLabel[row.state]}</small>}
    </button>)}
   </div>)}
  </div>
 </div></div>
 {ghosts.length>0&&<details className="routine-board-previous"><summary>Consultar horários anteriores ({ghosts.length})</summary>{ghosts.map((row,i)=><p key={i}>{DAY_NAMES[row.dayOfWeek]} · {row.startTime} – {row.endTime} · {row.title}</p>)}</details>}
 {selected!==null&&<DayDetails title={typeof selected==='number'?DAY_NAMES[selected]+' · programação':selected.row.title} rows={typeof selected==='number'?rowsFor(selected):[selected.row]} onClose={()=>setSelected(null)}/>}
 </>;
}
function MonthPreview({ blocks, period }) {
 const [selected,setSelected]=useState(null);
 const dates=[];
 for(let date=period.start;date<=period.end;){dates.push(date);const next=new Date(date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);date=next.toISOString().slice(0,10)}
 const months=[...new Set(dates.map(date=>date.slice(0,7)))];
 const rowsFor=date=>blocks.filter(row=>row.dayOfWeek===new Date(date+'T12:00:00Z').getUTCDay()&&(!row.date||row.date===date)&&(!row.until||date<=row.until)).sort((a,b)=>a.startTime.localeCompare(b.startTime));
 return <><p className="routine-calendar-hint"><CalendarDays size={14}/> Selecione um dia para abrir a programação completa</p>
 <div className="routine-month-calendars">{months.map(month=>{const first=month+'-01';const count=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();const offset=(new Date(first+'T12:00:00Z').getUTCDay()+6)%7;
 const startDay=month===period.start.slice(0,7)?Math.max(1,Math.floor((Number(period.start.slice(-2))-1+offset)/7)*7-offset+1):1;
 const endDay=month===period.end.slice(0,7)?Math.min(count,Math.ceil((Number(period.end.slice(-2))+offset)/7)*7-offset):count;
 return <section className="routine-month-section" key={month}><h3>{new Date(first+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'})}</h3><div className="routine-month-calendar-scroll"><div className="routine-month-calendar">
 {WEEK.map(day=><strong key={day} className="routine-month-name">{DAY_NAMES[day]}</strong>)}{Array.from({length:startDay===1?offset:0},(_,i)=><span className="routine-month-blank" key={'gap'+i}/>)}
 {Array.from({length:endDay-startDay+1},(_,index)=>{const i=index+startDay-1;const date=month+'-'+String(i+1).padStart(2,'0'),active=date>=period.start&&date<=period.end,rows=active?rowsFor(date):[];return <button type="button" key={date} className="routine-calendar-cell" disabled={!active} onClick={()=>setSelected(date)} aria-label={fullDate(date)+', '+rows.length+' atividades'}>
 <span className="routine-cell-number">{i+1}{active&&rows.length>0&&<small>{rows.length}</small>}</span>
 {rows.slice(0,3).map((row,index)=><span key={index} className={'routine-cell-event '+row.kind}><time>{row.startTime}</time><span>{row.title}</span></span>)}
 {rows.length>3&&<span className="routine-cell-more">+{rows.length-3} atividades <ArrowRight size={11}/></span>}
 {active&&!rows.length&&<span className="routine-cell-free">Livre</span>}
 </button>})}</div></div></section>})}</div>
 {selected&&<DayDetails title={fullDate(selected)} rows={rowsFor(selected)} onClose={()=>setSelected(null)}/>}</>;
}

export function RoutineLegend() {
 return <ul className="routine-legend"><li><i className="trabalho" />Trabalho</li><li><i className="lembretes" />Lembretes</li><li><i className="imprevistos" />Imprevistos</li><li><i className="fixo" />Preparo e deslocamento</li><li><i className="rotinas" />Rotinas</li><li><i className="metas" />Metas</li><li><i className="new" />Novo ou com horário alterado</li><li><i className="old" />Posição anterior</li></ul>;
}

export default function RoutinePreview({ plan, option }) {
 const [tab, setTab] = useState('week');
 const { blocks, ghosts } = previewBlocks(plan, option);
 const changed = blocks.filter(row => row.state === 'new' || row.state === 'moved').length;
 return <div className="routine-preview">
  <div className="routine-preview-summary"><span className="studio-badge">Pontuação {option.metrics.score}</span><span>{changed} item(ns) novo(s) ou com horário alterado · ciclo de {new Date(`${plan.period.start}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a {new Date(`${plan.period.end}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span></div>
  <nav className="studio-view-toggle routine-preview-tabs" aria-label="Visualização"><button type="button" aria-pressed={tab === 'week'} onClick={() => setTab('week')}>Semana</button><button type="button" aria-pressed={tab === 'month'} onClick={() => setTab('month')}>Mês do ciclo</button></nav>
  {!plan.fixed && <p className="ai-help">Esta sugestão foi gerada antes da visualização completa; trabalho e compromissos fixos não aparecem. Gere novamente para vê-los.</p>}
  <RoutineLegend />
  {tab === 'week' ? <WeekPreview blocks={blocks} ghosts={ghosts} /> : <MonthPreview blocks={blocks} period={plan.period} />}
  {option.metrics.issues.length > 0 && <details className="monthly-issues"><summary>Pontos de atenção ({option.metrics.issues.length})</summary><ul>{option.metrics.issues.map(text => <li key={text}>{text}</li>)}</ul></details>}
 </div>;
}
