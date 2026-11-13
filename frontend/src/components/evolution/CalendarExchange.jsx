import { useState } from 'react';
import api from '../../lib/api';
import useResource from './useResource';
import { requestErrorMessage } from '../../lib/requestFeedback';
import { localDateKey, shiftDate } from '../planner/calendarUtils';
import { useUserPreferences } from '../../lib/UserPreferences';
import { download } from './download';

export default function CalendarExchange() {
  const { user } = useUserPreferences();
  const [from, setFrom] = useState(() => localDateKey(new Date(), user?.profile?.timezone));
  const [to, setTo] = useState(() => shiftDate(from, 30));
  const [revision, setRevision] = useState(0), resource = useResource('/evolution/calendar/connections', revision);
  const [source, setSource] = useState('file'), [name, setName] = useState('Meu calendário'), [content, setContent] = useState('');
  const [connectionName, setConnectionName] = useState(''), [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null), [choices, setChoices] = useState({}), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function run(action) { setBusy(true); setError(''); setNotice(''); try { await action(); } catch (e) { setError(requestErrorMessage(e)); } finally { setBusy(false); } }
  async function file(event) {
    const selected = event.target.files?.[0]; setPreview(null); if (!selected) return;
    if (selected.size > 200000) { setError('Escolha um arquivo ICS de até 200 KB.'); return; }
    setContent(await selected.text()); setName(selected.name); setSource('file'); setError('');
  }
  const selected = preview?.rows.filter(row => choices[row.externalKey]?.selected) || [];
  const unconfirmed = selected.some(row => (row.conflicts.length || row.localEdited) && !choices[row.externalKey].allowConflict);
  function choice(key, change) { setChoices(current => ({ ...current, [key]: { ...current[key], ...change } })); }
  return <section className="evolution-panel"><h2>Calendários externos</h2><p>Importe do Google Calendar, Outlook ou outro aplicativo usando ICS. Ao atualizar a mesma origem, você revisa mudanças e conflitos antes de aplicar. A atualização é de leitura: o LifeAI não altera o calendário externo.</p>
    <form className="evolution-card" onSubmit={event => { event.preventDefault(); run(async () => {
      const response = await api.post('/evolution/calendar/preview', { from, to, name, ...(source === 'file' ? { content } : { connectionId: Number(source) }) });
      setPreview(response.data); setChoices(Object.fromEntries(response.data.rows.map(row => [row.externalKey, { selected: !row.unchanged && !row.localEdited && !row.conflicts.length, allowConflict: false }])));
    }); }}>
      <fieldset disabled={busy}><legend>Importar ou atualizar</legend><div className="studio-form-grid">
        <label className="studio-field"><span>De</span><input type="date" required value={from} onChange={e => { setFrom(e.target.value); setPreview(null); }} /></label>
        <label className="studio-field"><span>Até · máximo 31 dias</span><input type="date" required min={from} max={from ? shiftDate(from, 30) : undefined} value={to} onChange={e => { setTo(e.target.value); setPreview(null); }} /></label>
        <label className="studio-field wide"><span>Origem</span><select value={source} onChange={e => { setSource(e.target.value); setPreview(null); }}><option value="file">Arquivo ICS</option>{resource.data?.connections.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        {source === 'file' && <><label className="studio-field wide"><span>Arquivo</span><input type="file" accept=".ics,text/calendar" onChange={file} /></label><label className="studio-field wide"><span>Nome desta origem</span><input required maxLength={80} value={name} onChange={e => { setName(e.target.value); setPreview(null); }} /><small>Use o mesmo nome ao reimportar para reconhecer os eventos existentes.</small></label></>}
      </div><div className="evolution-actions"><button className="studio-button" disabled={busy || source === 'file' && !content}>{busy ? 'Preparando…' : 'Revisar importação'}</button><button type="button" className="studio-button secondary" onClick={() => run(async () => download(await api.get('/evolution/calendar/export', { params: { from, to }, responseType: 'blob' }), 'lifeai-agenda.ics'))}>Exportar agenda em ICS</button></div></fieldset>
    </form>
    {preview && <section className="evolution-card" aria-label="Prévia da importação"><h3>Revise {preview.rows.length} ocorrência(s)</h3><p>Desmarcadas serão mantidas como estão. Eventos que desapareceram do arquivo externo não são excluídos da sua agenda. Esta prévia expira em 15 minutos.</p>{preview.warnings.map(text => <p key={text} className="evolution-warning">{text}</p>)}
      <div className="evolution-list">{preview.rows.map(row => <article key={row.externalKey}><label className="evolution-check"><input type="checkbox" disabled={busy || row.unchanged} checked={!!choices[row.externalKey]?.selected} onChange={e => choice(row.externalKey, { selected: e.target.checked })} /><span><strong>{row.title}</strong><small>{row.date.split('-').reverse().join('/')} · {row.startTime}–{row.endTime}{row.unchanged ? ' · Já sincronizado' : row.status === 'CANCELLED' ? ' · Cancelado na origem' : ''}</small></span></label>
        {!!row.conflicts.length && <p className="evolution-warning">Sobreposição com: {row.conflicts.join(', ')}.</p>}{row.localEdited && <p className="evolution-warning">Este evento recebeu uma alteração local.</p>}
        {(!!row.conflicts.length || row.localEdited) && <label className="evolution-check"><input type="checkbox" disabled={busy} checked={!!choices[row.externalKey]?.allowConflict} onChange={e => choice(row.externalKey, { allowConflict: e.target.checked })} /><span>Revisei e aceito substituir a alteração local ou manter a sobreposição.</span></label>}
      </article>)}</div><button className="studio-button" disabled={busy || !selected.length || unconfirmed} onClick={() => run(async () => {
        const response = await api.post(`/evolution/calendar/imports/${preview.id}/apply`, { decisions: selected.map(row => ({ key: row.externalKey, allowConflict: choices[row.externalKey].allowConflict })) });
        setPreview(null); setNotice(`${response.data.applied} ocorrência(s) atualizada(s).`); window.dispatchEvent(new Event('lifeai:agenda-updated'));
      })}>Aplicar {selected.length} ocorrência(s)</button>
    </section>}
    <details className="evolution-card"><summary>Assinar um calendário por link</summary><p>Use um link de assinatura ICS do Google Calendar ou Outlook. Links privados dão acesso ao calendário: não os compartilhe. Atualizar uma assinatura sempre abre uma prévia; alterações nunca são aplicadas em segundo plano.</p>
      {resource.loading ? <p role="status">Carregando assinaturas…</p> : resource.error ? <p role="alert">{resource.error}</p> : !resource.data?.feedConfigured ? <p>Assinaturas por link ainda não foram habilitadas nesta instalação. Você já pode importar e exportar arquivos ICS.</p> : <form onSubmit={e => { e.preventDefault(); run(async () => { await api.post('/evolution/calendar/connections', { name: connectionName, url }); setUrl(''); setConnectionName(''); setRevision(value => value + 1); }); }}><div className="studio-form-grid"><label className="studio-field"><span>Nome</span><input required maxLength={80} value={connectionName} onChange={e => setConnectionName(e.target.value)} /></label><label className="studio-field"><span>Link privado de assinatura ICS</span><input type="password" autoComplete="off" required value={url} onChange={e => setUrl(e.target.value)} /></label></div><button disabled={busy} className="studio-button secondary">Salvar assinatura</button></form>}
      {resource.data?.connections.map(row => <div className="evolution-actions" key={row.id}><strong>{row.name}</strong><button className="studio-button secondary" disabled={busy} onClick={() => { setSource(String(row.id)); setPreview(null); }}>Selecionar para atualizar</button><button className="studio-button secondary" disabled={busy} onClick={() => { if (window.confirm('Desconectar esta assinatura? Os eventos já importados serão preservados.')) run(async () => { await api.delete(`/evolution/calendar/connections/${row.id}`); setSource('file'); setRevision(value => value + 1); }); }}>Desconectar</button></div>)}
    </details>{error && <p role="alert" className="studio-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>;
}
