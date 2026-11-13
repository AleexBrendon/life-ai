import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { EntityEditor } from '../../src/components/planner/EntityManager';
import Dashboard from '../../src/components/dashboard/Dashboard';
import '@fontsource-variable/inter';
import '../../src/index.css';
import '../../src/styles/app-theme.css';
import '../../src/styles/studio.css';
import '../../src/styles/appearance.css';
import '../../src/styles/spacing.css';
import '../../src/styles/scrollbars.css';
import '../../src/styles/date-time.css';
import '../../src/styles/layout-resilience.css';
import '../../src/styles/identity.css';

export default function Fixture() {
  const [state, setState] = useState('editing');
  if (new URLSearchParams(location.search).get('view') === 'dashboard') return <MemoryRouter><div style={{ padding: 24 }}><Dashboard /></div></MemoryRouter>;
  return state === 'editing'
    ? <EntityEditor kind={new URLSearchParams(location.search).get('kind') || 'metas'} onClose={() => setState('closed')} onSaved={() => setState('saved')} />
    : <p role="status">{state === 'saved' ? 'Cadastro salvo' : 'Editor fechado'}</p>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
