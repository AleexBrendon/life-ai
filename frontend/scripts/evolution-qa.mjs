import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const user = { id: 1, name: 'Pessoa de teste', email: 'qa@example.invalid', profile: { timezone: 'America/Sao_Paulo', notifyUpcoming: false, notifyActions: false, weekStartsOn: 1, calendarView: 'day' } };
const goal = { id: 1, title: 'Estudar livros', milestones: [], sessions: [{ id: 2, date: '2026-11-12T00:00:00.000Z', startTime: '14:00', endTime: '15:00', status: 'COMPLETED' }, { id: 3, date: '2026-11-13T00:00:00.000Z', startTime: '14:00', endTime: '15:00', status: 'PENDING' }] };
let preference = { enabled: false, quietEnabled: true, quietStart: '22:00', quietEnd: '07:00', upcoming: true, hydration: true, actions: false, showDetails: false };
const receipts = new Set();
const success = data => ({ body: { success: true, data } });
export function evolutionReply(request) {
  const url = new URL(request.url), route = url.pathname, method = request.method;
  const input = request.postData ? JSON.parse(request.postData) : {};
  if (route === '/api/auth/me' || route === '/api/users/me') return success({ user });
  if (route === '/api/personal/water') return success({ plan: { id: 1, enabled: false, goalMl: 2000, cupMl: 250, intervalMinutes: 120, startTime: '08:00', endTime: '20:00' }, totalMl: 0, date: '2026-11-13', intakes: [] });
  if (route === '/api/goals') return success([goal]);
  if (route === '/api/planner/metas') return success([goal]);
  if (route === '/api/evolution/goals/1') return success(goal);
  if (route === '/api/evolution/goals/1/milestones') { goal.milestones.push({ id: 1, ...input, current: 0, percent: 0, completed: false, entries: [] }); return success(goal.milestones[0]); }
  if (route === '/api/evolution/milestones/1/progress') { const milestone = goal.milestones[0]; milestone.current += input.amount; milestone.percent = Math.round(milestone.current / milestone.target * 100); milestone.entries.push({ id: 1, ...input, createdAt: '2026-11-13T13:30:00Z', session: { date: '2026-11-12T00:00:00Z' } }); return success(milestone.entries[0]); }
  if (route === '/api/evolution/reviews' && method === 'POST') return success({ id: 1, weekStart: input.weekStart, metrics: { summary: { planned: 10, completed: 4, skipped: 2, pending: 4, rate: 40 }, daily: [{ date: input.weekStart, planned: 10, completed: 4 }] }, suggestions: [{ id: 'rotinas', title: 'Revisar rotinas', reason: 'Considere uma semana mais leve.' }], accepted: [], notes: '', status: 'DRAFT' });
  if (route === '/api/evolution/reviews') return success([]);
  if (route === '/api/evolution/reviews/1') return success({ ...input, status: 'REVIEWED' });
  if (route === '/api/evolution/calendar/connections') return success({ feedConfigured: false, connections: [] });
  if (route === '/api/evolution/calendar/preview') return success({ id: 1, name: input.name, warnings: [], rows: [{ externalKey: 'conflict', title: 'Evento com conflito', date: '2026-11-13', startTime: '08:00', endTime: '09:00', conflicts: ['Trabalho'], localEdited: false, unchanged: false }, { externalKey: 'free', title: 'Evento livre', date: '2026-11-14', startTime: '10:00', endTime: '11:00', conflicts: [], localEdited: false, unchanged: false }] });
  if (route === '/api/evolution/calendar/imports/1/apply') return success({ applied: input.decisions.length });
  if (route === '/api/evolution/push') return success({ configured: false, publicKey: null, preference, devices: [] });
  if (route === '/api/evolution/push/preferences') { preference = input; return success(preference); }
  if (route === '/api/evolution/sync') return success(input.operations.map(operation => { receipts.add(operation.id); return { id: operation.id, status: 'APPLIED' }; }));
  if (route === '/api/activity-status') return success([{ kind: 'metas', sourceId: 3, status: 'PENDING' }]);
  if (route === '/api/dashboard') return success({ date: '2026-11-13', timezone: 'America/Sao_Paulo', summary: { totalActivities: 1, completed: 0, totalScheduledRoutines: 0, totalScheduledReminders: 0, totalGoalSessions: 1, totalWorkSchedules: 0 }, activities: [{ kind: 'metas', sourceId: 3, status: 'PENDING' }], routines: { scheduled: [], executions: [] }, reminders: { scheduled: [], executions: [] }, work: [], goals: { sessions: [{ id: 3, goal: { title: 'Estudar' }, startTime: '14:00', endTime: '15:00', status: 'PENDING' }] }, unexpectedEvents: [] });
  return null;
}
export const seedSession = `if(!sessionStorage.getItem('qa-no-seed')){localStorage.setItem('lifeai_account','1');localStorage.setItem('lifeai_token','qa.'+btoa(JSON.stringify({sub:1,exp:2000000000}))+'.test');}`;
export async function runEvolutionQA({ send, evaluate, waitFor, clickText, capture, origin, profile }) {
  const navigate = path => send('Page.navigate', { url: origin + path });
  const fill = async (selector, value) => { await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});element.focus();element.select()})()`); await send('Input.insertText', { text: String(value) }); };
  await navigate('/evolucao?aba=revisao'); await waitFor("document.body.textContent.includes('Gerar revisão')");
  await clickText('Gerar revisão'); await waitFor("document.body.textContent.includes('4 de') || document.body.textContent.includes('Revisar rotinas')");
  await clickText('Salvar revisão'); await waitFor("document.body.textContent.includes('Revisão salva.')");
  await clickText('Marcos das metas'); await waitFor("document.body.textContent.includes('Adicionar marco')");
  await fill('input[placeholder="Ex.: terminar a leitura de 3 livros"]', 'Ler três livros');
  await fill('input[type=number]', 3); await clickText('Adicionar marco');
  await waitFor("document.body.textContent.includes('Registrar progresso')");
  await fill('.evolution-card input[type=number]', 1); await clickText('Registrar progresso');
  await waitFor("document.body.textContent.includes('33%')");
  await capture('marcos-mobile.png', true);
  await clickText('Calendários'); await waitFor("document.querySelector('input[type=file]')");
  const filename = path.join(profile, 'example.ics'); await writeFile(filename, 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n');
  const { root } = await send('DOM.getDocument'); const node = await send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type=file]' });
  await send('DOM.setFileInputFiles', { nodeId: node.nodeId, files: [filename] });
  await waitFor("!Array.from(document.querySelectorAll('button')).find(el=>el.textContent==='Revisar importação').disabled");
  await clickText('Revisar importação'); await waitFor("document.body.textContent.includes('Evento com conflito')");
  await evaluate("document.querySelector('.evolution-list article input[type=checkbox]').click()");
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(el=>el.textContent.includes('Aplicar 2')).disabled"), true);
  await evaluate("document.querySelectorAll('.evolution-list article input[type=checkbox]')[1].click()");
  await clickText('Aplicar 2 ocorrência(s)'); await waitFor("document.body.textContent.includes('2 ocorrência(s) atualizada(s).')");
  await clickText('Notificações push'); await waitFor("document.body.textContent.includes('Preferências da conta')");
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(el=>el.textContent==='Ativar push neste dispositivo').disabled"), true);
  await evaluate("Array.from(document.querySelectorAll('label')).find(el=>el.textContent.includes('Mostrar títulos')).querySelector('input').click()");
  await clickText('Salvar preferências'); await waitFor("Array.from(document.querySelectorAll('button')).some(el=>el.textContent==='Salvar preferências' && !el.disabled)");
  assert.equal(preference.showDetails, true);
  await clickText('Dados e offline'); await waitFor("document.body.textContent.includes('Ativar e salvar dados offline')");
  await clickText('Ativar e salvar dados offline'); await waitFor("document.body.textContent.includes('Dados do dia e cadastros salvos neste dispositivo.')");
  await evaluate('navigator.serviceWorker.ready.then(()=>new Promise(resolve=>{if(navigator.serviceWorker.controller)resolve(true);else navigator.serviceWorker.addEventListener("controllerchange",()=>resolve(true),{once:true})}))');
  await send('Network.enable'); await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await navigate('/dashboard'); await waitFor("document.body.textContent.includes('Sem conexão.') && document.querySelector('.dashboard-next-feature')");
  await navigate('/agenda?data=2026-11-13'); await waitFor("document.body.textContent.includes('Estudar')");
  await clickText('Concluir');
  await waitFor("document.querySelector('.offline-banner')?.textContent.includes('1 ação')");
  await navigate('/evolucao?aba=dados'); await waitFor("document.body.textContent.includes('Modo offline ativado.')");
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  await waitFor("document.querySelector('.header-brand img')?.naturalWidth>0");
  await capture('offline-mobile.png', true);
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await waitFor("!Array.from(document.querySelectorAll('button')).find(el=>el.textContent==='Sincronizar pendências').disabled");
  await clickText('Sincronizar pendências');
  await waitFor("document.body.textContent.includes('1 ação(ões) enviada(s)')");
  assert.equal(receipts.size, 1);
  // Ending the session must remove offline identity and private cached data.
  await evaluate("document.querySelector('[aria-label=\"Sair da conta\"]').click()");
  await waitFor("!localStorage.getItem('lifeai_account') && !localStorage.getItem('lifeai_token')");
  await waitFor("!localStorage.getItem('lifeai_offline_1')");
  await waitFor(`new Promise((resolve,reject)=>{const request=indexedDB.open('lifeai-offline-v1');request.onsuccess=()=>{const db=request.result;const tx=db.transaction(['cache','queue'],'readonly');let privateRows=0;for(const name of ['cache','queue']){const rows=tx.objectStore(name).getAll();rows.onsuccess=()=>{privateRows+=rows.result.filter(row=>row.account==='1').length}}tx.oncomplete=()=>{db.close();resolve(privateRows===0)}};request.onerror=()=>reject(request.error)})`);
  await evaluate("sessionStorage.setItem('qa-no-seed','1');localStorage.setItem('lifeai_account','2');localStorage.setItem('lifeai_token','qa.'+btoa(JSON.stringify({sub:2,exp:2000000000}))+'.test');localStorage.setItem('lifeai_offline_2','true')");
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await navigate('/dashboard');
  await waitFor("document.body.textContent.includes('Não foi possível confirmar sua sessão.')");
  assert.equal(await evaluate("document.body.textContent.includes('Pessoa de teste')"), false);
  console.log('Evolução aprovada: revisão, marcos, confirmação de conflitos ICS, preferências push, shell de produção offline, agenda salva e limpeza da sessão.');
}
