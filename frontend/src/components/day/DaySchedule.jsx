import { ArrowUpRight, CheckCircle2, Circle, Star } from "lucide-react";
import { dayTasks } from "./dayData";

function TaskIcon({ task }) {
  if (task.done) return <CheckCircle2 size={29} />;
  return <Circle size={28} strokeWidth={1.7} />;
}

function TaskTag({ task }) {
  const TagIcon = task.done ? CheckCircle2 : task.tone === "orange" ? ArrowUpRight : task.tone === "purple" ? Star : CheckCircle2;
  return <span className="day-task-tag"><TagIcon size={14} />{task.tag}</span>;
}

export function DaySchedule({ tasks = dayTasks, compact = false, suggested = false }) {
  return <div className={`day-schedule ${compact ? "day-schedule-compact" : ""}`}>
    {tasks.map((task) => (
      <div className={`day-schedule-row day-${task.tone} ${suggested && task.time === "14:00" ? "day-task-dragging" : ""}`} key={`${task.time}-${task.title}`}>
        {task.period && !compact && <strong className="day-period">{task.period}</strong>}
        <time>{task.time}</time><span className="day-schedule-dot" />
        <div className="day-task-card"><TaskIcon task={task} /><div className="day-task-copy"><strong>{task.title}</strong><span>{task.meta}</span></div><TaskTag task={task} /></div>
        {suggested && task.time === "14:00" && <div className="day-drop-zone">Solte aqui para mover</div>}
      </div>
    ))}
  </div>;
}
