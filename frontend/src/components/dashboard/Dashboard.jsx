import {
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Repeat2,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { lifeApi } from "../../lib/api";

const summaryCards = [
  {
    title: "Meu Dia",
    value: "3",
    label: "tarefas planejadas",
    detail: "2 concluídas",
    percentage: 67,
    icon: CheckCircle2,
    tone: "green",
  },
  {
    title: "Rotinas",
    value: "2",
    label: "rotinas restantes",
    detail: "3 concluídas",
    percentage: 60,
    icon: Repeat2,
    tone: "purple",
  },
  {
    title: "Metas",
    value: "4",
    label: "metas em andamento",
    detail: "2 no caminho certo",
    percentage: 50,
    icon: Target,
    tone: "orange",
  },
];

const agenda = [
  { time: "08:30", title: "Treino da manhã", meta: "Atividade pessoal", tone: "green", done: true, tag: "Concluída" },
  { time: "10:00", title: "Planejar apresentação", meta: "Trabalho  •  60 min", tone: "orange", tag: "Alta prioridade" },
  { time: "14:00", title: "Revisar meta trimestral", meta: "Planejamento  •  45 min", tone: "purple", tag: "Importante" },
  { time: "16:00", title: "Leitura e aprendizado", meta: "Desenvolvimento pessoal  •  30 min", tone: "gray", tag: "Pessoal" },
];

const weeklyProgress = [
  { day: "Seg", value: 80 }, { day: "Ter", value: 60 }, { day: "Qua", value: 90 },
  { day: "Qui", value: 40 }, { day: "Sex", value: 70 }, { day: "Sáb", value: 30 }, { day: "Dom", value: 0 },
];

function SummaryCard({ card }) {
  const Icon = card.icon;
  return (
    <article className={`dashboard-summary-card dashboard-${card.tone}`}>
      <div className="dashboard-card-title"><strong>{card.title}</strong><ChevronRight size={18} /></div>
      <div className="dashboard-summary-content">
        <span className="dashboard-summary-icon"><Icon size={31} strokeWidth={1.8} /></span>
        <div><strong className="dashboard-summary-number">{card.value}</strong><span>{card.label}</span></div>
      </div>
      <div className="dashboard-progress-track"><span style={{ width: `${card.percentage}%` }} /></div>
      <div className="dashboard-summary-footer"><span>{card.detail}</span><span>{card.percentage}%</span></div>
    </article>
  );
}

function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    Promise.all([lifeApi.dashboard(), lifeApi.profile()])
      .then(([dashboardResponse, profileResponse]) => {
        setDashboard(dashboardResponse.data);
        setUser(profileResponse.data.user);
      })
      .catch(() => {});
  }, []);

  const apiAgenda = dashboard
    ? [
      ...dashboard.routines.executions.map((item) => ({ time: item.startTime, title: item.routineItem.name, meta: "Rotina", tone: "green", done: item.status === "COMPLETED", tag: item.status === "COMPLETED" ? "Concluída" : "Pendente" })),
      ...dashboard.reminders.scheduled.map((item) => ({ time: item.reminderTime, title: item.title, meta: "Lembrete", tone: "purple", tag: "Lembrete" })),
      ...dashboard.work.map((item) => ({ time: item.startTime, title: item.job.name, meta: "Trabalho", tone: "orange", tag: "Trabalho" })),
    ].sort((first, second) => first.time.localeCompare(second.time))
    : agenda;

  return (
    <section className="dashboard-page">
      <div className="dashboard-intro">
        <h1>Bom dia, {user?.name || "Alex"}</h1>
        <p>Aqui está o que merece sua atenção hoje.</p>
      </div>

      <div className="dashboard-summary-grid">
        {summaryCards.map((card) => <SummaryCard key={card.title} card={card} />)}
        <article className="dashboard-summary-card dashboard-focus-card dashboard-green">
          <div className="dashboard-card-title"><strong>Foco da semana</strong><ChevronRight size={18} /></div>
          <div className="dashboard-focus-content">
            <span className="dashboard-summary-icon"><Star size={31} strokeWidth={1.8} /></span>
            <div><strong>Crescimento<br />Profissional</strong><span>2 de 3 prioridades concluídas</span></div>
          </div>
          <div className="dashboard-progress-track"><span style={{ width: "67%" }} /></div>
        </article>
      </div>

      <div className="dashboard-content-grid">
        <article className="dashboard-panel dashboard-agenda">
          <div className="dashboard-panel-heading">
            <h2>Agenda de hoje</h2>
            <button type="button" className="dashboard-outline-button"><CalendarDays size={15} /> Ver calendário</button>
          </div>
          <div className="dashboard-timeline">
            {apiAgenda.slice(0, 4).map((item, index) => (
              <div className={`dashboard-agenda-row dashboard-${item.tone}`} key={`${item.time}-${index}`}>
                <time>{item.time}</time>
                <span className="dashboard-timeline-dot" />
                <div className="dashboard-agenda-item">
                  {item.done ? <CheckCircle2 size={29} /> : <Circle size={28} strokeWidth={1.7} />}
                  <div className="dashboard-agenda-copy"><strong>{item.title}</strong><span>{item.meta}</span></div>
                  <span className="dashboard-agenda-tag">{item.done ? <CheckCircle2 size={14} /> : item.tone === "orange" ? <ArrowUpRight size={14} /> : item.tone === "purple" ? <Star size={14} /> : <Clock3 size={14} />}{item.tag}</span>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="dashboard-more-button">Ver todas as atividades <ChevronDown size={16} /></button>
        </article>

        <div className="dashboard-right-column">
          <article className="dashboard-panel dashboard-weekly">
            <div className="dashboard-panel-heading"><h2>Progresso semanal</h2><button type="button" className="dashboard-outline-button">Esta semana <ChevronDown size={14} /></button></div>
            <div className="dashboard-chart" aria-label="Progresso semanal">
              <div className="dashboard-chart-axis"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
              <div className="dashboard-bars">
                {weeklyProgress.map(({ day, value }) => <div className="dashboard-bar-item" key={day}><span className="dashboard-bar-value">{value ? `${value}%` : ""}</span><div className="dashboard-bar-track"><span style={{ height: `${value}%` }} /></div><span className="dashboard-bar-day">{day}</span></div>)}
              </div>
            </div>
            <div className="dashboard-chart-note"><ArrowUpRight size={16} /> Você está <strong>15% acima</strong> da sua média semanal.</div>
          </article>

          <article className="dashboard-panel dashboard-insight">
            <div className="dashboard-panel-heading"><h2><Sparkles size={23} /> Insight da IA</h2><span className="dashboard-insight-label">Novo insight</span></div>
            <div className="dashboard-insight-content"><span className="dashboard-brain"><BrainCircuit size={31} /></span><div><p>Você tem seu melhor desempenho às quartas-feiras. Considere agendar tarefas importantes nesse dia.</p><span>Com base na sua produtividade nas últimas 4 semanas.</span></div></div>
            <button type="button" className="dashboard-insight-button">Ver todos os insights <ChevronRight size={16} /></button>
          </article>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
