import { useState } from 'react';
import api from '../../lib/api';
import { localDateKey, shiftDate } from '../planner/calendarUtils';
import { useUserPreferences } from '../../lib/UserPreferences';
import { requestErrorMessage } from '../../lib/requestFeedback';
import WeeklyPlanner from '../ai/WeeklyPlanner';
import useResource from './useResource';

function Review({ review, onSaved }) {
  const [accepted, setAccepted] = useState(review.accepted || []), [notes, setNotes] = useState(review.notes || '');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [planning, setPlanning] = useState(false), [saved, setSaved] = useState(review.status === 'REVIEWED');
  const summary = review.metrics.summary;
  return <section className="evolution-card"><h3>Semana de {review.weekStart.slice(0, 10).split('-').reverse().join('/')}</h3><div className="evolution-stats">{[['Planejadas', summary.planned], ['Concluídas', summary.completed], ['Puladas/não realizadas', summary.skipped], ['Sem conclusão', summary.pending]].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><p>{summary.rate}% das atividades planejadas foram concluídas. A revisão considera os cadastros atuais e os registros da agenda; alterações ou exclusões antigas podem mudar uma revisão ainda não salva.</p>
    <div className="evolution-table-wrap"><table><thead><tr><th>Dia</th><th>Planejadas</th><th>Concluídas</th></tr></thead><tbody>{review.metrics.daily.map(row => <tr key={row.date}><td>{row.date.split('-').reverse().join('/')}</td><td>{row.planned}</td><td>{row.completed}</td></tr>)}</tbody></table></div>
    <form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await api.put(`/evolution/reviews/${review.id}`, { accepted, notes }); setSaved(true); onSaved(); } catch (e) { setError(requestErrorMessage(e)); } finally { setBusy(false); } }}><h3>Ajustes para revisar</h3>{!review.suggestions.length && <p>Seu registro não indicou categorias abaixo de 60% de conclusão. Preserve o que funcionou e ajuste o que fizer sentido.</p>}{review.suggestions.map(row => <label className="evolution-check" key={row.id}><input type="checkbox" disabled={busy} checked={accepted.includes(row.id)} onChange={e => { setSaved(false); setAccepted(current => e.target.checked ? [...current, row.id] : current.filter(id => id !== row.id)); }} /><span><strong>{row.title}</strong><small>{row.reason}</small></span></label>)}<label className="studio-field"><span>O que funcionou e o que deseja mudar?</span><textarea rows={3} maxLength={2000} value={notes} onChange={e => { setNotes(e.target.value); setSaved(false); }} /></label><p>Salvar registra suas decisões. Horários só serão alterados se você revisar e aprovar uma proposta de planejamento.</p><div className="evolution-actions"><button className="studio-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar revisão'}</button><button className="studio-button secondary" type="button" onClick={() => setPlanning(value => !value)}>Revisar o planejamento da próxima semana</button>{saved && <span role="status">Revisão salva.</span>}</div></form>
    {planning && <WeeklyPlanner initialDate={shiftDate(review.weekStart.slice(0, 10), 7)} />}{error && <p role="alert" className="studio-error">{error}</p>}
  </section>;
}
export default function WeeklyReview() {
  const { user } = useUserPreferences();
  const [weekStart, setWeekStart] = useState(() => { const today = localDateKey(new Date(), user?.profile?.timezone); return shiftDate(today, -((new Date(today).getUTCDay() + 6) % 7) - 7); });
  const [revision, setRevision] = useState(0), history = useResource('/evolution/reviews', revision);
  const [review, setReview] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <section className="evolution-panel"><h2>Revisão semanal</h2><p>Compare o que estava na agenda com o que foi concluído e escolha ajustes para a próxima semana.</p><form className="evolution-card evolution-actions" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { const response = await api.post('/evolution/reviews', { weekStart }); setReview(response.data); } catch (e) { setError(requestErrorMessage(e)); } finally { setBusy(false); } }}><label className="studio-field"><span>Segunda-feira de uma semana encerrada</span><input type="date" required value={weekStart} onChange={e => setWeekStart(e.target.value)} /></label><button className="studio-button" disabled={busy}>{busy ? 'Comparando…' : 'Gerar revisão'}</button></form>
    {review && <Review key={`${review.id}:${review.updatedAt}`} review={review} onSaved={() => setRevision(value => value + 1)} />}{error && <p role="alert" className="studio-error">{error}</p>}
    <section className="evolution-card"><h3>Revisões anteriores</h3>{history.loading ? <p role="status">Carregando…</p> : history.error ? <p role="alert">{history.error}</p> : !history.data?.length ? <p>Sua primeira revisão aparecerá aqui.</p> : <div className="evolution-actions">{history.data.map(row => <button className="studio-button secondary" key={row.id} onClick={() => setReview(row)}>{row.weekStart.slice(0, 10).split('-').reverse().join('/')} · {row.status === 'REVIEWED' ? 'Revisada' : 'Rascunho'}</button>)}</div>}</section>
  </section>;
}
