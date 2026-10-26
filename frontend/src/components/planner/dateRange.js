export const MAX_RANGE_DAYS=365;
export const shiftDate=(key,amount)=>{const d=new Date(`${key}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10)};
export const countDays=(start,end)=>Math.round((new Date(`${end}T00:00:00Z`)-new Date(`${start}T00:00:00Z`))/86400000)+1;
export function rangeError(start,end,today){if(!start||!end)return 'Selecione o início e o fim do período.';const days=countDays(start,end);if(!Number.isInteger(days)||days<1)return 'A data final deve ser igual ou posterior à inicial.';if(days>MAX_RANGE_DAYS)return 'Escolha um período de até 365 dias.';if(end>today)return 'O histórico pode ser consultado até hoje.';return ''}
