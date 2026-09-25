import { ArrowUpRight, CheckCircle2, Circle, Star } from "lucide-react";

function TaskIcon({ task }) {
  if (task.done) {
    return <CheckCircle2 size={29} />;
  }

  return <Circle size={28} strokeWidth={1.7} />;
}

function TaskTag({ task }) {
  const TagIcon = task.done
    ? CheckCircle2
    : task.tone === "orange"
      ? ArrowUpRight
      : task.tone === "purple"
        ? Star
        : CheckCircle2;

  return (
    <span className="day-task-tag">
      <TagIcon size={14} />
      {task.tag}
    </span>
  );
}

function getTaskTone(task, index) {
  if (task.done) {
    return "green";
  }

  if (task.type === "STUDY" || task.type === "WORK") {
    return "orange";
  }

  if (index % 3 === 2) {
    return "purple";
  }

  return "orange";
}

function getTaskTag(task) {
  if (task.done) {
    return "Concluída";
  }

  return task.type === "WORK" || task.type === "STUDY"
    ? "Prioridade"
    : "Programada";
}

function formatTime(time) {
  if (!time) {
    return "--:--";
  }

  if (typeof time === "string") {
    return time.slice(0, 5);
  }

  const date = new Date(time);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPeriod(time) {
  const hour = Number(time?.slice(0, 2));

  if (Number.isNaN(hour)) {
    return null;
  }

  if (hour < 12) {
    return "Manhã";
  }

  if (hour < 18) {
    return "Tarde";
  }

  return "Noite";
}

function normalizeTask(task, index) {
  const time = formatTime(task.startTime);

  return {
    ...task,
    time,
    title: task.name,
    meta: task.endTime
      ? `${time} - ${formatTime(task.endTime)}`
      : "Atividade programada",
    done: task.status === "COMPLETED",
    tone: getTaskTone(
      {
        ...task,
        done: task.status === "COMPLETED",
      },
      index,
    ),
    tag: getTaskTag({
      ...task,
      done: task.status === "COMPLETED",
    }),
    period: getPeriod(time),
  };
}

export function DaySchedule({
  items = [],
  tasks,
  compact = false,
  suggested = false,
}) {
  const sourceItems = items.length > 0 ? items : tasks || [];

  const normalizedTasks = sourceItems.map((task, index) =>
    normalizeTask(task, index),
  );

  return (
    <div
      className={`day-schedule ${
        compact ? "day-schedule-compact" : ""
      }`}
    >
      {normalizedTasks.map((task) => (
        <div
          className={`day-schedule-row day-${task.tone} ${
            suggested && task.time === "14:00"
              ? "day-task-dragging"
              : ""
          }`}
          key={`${task.time}-${task.title}`}
        >
          {task.period && !compact && (
            <strong className="day-period">{task.period}</strong>
          )}

          <time>{task.time}</time>

          <span className="day-schedule-dot" />

          <div className="day-task-card">
            <TaskIcon task={task} />

            <div className="day-task-copy">
              <strong>{task.title}</strong>
              <span>{task.meta}</span>
            </div>

            <TaskTag task={task} />
          </div>

          {suggested && task.time === "14:00" && (
            <div className="day-drop-zone">
              Solte aqui para mover
            </div>
          )}
        </div>
      ))}
    </div>
  );
}