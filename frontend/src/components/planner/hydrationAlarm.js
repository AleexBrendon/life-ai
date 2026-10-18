const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
export function hydrationAlarm(data, now = new Date()) {
 if (!data?.plan.enabled) return { state: 'disabled', label: 'Ativar lembretes de água' };
 const timezone = data.timezone || 'America/Sao_Paulo';
 let parts;
 try { parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(part => [part.type, part.value])); }
 catch { return { state: 'refresh', label: 'Atualizando horário…' }; }
 const date = `${parts.year}-${parts.month}-${parts.day}`;
 if (date !== data.date) return { state: 'refresh', label: 'Atualizando o dia…' };
 if (data.totalMl >= data.plan.goalMl) return { state: 'complete', label: 'Meta de água atingida' };
 const minute = Number(parts.hour) * 60 + Number(parts.minute), second = Number(parts.second);
 const start = minutes(data.plan.startTime), end = minutes(data.plan.endTime), interval = data.plan.intervalMinutes;
 if (minute > end) return { state: 'outside', label: `Amanhã às ${data.plan.startTime}` };
 const slot = Math.floor((minute - start) / interval);
 const next = minute < start ? start : start + (slot + 1) * interval;
 const seconds = next <= end ? Math.max(0, (next - minute) * 60 - second) : null;
 const duration = seconds === null ? null : [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
 return { state: minute < start ? 'waiting' : 'active', key: minute < start ? null : `${data.plan.id}:${date}:${slot}:${start}:${interval}`,
  label: duration ? `Próximo em ${duration}` : `Amanhã às ${data.plan.startTime}` };
}
