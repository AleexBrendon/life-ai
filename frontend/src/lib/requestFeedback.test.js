import test from 'node:test';
import assert from 'node:assert/strict';
import { requestTimeout, requestErrorMessage, requestFieldErrors } from './requestFeedback.js';

test('gerações têm tempo maior sem alongar consultas ou gravações comuns', () => {
  assert.equal(requestTimeout('/ai/week/preview', 'post'), 120000);
  assert.equal(requestTimeout('/ai/chat/?test=1', 'POST'), 120000);
  assert.equal(requestTimeout('/ai/recommendations', 'get'), 20000);
  assert.equal(requestTimeout('/ai/week/1/apply', 'post'), 20000);
  assert.equal(requestTimeout('/planner/metas', 'post'), 20000);
});
test('explica limite, falha de conexão e resultado incerto depois de timeout', () => {
  assert.match(requestErrorMessage({ response: { status: 429, headers: { 'retry-after': '45' }, data: { message: 'Aguarde.' } } }), /45 segundos/);
  assert.match(requestErrorMessage({ code: 'ECONNABORTED' }), /Confira se a alteração foi salva/);
  assert.match(requestErrorMessage({}), /conexão/);
});
test('normaliza erros em texto ou objetos sem expor objetos como mensagem', () => {
  assert.deepEqual(requestFieldErrors({ response: { data: { errors: ['title: Inválido', { field: 'date', message: 'Revise a data' }, null] } } }), [
    { field: 'title', message: 'Inválido' }, { field: 'date', message: 'Revise a data' },
  ]);
});
