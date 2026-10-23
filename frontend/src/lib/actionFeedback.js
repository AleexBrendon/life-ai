export function actionFeedback(config = {}) {
 const method = (config.method || 'get').toLowerCase();
 if (!['post','put','patch','delete'].includes(method)) return null;
 const path = new URL(config.url || '/', 'http://lifeai.local').pathname.replace(/^\/api/, '').replace(/\/$/, '');
 if (/^\/(auth|ai)(\/|$)/.test(path)) return null;
 let body = config.data || {};
 if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
 if (path === '/notifications/read-all') return 'Notificações marcadas como lidas.';
 if (/^\/notifications\//.test(path)) return path.endsWith('/drink') ? '250 ml de água registrados.' : null;
 if (!/^\/(planner|personal|users|activity-status|jobs|goals|routines|reminders|routine-executions|reminder-executions|unexpected-events)(\/|$)/.test(path)) return null;
 if (method === 'delete') return 'Registro excluído com sucesso.';
 if (path === '/personal/debt-plans') return 'Simulação financeira salva.';
 if (/^\/personal\/debt-plans\/\d+\/choose$/.test(path)) return 'Estratégia escolhida e salva. Nenhum pagamento foi realizado.';
 if (path === '/users/me') return 'Configurações salvas.';
 if (/^\/personal\/finance-bills\/\d+\/status$/.test(path)) return ({PAID:'Pagamento ou recebimento registrado.',UNPAID:'Não pagamento registrado.',POSTPONED:'Nova data registrada.',PENDING:'Conta voltou a pendente.'})[body.status] || 'Situação financeira atualizada.';
 if (path === '/personal/water/intakes' && method === 'post') return `${body.amountMl || 250} ml de água registrados.`;
 if (path === '/activity-status') return ({COMPLETED:'Atividade concluída.',SKIPPED:'Atividade pulada neste dia.',PENDING:'Atividade voltou a pendente.'})[body.status] || 'Status atualizado.';
 if (/\/tasks\//.test(path)) return 'Tarefa atualizada com sucesso.';
 return method === 'post' ? 'Cadastro realizado com sucesso.' : 'Alterações salvas com sucesso.';
}
export function showFeedback(message) {
 if (message) window.dispatchEvent(new CustomEvent('lifeai:feedback', { detail: { message } }));
}
