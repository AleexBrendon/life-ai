// Real browser smoke checks with CDP. All API calls use synthetic data.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer, preview as startPreview } from 'vite';
import { evolutionReply, runEvolutionQA, seedSession } from './evolution-qa.mjs';
const evolutionMode = process.argv.includes('--evolution');
const iconsMode = process.argv.includes('--icons');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browserPath = process.env.FRONTEND_BROWSER_PATH || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(existsSync);
if (!browserPath) throw new Error('Defina FRONTEND_BROWSER_PATH com o executável de Chrome, Chromium ou Edge.');
const profile = await mkdtemp(path.join(tmpdir(), 'lifeai-frontend-qa-'));
let server, browser, socket;
let failSave = true;
const pending = new Map(), exceptions = [];
let sequence = 0;
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
  pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
  socket.send(JSON.stringify({ id, method, params }));
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
async function waitFor(expression) {
  for (let index = 0; index < 200; index++) { if (await evaluate(`Promise.resolve(${expression}).then(Boolean)`)) return; await pause(50); }
  throw new Error('UI timeout: ' + expression);
}
const clickText = text => evaluate(`Array.from(document.querySelectorAll('button')).find(el=>el.textContent.trim()===${JSON.stringify(text)}).click()`);
async function capture(name, scrollTop = false) {
  if (scrollTop) await evaluate('window.scrollTo(0,0)');
  await evaluate('document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)))))');
  await writeFile(path.join(profile, name), Buffer.from((await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false })).data, 'base64'));
}
async function escape() {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
}
const goalTitle = async () => {
  await evaluate("document.querySelector('#metas-title').focus()");
  await send('Input.insertText', { text: 'Aprender piano' });
  await pause(100);
};
function apiResponse(url, method) {
  const route = new URL(url).pathname;
  if (route === '/api/planner/metas' && method === 'POST') return failSave
    ? { status: 400, body: { success: false, message: 'Revise os campos.', errors: ['title: Título já utilizado.'] } }
    : { status: 201, body: { success: true, data: { id: 1 } } };
  const day = '2026-11-13';
  if (route === '/api/dashboard') return { body: { success: true, data: {
    date: day, timezone: 'America/Sao_Paulo', summary: { totalActivities: 2, completed: 0, totalScheduledRoutines: 1, totalScheduledReminders: 0, totalGoalSessions: 1, totalWorkSchedules: 0 },
    routines: { scheduled: [{ id: 1, name: 'Treinar flauta', schedules: [{ id: 2, startTime: '10:00', endTime: '11:00' }] }], executions: [] },
    reminders: { scheduled: [], executions: [] }, work: [], unexpectedEvents: [],
    goals: { sessions: [{ id: 3, startTime: '13:00', endTime: '14:00', status: 'PENDING', goal: { title: 'Estudar' } }] },
    activities: [{ kind: 'rotinas', sourceId: 2, status: 'PENDING' }],
  } } };
  if (route === '/api/dashboard/insights') return { body: { success: true, data: { days: 7, startDate: day, endDate: day, heatmap: [], summary: { rate: 0, completed: 0, total: 0, minutes: 0, activeDays: 0 } } } };
  return { body: { success: true, data: [] } };
}

