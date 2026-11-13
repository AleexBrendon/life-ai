const DashboardCharts = lazy(() => import('./DashboardCharts'));
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCheck, Target, BriefcaseBusiness, ArrowUpRight, Sparkles, CalendarCheck2 } from 'lucide-react';
import { lifeApi } from '../../lib/api';
import { dashboardAgenda, highlightedActivity } from './dashboardAgenda';
import { localDateKey } from '../planner/calendarUtils';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30000);
    const refreshClock = () => { if (!document.hidden) setClock(new Date()); };
    document.addEventListener('visibilitychange', refreshClock);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refreshClock); };
  }, []);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dateKey = localDateKey(clock, data?.timezone || 'America/Sao_Paulo');
  useEffect(() => {
    const reload = () => {
      setError(false);
      setAttempt(value => value + 1);
    };
    window.addEventListener("lifeai:agenda-updated", reload);
    return () => window.removeEventListener("lifeai:agenda-updated", reload);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    lifeApi.dashboard({ signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) { setData(response.data); setError(false); }
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt, dateKey]);
  if (error) return <div role="alert" className="studio-empty"><p>Não foi possível carregar o dashboard.</p><button className="studio-button" onClick={() => { setError(false); setAttempt(value => value + 1); }}>Tentar novamente</button></div>;
  if (!data || data.date !== dateKey) return <p role="status" className="studio-empty">Carregando seu resumo...</p>;
  const summary = data.summary;
  const agenda = dashboardAgenda(data);
  const total = summary.totalActivities ?? (summary.totalScheduledRoutines + summary.totalScheduledReminders);
  const percentage = total ? Math.min(100, Math.round(summary.completed / total * 100)) : 0;
  const now = new Intl.DateTimeFormat('pt-BR', { timeZone: data.timezone || 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(clock);
  const next = highlightedActivity(agenda, now);
  const stats = [
    ['Rotinas de hoje', summary.totalScheduledRoutines, 'atividades programadas', CalendarDays],
    ['Concluídas', summary.completed, 'atividades do dia', CheckCheck],
    ['Sessões de metas', summary.totalGoalSessions, 'passos para seus objetivos', Target],
    ['Trabalho', summary.totalWorkSchedules, 'períodos na agenda', BriefcaseBusiness],
  ];
  const nextTarget = next
    ? `/agenda?data=${data.date}&tipo=${next.kind}&item=${next.sourceId}`
    : `/agenda?data=${data.date}`;
  return <section className="overview-page dashboard-refined">
    <div className="dashboard-welcome"><div className="simple-intro"><span>VISÃO GERAL</span><h1>Dashboard</h1><p>Sua agenda, seu progresso e as próximas atividades.</p></div><div className="dashboard-header-actions"><time className="dashboard-date" dateTime={data.date}><CalendarDays size={16}/>{new Date(`${data.date}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' })}</time><Link className="studio-button secondary" to="/agenda">Minha agenda <ArrowUpRight size={16}/></Link></div></div>
    <article className="dashboard-next-feature" aria-label={next?.current ? 'Compromisso em andamento' : 'Próximo compromisso'}>
      <div>
        <span className="studio-eyebrow">{next?.current ? 'EM ANDAMENTO' : next ? 'PRÓXIMO COMPROMISSO' : 'SEU DIA, NO SEU RITMO'}</span>
        {next ? <><time>{next.time}{next.end ? ` – ${next.end}` : ''}</time><h2>{next.title}</h2><p>{next.type}</p></> : <><h2>Você tem espaço para planejar.</h2><p>Nenhuma outra atividade prevista para hoje.</p></>}
      </div>
      <Link to={nextTarget}>{next ? 'Abrir compromisso' : 'Planejar meu dia'} <ArrowUpRight size={16}/></Link>
    </article>
    <dl className="dashboard-totals" aria-label="Resumo de hoje">{stats.map(([label, value, , Icon]) => <div key={label} className="dashboard-total"><dt><span className="dashboard-total-icon"><Icon size={19} aria-hidden="true"/></span><span>{label}</span></dt><dd>{value ?? 0}</dd></div>)}</dl>
    <div className="overview-layout"><article className="overview-agenda"><header><div><span className="studio-eyebrow">SEU PLANEJAMENTO</span><h2>Agenda de hoje</h2></div><Link to="/agenda">Ver agenda <ArrowUpRight size={15}/></Link></header>
      <div className="overview-timeline">{agenda.length ? agenda.slice(0, 8).map(item => <div className={`overview-event ${item.tone} ${item.done ? 'done' : ''}`} key={item.id}><time>{item.time}</time><i/><div><strong>{item.title}</strong><span>{item.type}{item.skipped ? ' · Pulada neste dia' : ''}</span></div>{item.done && <CheckCheck size={17} aria-label="Concluída"/>}</div>) : <div className="dashboard-empty"><CalendarCheck2 size={28}/><strong>Sua agenda está livre hoje</strong><p>Nenhuma atividade programada para hoje.</p><Link to="/planejamento">Planejar minha rotina →</Link></div>}</div>
      {agenda.length > 8 && <Link className="overview-more" to="/agenda">Ver as {agenda.length} atividades do dia →</Link>}
    </article><aside className="overview-side"><article className="overview-progress"><span className="studio-eyebrow">HOJE</span><div><h2>Progresso do dia</h2><strong>{percentage}%</strong></div><div className="overview-progress-track" role="progressbar" aria-label="Conclusão das atividades do dia" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{width:`${percentage}%`}}/></div><p>{total ? `${summary.completed} de ${total} atividades concluídas.${summary.skipped ? ` ${summary.skipped} pulada(s).` : ''}` : 'Adicione atividades à agenda para acompanhar seu progresso.'}</p></article>
    <Link to="/dashboard?painel=ia" className="overview-assistant"><span><Sparkles size={20}/></span><div><strong>Assistente</strong><p>Organize ou revise seu planejamento.</p></div><ArrowUpRight size={17}/></Link>
    <div className="overview-shortcuts"><Link to="/planejamento?aba=metas">Minhas metas <Target size={15}/></Link><Link to="/planejamento?aba=trabalho">Abrir Kanban <BriefcaseBusiness size={15}/></Link></div>
    </aside></div>
    <Suspense fallback={<p role="status">Carregando gráficos...</p>}><DashboardCharts /></Suspense>
  </section>;
}

