import FeedbackToast from '../FeedbackToast';
import { useEffect, useRef, useState } from 'react';
import { Camera, CalendarDays, Bell, UserRound, Droplets, Wallet, Save, LoaderCircle, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { DatePicker } from './ScheduleInputs';
import { useTheme } from '../../lib/ThemeProvider';

function initial(user) {
 const profile = user.profile || {};
 return { name:user.name, birthDate:profile.birthDate?.slice(0,10)||'', timezone:profile.timezone||'America/Sao_Paulo', occupation:profile.occupation||'', relationshipStatus:profile.relationshipStatus||'', hasChildren:profile.hasChildren||false,
  avatarData:profile.avatarData||null,calendarView:profile.calendarView||'month',weekStartsOn:profile.weekStartsOn??1,notifyActions:profile.notifyActions??true,notifyUpcoming:profile.notifyUpcoming??true };
}
async function preparePhoto(file) {
 if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) throw new Error('Escolha uma foto JPG, PNG ou WebP de até 5 MB.');
 const bitmap = await createImageBitmap(file);
 try {
  const canvas = document.createElement('canvas'); canvas.width=256; canvas.height=256;
  const context=canvas.getContext('2d'); const side=Math.min(bitmap.width,bitmap.height);
  context.fillStyle='#f3f7ef';context.fillRect(0,0,256,256);
  context.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,256,256);
  return canvas.toDataURL('image/jpeg',.85);
 } finally { bitmap.close(); }
}
export default function ProfileSettings() {
 const {theme,setTheme}=useTheme();
 const [saved,setSaved]=useState(null);
 const [form,setForm]=useState(null),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0);
 const photoInput=useRef(null), alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 useEffect(()=>{let active=true;api.get('/users/me').then(response=>{if(active){setEmail(response.data.user.email);setForm(initial(response.data.user));setSaved(initial(response.data.user));setError('')}}).catch(()=>{if(active)setError('Não foi possível carregar suas configurações.')});return()=>{active=false}},[revision]);
 const set=(key,value)=>{setForm(current=>({...current,[key]:value}));setNotice('');};
 async function photo(event) {
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  setPhotoBusy(true);setError('');
  try{const image=await preparePhoto(file);if(alive.current)set('avatarData',image)}catch(e){if(alive.current)setError(e.message||'Não foi possível abrir a foto. Escolha outro arquivo.')}finally{if(alive.current)setPhotoBusy(false)}
 }
 async function save(event) {
  event.preventDefault();setBusy(true);setError('');setNotice('');
  try{const response=await api.put('/users/me',{...form,birthDate:form.birthDate?`${form.birthDate}T00:00:00.000Z`:null});setForm(initial(response.data.user));setSaved(initial(response.data.user));window.dispatchEvent(new Event('lifeai:profile-updated'));window.dispatchEvent(new Event('lifeai:water-updated'));window.dispatchEvent(new Event('lifeai:agenda-updated'));}
  catch(e){setError(e.response?.data?.errors?.map(issue=>issue.message).join(' ')||e.response?.data?.message||'Não foi possível salvar. Revise os campos.');}
  finally{setBusy(false)}
 }
 const dirty=JSON.stringify(form)!==JSON.stringify(saved);
 if(!form)return <div>{error?<p role="alert">{error}<button onClick={()=>setRevision(value=>value+1)}>Tentar novamente</button></p>:<p role="status">Carregando configurações...</p>}</div>;
 return <form onSubmit={save} className="profile-settings"><div className="studio-section-heading"><div><h2>Do seu jeito</h2><p>Seu perfil e suas preferências, em um só lugar.</p></div></div>
 <section className="settings-section appearance-settings"><header><UserRound size={18}/><div><h3>Aparência</h3><p>Escolha o tema. A mudança é imediata e fica salva neste navegador.</p></div></header><div className="appearance-options" role="group" aria-label="Tema do sistema">{[['light','Claro'],['dark','Escuro'],['system','Automático']].map(([value,label])=><button key={value} type="button" aria-pressed={theme===value} onClick={()=>setTheme(value)}><span className={`appearance-preview ${value}`} aria-hidden="true"><i/><i/><i/></span><strong>{label}</strong>{theme===value&&<Check size={15}/>}</button>)}</div></section>
 <fieldset disabled={busy||photoBusy} className="studio-profile-fields">
 <section className="settings-section"><header><UserRound size={18}/><div><h3>Perfil pessoal</h3><p>Como você aparece no LifeAI.</p></div></header>
 <div className="settings-photo"><span className="settings-photo-preview">{form.avatarData?<img src={form.avatarData} alt="Prévia da sua foto de perfil"/>:<UserRound size={32}/>}</span><div><strong>Sua foto</strong><p>JPG, PNG ou WebP · até 5 MB. Recorte central automático.</p><input ref={photoInput} className="settings-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={photo} aria-label="Escolher foto de perfil"/><div className="personal-actions"><button type="button" className="studio-button secondary" onClick={()=>photoInput.current.click()}><Camera size={14}/>{photoBusy?'Preparando…':'Escolher foto'}</button>{form.avatarData&&<button type="button" className="settings-text-button" onClick={()=>set('avatarData',null)}>Remover foto</button>}</div></div></div>
 <div className="studio-form-grid"><label className="studio-field"><span>Nome *</span><input required minLength={2} maxLength={100} value={form.name} onChange={e=>set('name',e.target.value)} autoComplete="name"/></label><div className="studio-field"><label htmlFor="profile-birthday" className="schedule-label">Data de nascimento</label><DatePicker id="profile-birthday" value={form.birthDate} max={new Date().toLocaleDateString('en-CA')} onChange={value=>set('birthDate',value)}/></div>
 <label className="studio-field"><span>Ocupação</span><input maxLength={150} value={form.occupation} onChange={e=>set('occupation',e.target.value)}/></label><label className="studio-field"><span>Estado civil</span><select value={form.relationshipStatus} onChange={e=>set('relationshipStatus',e.target.value)}><option value="">Prefiro não informar</option>{['Solteiro(a)','Casado(a)','União estável','Divorciado(a)','Viúvo(a)',...(!['','Solteiro(a)','Casado(a)','União estável','Divorciado(a)','Viúvo(a)'].includes(form.relationshipStatus)?[form.relationshipStatus]:[])].map(value=><option key={value}>{value}</option>)}</select></label>
 <label className="studio-field wide"><span>E-mail da conta</span><input type="email" value={email} readOnly/><small className="settings-help">Usado para entrar no sistema.</small></label><label className="studio-field check"><input type="checkbox" checked={form.hasChildren} onChange={e=>set('hasChildren',e.target.checked)}/><span>Tenho filhos</span></label></div></section>
 <section className="settings-section"><header><CalendarDays size={18}/><div><h3>Agenda e horários</h3><p>Personalize a organização do seu calendário.</p></div></header><div className="studio-form-grid">
 <label className="studio-field wide"><span>Fuso horário *</span><select value={form.timezone} onChange={e=>set('timezone',e.target.value)}>{[...new Set(['America/Sao_Paulo','America/Manaus','America/Recife','America/Rio_Branco','America/Belem','America/Cuiaba','America/Noronha','Europe/Lisbon','UTC',form.timezone])].map(zone=><option key={zone}>{zone}</option>)}</select></label>
 <label className="studio-field"><span>Ao abrir Minha agenda</span><select value={form.calendarView} onChange={e=>set('calendarView',e.target.value)}><option value="month">Mostrar mês</option><option value="week">Mostrar semana</option><option value="day">Mostrar dia</option></select></label><label className="studio-field"><span>A semana começa em</span><select value={form.weekStartsOn} onChange={e=>set('weekStartsOn',Number(e.target.value))}><option value={1}>Segunda-feira</option><option value={0}>Domingo</option></select></label></div></section>
 <section className="settings-section"><header><Bell size={18}/><div><h3>Notificações</h3><p>Acompanhe o que mudou na sua conta.</p></div></header><label className="settings-toggle"><div><strong>Avisos das minhas alterações</strong><p>Cadastros, edições, exclusões, conclusões, skips, retomadas e ações da IA. Não altera os alarmes de água.</p></div><input type="checkbox" checked={form.notifyActions} onChange={e=>set('notifyActions',e.target.checked)}/></label><label className="settings-toggle upcoming-toggle"><div><strong>Avisar 5 minutos antes</strong><p>Receber no sino um aviso antes do início das atividades pendentes na agenda.</p></div><input type="checkbox" checked={form.notifyUpcoming} onChange={e=>set('notifyUpcoming',e.target.checked)}/></label></section>
 <section className="settings-section"><header><Droplets size={18}/><div><h3>Preferências específicas</h3><p>Metas e valores ficam nas respectivas áreas.</p></div></header><div className="settings-shortcuts"><Link to="/planejamento?aba=agua"><Droplets size={17}/>Meta de água e alarmes</Link><Link to="/planejamento?aba=financas"><Wallet size={17}/>Orçamento e caixinhas</Link></div></section>
 </fieldset>{error&&<p className="studio-error" role="alert">{error}</p>}{notice&&<FeedbackToast key={notice + revision} message={notice}/>}<div className="settings-action-footer"><small className="settings-save-status">{dirty ? <><span/>Alterações não salvas</> : <><Check size={14}/>Tudo salvo</>}</small><div className="settings-save-actions"><button type="button" className="settings-discard-button" disabled={busy||photoBusy||!dirty} onClick={()=>{setForm(saved);setError('');setNotice('Alterações descartadas.')}}>Descartar</button><button type="submit" className="settings-submit-button" disabled={busy||photoBusy||!dirty}>{busy ? <LoaderCircle size={17} className="settings-save-spinner"/> : <Save size={17}/>}<span>{busy?'Salvando…':'Salvar alterações'}</span></button></div></div></form>;
}
