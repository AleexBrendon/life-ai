import { CheckCircle2, CirclePlus, Frown, Meh, Plus, Smile, Sparkles, Star, TrendingUp } from "lucide-react";
import { DaySchedule } from "./DaySchedule";

function MyDay() {
  return <section className="my-day-page">
    <div className="day-page-intro"><h1>Meu Dia</h1><p>Segunda-feira, 23 de agosto</p></div>
    <div className="my-day-overview">
      <article className="my-day-progress"><div className="day-progress-ring"><span>67%</span></div><div><strong>2 de 3</strong><span>tarefas concluídas</span><p>Excelente progresso!</p></div><div className="my-day-priorities"><h2>3 prioridades</h2><Priority tone="orange" text="Planejar apresentação" tag="Alta prioridade" /><Priority tone="green" text="Treino da manhã" tag="Concluída" /><Priority tone="purple" text="Revisar meta trimestral" tag="Importante" /></div></article>
      <article className="my-day-focus"><h2>Foco do dia</h2><div className="my-day-focus-content"><span><Star size={34} /></span><div><strong>Crescimento<br />Profissional</strong><p>2 de 3 prioridades concluídas</p></div></div><div className="day-green-progress"><span /></div><div className="my-day-focus-note"><TrendingUp size={21} /> Você está no caminho certo para<br /> um dia produtivo!</div></article>
    </div>
    <div className="my-day-content"><article className="day-main-schedule"><DaySchedule /></article><aside className="my-day-side"><article className="day-add-task"><h2>Adicionar tarefa</h2><div><span>O que você quer realizar?</span><button type="button" aria-label="Adicionar tarefa"><Plus size={24} /></button></div></article><article className="day-energy"><h2>Como está sua energia?</h2><p>Isso nos ajuda a personalizar seu dia</p><div className="day-energy-options"><Energy icon={Frown} label="Muito baixa" /><Energy icon={Frown} label="Baixa" /><Energy icon={Meh} label="Média" /><Energy icon={Smile} label="Alta" /><Energy icon={Smile} label="Muito alta" /></div></article><article className="day-tip"><span><TrendingUp size={23} /></span><div><strong>Dica do dia</strong><p>Pequenos passos constantes geram grandes resultados.<br />Mantenha o foco no que importa!</p></div></article></aside></div>
  </section>;
}
function Priority({ tone, text, tag }) { const Icon = tone === "green" ? CheckCircle2 : tone === "purple" ? Sparkles : CirclePlus; return <div className={`day-priority day-${tone}`}><Icon size={27} /><strong>{text}</strong><span>{tag}</span></div>; }
function Energy({ icon: Icon, label }) { return <button type="button"><Icon size={39} /><span>{label}</span></button>; }
export default MyDay;
