import {DatePicker} from './ScheduleInputs';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Columns3, Play, Pause, X, Timer, FolderGit2, CalendarDays, ArrowRightLeft } from 'lucide-react';
import api from '../../lib/api';
import { Dialog } from './EntityManager';
import { statuses } from './entityConfig';

const priorities = [['HIGH', 'Alta'], ['MEDIUM', 'Média'], ['LOW', 'Baixa']];
const priorityLabel = id => priorities.find(([key]) => key === id)?.[1] || 'Média';
const statusLabel = id => statuses.find(([key]) => key === id)?.[1] || id;
const emptyForm = { title: '', description: '', project: '', repositoryUrl: '', priority: 'MEDIUM', dueDate: '', estimatedMinutes: '' };
const errorMessage = (error, fallback) => error.response?.data?.message || fallback;
// trackedSeconds already includes the running interval up to fetchedAt.
function elapsed(task, now) {
 return task.trackedSeconds + (task.runningSince ? Math.max(0, Math.floor((now - Date.parse(task.fetchedAt)) / 1000)) : 0);
}
function clock(seconds) { const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
const dateText = value => new Date(value + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const eventText = event => ({ CREATE: 'Tarefa criada', START: 'Iniciada', RESUME: 'Tempo retomado', PAUSE: 'Tempo pausado', PRIORITY: 'Prioridade alterada' })[event.type] || `Movida de ${statusLabel(event.fromStatus)} para ${statusLabel(event.toStatus)}`;
const isLink = value => /^https?:\/\//i.test(value || '');

function useNow(active) {
 const [now, setNow] = useState(Date.now());
 useEffect(() => { if (!active) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [active]);
 return now;
}

function TaskDetails({ task, busy, error, onClose, onStart, onPause, onEdit, onDelete, onMove }) {
 const now = useNow(Boolean(task.runningSince));
 const running = Boolean(task.runningSince), seconds = elapsed(task, now);
 return <Dialog title={task.title} subtitle={`${statusLabel(task.status)} · prioridade ${priorityLabel(task.priority).toLowerCase()}`} onClose={onClose} busy={busy} className="kanban-task-dialog"><div className="studio-editor-body">
  <div className={`kanban-timer ${running ? 'running' : ''}`}><Timer size={20} /><div><strong>{clock(seconds)}</strong><span>{running ? 'Tempo contando' : task.status === 'IN_PROGRESS' ? 'Pausado. Continue quando quiser' : task.status === 'COMPLETED' ? 'Tempo total trabalhado' : 'Ainda não iniciada'}{task.estimatedMinutes ? ` · estimativa ${clock(task.estimatedMinutes * 60).slice(0, 5)}` : ''}</span></div></div>
  <dl className="kanban-task-facts">
   {task.project && <div><dt>Projeto</dt><dd>{task.project}</dd></div>}
   {task.repositoryUrl && <div><dt>Repositório ou link</dt><dd>{isLink(task.repositoryUrl) ? <a href={task.repositoryUrl} target="_blank" rel="noreferrer">{task.repositoryUrl}</a> : task.repositoryUrl}</dd></div>}
   {task.dueDate && <div><dt>Prazo</dt><dd>{dateText(task.dueDate)}</dd></div>}
   <div><dt>Prioridade</dt><dd>{priorityLabel(task.priority)}</dd></div>
   <div><dt>Criada em</dt><dd>{new Date(task.createdAt).toLocaleString('pt-BR')}</dd></div>
   {task.completedAt && <div><dt>Concluída em</dt><dd>{new Date(task.completedAt).toLocaleString('pt-BR')}</dd></div>}
  </dl>
  {task.description ? <p className="kanban-task-description">{task.description}</p> : <p className="studio-inline-empty">Sem descrição.</p>}
  {task.events.length > 0 && <details className="kanban-task-history"><summary>Histórico ({task.events.length})</summary><ul>{task.events.map(event => <li key={event.id}><strong>{eventText(event)}</strong><span>{new Date(event.createdAt).toLocaleString('pt-BR')}</span>{event.reason && <em>Motivo: {event.reason}</em>}</li>)}</ul></details>}
  <div className="kanban-move"><span><ArrowRightLeft size={14} /> Mover para</span>{statuses.filter(([id]) => id !== task.status).map(([id, label]) => <button key={id} type="button" className="studio-button secondary" disabled={busy} onClick={() => onMove(task, id)}>{label}</button>)}</div>
  {error && <p role="alert" className="studio-error">{error}</p>}
 </div><footer className="kanban-task-actions">
  <button type="button" className="studio-button secondary" disabled={busy} onClick={() => onEdit(task)}><Pencil size={14} />Editar</button>
  {task.status === 'TODO' && <><button type="button" className="studio-button secondary" disabled={busy} onClick={onClose}><X size={14} />Cancelar</button><button type="button" className="studio-button" disabled={busy} onClick={() => onStart(task)}><Play size={14} />Iniciar</button></>}
  {task.status === 'IN_PROGRESS' && <><button type="button" className="studio-button danger" disabled={busy} onClick={() => onDelete(task)}><Trash2 size={14} />Excluir</button>{running ? <button type="button" className="studio-button" disabled={busy} onClick={() => onPause(task)}><Pause size={14} />Pausar</button> : <button type="button" className="studio-button" disabled={busy} onClick={() => onStart(task)}><Play size={14} />Continuar</button>}</>}
  {task.status === 'COMPLETED' && <><button type="button" className="studio-button danger" disabled={busy} onClick={() => onDelete(task)}><Trash2 size={14} />Excluir</button><button type="button" className="studio-button secondary" disabled={busy} onClick={onClose}>Fechar</button></>}
 </footer></Dialog>;
}

export default function Kanban() {
 const [jobs, setJobs] = useState([]), [jobId, setJobId] = useState(''), [tasks, setTasks] = useState([]), [revision, setRevision] = useState(0), [jobsRevision, setJobsRevision] = useState(0);
 const [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false);
 const [editing, setEditing] = useState(undefined), [form, setForm] = useState(emptyForm), [openId, setOpenId] = useState(null), [deleting, setDeleting] = useState(null), [moving, setMoving] = useState(null), [dialogError, setDialogError] = useState('');
 const [dragging, setDragging] = useState(null);
 const now = useNow(tasks.some(task => task.runningSince));
 const open = tasks.find(task => task.id === openId);
 useEffect(() => { const reload = () => { setJobsRevision(r => r + 1); setRevision(r => r + 1); }; window.addEventListener('lifeai:agenda-updated', reload); return () => window.removeEventListener('lifeai:agenda-updated', reload); }, []);
 useEffect(() => { let active = true; api.get('/planner/trabalho').then(r => { if (active) { setJobs(r.data); setJobId(id => id || String(r.data[0]?.id || '')); setLoading(false); } }).catch(() => { if (active) { setError('Não foi possível carregar os trabalhos.'); setLoading(false); } }); return () => { active = false; }; }, [jobsRevision]);
 useEffect(() => { if (!jobId) return; let active = true; setLoading(true); api.get(`/jobs/${jobId}/tasks`).then(r => { if (active) { const fetchedAt = new Date().toISOString(); setTasks(r.data.map(task => ({ ...task, fetchedAt }))); setError(''); } }).catch(() => { if (active) setError('Não foi possível carregar as tarefas.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [jobId, revision]);
 // Server totals are exact at fetch time; the running interval keeps counting locally until the next reload.
 const replace = task => { const fetchedAt = new Date().toISOString(); setTasks(current => current.some(row => row.id === task.id) ? current.map(row => row.id === task.id ? { ...task, fetchedAt } : row) : [...current, { ...task, fetchedAt }]); };
 const changed = () => window.dispatchEvent(new CustomEvent('lifeai:tasks-updated'));
 async function run(action, { onError = setDialogError, fallback = 'Não foi possível concluir a ação.' } = {}) {
  if (busy) return false; setBusy(true); onError('');
  try { const result = await action(); if (result?.data?.id) replace(result.data); changed(); return true; }
  catch (err) { onError(errorMessage(err, fallback)); return false; }
  finally { setBusy(false); }
 }
 function edit(task) { setDialogError(''); setEditing(task || null); setForm(task ? { title: task.title, description: task.description || '', project: task.project || '', repositoryUrl: task.repositoryUrl || '', priority: task.priority || 'MEDIUM', dueDate: task.dueDate || '', estimatedMinutes: task.estimatedMinutes ?? '' } : emptyForm); }
 async function save(event) {
  event.preventDefault();
  const body = { title: form.title.trim(), description: form.description.trim(), project: form.project.trim() || null, repositoryUrl: form.repositoryUrl.trim() || null, priority: form.priority, dueDate: form.dueDate || null, estimatedMinutes: form.estimatedMinutes === '' ? null : Number(form.estimatedMinutes) };
  if (await run(() => editing ? api.patch(`/jobs/${jobId}/tasks/${editing.id}`, body) : api.post(`/jobs/${jobId}/tasks`, body), { fallback: 'Não foi possível salvar a tarefa. Revise os campos.' })) { setEditing(undefined); setRevision(r => r + 1); }
 }
 const start = task => run(() => api.post(`/jobs/${jobId}/tasks/${task.id}/start`));
 const pause = task => run(() => api.post(`/jobs/${jobId}/tasks/${task.id}/pause`));
 function requestMove(task, status) { if (task.status === status) return; if (task.status === 'TODO' && status === 'IN_PROGRESS') { run(() => api.post(`/jobs/${jobId}/tasks/${task.id}/move`, { status }), { onError: setError }).then(ok => ok && setRevision(r => r + 1)); return; } setDialogError(''); setMoving({ task, status, reason: '' }); }
 async function confirmMove(event) { event.preventDefault(); const { task, status, reason } = moving; if (await run(() => api.post(`/jobs/${jobId}/tasks/${task.id}/move`, { status, reason: reason.trim() }))) { setMoving(null); setRevision(r => r + 1); } }
 async function reorder(task, beforeId) { if (task.id === beforeId) return; if (await run(() => api.post(`/jobs/${jobId}/tasks/${task.id}/reorder`, { beforeId }), { onError: setError, fallback: 'Não foi possível reordenar a tarefa.' })) setRevision(r => r + 1); }
 async function remove() { if (await run(() => api.delete(`/jobs/${jobId}/tasks/${deleting.id}`))) { setDeleting(null); setOpenId(null); setTasks(current => current.filter(task => task.id !== deleting.id)); } }
 function drop(event, status, beforeId = null) {
  event.preventDefault(); event.stopPropagation(); setDragging(null);
  const task = tasks.find(row => row.id === Number(event.dataTransfer.getData('text/plain'))); if (!task) return;
  if (task.status === status) reorder(task, beforeId); else requestMove(task, status);
 }
 const columnSeconds = rows => rows.reduce((sum, task) => sum + elapsed(task, now), 0);
 return <section className="studio-kanban"><div className="studio-section-heading"><div><span className="studio-eyebrow"><Columns3 size={13} /> SUAS ENTREGAS</span><h2>Uma tarefa de cada vez.</h2><p>Clique em uma tarefa para ver os detalhes e controlar o tempo. Arraste entre as colunas (com motivo) ou dentro da coluna para mudar a prioridade.</p></div><button className="studio-button" disabled={!jobId || busy} onClick={() => edit(null)}><Plus size={16} />Nova tarefa</button></div>
  <label className="studio-field kanban-job"><span>Trabalho</span><select value={jobId} onChange={e => setJobId(e.target.value)} disabled={busy}>{!jobs.length && <option value="">Cadastre um trabalho primeiro</option>}{jobs.map(job => <option key={job.id} value={job.id}>{job.name}</option>)}</select></label>
  {error && <p className="studio-error" role="alert">{error}</p>}{loading && <p role="status">Carregando tarefas...</p>}
  <div className="studio-kanban-columns">{statuses.map(([status, label]) => { const rows = tasks.filter(task => task.status === status); return <section key={status} className={`studio-kanban-column ${status} ${dragging && dragging !== status ? 'drop-target' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => drop(e, status)}>
   <header><h3><i />{label}</h3><span>{rows.length}{rows.some(task => task.trackedSeconds || task.runningSince) ? ` · ${clock(columnSeconds(rows)).slice(0, 5)}` : ''}</span></header>
   <div className="studio-kanban-list">{rows.map(task => <article className={`studio-task kanban-row priority-${task.priority} ${task.runningSince ? 'running' : ''}`} key={task.id} draggable={!busy} onDragStart={e => { e.dataTransfer.setData('text/plain', String(task.id)); setDragging(task.status); }} onDragEnd={() => setDragging(null)} onDragOver={e => e.preventDefault()} onDrop={e => drop(e, status, task.id)}>
    <button type="button" className="kanban-row-open" onClick={() => { setDialogError(''); setOpenId(task.id); }} aria-label={`Abrir ${task.title}`}>
     <span className={`kanban-priority ${task.priority}`}>{priorityLabel(task.priority)}</span>
     <strong>{task.title}</strong>
     <small>{task.project && <><FolderGit2 size={12} />{task.project}</>}{task.dueDate && <><CalendarDays size={12} />{dateText(task.dueDate)}</>}</small>
     {(task.trackedSeconds > 0 || task.runningSince) && <span className="kanban-row-time">{task.runningSince ? <Play size={11} /> : <Pause size={11} />}{clock(elapsed(task, now))}</span>}
    </button></article>)}</div>
   {!rows.length && <p className="studio-column-empty">{status === 'TODO' ? 'As próximas tarefas entram aqui.' : 'Arraste uma tarefa para cá.'}</p>}
   {status === 'TODO' && <button className="studio-kanban-add" disabled={!jobId || busy} onClick={() => edit(null)}><Plus size={14} />Adicionar tarefa</button>}
  </section>; })}</div>
  {open && !editing && !deleting && !moving && <TaskDetails task={open} busy={busy} error={dialogError} onClose={() => setOpenId(null)} onStart={start} onPause={pause} onEdit={edit} onDelete={task => { setDialogError(''); setDeleting(task); }} onMove={requestMove} />}
  {editing !== undefined && <Dialog title={editing ? 'Editar tarefa' : 'Nova tarefa'} subtitle="Uma entrega clara facilita o próximo passo. Novas tarefas entram em A fazer." onClose={() => setEditing(undefined)} busy={busy}><form onSubmit={save}><fieldset className="studio-editor-body" disabled={busy}><div className="studio-form-grid">
   <label className="studio-field wide"><span>Título *</span><input required maxLength={150} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Implementar login com Google" /></label>
   <label className="studio-field wide"><span>Descrição</span><textarea maxLength={2000} rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="O que precisa ser feito, critérios de entrega, observações." /></label>
   <label className="studio-field"><span>Projeto</span><input maxLength={120} value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} placeholder="Ex.: Loja do cliente X" /></label>
   <label className="studio-field"><span>Repositório ou link</span><input maxLength={500} value={form.repositoryUrl} onChange={e => setForm({ ...form, repositoryUrl: e.target.value })} placeholder="https://github.com/..." /></label>
   <label className="studio-field"><span>Prioridade</span><select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{priorities.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
   <label className="studio-field"><span>Prazo</span><DatePicker value={form.dueDate} onChange={value=> setForm({ ...form, dueDate: value })} /></label>
   <label className="studio-field"><span>Estimativa (minutos)</span><input type="number" min={5} max={10000} value={form.estimatedMinutes} onChange={e => setForm({ ...form, estimatedMinutes: e.target.value })} placeholder="Ex.: 120" /></label>
  </div>{dialogError && <p className="studio-error" role="alert">{dialogError}</p>}</fieldset><footer><button type="button" className="studio-button secondary" disabled={busy} onClick={() => setEditing(undefined)}>Cancelar</button><button className="studio-button" disabled={busy}>{busy ? 'Salvando...' : 'Salvar tarefa'}</button></footer></form></Dialog>}
  {moving && <Dialog title={`Mover para ${statusLabel(moving.status)}`} subtitle={moving.task.title} onClose={() => setMoving(null)} busy={busy}><form onSubmit={confirmMove}><div className="studio-editor-body"><label className="studio-field wide"><span>Motivo *</span><textarea required minLength={3} maxLength={500} rows={3} autoFocus value={moving.reason} onChange={e => setMoving({ ...moving, reason: e.target.value })} placeholder={moving.status === 'COMPLETED' ? 'Ex.: Entregue e validado com o cliente.' : 'Ex.: Cliente pediu ajustes.'} /></label><p className="ai-help">{moving.status === 'COMPLETED' ? 'O tempo para de contar e fica guardado.' : moving.status === 'IN_PROGRESS' ? 'O tempo volta a contar de onde parou.' : 'O tempo é pausado e continua de onde parou quando a tarefa for retomada.'}</p>{dialogError && <p role="alert" className="studio-error">{dialogError}</p>}</div><footer><button type="button" className="studio-button secondary" disabled={busy} onClick={() => setMoving(null)}>Cancelar</button><button className="studio-button" disabled={busy || moving.reason.trim().length < 3}>{busy ? 'Movendo...' : 'Confirmar'}</button></footer></form></Dialog>}
  {deleting && <Dialog title="Excluir tarefa?" subtitle={deleting.title} onClose={() => setDeleting(null)} busy={busy}><div className="studio-editor-body"><p>A tarefa e todo o tempo registrado nela serão removidos. Essa ação não pode ser desfeita.</p>{dialogError && <p role="alert" className="studio-error">{dialogError}</p>}</div><footer><button className="studio-button secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button className="studio-button danger" disabled={busy} onClick={remove}>Excluir tarefa</button></footer></Dialog>}
 </section>;
}
