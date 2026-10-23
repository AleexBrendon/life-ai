import FinanceCategory, { recurrenceOptions } from './FinanceCategory';
import { useState } from 'react';
import api from '../../lib/api';
import { Dialog } from '../planner/EntityManager';
import { DatePicker } from '../planner/ScheduleInputs';

export default function FinanceBillEditor({bill,initial,today,onClose,onSaved,maxFirstDueDate}){
 const [form,setForm]=useState(()=>({...{title:'',kind:'EXPENSE',isVariable:false,category:'Outros',description:'',firstDueDate:today,monthly:true,recurrence:'MONTHLY',endDate:''},...initial,...bill,recurrence:bill?.recurrence||initial?.recurrence||(bill?(bill.monthly?'MONTHLY':'ONCE'):'MONTHLY'),amount:bill||initial?((bill||initial).amountCents/100).toFixed(2):''}));
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const set=(key,value)=>setForm(current=>({...current,[key]:value}));
 async function save(event){event.preventDefault();setBusy(true);setError('');try{const body={...(form.sourceEntryId?{sourceEntryId:form.sourceEntryId}:{}),title:form.title,kind:form.kind,isVariable:form.kind==='INCOME'&&form.isVariable,category:form.category,recurrence:form.recurrence,description:form.description,amountCents:Math.round(Number(form.amount)*100),firstDueDate:form.firstDueDate,monthly:form.recurrence==='MONTHLY',endDate:form.recurrence!=='ONCE'&&form.endDate?form.endDate:null};if(bill)await api.put(`/personal/finance-bills/${bill.id}`,body);else await api.post('/personal/finance-bills',body);onSaved()}catch(e){setError(e.response?.data?.message||'Não foi possível salvar a conta.')}finally{setBusy(false)}}
 return <Dialog title={bill?'Editar conta':'Nova conta ou recebimento'} subtitle="Organize vencimentos e acompanhe cada mês separadamente." onClose={onClose} busy={busy}><form onSubmit={save}><fieldset className="studio-editor-body" disabled={busy}><div className="studio-form-grid">
 <label className="studio-field"><span>Tipo *</span><select value={form.kind} onChange={e=>set('kind',e.target.value)}><option value="EXPENSE">Conta a pagar</option><option value="INCOME">Valor a receber</option></select></label>
 {form.kind==='INCOME'&&<label className="studio-field check wide"><input type="checkbox" checked={form.isVariable} onChange={e=>set('isVariable',e.target.checked)}/><span>Renda variável ou incerta (freelancer, bônus, comissão)</span></label>}
 <label className="studio-field"><span>Nome *</span><input required maxLength={100} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Aluguel, internet, salário…"/></label>
 <label className="studio-field"><span>Valor (R$) *</span><input required type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)}/></label>
 <FinanceCategory kind={form.kind} value={form.category} onChange={value=>set('category',value)}/>
 <div className="studio-field"><label htmlFor="bill-first-due">{form.recurrence!=='ONCE'?'Primeiro vencimento':'Vencimento'} *</label><DatePicker id="bill-first-due" value={form.firstDueDate} max={maxFirstDueDate} required onChange={value=>set('firstDueDate',value)}/></div>
 <label className="studio-field"><span>Repetição</span><select value={form.recurrence} onChange={e=>set('recurrence',e.target.value)}>{recurrenceOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
 {form.recurrence!=='ONCE'&&<div className="studio-field wide"><label htmlFor="bill-end">Repetir até (opcional)</label><DatePicker id="bill-end" value={form.endDate} min={form.firstDueDate} onChange={value=>set('endDate',value)}/><small>O valor informado é por vencimento. Sem data final, continua repetindo no intervalo escolhido. Cada vencimento tem seu próprio pagamento. Dias 29, 30 ou 31 são ajustados ao último dia dos meses menores.</small></div>}
 <label className="studio-field wide"><span>Descrição (opcional)</span><textarea rows={3} maxLength={2000} value={form.description} onChange={e=>set('description',e.target.value)}/></label></div>
 {bill&&<p className="bill-help">Meses já registrados preservam o valor e o histórico. O novo valor vale para ocorrências ainda não registradas. Tipo, repetição e início não podem mudar se já houver histórico.</p>}
 {error&&<p role="alert" className="studio-error">{error}</p>}</fieldset><footer><button type="button" className="studio-button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className="studio-button" disabled={busy}>{busy?'Salvando…':'Salvar conta'}</button></footer></form></Dialog>;
}
