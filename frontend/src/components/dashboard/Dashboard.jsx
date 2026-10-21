const DashboardCharts = lazy(() => import('./DashboardCharts'));
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCheck, Target, BriefcaseBusiness, ArrowUpRight, Sparkles, Clock3, CalendarCheck2 } from 'lucide-react';
import { lifeApi } from '../../lib/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { const reload = () => setAttempt(value => value + 1); window.addEventListener("lifeai:agenda-updated", reload); return () => window.removeEventListener("lifeai:agenda-updated", reload); }, []);
  useEffect(() => {
    let active = true;
    setError(false);
    lifeApi.dashboard().then(response => { if (active) setData(response.data); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  if (error) return <div role="alert" className="studio-empty"><p>Não foi possível carregar o dashboard.</p><button className="studio-button" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>;
  if (!data) return <p role="status" className="studio-empty">Carregando seu resumo...</p>;
  const summary = data.summary;
  const agenda = [
    ...data.routines.scheduled.flatMap(routine => routine.schedules.map(schedule => {
      const execution = data.routines.executions.find(item => item.routineScheduleId === schedule.id);
      return { id: `routine-${schedule.id}`, time: execution?.startTime || schedule.startTime, title: routine.name, type: 'Rotina', tone: 'routine', done: execution?.status === 'COMPLETED' };
    })),
    ...data.reminders.scheduled.map(item => ({ id: `reminder-${item.id}`, time: item.reminderTime, title: item.title, type: 'Lembrete', tone: 'reminder', done: data.reminders.executions.some(e => e.reminderId === item.id && e.status === 'COMPLETED') })),
    ...data.work.map(item => ({ id: `work-${item.id}`, time: item.startTime, title: item.job.name, type: 'Trabalho', tone: 'work' })),
    ...(data.goals?.sessions || []).map(item => ({ id: `goal-${item.id}`, time: item.startTime, title: item.goal.title, type: 'Meta', tone: 'goal', done: item.status === 'COMPLETED' })),
    ...data.unexpectedEvents.map(item => ({ id: `event-${item.id}`, time: item.startTime, title: item.title, type: 'Imprevisto', tone: 'event', done: ['RESOLVED', 'CANCELLED'].includes(item.status) })),
  ].sort((a, b) => a.time.localeCompare(b.time)).map(item => {
    const [prefix, sourceId] = item.id.split('-');
    const kind = {routine:'rotinas',reminder:'lembretes',work:'trabalho',goal:'metas',event:'imprevistos'}[prefix];
    const activity = data.activities?.find(row => row.kind === kind && row.sourceId === Number(sourceId));
    return activity ? {...item,done:activity.status==='COMPLETED',skipped:activity.status==='SKIPPED'} : item;
  });
  const total = summary.totalActivities ?? (summary.totalScheduledRoutines + summary.totalScheduledReminders);
  const percentage = total ? Math.min(100, Math.round(summary.completed / total * 100)) : 0;
  const now = new Intl.DateTimeFormat('pt-BR', { timeZone: data.timezone || 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  const next = agenda.find(item => !item.done && !item.skipped && item.time >= now);
  const stats = [
    ['Rotinas de hoje', summary.totalScheduledRoutines, 'atividades programadas', CalendarDays],
    ['Concluídas', summary.completed, 'atividades do dia', CheckCheck],
    ['Sessões de metas', summary.totalGoalSessions, 'passos para seus objetivos', Target],
    ['Trabalho', summary.totalWorkSchedules, 'períodos na agenda', BriefcaseBusiness],
  ];
  return <section className="overview-page dashboard-refined">
    <div className="dashboard-welcome"><div className="simple-intro"><span>VISÃO GERAL</span><h1>Dashboard</h1><p>Sua agenda, seu progresso e as próximas atividades.</p></div><div className="dashboard-header-actions"><time className="dashboard-date" dateTime={data.date}><CalendarDays size={16}/>{new Date(`${data.date}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' })}</time><Link className="studio-button" to="/agenda">Minha agenda <ArrowUpRight size={16}/></Link></div></div>
    <dl className="dashboard-totals" aria-label="Resumo de hoje">{stats.map(([label, value, , Icon]) => <div key={label} className="dashboard-total"><dt><span className="dashboard-total-icon"><Icon size={19} aria-hidden="true"/></span><span>{label}</span></dt><dd>{value ?? 0}</dd></div>)}</dl>
    <div className="overview-layout"><article className="overview-agenda"><header><div><span className="studio-eyebrow">SEU PLANEJAMENTO</span><h2>Agenda de hoje</h2></div><Link to="/agenda">Ver agenda <ArrowUpRight size={15}/></Link></header>
      <div className="overview-timeline">{agenda.length ? agenda.slice(0, 8).map(item => <div className={`overview-event ${item.tone} ${item.done ? 'done' : ''}`} key={item.id}><time>{item.time}</time><i/><div><strong>{item.title}</strong><span>{item.type}{item.skipped ? ' · Pulada neste dia' : ''}</span></div>{item.done && <CheckCheck size={17} aria-label="Concluída"/>}</div>) : <div className="dashboard-empty"><CalendarCheck2 size={28}/><strong>Sua agenda está livre hoje</strong><p>Nenhuma atividade programada para hoje.</p><Link to="/planejamento">Planejar minha rotina →</Link></div>}</div>
      {agenda.length > 8 && <Link className="overview-more" to="/agenda">Ver as {agenda.length} atividades do dia →</Link>}
    </article><aside className="overview-side"><article className="overview-progress"><span className="studio-eyebrow">HOJE</span><div><h2>Progresso do dia</h2><strong>{percentage}%</strong></div><div className="overview-progress-track" role="progressbar" aria-label="Conclusão das atividades do dia" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{width:`${percentage}%`}}/></div><p>{total ? `${summary.completed} de ${total} atividades concluídas.${summary.skipped ? ` ${summary.skipped} pulada(s).` : ''}` : 'Adicione atividades à agenda para acompanhar seu progresso.'}</p></article>
    <article className="overview-next"><span className="studio-eyebrow"><Clock3 size={13}/> A SEGUIR</span>{next ? <><time>{next.time}</time><h3>{next.title}</h3><p>{next.type}</p></> : <><h3>Nenhuma próxima atividade</h3><p>Não há outras atividades previstas para começar hoje.</p></>}<Link to="/agenda">Conferir meu dia <ArrowUpRight size={14}/></Link></article>
    <Link to="/dashboard?painel=ia" className="overview-assistant"><span><Sparkles size={20}/></span><div><strong>Assistente</strong><p>Organize ou revise seu planejamento.</p></div><ArrowUpRight size={17}/></Link>
    <div className="overview-shortcuts"><Link to="/planejamento?aba=metas">Minhas metas <Target size={15}/></Link><Link to="/planejamento?aba=trabalho">Abrir Kanban <BriefcaseBusiness size={15}/></Link></div>
    </aside></div>
    <Suspense fallback={<p role="status">Carregando gráficos...</p>}><DashboardCharts /></Suspense>
  </section>;
}




