import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionFeedback } from './actionFeedback.js';

test('consultas e operações de autenticação não geram confirmação de cadastro',()=>{
 assert.equal(actionFeedback({url:'/planner/rotinas'}),null);
 assert.equal(actionFeedback({method:'post',url:'/auth/login'}),null);
 assert.equal(actionFeedback({method:'post',url:'/ai/setup/preview'}),null);
});
test('alterações no Kanban e exclusões usam confirmações de ação',()=>{
 assert.equal(actionFeedback({method:'patch',url:'/jobs/2/tasks/9'}),'Tarefa atualizada com sucesso.');
 assert.equal(actionFeedback({method:'delete',url:'/api/planner/imprevistos/2'}),'Registro excluído com sucesso.');
});
test('status da agenda e consumo de água refletem os dados enviados pelo axios',()=>{
 assert.equal(actionFeedback({method:'put',url:'/activity-status',data:JSON.stringify({status:'SKIPPED'})}),'Atividade pulada neste dia.');
 assert.equal(actionFeedback({method:'post',url:'/personal/water/intakes',data:JSON.stringify({amountMl:350})}),'350 ml de água registrados.');
});
test('ler um aviso é silencioso e marcar todos confirma a ação',()=>{
 assert.equal(actionFeedback({method:'patch',url:'/notifications/3/read'}),null);
 assert.equal(actionFeedback({method:'patch',url:'/notifications/read-all'}),'Notificações marcadas como lidas.');
});
