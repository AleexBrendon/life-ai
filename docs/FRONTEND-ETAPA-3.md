# Front-end — terceira entrega incremental

## Comportamento

- O dashboard destaca primeiro uma atividade pendente em andamento, com início e
  fim, e depois o próximo compromisso. Considera o horário efetivo de uma rotina
  reagendada, intervalos do trabalho e estados de conclusão, pulo e não realização.
  Durante a pausa de trabalho, a retomada aparece como compromisso futuro.
- O relógio atualiza ao retornar à aba; a consulta do resumo é refeita na virada
  do dia no fuso do usuário. Dados do dia anterior não aparecem como dados de hoje.
- O editor de planejamento agrupa opções de IA/disponibilidade em uma seção
  expansível. Campos essenciais e tempos de deslocamento exigidos ficam visíveis.
  A seção abre quando o agendamento automático está habilitado.
- Cancelar, X e Escape pedem confirmação se o editor foi alterado. Continuar
  editando mantém os valores; descartar fecha o editor. Atualizar/fechar a aba
  utiliza o aviso nativo do navegador quando há alterações, sujeito às regras
  do próprio navegador. Essa proteção está no EntityEditor, não em todos os
  formulários financeiros, de perfil ou assistente.
- Falhas de salvamento preservam valores e exibem um resumo focável. Erros com
  identificação de campo permitem voltar diretamente ao controle correspondente.
  Erros sem identificação permanecem como mensagens no resumo.
- O cliente HTTP define limite de 20 segundos para operações comuns e 120 segundos
  para as gerações POST da IA. Limites explícitos existentes são preservados.
  Não há retentativa automática de gravações. O editor explica falhas de conexão,
  limite de requisições e a necessidade de conferir uma gravação após timeout.
- Consultas do dashboard, gráficos e lista do planejamento são canceladas quando
  substituídas/desmontadas. Resultados antigos não substituem uma consulta nova.
  Os gráficos mantêm o conteúdo na atualização do mesmo período e sinalizam
  atualização com aria-busy; trocar o período mostra o estado de carregamento.

## Qualidade e validação

Os seletores de data/hora agora usam um hook separado, com referências e estado
desestruturados. A correção mantém as regras de lint de hooks ativas.
O editor deixou de modificar a definição de um campo durante a renderização.

Na pasta frontend:

```powershell
npm test
npm run build
npm run lint
npm run test:ui
```

- 28 testes automatizados de lógica aprovados.
- Build de produção aprovado.
- Lint sem apontamentos nos arquivos novos/alterados. O lint global foi reduzido
  de 54 erros e 5 avisos para 29 erros e 4 avisos em arquivos fora desta entrega.
  Portanto, o comando global ainda termina com falha; a dívida restante não foi
  ocultada com desativação de regras.
- Testes de interface no Edge headless com perfil temporário, API interceptada
  com dados fictícios, servidor local em porta aleatória e relógio controlado.
  O VITE_API_URL é forçado para /api e requisições externas são bloqueadas.
  Verificam confirmação por Cancelar/X/Escape, descarte efetivo, fechamento sem
  alterações, preservação de valores, seletores de data/hora, foco no resumo e
  no campo com erro, salvamento, opções de IA e destaque em andamento.
- Largura sem rolagem horizontal verificada em 390 px (editor) e 1280 px
  (dashboard). Capturas dessas duas telas foram inspecionadas visualmente.

test:ui requer Chrome, Chromium ou Edge já instalado e Node com WebSocket nativo
(a execução desta entrega utilizou Node 24). Procura caminhos usuais; para outro
caminho, definir FRONTEND_BROWSER_PATH. Não precisa de login, banco ou Redis.
As capturas ficam na pasta temporária lifeai-frontend-qa-* indicada na saída.
A fixture fica fora da entrada do build e não integra os artefatos de produção.

O controle visual nativo do Windows estava indisponível; a verificação foi feita
com o navegador headless isolado. Os testes não substituem uma revisão de todos
os fluxos, temas e tamanhos de tela, nem testes com leitor de tela ou usuários.
Não houve alteração de back-end, aplicação de migração, publicação ou push nesta
entrega. Revisão ampla das notificações, finanças, onboarding e demais formulários
permanece como evolução futura.
