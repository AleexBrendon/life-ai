import { useState } from 'react';
export const recurrenceOptions = [['ONCE','Uma única vez'],['WEEKLY','Toda semana'],['FORTNIGHTLY','A cada 14 dias'],['MONTHLY','Todo mês'],['BIMONTHLY','A cada 2 meses'],['QUARTERLY','A cada 3 meses'],['SEMIANNUAL','A cada 6 meses'],['YEARLY','Todo ano']];
const expenses=['Moradia','Alimentação','Supermercado','Transporte','Combustível','Saúde','Educação','Lazer','Assinaturas','Internet e telefone','Água e energia','Cartão de crédito','Impostos e taxas','Pets','Presentes e doações','Compras','Outros'];
const incomes=['Salário','Freelance','Bônus e comissão','Investimentos','Reembolso','Vendas','Outros'];
export default function FinanceCategory({kind,value,onChange}){
 const options=kind==='INCOME'?incomes:expenses;
 const [custom,setCustom]=useState(()=>!!value&&!options.includes(value));
 return <div className="studio-field"><label><span>Categoria *</span><select aria-label="Categoria" value={custom||!options.includes(value)?'CUSTOM':value} onChange={e=>{setCustom(e.target.value==='CUSTOM');onChange(e.target.value==='CUSTOM'?'':e.target.value)}}>{options.map(name=><option key={name} value={name}>{name}</option>)}<option value="CUSTOM">Outra categoria…</option></select></label>{(custom||!options.includes(value))&&<input required aria-label="Nome da categoria" maxLength={60} value={value||''} onChange={e=>onChange(e.target.value)} placeholder="Digite sua categoria"/>}</div>;
}
