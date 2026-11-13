# Evolução P3 — calendários, push, revisão, marcos e offline

A página **Evolução** reúne os cinco recursos, acessível na navegação desktop e
mobile. O pacote inclui a identidade LifeAI: SVG com monograma L/folha, favicon,
marca na navegação e PNGs de 180, 192 e 512 px para instalação no dispositivo.

## 36. Calendários externos

- Exportação ICS das ocorrências da agenda em períodos de até 31 dias, com UIDs
  estáveis e datas UTC para preservar o fuso do usuário.
- Importação de arquivos ICS até 200 KB, 300 eventos e 500 ocorrências por lote.
  Suporta eventos individuais, DAILY/WEEKLY/MONTHLY/YEARLY, exclusões EXDATE e
  exceções vinculadas à série. Limita a expansão a 20.000 iterações; formatos
  inválidos ou casos não suportados retornam erro, sem aplicar parcialmente.
- Eventos de dia inteiro ou múltiplos dias viram blocos diários até 23:59, com
  aviso na prévia. Um intervalo menor que um minuto é recusado.
- Reimportar a mesma origem identifica UID/ocorrência e atualiza o evento, sem
  duplicar por mudança de título ou horário no mesmo dia. Uma série recorrente
  movida para outros dias pode criar novas ocorrências: as ausentes não são
  excluídas automaticamente. Use o mesmo nome de origem ao reimportar arquivos.
- Assinatura de feeds ICS HTTPS do Google Calendar e Outlook. Links ficam
  cifrados com AES-256-GCM e não são devolvidos pelas APIs de listagem/exportação.
  Redirecionamentos e destinos arbitrários são recusados; há limite de tamanho
  e tempo de leitura.
- A atualização é **manual e de leitura**, com prévia de 15 minutos. Conflitos
  com a agenda, com outros itens importados e alterações locais exigem escolha
  explícita. Uma mudança posterior na agenda invalida a prévia. Aplicação
  transacional com isolamento Serializable e reivindicação condicional.
- Não há OAuth, escrita no Google/Outlook, sincronização bidirecional ou
  atualização automática de eventos. Desconectar preserva eventos já importados.

## 37. Push do navegador/celular

- Ativação mediante botão e permissão nativa. Não solicita permissão ao abrir a
  página. Preferências por categoria: compromissos próximos, água e ações.
- Silêncio no fuso do perfil, inclusive atravessando meia-noite. Avisos de início
  já expirados não são enviados depois do silêncio.
- Opção de ocultar detalhes na tela bloqueada, habilitada por padrão. Nesse
  caso, o push só informa que existe uma atualização no LifeAI.
- Trabalhador a cada 30 segundos; até 100 notificações consultadas e 20 tentativas
  de envio por ciclo. Registro por notificação/dispositivo, lease de 2 minutos,
  até 3 tentativas, backoff e remoção de assinaturas expiradas (404/410).
- Entrega é de melhor esforço, não exatamente uma vez: um provedor pode aceitar
  antes de uma falha de gravação do recibo. A tag estável ajuda a substituir o aviso
  no dispositivo. Disponibilidade depende também do navegador/OS e da conexão.
- Até 20 dispositivos por conta, endpoints de provedores permitidos e chaves
  validadas. Nenhum envio real ou pedido de permissão foi feito nos testes.
- Sem as variáveis VAPID, a funcionalidade aparece como não habilitada; os
  lembretes dentro do aplicativo continuam funcionando.

## 38. Revisão semanal orientada a resultados

- Compara planejadas, concluídas, puladas/não realizadas e sem conclusão, por dia
  e categoria. Selecionar a segunda-feira de uma semana já encerrada.
- Sugestões determinísticas para categorias abaixo de 60% de conclusão, sem
  inventar recomendações de um modelo quando ele não foi utilizado.
- Permite selecionar sugestões, escrever notas e salvar decisões. O snapshot
  de uma revisão finalizada não é recalculado ao reabrir.
- O botão de planejamento abre a prévia semanal existente; salvar a revisão não
  altera horários. É necessária a aprovação explícita da proposta semanal.
- A comparação reconstrói a agenda a partir dos cadastros/execuções atuais.
  Exclusões e mudanças históricas podem afetar uma revisão ainda não finalizada;
  não representa um plano original imutável de antes dessas mudanças.

## 39. Metas mensuráveis

- Marcos com título, unidade e valor-alvo. Cada entrega adiciona uma quantidade
  positiva, com nota e sessão concluída opcional da mesma meta.
