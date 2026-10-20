const { localClock } = require('../services/personalPlanning.service');
const PROJECT_START = '2026-10-17';
function canOccurOn(date, timezone, ...records) {
 if (date < PROJECT_START) return false;
 return records.every(record => {
  if (!record?.createdAt) return true;
  const created = new Date(record.createdAt);
  if (Number.isNaN(created.getTime())) return true;
  return date >= localClock(created, timezone || 'America/Sao_Paulo').date;
 });
}
module.exports = { PROJECT_START, canOccurOn };
