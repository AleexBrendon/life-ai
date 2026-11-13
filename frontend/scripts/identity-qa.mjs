import assert from 'node:assert/strict';

const success = data => ({body:{success:true,data}});
const notifications = [
  {id:1,title:'Sua próxima atividade',message:'Reserve um momento para estudar.',type:'UPCOMING',entityType:'GOAL_SESSION',entityId:3,isRead:false,createdAt:'2026-11-13T12:00:00Z',scheduledAt:'2026-11-13T14:00:00Z'},
  {id:2,title:'Revise seu orçamento',message:'Abra o financeiro e confira seu planejamento.',entityType:'financas',isRead:false,createdAt:'2026-11-12T12:00:00Z'},
  {id:3,title:'Seu planejamento está pronto',message:'Você pode revisar os próximos passos.',entityType:'ia',isRead:true,createdAt:'2026-11-10T12:00:00Z'},
];
export function identityReply(request) {
  const route=new URL(request.url).pathname;
  if(route==='/api/notifications')return success(notifications);
  if(route==='/api/notifications/read-all'){notifications.forEach(row=>{row.isRead=true});return success({});}
  if(route==='/api/personal/finance')return success({entries:[],incomeCents:500000,expenseCents:200000,allocatedCents:50000,freeCents:250000});
  if(route==='/api/personal/debt-plans')return success({today:'2026-11-13',arrears:[],purchases:[],plans:[]});
  if(route==='/api/personal/finance-bills')return success({month:'2026-11',rows:[],unscheduled:[],summary:{incomeCents:500000,expenseCents:200000,pendingCents:200000,balanceCents:300000,overdueCents:0}});
  if(route==='/api/planner/rotinas')return success([{id:1,name:'Leitura da manhã',description:'Um momento para aprender, todos os dias.',isActive:true,type:'PERSONAL',createdAt:'2026-01-01',schedules:[{id:1,startTime:'08:00',endTime:'08:30',dayOfWeek:5}],routineExecutions:[]}]);
  if(route==='/api/planner/lembretes')return success([{id:1,title:'Revisar o planejamento',description:'Escolher as prioridades da próxima semana.',isActive:true,recurrence:'DAILY',reminderTime:'18:00',createdAt:'2026-01-01',executions:[]}]);
  return null;
}

export async function runIdentityQA({send,evaluate,waitFor,clickText,capture,origin}) {
  const navigate=route=>send('Page.navigate',{url:origin+route});
  const ready=async()=>{await waitFor("document.querySelector('.app-shell') && document.querySelector('main h1')");await evaluate('document.fonts.ready');};
  const checkWidth=async(label)=>assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Overflow: ${label}`);
  const checkControls=async(label)=>{
    const mismatches=await evaluate(`Array.from(document.querySelectorAll('.studio-field > input:not([type=checkbox]):not([type=radio]):not([type=file]),.studio-field > select,.studio-field .picker-trigger')).filter(el=>el.getBoundingClientRect().width>10).map(el=>({label:el.closest('.studio-field').textContent.trim().slice(0,60),height:el.getBoundingClientRect().height})).filter(el=>Math.abs(el.height-44)>1)`);
    assert.deepEqual(mismatches,[],`Altura de campos: ${label}`);
  };
  const routes=[
    ['dashboard','/dashboard'],['agenda','/agenda'],['rotinas','/planejamento?aba=rotinas'],
    ['metas','/planejamento?aba=metas'],['trabalho','/planejamento?aba=trabalho'],
    ['lembretes','/planejamento?aba=lembretes'],['agua','/planejamento?aba=agua'],
    ['imprevistos','/planejamento?aba=imprevistos'],['financeiro','/financeiro'],
    ...['revisao','metas','calendarios','push','dados'].map(tab=>['evolucao-'+tab,'/evolucao?aba='+tab]),
  ];
  await navigate('/dashboard');await ready();
  assert.equal(await evaluate("document.documentElement.dataset.theme"),'dark');
  await navigate('/planejamento?aba=rotinas');await ready();
  await waitFor("document.querySelector('.studio-button:not(.secondary)')");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.studio-button:not(.secondary)')).backgroundColor"),'rgb(245, 196, 81)');
  for(const theme of ['dark','light']) {
    await evaluate(`localStorage.setItem('lifeai:appearance',${JSON.stringify(theme)})`);
    for(const width of [1440,768,390,320]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});
      for(const [label,route] of routes) {
        await navigate(route);await ready();
        await waitFor("!document.querySelector('main').textContent.includes('Carregando')");
        await checkWidth(`${label}-${theme}-${width}`);
        await checkControls(`${label}-${theme}-${width}`);
        if(label==='evolucao-metas')assert.equal(await evaluate(`(()=>{const grid=document.querySelector('form.evolution-card .studio-form-grid'),button=document.querySelector('form.evolution-card fieldset > .studio-button');return button.getBoundingClientRect().top-grid.getBoundingClientRect().bottom>=16})()`),true,'Separação da ação de criar marco');
        await capture(`${label}-${theme}-${width}.png`,true);
      }
      await navigate('/dashboard?painel=notificacoes');await ready();
      await waitFor("document.querySelector('.notification-row')");
      assert.equal(await evaluate("document.querySelectorAll('.notification-group').length"),3);
      await clickText('Financeiro');
      assert.equal(await evaluate("document.querySelectorAll('.notification-row').length"),1);
      await clickText('Todas');
      await checkWidth(`notificacoes-${theme}-${width}`);
      await capture(`notificacoes-${theme}-${width}.png`,true);
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      await waitFor("!document.querySelector('dialog[open]')");
      await navigate('/dashboard?painel=perfil');await ready();
      await waitFor("document.querySelector('.appearance-options')");
      await checkWidth(`perfil-${theme}-${width}`);
      await checkControls(`perfil-${theme}-${width}`);
      if(width>=768)assert.equal(await evaluate(`(()=>{const fields=Array.from(document.querySelectorAll('.profile-settings .studio-form-grid .studio-field'));const first=fields[0].querySelector('input'),second=fields[1].querySelector('.picker-trigger');return Math.abs(first.getBoundingClientRect().top-second.getBoundingClientRect().top)<1})()`),true,'Alinhamento de nome e data de nascimento');
      await capture(`perfil-${theme}-${width}.png`,true);
      await navigate('/dashboard?painel=ia');await ready();
      await waitFor("document.querySelector('.assistant-mode-tabs')");
      await checkWidth(`assistente-${theme}-${width}`);
      await capture(`assistente-${theme}-${width}.png`,true);
    }
  }
  await navigate('/dashboard?painel=notificacoes');await ready();
  await waitFor("document.querySelector('.notification-row')");
  await clickText('Marcar todas como lidas');
  await waitFor("!document.querySelector('.notification-row.is-unread')");
  await evaluate("sessionStorage.setItem('qa-no-seed','1');localStorage.removeItem('lifeai_token')");
  await navigate('/dashboard');await waitFor("document.querySelector('.login-page')");
  await capture('login-mobile.png',true);await checkWidth('login');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await capture('login-desktop.png',true);await checkWidth('login-desktop');
  console.log('Identidade aprovada: todas as áreas, temas claro/escuro, desktop/mobile, filtros e leitura de notificações, Escape e login.');
}