try {
  server = evolutionMode ? await startPreview({ root, preview: { host: '127.0.0.1', port: 0, strictPort: false } }) : await createServer({ root, define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') }, server: { host: '127.0.0.1', port: 0, strictPort: false } });
  if (!evolutionMode) await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Browser startup timeout')), 15000);
    browser.once('error', error => { clearTimeout(timer); reject(error); });
    browser.stderr.on('data', chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); resolve(new URL(match[1])); } });
  });
  const targets = await (await fetch(`http://${endpoint.host}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await once(socket, 'open');
  socket.addEventListener('message', async event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callbacks = pending.get(message.id); pending.delete(message.id);
      if (message.error) callbacks?.reject(new Error(message.error.message)); else callbacks?.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    else if (message.method === 'Fetch.requestPaused') {
      try {
      const { requestId, request } = message.params;
      if (new URL(request.url).pathname.startsWith('/api/')) {
        const reply = (evolutionMode ? evolutionReply(request) : null) || apiResponse(request.url, request.method);
        await send('Fetch.fulfillRequest', { requestId, responseCode: reply.status || 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(reply.body)).toString('base64') });
      } else if (new URL(request.url).origin !== origin) await send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
      else await send('Fetch.continueRequest', { requestId });
      } catch (error) { if (!error.message.includes('Invalid InterceptionId')) exceptions.push(error.message); }
    }
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-11-13T13:30:00Z']))}static now(){return new RealDate('2026-11-13T13:30:00Z').getTime()}};${evolutionMode ? seedSession : ''}` });
  if (iconsMode) {
    const svg = await readFile(path.join(root, 'public/lifeai-icon.svg'), 'utf8');
    await send('Page.navigate', { url: 'about:blank' });
    const tree = await send('Page.getFrameTree');
    await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    for (const size of [512, 192, 180]) {
      await send('Emulation.setDeviceMetricsOverride', { width: size, height: size, deviceScaleFactor: 1, mobile: false });
      await send('Page.setDocumentContent', { frameId: tree.frameTree.frame.id, html: `<html><body style="margin:0">${svg.replace('viewBox=', `width="${size}" height="${size}" viewBox=`)}</body></html>` });
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))');
      const picture = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: size, height: size, scale: 1 } });
      await writeFile(path.join(root, `public/lifeai-icon-${size}.png`), Buffer.from(picture.data, 'base64'));
    }
    console.log('Ícones PNG 512, 192 e 180 gerados a partir do SVG vetorial.');
  } else if (evolutionMode) {
    await runEvolutionQA({ send, evaluate, waitFor, clickText, capture, origin, profile });
  } else {
  await send('Page.navigate', { url: `${origin}/tests/ui/fixture.html` });
  await waitFor("document.querySelector('dialog[open] #metas-title')");
  await goalTitle(); await clickText('Cancelar');
  await waitFor("document.querySelector('dialog[open]')?.textContent.includes('Descartar alterações?')");
  await clickText('Continuar editando');
  await waitFor("document.querySelector('#metas-title')?.value==='Aprender piano'");
  await escape();
  await waitFor("document.querySelector('dialog[open]')?.textContent.includes('Descartar alterações?')");
  await clickText('Continuar editando');
  await evaluate("document.querySelector('#metas-targetDate').click()");
  await waitFor("document.querySelector('.picker-calendar:popover-open')");
  await escape();
  await waitFor("!document.querySelector('.picker-calendar:popover-open') && document.querySelector('#metas-title')");
  await clickText('Adicionar');
  await evaluate("document.querySelector('.studio-child-row .schedule-time .picker-trigger').click()");
  await waitFor("document.querySelector('.picker-time:popover-open')");
  await evaluate("document.querySelector('.picker-time:popover-open [aria-label=\"14 horas\"]').click()");
  await clickText('Confirmar horário');
  assert.equal(await evaluate("document.querySelector('.studio-child-row input[type=time]').value"), '14:00');
  await clickText('Remover'); await clickText('Salvar alterações');
  await waitFor("document.activeElement?.classList.contains('editor-error-summary')");
  await clickText('Título: Título já utilizado.');
  assert.equal(await evaluate('document.activeElement.id'), 'metas-title');
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  await capture('editor-mobile.png');
  failSave = false; await clickText('Salvar alterações');
  await waitFor("document.body.textContent.includes('Cadastro salvo')");
  await send('Page.navigate', { url: `${origin}/tests/ui/fixture.html` });
  await waitFor("document.querySelector('dialog[open] #metas-title')");
  await clickText('Cancelar');
  await waitFor("document.body.textContent.includes('Editor fechado')");
  await send('Page.navigate', { url: `${origin}/tests/ui/fixture.html` });
  await waitFor("document.querySelector('dialog[open] #metas-title')");
  await goalTitle(); await evaluate("document.querySelector('dialog[open] [aria-label=Fechar]').click()");
  await waitFor("document.querySelector('dialog[open]')?.textContent.includes('Descartar alterações?')");
  await clickText('Descartar alterações');
  await waitFor("document.body.textContent.includes('Editor fechado')");
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${origin}/tests/ui/fixture.html?view=dashboard` });
  await waitFor("document.querySelector('[aria-label=\"Compromisso em andamento\"]')?.textContent.includes('Treinar flauta')");
  await waitFor("document.body.textContent.includes('Sem registros neste período')");
  await waitFor("document.querySelector('.overview-page')?.contains(document.elementFromPoint(100,100))");
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  await capture('dashboard-desktop.png', true);
  await send('Page.navigate', { url: `${origin}/tests/ui/fixture.html?kind=rotinas` });
  await waitFor("document.querySelector('dialog[open] #rotinas-name')");
  await evaluate("document.querySelector('.editor-planning-options summary').click()");
  await evaluate("document.querySelector('#rotinas-autoSchedule').click()");
  await waitFor("document.querySelector('.editor-planning-options').open && document.querySelector('#rotinas-weeklyFrequency')");
  assert.deepEqual(exceptions, []);
  console.log('UI aprovada: confirmação por Cancelar/X/Escape, descarte, preservação, seletores de data/hora, erro/foco, salvamento, opções de IA, destaque em andamento e largura mobile/desktop.');
  }
  assert.deepEqual(exceptions, []);
  console.log('Screenshots: ' + profile);
} catch (error) {
  if (socket?.readyState === WebSocket.OPEN) {
    console.error('UI state:', await evaluate('document.body.innerText.slice(0,2500)').catch(() => 'unavailable'));
    await writeFile(path.join(profile, 'failure.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64')).catch(() => {});
    console.error('Artifacts:', profile);
  }
  throw error;
} finally {
  socket?.close(); browser?.kill();
  if (server?.close) await server.close(); else if (server?.httpServer) await new Promise(resolve => server.httpServer.close(resolve));
  // Artifacts remain in the uniquely named OS temporary directory for inspection.
}
