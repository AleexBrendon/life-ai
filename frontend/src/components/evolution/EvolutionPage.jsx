import { useSearchParams } from 'react-router-dom';
import CalendarExchange from './CalendarExchange';
import PushPreferences from './PushPreferences';
import WeeklyReview from './WeeklyReview';
import GoalMilestones from './GoalMilestones';
import DataOffline from './DataOffline';
import '../../styles/evolution.css';
const tabs = [
  ['revisao', 'Revisão semanal', WeeklyReview], ['metas', 'Marcos das metas', GoalMilestones],
  ['calendarios', 'Calendários', CalendarExchange], ['push', 'Notificações push', PushPreferences], ['dados', 'Dados e offline', DataOffline],
];
export default function EvolutionPage() {
  const [params, setParams] = useSearchParams();
  const selected = tabs.find(([id]) => id === params.get('aba')) || tabs[0], Content = selected[2];
  return <section className="evolution-page"><div className="simple-intro"><span>CONEXÕES E PROGRESSO</span><h1>Evolução</h1><p>Revise seus resultados, acompanhe entregas e leve sua organização para outros lugares.</p></div><nav className="simple-tabs" aria-label="Recursos de evolução">{tabs.map(([id, label]) => <button key={id} type="button" aria-current={id === selected[0] ? 'page' : undefined} onClick={() => { const next = new URLSearchParams(params); next.set('aba', id); setParams(next); }}>{label}</button>)}</nav><Content key={selected[0]} /></section>;
}
