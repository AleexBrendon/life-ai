import {useState} from 'react';
import {CalendarRange,X,Check} from 'lucide-react';
import {CalendarPicker,usePickerPopover} from './PickerPopover';
import {countDays,rangeError,shiftDate} from './dateRange';
import {localDateKey} from './calendarUtils';
import {useUserPreferences} from '../../lib/UserPreferences';
const label=value=>value?new Date(`${value}T12:00:00Z`).toLocaleDateString('pt-BR',{timeZone:'UTC'}):'Selecionar';
export default function DateRangeFilter({value,onChange}){
 const {user}=useUserPreferences(),today=localDateKey(new Date(),user?.profile?.timezone||'America/Sao_Paulo'),picker=usePickerPopover();
 const [start,setStart]=useState(''),[end,setEnd]=useState(''),[phase,setPhase]=useState('start');
 function open(){setStart(value.startDate||shiftDate(today,1-(value.days||7)));setEnd(value.endDate||today);setPhase('start');picker.show()}
 const error=rangeError(start,end,today),text=value.startDate?`${label(value.startDate)} — ${label(value.endDate)}`:value.days===1?'Hoje':`Últimos ${value.days||7} dias`;
 function select(date){if(phase==='start'){setStart(date);setEnd('');setPhase('end')}else setEnd(date)}
 return <div className="range-filter"><button ref={picker.anchor} type="button" className="picker-trigger" aria-label="Escolher período do histórico" aria-expanded={picker.open} aria-haspopup="dialog" onClick={open}><CalendarRange size={17}/><span>{text}</span></button><div ref={picker.panel} popover="auto" className="picker-panel range-panel" role="dialog" aria-label="Filtrar por período" onToggle={picker.onToggle}><header><strong>Período do histórico</strong><button type="button" aria-label="Fechar filtro" onClick={picker.close}><X size={16}/></button></header><p>Escolha um atalho ou marque as datas no calendário.</p><div className="range-presets">{[1,7,15,30,90,365].map(days=><button type="button" key={days} aria-pressed={!value.startDate&&value.days===days} onClick={()=>{onChange({days});picker.close()}}>{days===1?'Hoje':days===365?'1 ano':`${days} dias`}</button>)}</div><div className="range-dates"><button type="button" aria-pressed={phase==='start'} onClick={()=>setPhase('start')}><small>De</small>{label(start)}</button><button type="button" aria-pressed={phase==='end'} onClick={()=>setPhase('end')}><small>Até</small>{label(end)}</button></div>{picker.open&&<CalendarPicker key={`${phase}:${start}`} value={phase==='start'?start:end||start} min={phase==='end'?start:undefined} max={phase==='end'&&start?[today,shiftDate(start,364)].sort()[0]:today} rangeStart={start} rangeEnd={end} onSelect={select}/>}<footer><small>{error||`${countDays(start,end)} dia(s) selecionado(s)`}</small><button type="button" className="picker-apply" disabled={!!error} onClick={()=>{onChange({startDate:start,endDate:end});picker.close()}}><Check size={14}/>Aplicar</button></footer></div></div>;
}
