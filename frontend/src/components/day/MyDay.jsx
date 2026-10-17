import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  CirclePlus,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

import { DaySchedule } from "./DaySchedule";
import { lifeApi } from "../../lib/api";

function MyDay() {
  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [completingScheduleIds, setCompletingScheduleIds] = useState([]);
  const [actionError, setActionError] = useState("");

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

  async function handleCompleteRoutine(task) {
    const scheduleId = task.routineScheduleId;

    if (!scheduleId || completingScheduleIds.includes(scheduleId)) {
      return;
    }

    if (!day?.date) {
      setActionError("Não foi possível identificar a data da rotina.");
      return;
    }

    try {
      setActionError("");

      setCompletingScheduleIds((current) =>
        current.includes(scheduleId)
          ? current
          : [...current, scheduleId],
      );

      // Preserva a data enviada pelo backend, sem conversão
      // pelo fuso horário do navegador.
      const date =
        typeof day.date === "string"
          ? day.date.slice(0, 10)
          : new Date(day.date).toISOString().slice(0, 10);

      await lifeApi.completeRoutineSchedule(scheduleId, date);

      const response = await lifeApi.today();
      setDay(response.data);
    } catch (err) {
      console.error("Erro ao concluir rotina:", err);

      setActionError(
        err.response?.data?.message ??
        "Não foi possível concluir a rotina. Tente novamente.",
      );
    } finally {
      setCompletingScheduleIds((current) =>
        current.filter((id) => id !== scheduleId),
      );
    }
  }

  const items = day?.items ?? [];

  console.log("Meu Dia — data:", day?.date);
  console.table(
    items.map((item) => ({
      name: item.name,
      routineScheduleId: item.routineScheduleId,
      status: item.status,
      startTime: item.startTime,
    })),
  );

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
          <span className="page-eyebrow">UM DIA DE CADA VEZ</span><h1>Minha agenda</h1>
          <p>Carregando seu dia...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="my-day-page">
        <div className="day-page-intro">
          <span className="page-eyebrow">UM DIA DE CADA VEZ</span><h1>Minha agenda</h1>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="my-day-page">
      <div className="day-page-intro">
        <span className="page-eyebrow">UM DIA DE CADA VEZ</span><h1>Minha agenda</h1>
        <p>{dateLabel}</p>
      </div>

      <div className="my-day-overview">
        <article className="my-day-progress">
          <div className="day-progress-ring" style={{ background: `conic-gradient(#28745b ${progress}%, #e8f0eb 0)` }}>
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
          {actionError && (
            <p role="alert" className="day-action-error">
              {actionError}
            </p>
          )}

          <DaySchedule
            items={items}
            onComplete={handleCompleteRoutine}
            completingIds={completingScheduleIds}
          />
        </article>

        <aside className="agenda-help">
          <h2>Seu tempo, bem cuidado.</h2>
          <p>Organize as próximas atividades no planejamento e acompanhe suas rotinas por aqui.</p>
          <Link to="/planejamento?aba=rotinas">Organizar rotinas →</Link>
          <Link to="/planejamento?aba=lembretes">Criar um lembrete →</Link>
          <Link to="/planejamento?aba=metas">Revisar minhas metas →</Link>
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


export default MyDay;

