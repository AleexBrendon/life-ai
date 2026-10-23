import { useState } from 'react';
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const PX_PER_MINUTE = 0.62;
const minute = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const stateLabel = { new: 'Novo', moved: 'Horário alterado', same: 'Mantido', fixed: 'Fixo' };

// Everything that will be on the week once this option is approved, plus the old position of what moves.
export function previewBlocks(plan, option) {
 const changes = new Map(option.changes.map(change => [change.key, change]));
 const state = (key, slot) => { const change = changes.get(key); if (!change) return 'same'; if (!change.old) return 'new'; return change.old.dayOfWeek !== slot.dayOfWeek || change.old.startTime !== slot.startTime ? 'moved' : 'same'; };
 const blocks = [
  ...(plan.fixed || []).map(row => ({ ...row, kind: row.kind === 'trabalho' ? 'trabalho' : 'fixo', state: 'fixed' })),
  ...option.template.routines.map(row => ({ ...row, kind: 'rotinas', state: state(row.key, row) })),
  ...option.template.goals.map(row => ({ ...row, kind: 'metas', state: state(row.key, row) })),
 ];
 const ghosts = option.changes.filter(change => change.old && blocks.some(block => block.key === change.key && block.state === 'moved')).map(change => ({ key: `old:${change.key}`, title: change.title, kind: change.kind, ...change.old, state: 'old' }));
 return { blocks, ghosts };
}

// Side-by-side lanes for blocks that overlap on the same day.
function withLanes(rows) {
 const sorted = [...rows].sort((a, b) => minute(a.startTime) - minute(b.startTime)), lanes = [];
 const placed = sorted.map(row => { let lane = lanes.findIndex(end => end <= minute(row.startTime)); if (lane < 0) { lane = lanes.length; lanes.push(0); } lanes[lane] = minute(row.endTime); return { ...row, lane }; });
 return placed.map(row => ({ ...row, lanes: lanes.length }));
}

export function WeekPreview({ blocks, ghosts }) {
 const all = [...blocks, ...ghosts];
 const first = Math.min(6 * 60, ...all.map(row => minute(row.startTime))), last = Math.max(23 * 60, ...all.map(row => minute(row.endTime)));
 const top = Math.floor(first / 60) * 60, bottom = Math.ceil(last / 60) * 60, height = (bottom - top) * PX_PER_MINUTE;
 const hours = Array.from({ length: (bottom - top) / 60 + 1 }, (_, i) => top + i * 60);
 return <div className="routine-week-scroll"><div className="routine-week" style={{ '--routine-week-height': `${height}px` }}>
  <div className="routine-week-head"><span />{WEEK.map(day => <strong key={day}>{DAY_NAMES[day]}</strong>)}</div>
  <div className="routine-week-body">
   <div className="routine-week-hours">{hours.map(value => <span key={value} style={{ top: (value - top) * PX_PER_MINUTE }}>{String(value / 60).padStart(2, '0')}h</span>)}</div>
   {WEEK.map(day => <div className="routine-week-day" key={day}>{hours.map(value => <i key={value} style={{ top: (value - top) * PX_PER_MINUTE }} />)}
    {withLanes(all.filter(row => row.dayOfWeek === day)).map(row => { const start = minute(row.startTime), end = minute(row.endTime); return <div key={row.key} className={`routine-block ${row.kind} ${row.state}`} style={{ top: (start - top) * PX_PER_MINUTE, height: Math.max(14, (end - start) * PX_PER_MINUTE - 2), left: `calc(${(row.lane / row.lanes) * 100}% + 2px)`, width: `calc(${100 / row.lanes}% - 4px)` }} title={`${row.title} · ${row.startTime}–${row.endTime}${row.state === 'old' ? ' · posição anterior' : ` · ${stateLabel[row.state]}`}`}><strong>{row.title}</strong>{end - start >= 40 && <span>{row.startTime}–{row.endTime}</span>}</div>; })}
   </div>)}
  </div>
 </div></div>;
}

function MonthPreview({ blocks, period }) {
 const dates = [];
 for (let date = period.start; date <= period.end;) { dates.push(date); const next = new Date(`${date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1); date = next.toISOString().slice(0, 10); }
 const offset = (new Date(`${dates[0]}T12:00:00Z`).getUTCDay() + 6) % 7;
 const flexible = blocks.filter(row => row.kind === 'rotinas' || row.kind === 'metas');
 return <div className="routine-month">
  {WEEK.map(day => <strong key={day} className="routine-month-name">{DAY_NAMES[day]}</strong>)}
  {Array.from({ length: offset }, (_, i) => <span key={`gap-${i}`} className="routine-month-gap" />)}
  {dates.map(date => { const day = new Date(`${date}T12:00:00Z`).getUTCDay(), rows = flexible.filter(row => row.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime)), fixed = blocks.filter(row => row.dayOfWeek === day && row.state === 'fixed').length;
   return <div key={date} className="routine-month-day"><b>{Number(date.slice(-2))}</b>{rows.slice(0, 3).map(row => <span key={row.key} className={`routine-chip ${row.kind} ${row.state}`} title={`${row.startTime} · ${row.title}`}>{row.startTime} {row.title}</span>)}{rows.length > 3 && <small>+{rows.length - 3}</small>}{fixed > 0 && <small>{fixed} fixo(s)</small>}</div>; })}
 </div>;
}

export function RoutineLegend() {
 return <ul className="routine-legend"><li><i className="trabalho" />Trabalho e compromissos fixos</li><li><i className="rotinas" />Rotinas</li><li><i className="metas" />Metas</li><li><i className="new" />Novo ou com horário alterado</li><li><i className="old" />Posição anterior</li></ul>;
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
