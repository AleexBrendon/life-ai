import { useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react';
import { weekdays } from './entityConfig';

const pad = value => String(value).padStart(2, '0');
const iso = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const days = [1, 2, 3, 4, 5, 6, 0];

export function WeekdayPicker({ id, value, onChange, label }) {
 return <div className="studio-field wide"><span id={`${id}-label`}>{label}</span><div className="schedule-weekdays" role="radiogroup" aria-labelledby={`${id}-label`}>
 {days.map(day => <label key={day} title={weekdays[day]}><input type="radio" name={id} value={day} checked={String(value) === String(day)} onChange={() => onChange(day)}/><span>{weekdays[day].slice(0, 3)}</span></label>)}
 </div></div>;
}

export function TimePicker({ id, value, onChange, required }) {
 const [hour = '', minute = '00'] = String(value || '').split(':');
 return <div className="schedule-time"><Clock3 size={17} aria-hidden="true"/>
 <select id={id} aria-label="Hora" required={required} value={hour} onChange={e => onChange(e.target.value ? `${e.target.value}:${minute}` : '')}>
 <option value="">Hora</option>{Array.from({ length: 24 }, (_, i) => <option key={i} value={pad(i)}>{pad(i)}</option>)}
 </select><span aria-hidden="true">:</span>
 <select aria-label="Minutos" disabled={!hour} value={hour ? minute : ''} onChange={e => onChange(`${hour}:${e.target.value}`)}>
 {!hour && <option value="">Min</option>}{Array.from({ length: 60 }, (_, i) => <option key={i} value={pad(i)}>{pad(i)}</option>)}
 </select><small>24h</small>{!required && value && <button type="button" onClick={() => onChange('')} aria-label="Limpar horário"><X size={14}/></button>}
 </div>;
}

export function DatePicker({ id, value, onChange, required, min, max }) {
 const disclosure = useRef(null);
 const [month, setMonth] = useState(() => {
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
 });
 const offset = (month.getDay() + 6) % 7;
 const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
 const today = iso(new Date());
 const firstYear = Math.min(month.getFullYear(), min ? Number(min.slice(0,4)) : new Date().getFullYear()-110);
 const lastYear = Math.max(month.getFullYear(), max ? Number(max.slice(0,4)) : new Date().getFullYear()+20);
 function select(date) { onChange(date); disclosure.current.open = false; document.getElementById(id)?.focus(); }
 return <div className="schedule-date">
 <input id={id} type="date" value={value} required={required} min={min} max={max} onChange={e => onChange(e.target.value)}/>
 <details ref={disclosure} onToggle={e => { if (e.currentTarget.open && value) { const date = new Date(`${value}T12:00:00`); setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12)); } }}>
 <summary aria-label="Abrir calendário"><CalendarDays size={18}/></summary>
 <div className="schedule-date-panel"><header><button type="button" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))}><ChevronLeft size={17}/></button><div className="schedule-date-month-year"><select aria-label="Mês do calendário" value={month.getMonth()} onChange={e=>setMonth(new Date(month.getFullYear(),Number(e.target.value),1,12))}>{Array.from({length:12},(_,i)=><option key={i} value={i}>{new Date(2026,i,1).toLocaleDateString('pt-BR',{month:'long'})}</option>)}</select><select aria-label="Ano do calendário" value={month.getFullYear()} onChange={e=>setMonth(new Date(Number(e.target.value),month.getMonth(),1,12))}>{Array.from({length:lastYear-firstYear+1},(_,i)=>firstYear+i).map(year=><option key={year} value={year}>{year}</option>)}</select></div><button type="button" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))}><ChevronRight size={17}/></button></header>
 <div className="schedule-date-grid">{days.map(day => <span key={day}>{weekdays[day].slice(0, 3)}</span>)}
 {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`}/>)}
 {Array.from({ length: total }, (_, i) => { const date = iso(new Date(month.getFullYear(), month.getMonth(), i + 1, 12)); return <button type="button" key={date} aria-label={new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { dateStyle: 'full' })} aria-pressed={date === value} aria-current={date === today ? 'date' : undefined} disabled={!!((min && date < min) || (max && date > max))} onClick={() => select(date)}>{i + 1}</button>; })}</div>
 <div className="schedule-date-actions"><button type="button" disabled={!!((min && today < min) || (max && today > max))} onClick={() => select(today)}>Hoje</button>{!required && <button type="button" onClick={() => select('')}>Limpar data</button>}</div>
 </div></details></div>;
}
