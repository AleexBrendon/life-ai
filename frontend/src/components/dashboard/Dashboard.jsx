const DashboardCharts = lazy(() => import('./DashboardCharts'));
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCheck, Target, ArrowUpRight, Sparkles, CalendarCheck2, Clock3, ArrowDown, CircleAlert } from 'lucide-react';
import { lifeApi } from '../../lib/api';
import { dashboardAgenda, highlightedActivity } from './dashboardAgenda';
import { localDateKey } from '../planner/calendarUtils';
import { useUserPreferences } from '../../lib/UserPreferences';

export default function Dashboard() {
  const { user } = useUserPreferences();
  const [showInsights, setShowInsights] = useState(false);
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
  if (data && data.date !== dateKey && !navigator.onLine) return <div role="status" className="studio-empty"><p>Não há resumo salvo para hoje neste dispositivo. Conecte-se para atualizar.</p><Link to={`/agenda?data=${data.date}`}>Abrir a última agenda salva</Link></div>;
  if (!data || data.date !== dateKey) return <p role="status" className="studio-empty">Carregando seu resumo...</p>;
  const summary = data.summary;
  const agenda = dashboardAgenda(data);
  const total = summary.totalActivities ?? (summary.totalScheduledRoutines + summary.totalScheduledReminders);
  const percentage = total ? Math.min(100, Math.round(summary.completed / total * 100)) : 0;
  const now = new Intl.DateTimeFormat('pt-BR', { timeZone: data.timezone || 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(clock);
  const next = highlightedActivity(agenda, now);
  const pending = agenda.filter(item => item.status === 'PENDING');
  const overdue = pending.filter(item => (item.end || item.time) < now);
  const stats = [
    ['Na agenda', total, 'atividades para hoje', CalendarDays],
    ['Concluídas', summary.completed, 'passos realizados', CheckCheck],
    ['A realizar', pending.length, 'atividades pendentes', Clock3],
  ];
  const nextTarget = next
    ? `/agenda?data=${data.date}&tipo=${next.kind}&item=${next.sourceId}`
    : `/agenda?data=${data.date}`;
  return <section className="overview-page dashboard-refined">
    <div className="dashboard-welcome"><div className="simple-intro"><span>SEU ESPAÇO, SEU RITMO</span><h1>{user?.name ? `Olá, ${user.name.trim().split(/\s+/)[0]}.` : 'Seu dia começa aqui.'}</h1><p>{total ? `${summary.completed} de ${total} atividades concluídas. Um passo de cada vez.` : 'Abra espaço para o que importa hoje.'}</p></div><div className="dashboard-header-actions"><time className="dashboard-date" dateTime={data.date}><CalendarDays size={16}/>{new Date(`${data.date}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' })}</time><Link className="studio-button secondary" to="/agenda">Minha agenda <ArrowUpRight size={16}/></Link></div></div>
    <article className="dashboard-next-feature" aria-label={next?.current ? 'Compromisso em andamento' : 'Próximo compromisso'}>
      <div>
        <span className="studio-eyebrow"><span className="focus-indicator"/>{next?.current ? 'EM ANDAMENTO' : next ? 'SEU PRÓXIMO PASSO' : 'ESPAÇO PARA VOCÊ'}</span>
        {next ? <><time>{next.time}{next.end ? ` – ${next.end}` : ''}</time><h2>{next.title}</h2><p>{next.type}</p></> : <><h2>Você tem espaço para planejar.</h2><p>Nenhuma outra atividade prevista para hoje.</p></>}
      </div>
      <Link to={nextTarget}>{next ? 'Abrir compromisso' : 'Planejar meu dia'} <ArrowUpRight size={16}/></Link>
    </article>
    <dl className="dashboard-totals" aria-label="Resumo de hoje">{stats.map(([label, value, note, Icon]) => <div key={label} className="dashboard-total"><dt><span className="dashboard-total-icon"><Icon size={19} aria-hidden="true"/></span><span>{label}<small>{note}</small></span></dt><dd>{value ?? 0}</dd></div>)}</dl>
    <div className="overview-layout"><article className="overview-agenda"><header><div><span className="studio-eyebrow">SEU PLANEJAMENTO</span><h2>Agenda de hoje</h2></div><Link to="/agenda">Ver agenda <ArrowUpRight size={15}/></Link></header>
      <div className="overview-timeline">{agenda.length ? agenda.slice(0, 8).map(item => <Link to={`/agenda?data=${data.date}&tipo=${item.kind}&item=${item.sourceId}`} className={`overview-event ${item.tone} ${item.done ? 'done' : ''} ${next?.id === item.id ? 'is-focus' : ''}`} key={item.id}><time>{item.time}</time><i/><div><strong>{item.title}</strong><span>{item.type}{item.skipped ? ' · Pulada neste dia' : ''}{next?.id === item.id && next.current ? ' · Em andamento' : ''}</span></div>{item.done ? <CheckCheck size={17} aria-label="Concluída"/> : <ArrowUpRight size={15} aria-hidden="true"/>}</Link>) : <div className="dashboard-empty"><CalendarCheck2 size={28}/><strong>Sua agenda está livre hoje</strong><p>Nenhuma atividade programada para hoje.</p><Link to="/planejamento">Planejar minha rotina →</Link></div>}</div>
      {agenda.length > 8 && <Link className="overview-more" to="/agenda">Ver as {agenda.length} atividades do dia →</Link>}
    </article><aside className="overview-side"><article className="overview-progress"><span className="studio-eyebrow">HOJE</span><div><h2>Progresso do dia</h2><strong>{percentage}%</strong></div><div className="overview-progress-track" role="progressbar" aria-label="Conclusão das atividades do dia" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{width:`${percentage}%`}}/></div><p>{total ? `${summary.completed} de ${total} atividades concluídas.${summary.skipped ? ` ${summary.skipped} pulada(s).` : ''}` : 'Adicione atividades à agenda para acompanhar seu progresso.'}</p></article>
    <Link to="/dashboard?painel=ia" className="overview-assistant"><span><Sparkles size={20}/></span><div><strong>Assistente</strong><p>Organize ou revise seu planejamento.</p></div><ArrowUpRight size={17}/></Link>
    <article className="dashboard-attention"><span className="studio-eyebrow">PARA REVISAR</span><h2>{overdue.length ? `${overdue.length} ${overdue.length === 1 ? 'atividade sem conclusão' : 'atividades sem conclusão'}` : 'Tudo no seu tempo'}</h2><p>{overdue.length ? 'O horário previsto passou. Confira o que foi feito ou ajuste sua agenda.' : 'Nenhuma atividade pendente com horário encerrado.'}</p>{overdue.length > 0 && <Link to="/agenda"><CircleAlert size={16}/>Revisar agenda<ArrowUpRight size={15}/></Link>}</article>
    <div className="overview-shortcuts"><Link to="/evolucao?aba=metas">Metas e marcos <Target size={15}/></Link><Link to="/evolucao?aba=revisao">Revisão semanal <ArrowUpRight size={15}/></Link></div>
    </aside></div>
    <section className="dashboard-history"><div><span className="studio-eyebrow">UM OLHAR MAIS AMPLO</span><h2>Entenda seu ritmo</h2><p>Consulte seu histórico de conclusões e tempo dedicado.</p></div><button type="button" className="studio-button secondary" aria-expanded={showInsights} aria-controls="dashboard-insights" onClick={() => setShowInsights(value => !value)}>{showInsights ? 'Recolher análises' : 'Explorar análises'}<ArrowDown size={16}/></button></section>
    <div id="dashboard-insights">{showInsights && <Suspense fallback={<p role="status">Carregando gráficos...</p>}><DashboardCharts /></Suspense>}</div>
  </section>;
}

