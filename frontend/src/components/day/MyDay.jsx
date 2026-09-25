import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CirclePlus,
  Frown,
  Meh,
  Plus,
  Smile,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

import { DaySchedule } from "./DaySchedule";
import { lifeApi } from "../../lib/api";

function MyDay() {
  const [day, setDay] = useState(null);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadToday() {
      try {
        setLoading(true);
        setError("");

        const response = await lifeApi.today();

        if (mounted) {
          setDay(response.data);
        }
      } catch (err) {
        console.error("Erro ao carregar Meu Dia:", err);

        if (mounted) {
          setError("Não foi possível carregar seu dia.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadToday();

    return () => {
      mounted = false;
    };
  }, []);

  const items = day?.items ?? [];

  const completedItems = useMemo(
    () => items.filter((item) => item.status === "COMPLETED"),
    [items],
  );

  const totalItems = items.length;

  const progress =
    totalItems > 0
      ? Math.round((completedItems.length / totalItems) * 100)
      : 0;

  const dateLabel = day?.date
    ? new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(day.date))
    : "";

  const priorities = items.slice(0, 3);

  if (loading) {
    return (
      <section className="my-day-page">
        <div className="day-page-intro">
          <h1>Meu Dia</h1>
          <p>Carregando seu dia...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="my-day-page">
        <div className="day-page-intro">
          <h1>Meu Dia</h1>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="my-day-page">
      <div className="day-page-intro">
        <h1>Meu Dia</h1>
        <p>{dateLabel}</p>
      </div>

      <div className="my-day-overview">
        <article className="my-day-progress">
          <div className="day-progress-ring">
            <span>{progress}%</span>
          </div>

          <div>
            <strong>
              {completedItems.length} de {totalItems}
            </strong>

            <span>tarefas concluídas</span>

            <p>
              {progress === 100
                ? "Dia concluído!"
                : progress >= 70
                  ? "Excelente progresso!"
                  : progress >= 40
                    ? "Você está indo bem!"
                    : "Vamos começar!"}
            </p>
          </div>

          <div className="my-day-priorities">
            <h2>{priorities.length} prioridades</h2>

            {priorities.map((item, index) => (
              <Priority
                key={item.routineScheduleId}
                tone={
                  item.status === "COMPLETED"
                    ? "green"
                    : index === 0
                      ? "orange"
                      : "purple"
                }
                text={item.name}
                tag={
                  item.status === "COMPLETED"
                    ? "Concluída"
                    : index === 0
                      ? "Alta prioridade"
                      : "Importante"
                }
              />
            ))}
          </div>
        </article>

        <article className="my-day-focus">
          <h2>Foco do dia</h2>

          <div className="my-day-focus-content">
            <span>
              <Star size={34} />
            </span>

            <div>
              <strong>
                {priorities[0]?.name || "Organizar seu dia"}
              </strong>

              <p>
                {completedItems.length} de {totalItems} prioridades concluídas
              </p>
            </div>
          </div>

          <div className="day-green-progress">
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="my-day-focus-note">
            <TrendingUp size={21} />

            <span>
              {progress >= 70
                ? "Você está no caminho certo para um dia produtivo!"
                : "Comece pelas tarefas mais importantes do seu dia."}
            </span>
          </div>
        </article>
      </div>

      <div className="my-day-content">
        <article className="day-main-schedule">
          <DaySchedule items={items} />
        </article>

        <aside className="my-day-side">
          <article className="day-add-task">
            <h2>Adicionar tarefa</h2>

            <div>
              <input
                type="text"
                value={newTask}
                onChange={(event) => setNewTask(event.target.value)}
                placeholder="O que você quer realizar?"
                aria-label="Nova tarefa"
              />

              <button
                type="button"
                aria-label="Adicionar tarefa"
                onClick={() => {
                  if (!newTask.trim()) return;

                  console.log("Nova tarefa:", newTask);

                  setNewTask("");
                }}
              >
                <Plus size={24} />
              </button>
            </div>
          </article>

          <article className="day-energy">
            <h2>Como está sua energia?</h2>

            <p>Isso nos ajuda a personalizar seu dia</p>

            <div className="day-energy-options">
              <Energy icon={Frown} label="Muito baixa" />
              <Energy icon={Frown} label="Baixa" />
              <Energy icon={Meh} label="Média" />
              <Energy icon={Smile} label="Alta" />
              <Energy icon={Smile} label="Muito alta" />
            </div>
          </article>

          <article className="day-tip">
            <span>
              <TrendingUp size={23} />
            </span>

            <div>
              <strong>Dica do dia</strong>

              <p>
                Pequenos passos constantes geram grandes resultados.
                <br />
                Mantenha o foco no que importa!
              </p>
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}

function Priority({ tone, text, tag }) {
  const Icon =
    tone === "green"
      ? CheckCircle2
      : tone === "purple"
        ? Sparkles
        : CirclePlus;

  return (
    <div className={`day-priority day-${tone}`}>
      <Icon size={27} />
      <strong>{text}</strong>
      <span>{tag}</span>
    </div>
  );
}

function Energy({ icon: Icon, label }) {
  return (
    <button type="button">
      <Icon size={39} />
      <span>{label}</span>
    </button>
  );
}

export default MyDay;