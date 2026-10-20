const prisma = require('../database/prisma');
const areas = { rotinas:'Rotinas', trabalho:'Trabalho', metas:'Metas', lembretes:'Lembretes', imprevistos:'Imprevistos', routines:'Rotinas', jobs:'Trabalho', goals:'Metas', reminders:'Lembretes', 'routine-executions':'Rotinas', 'reminder-executions':'Lembretes', 'unexpected-events':'Imprevistos' };
function describe(req, body) {
 const path = req.originalUrl.split('?')[0];
 if (!['POST','PUT','PATCH','DELETE'].includes(req.method) || !req.user?.id || path.startsWith('/api/notifications') || path.startsWith('/api/auth')) return null;
 if (path === '/api/ai/chat' || path === '/api/ai/setup/preview' && !body.data?.proposal) return null;
 const pieces = path.split('/').filter(Boolean);
 const area = path.startsWith('/api/users') ? 'Configurações'
  : path.startsWith('/api/personal/water') ? 'Água'
  : path.startsWith('/api/personal/finance') ? 'Finanças'
  : path.startsWith('/api/ai') ? 'Assistente IA'
  : areas[pieces[1] === 'planner' ? pieces[2] : pieces[1]] || areas[req.body?.kind];
 if (!area) return null;
 let action = req.method === 'DELETE' ? 'Registro excluído' : req.method === 'POST' ? 'Registro adicionado' : 'Registro atualizado';
 const state = req.body?.reminderState || req.body?.status;
 if (state === 'COMPLETED' || state === 'DONE' || state === 'RESOLVED' || /\/complete$/.test(path)) action = 'Atividade concluída';
 else if (state === 'SKIPPED' || /\/skip$/.test(path)) action = 'Atividade pulada';
 else if (path === '/api/activity-status' && state === 'PENDING') action = 'Atividade voltou a pendente';
 else if (state === 'IN_PROGRESS') action = 'Atividade em andamento';
 else if (state === 'PAUSED') action = 'Lembrete pausado';
 else if (/\/approve$|\/apply$/.test(path)) action = 'Proposta da IA aplicada';
 else if (/\/reject$/.test(path)) action = 'Proposta da IA recusada';
 else if (/\/plan$/.test(path)) action = 'Planejamento gerado';
 else if (area === 'Configurações') action = 'Perfil e preferências atualizados';
 const record = body.data?.user || body.data;
 const name = typeof record?.name === 'string' ? record.name : typeof record?.title === 'string' ? record.title : typeof req.body?.title === 'string' ? req.body.title : typeof req.body?.name === 'string' ? req.body.name : '';
 const day = typeof req.body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date) ? ` Data: ${req.body.date.split('-').reverse().join('/')}.` : '';
 const entityType = { 'Configurações':'perfil','Água':'agua','Finanças':'financas','Assistente IA':'ia','Rotinas':'rotinas','Trabalho':'trabalho','Metas':'metas','Lembretes':'lembretes','Imprevistos':'imprevistos' }[area];
 const entityId = Number.isInteger(req.body?.sourceId) ? req.body.sourceId : record?.id;
 return { title: `${area} · ${action}`, message: `${action}${name ? `: ${name.slice(0,100)}` : ''}.${day}`, type: 'ACTIVITY', priority: 'LOW', entityType, ...(Number.isInteger(entityId) ? { entityId } : {}) };
}
module.exports = function activityNotification(req, res, next) {
 const json = res.json.bind(res);
 res.json = function (body) {
  if (res.statusCode < 200 || res.statusCode >= 300 || body?.success === false) return json(body);
  const notification = describe(req, body || {});
  if (!notification) return json(body);
  return (async () => {
   try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id }, select: { notifyActions: true } });
    if (profile?.notifyActions !== false || req.originalUrl.startsWith('/api/users')) {
     await prisma.notification.create({ data: { userId: req.user.id, ...notification } });
     res.setHeader('X-Activity-Notification', 'created');
    }
   } catch (error) { console.error('Não foi possível registrar aviso de atividade:', error.code || error.name); }
   return json(body);
  })();
 };
 next();
};
module.exports.describe = describe;
