import { recurrenceOptions } from './FinanceCategory';
import { useState } from 'react';
import { CalendarDays, Check, Clock3, History, Pencil, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { Dialog } from '../planner/EntityManager';
import { DatePicker } from '../planner/ScheduleInputs';

export const money=value=>(value/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const displayDate=value=>value?new Date(`${value.slice(0,10)}T12:00:00Z`).toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—';
export function statusLabel(row){return ({PAID:row.kind==='INCOME'?'Recebida':'Paga',PENDING:'Pendente',UNPAID:row.kind==='INCOME'?'Não recebida':'Não paga',POSTPONED:'Adiada'})[row.status]||'Pendente'}
export function FinanceBillDetails({row,today,onClose,onUpdated,onEdit,onDelete}){
 const [status,setStatus]=useState(row.status),[dueDate,setDueDate]=useState(row.dueDate),[paidAt,setPaidAt]=useState(row.paidAt||today),[reason,setReason]=useState(row.reason||''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const needsReason=['UNPAID','POSTPONED'].includes(status)||status==='PAID'&&paidAt>row.referenceDate;
 async function save(event){event.preventDefault();if(busy)return;setBusy(true);setError('');try{await api.put(`/personal/finance-bills/${row.billId}/status`,{referenceDate:row.referenceDate,status,reason,...(status==='PAID'?{paidAt}:{}),...(status==='POSTPONED'?{dueDate}:{})});onUpdated();onClose()}catch(e){setError(e.response?.data?.message||'Não foi possível salvar o status.')}finally{setBusy(false)}}
 return <Dialog className="finance-bill-dialog" title={row.title} subtitle={`${row.kind==='INCOME'?'Recebimento':'Conta a pagar'} · ${row.category}`} busy={busy} onClose={onClose}>
 <form onSubmit={save}><fieldset disabled={busy} className="studio-editor-body">
 <div className="bill-detail-heading"><strong>{money(row.amountCents)}</strong><span className={`bill-status ${row.status.toLowerCase()}`}>{statusLabel(row)}{row.overdue?' · vencida':''}</span></div>
 <p className="bill-help">{recurrenceOptions.find(([value])=>value===(row.bill?.recurrence||(row.bill?.monthly?'MONTHLY':'ONCE')))?.[1]} · valor por vencimento</p><dl className="bill-facts"><div><dt><CalendarDays size={14}/>Vencimento original</dt><dd>{displayDate(row.referenceDate)}</dd></div><div><dt><Clock3 size={14}/>Data prevista atual</dt><dd>{displayDate(row.dueDate)}</dd></div>{row.paidAt&&<div><dt><Check size={14}/>{row.kind==='INCOME'?'Recebida':'Paga'} em</dt><dd>{displayDate(row.paidAt)}</dd></div>}</dl>
 {row.description&&<p className="bill-description">{row.description}</p>}{row.reason&&<div className="bill-reason"><strong>Motivo registrado</strong><p>{row.reason}</p></div>}
 {row.overdue&&!row.reason&&<p className="bill-help">O prazo passou sem confirmação de pagamento. Registre o motivo ou confirme a data em que pagou.</p>}
 <div className="studio-form-grid"><label className="studio-field wide"><span>Atualizar situação</span><select value={status} onChange={e=>{setStatus(e.target.value);setError('')}}><option value="PENDING">Pendente</option><option value="PAID">{row.kind==='INCOME'?'Recebida':'Paga'}</option><option value="UNPAID">{row.kind==='INCOME'?'Não recebida':'Não paga'}</option><option value="POSTPONED">Adiada</option></select></label>
 {status==='PAID'&&<div className="studio-field wide"><label htmlFor="bill-paid-date">Data {row.kind==='INCOME'?'do recebimento':'do pagamento'} *</label><DatePicker id="bill-paid-date" value={paidAt} max={today} required onChange={setPaidAt}/></div>}
 {status==='POSTPONED'&&<div className="studio-field wide"><label htmlFor="bill-new-date">Nova data prevista *</label><DatePicker id="bill-new-date" value={dueDate} min={today} required onChange={setDueDate}/><small>A nova data deve ser posterior ao prazo atual.</small></div>}
 <label className="studio-field wide"><span>{needsReason?'Motivo *':'Observação (opcional)'}</span><textarea required={needsReason} maxLength={2000} rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explique o adiamento, o atraso ou o não pagamento."/></label></div>
 {status==='PAID'&&paidAt>row.referenceDate&&<p className="bill-help">Pagamento após o vencimento original: informe o motivo do atraso.</p>}
 {status==='PENDING'&&row.dueDate!==row.referenceDate&&<p className="bill-help">Voltar a pendente restaura o vencimento original. O histórico de adiamentos permanece.</p>}
 {row.history?.length>0&&<details className="bill-history"><summary><History size={15}/>Histórico de alterações ({row.history.length})</summary><ol>{row.history.map(event=><li key={event.id}><strong>{statusLabel({...row,status:event.status})}</strong><span>{new Date(event.createdAt).toLocaleString('pt-BR')} · previsto para {displayDate(event.dueDate)}</span>{event.paidAt&&<span>Pagamento em {displayDate(event.paidAt)}</span>}{event.reason&&<p>{event.reason}</p>}</li>)}</ol></details>}
 {error&&<p className="studio-error" role="alert">{error}</p>}</fieldset><footer>{onEdit&&<button type="button" className="studio-button secondary" onClick={()=>onEdit(row.bill)} disabled={busy}><Pencil size={14}/>Editar conta</button>}{onDelete&&<button type="button" className="studio-button secondary" onClick={()=>onDelete(row.bill)} disabled={busy}><Trash2 size={14}/>Excluir</button>}<button type="submit" className="studio-button" disabled={busy}>{busy?'Salvando…':'Salvar situação'}</button></footer></form></Dialog>;
}