- Uma sessão pode contar uma vez por marco; não é possível ultrapassar o alvo.
  A verificação e gravação usam transação Serializable para disputas concorrentes.
- Progresso e percentual vêm da soma das entregas. Concluir uma sessão não gera
  progresso automaticamente: é necessário registrar o resultado.
- Histórico preserva a entrega se uma sessão vinculada for removida (SetNull).
  As últimas 100 sessões ficam disponíveis para escolher novos vínculos.

## 40. Dados e offline

- JSON versionado com perfil, cadastros, finanças, execuções, tarefas, ciclos,
  revisões, marcos e metadados de integração. Consulta em RepeatableRead. Não
  exporta passwordHash, chaves push, URLs cifradas nem credenciais do servidor.
- Modo offline é opt-in por conta/dispositivo. IndexedDB guarda consultas
  permitidas e operações; não duplica o token na fila. Valida fingerprint do
  token e expiração da sessão antes de liberar dados locais.
- Service worker guarda **somente o shell estático** e os assets do build.
  APIs/autenticação nunca entram no Cache Storage. Os recursos da página
  Evolução são carregados sob demanda e também entram no precache de produção.
- Offline permite leitura de telas já salvas e mudanças de status de atividades
  dos dias disponíveis. Não permite finanças, exclusões, IA ou importações.
- Cada operação tem UUID, ordem local e estado esperado. O usuário solicita envio
  ao reconectar; o servidor confere identidade, propriedade, estado e recibo por
  usuário/UUID na mesma transação. Repetir uma ação aplicada é idempotente.
- Conflitos permanecem na fila, sem sobrescrever o servidor. O usuário revisa
  a agenda online e pode descartar a ação local. Falhas não apagam pendências.
- Ações em fila limitadas a 500; envio em lotes de 50. Cache e fila são separados
  por conta e limpos no logout. Locks de armazenamento coordenam gravação e
  limpeza entre abas quando Web Locks está disponível.
- Primeiro login, sessão expirada e telas/dias não salvos exigem conexão. Evite
  ativar em dispositivos compartilhados: dados locais são legíveis ao usuário
  do navegador. Não há restauração automática do JSON exportado nesta entrega.

## Configuração e publicação

1. Configurar a migração `20261114090000_future_features` no fluxo normal de
   `prisma migrate deploy`. Ela só adiciona tabelas/relações, dentro de transação
   com limite de espera por bloqueios de 5 segundos. Não foi aplicada ao banco real.
2. Para feeds, definir CALENDAR_ENCRYPTION_KEY com 64 caracteres hexadecimais:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   Guardar de forma segura. Trocar a chave exige recadastrar links existentes.
3. Para push, executar `npm run push:keys` na pasta backend e configurar
   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT no ambiente do servidor.
   O subject pode ser `mailto:contato@seu-dominio`. Manter o par estável; não
   publicar a chave privada no front-end, Git ou documentação.
4. Publicar API e front-end por seus fluxos existentes. O front-end gera sw.js
   e manifest; a aplicação deve ser servida em HTTPS. No iPhone compatível, usar
   a instalação na tela inicial. Atualizações de worker podem aguardar o fechamento
   das abas da versão anterior; filas IndexedDB permanecem entre builds.

## Validação

- Backend: `npm run test:evolution`, `test:unit`, `test:backend`, `test:database`.
  PGlite/Prisma isolados exercitam importação/reimportação, conflito, marcos,
  recibos offline, snapshot semanal, exportação e push com provedor simulado.
- Front-end: `npm test`, `npm run build`, `npm run test:ui` e
  `npm run test:evolution-ui`. Este último usa **o build de produção**, Edge em
  perfil temporário e API simulada; desliga a rede, recarrega a aplicação pelo
  service worker, registra uma ação, reconecta, envia e confere limpeza/isolamento.
- Foram inspecionadas capturas mobile e o ícone renderizado. Nenhum dado real,
  push externo, chave privada de produção ou migração real foi usado nesses testes.
- O lint global conserva dívida anterior; os arquivos novos estão cobertos por
  verificação direcionada, sem desativar regras para esconder apontamentos.
  Nesta entrega, o total ficou em 28 erros e 4 avisos anteriores. Passaram 285
  testes unitários do backend, 5 da aprovação, 17 de integridade, 8 dos novos
  recursos e 28 testes de lógica do frontend, além dos testes no navegador.

Referências técnicas: [ICAL.js](https://github.com/kewisch/ical.js/),
[Web Push](https://github.com/web-push-libs/web-push),
[Service Workers (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
