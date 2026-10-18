import { useCallback, useEffect, useState } from 'react';
import { Droplets, Plus, Pencil, Trash2, Wallet, PiggyBank, ShoppingBag, TrendingUp } from 'lucide-react';
import api from '../../lib/api';
import { Dialog } from './EntityManager';
import { TimePicker } from './ScheduleInputs';

const message = error => error.response?.data?.message || 'Não foi possível concluir. Tente novamente.';
const money = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const liters = ml => `${(ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`;
function usePersonal(path) {
 const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
 const load = useCallback(async () => { const response = await api.get(`/personal/${path}`); setData(response.data); }, [path]);
 useEffect(() => { let active = true; const refresh = () => api.get(`/personal/${path}`).then(r => { if (active) setData(r.data); }).catch(e => { if (active) setError(message(e)); }); refresh(); if (path === 'water') window.addEventListener('lifeai:water-updated', refresh); const timer = path === 'water' ? setInterval(refresh, 60000) : null; return () => { active = false; if (timer) clearInterval(timer); if (path === 'water') window.removeEventListener('lifeai:water-updated', refresh); }; }, [path]);
 async function act(method, endpoint, body) {
  setBusy(true); setError('');
  try { await api[method](`/personal/${endpoint}`, body); await load(); if (path === 'water') window.dispatchEvent(new Event('lifeai:water-updated')); return true; }
  catch (e) { setError(message(e)); return false; }
  finally { setBusy(false); }
 }
 return { data, error, busy, act, retry: () => load().then(() => setError('')).catch(e => setError(message(e))) };
}
function Feedback({ state }) {
 return state.error ? <div role="alert" className="studio-error">{state.error} <button type="button" onClick={state.retry}>Atualizar dados</button></div> : !state.data ? <p role="status">Carregando...</p> : null;
}
function RemoveDialog({ title, busy, onClose, onConfirm, error }) {
 return <Dialog title="Excluir registro?" subtitle={title} busy={busy} onClose={onClose}><div className="studio-editor-body"><p>O registro será removido e os totais serão recalculados.</p>{error && <p role="alert" className="studio-error">{error}</p>}</div><footer><button className="studio-button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="studio-button danger" disabled={busy} onClick={onConfirm}>Excluir</button></footer></Dialog>;
}
export function WaterPlanning() {
 const state = usePersonal('water');
 const [settings, setSettings] = useState(null), [intake, setIntake] = useState(null), [deleting, setDeleting] = useState(null);
 const { data, busy, act } = state;
 const set = (key, value) => setSettings(current => ({ ...current, [key]: value }));
 const remaining = data ? Math.max(0, data.plan.goalMl - data.totalMl) : 0;
 async function savePlan(e) { e.preventDefault(); if (await act('put', 'water/plan', { ...settings, goalMl: Math.round(Number(settings.liters) * 1000), cupMl: Number(settings.cupMl), intervalMinutes: Number(settings.intervalMinutes) })) setSettings(null); }
 async function saveIntake(e) { e.preventDefault(); if (await act(intake.id ? 'put' : 'post', `water/intakes${intake.id ? `/${intake.id}` : ''}`, { amountMl: Number(intake.amountMl) })) setIntake(null); }
 return <section className="personal-planning"><div className="studio-section-heading"><div><h2>Água no seu ritmo</h2><p>Defina sua meta, registre os copos e acompanhe o consumo de hoje.</p></div>{data && <button className="studio-button secondary" onClick={() => setSettings({ ...data.plan, liters: data.plan.goalMl / 1000 })}>Configurar meta e lembretes</button>}</div>
 <Feedback state={state}/>{data && <>
 <div className="hydration-guidance"><div><strong>Lembre-se ao longo do dia</strong><p>Beber regularmente é a orientação geral. Não existe um intervalo único em minutos para todos. Você pode usar 60 minutos para organizar os avisos e ajustar ao seu dia, sem obrigação de beber um copo a cada toque. Se tem restrição de líquidos, siga sua orientação de saúde.</p><a href="https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/" target="_blank" rel="noreferrer">Orientações de hidratação · NHS</a></div><button type="button" className="studio-button secondary" onClick={()=>setSettings({...data.plan,liters:data.plan.goalMl/1000,intervalMinutes:60,enabled:true})}>Configurar aviso de 1 em 1 hora</button></div>
 <div className="water-overview"><div className="water-symbol"><Droplets size={42}/></div><div><span>CONSUMO DE HOJE · {new Date(`${data.date}T12:00:00`).toLocaleDateString('pt-BR')}</span><h3>{liters(data.totalMl)} <small>/ {liters(data.plan.goalMl)}</small></h3><progress aria-label="Progresso da meta diária de água" value={Math.min(data.totalMl, data.plan.goalMl)} max={data.plan.goalMl}/><p>{remaining ? `Faltam ${liters(remaining)} · aproximadamente ${Math.ceil(remaining / data.plan.cupMl)} copos de ${data.plan.cupMl} ml.` : 'Meta de hoje atingida! Os lembretes ficam pausados até amanhã.'}</p></div></div>
 <div className="personal-actions"><button className="studio-button" disabled={busy} onClick={() => act('post', 'water/intakes', { amountMl: data.plan.cupMl })}><Plus size={16}/>Bebi {data.plan.cupMl} ml</button><button className="studio-button secondary" disabled={busy} onClick={() => setIntake({ amountMl: 500 })}>Outra quantidade</button></div>
 <p className="personal-note">{data.plan.enabled ? `Lembretes no sino a cada ${data.plan.intervalMinutes} minutos, das ${data.plan.startTime} às ${data.plan.endTime}, enquanto faltar água para sua meta.` : 'Lembretes desativados. Ative em “Configurar meta e lembretes”.'} O consumo começa em zero a cada novo dia, no fuso do seu perfil. Sua meta é escolhida por você.</p>
 <h3 className="personal-subtitle">Copos registrados hoje</h3><div className="personal-list">{!data.intakes.length && <p className="studio-inline-empty">Registre o primeiro copo do dia.</p>}{data.intakes.map(row => <article key={row.id}><span className="personal-row-icon water"><Droplets size={18}/></span><div><strong>{row.amountMl} ml</strong><small>{new Date(row.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></div><button className="studio-icon" aria-label={`Editar consumo de ${row.amountMl} ml`} disabled={busy} onClick={() => setIntake(row)}><Pencil size={16}/></button><button className="studio-icon" aria-label={`Excluir consumo de ${row.amountMl} ml`} disabled={busy} onClick={() => setDeleting(row)}><Trash2 size={16}/></button></article>)}</div>
 </>}
 {settings && <Dialog title="Meta de água e lembretes" subtitle="O lembrete avisa; o consumo só aumenta quando você registra o que bebeu." busy={busy} onClose={() => setSettings(null)}><form onSubmit={savePlan}><fieldset className="studio-editor-body" disabled={busy}><div className="studio-form-grid">
 <label className="studio-field"><span>Meta diária em litros *</span><input type="number" required min="0.1" max="10" step="0.05" value={settings.liters} onChange={e => set('liters', e.target.value)}/></label>
 <label className="studio-field"><span>Meu copo em ml *</span><input type="number" required min="10" max="2000" step="1" value={settings.cupMl} onChange={e => set('cupMl', e.target.value)}/></label>
 <label className="studio-field"><span>Intervalo dos lembretes *</span><select value={settings.intervalMinutes} onChange={e => set('intervalMinutes', e.target.value)}>{[15, 30, 45, 60, 90, 120, 180, 240].map(n => <option key={n} value={n}>{n} minutos</option>)}</select></label>
 <label className="studio-field check"><input type="checkbox" checked={settings.enabled} onChange={e => set('enabled', e.target.checked)}/><span>Ativar avisos na tela e no sino</span></label>
 <div className="studio-field"><label className="schedule-label" htmlFor="water-start">A partir de *</label><TimePicker id="water-start" value={settings.startTime} required onChange={value => set('startTime', value)}/></div>
 <div className="studio-field"><label className="schedule-label" htmlFor="water-end">Até *</label><TimePicker id="water-end" value={settings.endTime} required onChange={value => set('endTime', value)}/></div>
 </div><p className="personal-note">O alarme aparece na tela enquanto o sistema estiver aberto, com contagem regressiva no topo. Use “Ativar som” para liberar o áudio nesta sessão. A API também gera avisos no sino. Não envia push, SMS ou WhatsApp.</p>{state.error && <p role="alert" className="studio-error">{state.error}</p>}</fieldset><footer><button type="button" className="studio-button secondary" disabled={busy} onClick={() => setSettings(null)}>Cancelar</button><button className="studio-button" disabled={busy}>Salvar preferências</button></footer></form></Dialog>}
 {intake && <Dialog title={intake.id ? 'Editar consumo' : 'Registrar água'} busy={busy} onClose={() => setIntake(null)}><form onSubmit={saveIntake}><fieldset className="studio-editor-body" disabled={busy}><label className="studio-field"><span>Quantidade em ml *</span><input type="number" min="10" max="2000" step="1" required value={intake.amountMl} onChange={e => setIntake({ ...intake, amountMl: e.target.value })}/></label>{state.error && <p role="alert" className="studio-error">{state.error}</p>}</fieldset><footer><button type="button" className="studio-button secondary" disabled={busy} onClick={() => setIntake(null)}>Cancelar</button><button className="studio-button" disabled={busy}>Salvar consumo</button></footer></form></Dialog>}
 {deleting && <RemoveDialog title={`${deleting.amountMl} ml de água`} busy={busy} error={state.error} onClose={() => setDeleting(null)} onConfirm={async () => { if (await act('delete', `water/intakes/${deleting.id}`)) setDeleting(null); }}/>} </section>;
}

const categories = [['INCOME', 'Rendas', TrendingUp], ['EXPENSE', 'Despesas', Wallet], ['PURCHASE', 'Compras planejadas', ShoppingBag], ['BOX', 'Caixinhas', PiggyBank]];
const blankFinance = kind => ({ kind, title: '', amount: '', saved: '0', monthly: '', installments: 1 });
function MoneyField({ label, value, onChange, required = false }) {
 return <label className="studio-field"><span>{label}{required && ' *'}</span><div className="personal-money-input"><span>R$</span><input type="number" inputMode="decimal" min={required ? '0.01' : '0'} max="1000000" step="0.01" required={required} value={value} onChange={e => onChange(e.target.value)}/></div></label>;
}
export function FinancePlanning() {
 const state = usePersonal('finance');
 const { data, busy, act } = state;
 const [editor, setEditor] = useState(null), [deleting, setDeleting] = useState(null);
 const set = (key, value) => setEditor(current => ({ ...current, [key]: value }));
 function edit(row) { setEditor({ ...row, amount: (row.amountCents / 100).toFixed(2), saved: (row.savedCents / 100).toFixed(2), monthly: (row.monthlyCents / 100).toFixed(2) }); }
 async function save(e) {
  e.preventDefault();
  const body = { kind: editor.kind, title: editor.title, amountCents: Math.round(Number(editor.amount) * 100), savedCents: Math.round(Number(editor.saved || 0) * 100), monthlyCents: Math.round(Number(editor.monthly || 0) * 100), installments: Number(editor.installments) };
  if (await act(editor.id ? 'put' : 'post', `finance${editor.id ? `/${editor.id}` : ''}`, body)) setEditor(null);
 }
 const objective = editor && ['BOX', 'PURCHASE'].includes(editor.kind);
 const installment = editor ? Math.ceil(Math.max(0, Math.round(Number(editor.amount || 0) * 100) - Math.round(Number(editor.saved || 0) * 100)) / Number(editor.installments || 1)) : 0;
 return <section className="personal-planning"><div className="studio-section-heading"><div><h2>Seu dinheiro, com direção</h2><p>Planeje o mês, distribua suas reservas e veja quando cada compra cabe no orçamento.</p></div><button className="studio-button" onClick={() => setEditor(blankFinance('INCOME'))}><Plus size={16}/>Novo registro</button></div><Feedback state={state}/>
 {data && <><div className="finance-stats">{[['Renda mensal', data.incomeCents], ['Despesas mensais', data.expenseCents], ['Compras + caixinhas / mês', data.allocatedCents], ['Saldo livre / mês', data.freeCents]].map(([label, value]) => <article key={label} className={value < 0 ? 'negative' : ''}><span>{label}</span><strong>{money(value)}</strong></article>)}</div>
 {data.freeCents < 0 && <p role="status" className="studio-error">O planejamento ultrapassa sua renda em {money(-data.freeCents)} por mês. Aumente o prazo das compras ou ajuste as despesas e reservas.</p>}
 <p className="personal-note">Orçamento mensal recorrente, em reais. Saldo livre = renda − despesas − parcelas planejadas − reservas das caixinhas. Simulação sem juros, taxas ou rendimento. Valores guardados são atualizados manualmente; o sistema não movimenta dinheiro nem abate parcelas automaticamente.</p>
 <div className="finance-sections">{categories.map(([kind, title, Icon]) => <section className="finance-section" key={kind}><header><h3 id={`finance-heading-${kind}`}><Icon size={19}/>{title}<span className="finance-count" aria-label={`${data.entries.filter(row => row.kind === kind).length} registros`}>{data.entries.filter(row => row.kind === kind).length}</span></h3><button type="button" className="studio-icon" aria-label={`Adicionar em ${title}`} onClick={() => setEditor(blankFinance(kind))}><Plus size={18}/></button></header>
 <div className="finance-record-list" role="region" aria-labelledby={`finance-heading-${kind}`} tabIndex={0}>
 {!data.entries.some(row => row.kind === kind) && <p className="studio-inline-empty">Nenhum registro. Use + para começar.</p>}
 {data.entries.filter(row => row.kind === kind).map(row => <article className="finance-record" key={row.id}><div className="finance-record-heading"><strong>{row.title}</strong><div><button className="studio-icon" aria-label={`Editar ${row.title}`} disabled={busy} onClick={() => edit(row)}><Pencil size={15}/></button><button className="studio-icon" aria-label={`Excluir ${row.title}`} disabled={busy} onClick={() => setDeleting(row)}><Trash2 size={15}/></button></div></div>
 <h4>{money(row.amountCents)}{['INCOME', 'EXPENSE'].includes(kind) && <small> / mês</small>}</h4>
 {['PURCHASE', 'BOX'].includes(kind) && <><progress aria-label={`Progresso de ${row.title}`} value={row.savedCents} max={row.amountCents}/><p>{money(row.savedCents)} guardados · faltam {money(row.remainingCents)}</p>
 {row.remainingCents === 0 ? <span className="studio-badge done">Objetivo atingido</span> : <><p>{kind === 'PURCHASE' ? `${row.installments}× de ${money(row.allocationCents)} por mês` : `${money(row.allocationCents)} reservados por mês${row.plannedMonths ? ` · cerca de ${row.plannedMonths} meses para a meta` : ''}`}</p>
 <span className={`finance-fit ${row.fits ? '' : 'warning'}`}>{row.allocationCents === 0 ? 'Defina um valor mensal para avançar' : row.fits ? 'Cabe no planejamento atual' : 'Acima do saldo disponível'}</span>
 {kind === 'PURCHASE' && <p className="personal-note">{row.minimumMonths === null ? 'Sem saldo disponível para esta compra após os outros compromissos.' : `Prazo mínimo estimado: ${row.minimumMonths} mês(es), destinando até ${money(row.capacityCents)}/mês, após as outras reservas.`}</p>}</>}
 </>}</article>)}</div></section>)}</div></>}
 {editor && <Dialog title={editor.id ? 'Editar registro financeiro' : 'Novo registro financeiro'} subtitle="Informe os valores do seu planejamento mensal." busy={busy} onClose={() => setEditor(null)}><form onSubmit={save}><fieldset className="studio-editor-body" disabled={busy}><div className="studio-form-grid">
 <label className="studio-field"><span>Tipo *</span><select value={editor.kind} onChange={e => setEditor({ ...blankFinance(e.target.value), id: editor.id, title: editor.title })}>{categories.map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label>
 <label className="studio-field"><span>Nome *</span><input required maxLength={100} placeholder={editor.kind === 'BOX' ? 'Ex.: Reserva de emergência' : editor.kind === 'PURCHASE' ? 'Ex.: Notebook' : editor.kind === 'INCOME' ? 'Ex.: Salário líquido' : 'Ex.: Aluguel'} value={editor.title} onChange={e => set('title', e.target.value)}/></label>
 <MoneyField required label={objective ? 'Valor do objetivo' : 'Valor mensal'} value={editor.amount} onChange={value => set('amount', value)}/>
 {objective && <MoneyField label="Já guardado / entrada" value={editor.saved} onChange={value => set('saved', value)}/>}
 {editor.kind === 'PURCHASE' && <label className="studio-field"><span>Dividir o restante em quantos meses? *</span><input type="number" min="1" max="360" step="1" required value={editor.installments} onChange={e => set('installments', e.target.value)}/></label>}
 {editor.kind === 'BOX' && <MoneyField label="Guardar por mês" value={editor.monthly} onChange={value => set('monthly', value)}/>}
 </div>{editor.kind === 'PURCHASE' && <p className="personal-note">Parcela planejada: <strong>{money(installment)}/mês</strong>, sem juros. O prazo mínimo e o impacto no saldo serão recalculados ao salvar.</p>}{objective && <p className="personal-note">Atualize “Já guardado” quando separar dinheiro ou pagar parte da compra. Não cadastre a mesma parcela também em Despesas para evitar contá-la duas vezes.</p>}{state.error && <p role="alert" className="studio-error">{state.error}</p>}</fieldset><footer><button type="button" className="studio-button secondary" disabled={busy} onClick={() => setEditor(null)}>Cancelar</button><button className="studio-button" disabled={busy}>Salvar registro</button></footer></form></Dialog>}
 {deleting && <RemoveDialog title={deleting.title} busy={busy} error={state.error} onClose={() => setDeleting(null)} onConfirm={async () => { if (await act('delete', `finance/${deleting.id}`)) setDeleting(null); }}/>} </section>;
}
