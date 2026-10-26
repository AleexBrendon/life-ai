# Guia de uso do LifeAI

O LifeAI reúne rotina, objetivos e trabalho para ajudar você a organizar seu tempo. A navegação principal possui três telas: **Dashboard**, **Minha agenda** e **Planejamento**. Notificações, perfil e conversa com a IA abrem pelos botões do cabeçalho.

## Configurações, foto e calendário

Abra a **engrenagem** ou clique na sua foto no cabeçalho. O painel reúne:

- **Perfil pessoal:** nome, data de nascimento, ocupação, estado civil e informação sobre filhos.
- **Foto:** escolha JPG, PNG ou WebP de até 5 MB. O navegador faz um recorte central e reduz a imagem para 256 × 256 antes de enviar. Confira a prévia e clique em **Salvar configurações**. Para excluir, use **Remover foto** e salve. Ela fica vinculada ao perfil no banco e aparece no cabeçalho e na lateral após salvar; não depende do arquivo original continuar no computador.
- **Agenda e horários:** escolha o fuso, a visualização inicial de Minha agenda (mês, semana ou dia) e se a semana começa no domingo ou na segunda. Os valores são aplicados ao salvar.
- **Calendário dos campos de data:** use o ícone ao lado da data, selecione mês e ano e depois o dia. É possível digitar diretamente. Os seletores se ajustam à largura do campo sem ultrapassar o painel.
- **Notificações:** escolha se quer receber avisos das suas alterações. Os alarmes de água têm configuração independente. Alterações nas próprias configurações sempre recebem uma confirmação no sino.
- **Preferências específicas:** atalhos para meta de água, alarmes, orçamento e caixinhas.

Use **Descartar** para desfazer alterações ainda não salvas. O e-mail é exibido para identificação da conta e não é alterado nesse formulário.

## Notificações das ações

### Aviso cinco minutos antes

Além do sino, o LifeAI mostra um **aviso na tela** para cada atividade pendente que estiver a até cinco minutos de começar. O cartão informa o nome, o tipo e o horário, com contagem regressiva **05:00 → 04:59 → …** e uma barra do tempo restante. Ao chegar ao horário, o cartão sai da tela sem concluir a atividade automaticamente.

Use **Ver na agenda** para abrir a atividade ou o **X** para dispensar o cartão. Dispensar não altera a agenda; o mesmo aviso não reaparece durante essa sessão do navegador. Ao concluir, pular ou mudar o horário de uma atividade, os cartões são recalculados na atualização seguinte. A consulta ocorre a cada 15 segundos e após alterações da agenda. A contagem usa o instante real de início, para não acumular atraso se o navegador limitar os timers.

O **ícone de alto-falante no cabeçalho** ativa ou silencia os sons das notificações. O controle no cartão e o da faixa de água usam a mesma preferência. Um aviso novo toca uma vez; a contagem não fica apitando a cada segundo. Avisos do mesmo compromisso usam a mesma identificação para não tocar duas vezes entre o cartão e o sino. Notificações antigas carregadas ao entrar não são reproduzidas em sequência.

O som começa ativado ao abrir ou recarregar o sistema. Por exigência dos navegadores, o áudio é liberado após o primeiro clique, toque ou uso do teclado na página. O ícone de som permite silenciar durante a sessão, mantendo os avisos visuais ativos. O sistema precisa estar aberto e conectado à API; não são notificações push do celular.

O sistema verifica a agenda e gera um aviso no sino aproximadamente **cinco minutos antes** do início de rotinas, lembretes, turnos de trabalho, sessões de metas e imprevistos pendentes. Atividades já concluídas ou puladas não geram esse aviso. Há apenas um aviso por ocorrência e horário; alterar o horário permite um novo aviso para o novo início.

Em **Configurações → Notificações**, use **Avisar 5 minutos antes** para ativar ou desativar. Essa preferência é independente dos avisos de alterações e do alarme de água. A API precisa estar em execução na janela do aviso; não há push externo nem recuperação dos avisos perdidos enquanto ela estava desligada.

Na central, **Ver atividade** marca o aviso como lido e abre a agenda na data correspondente, destacando a atividade. A conclusão ou o skip continuam sendo feitos na agenda. A exceção é o aviso de água: **Já bebi 250 ml** registra o consumo e marca o aviso como lido. Cada aviso permite confirmar o copo uma única vez, mesmo se clicar novamente. Apenas lembretes e imprevistos oferecem **Editar**, que abre o cadastro original. O texto dos avisos automáticos não é editável; não há botão de concluir atividade na central.

No modal de **Lembretes**, o campo **Status** permite escolher **Ativo**, **Pausado** ou **Concluído**. Pausar suspende o cadastro sem apagar seus dados; concluir encerra suas próximas aparições na agenda. Para retomar, edite e escolha Ativo. Isso é diferente de concluir apenas uma ocorrência na agenda do dia, que mantém a recorrência.

Cadastros, edições, exclusões, mudanças de status, registros de água, alterações financeiras e ações aplicadas da IA geram avisos no **sino**, quando a opção estiver ativada. Na agenda, concluir, pular ou voltar a pendente gera uma confirmação com a data selecionada. Alterar horários pelo formulário gera um aviso de edição; aprovar um ajuste da IA gera um aviso da proposta aplicada. A confirmação se refere à operação solicitada: um cadastro com vários horários ou uma proposta em lote gera um aviso da operação.

O contador é atualizado após a resposta da operação e os avisos ficam disponíveis na central. Use **Ver atividade** para abrir a agenda ou a seção relacionada. Falhas de validação, leituras de dados e conversa da IA sem alteração não geram confirmação de mudança. Marcar avisos como lidos não gera novas notificações. Os avisos automáticos não oferecem edição do texto.

## Primeiro acesso

1. Entre com sua conta ou use o cadastro existente.
2. Para explorar com exemplos, no diretório `backend` execute `npm run seed`.
3. A conta de demonstração é `demo@lifeai.com`, com senha `LifeAI123!`.
4. Comece por **Planejamento → Trabalho → Trabalhos e jornadas** para cadastrar seu trabalho. Depois adicione rotinas e metas.

O seed preserva os registros existentes e não duplica os exemplos da mesma data. Ao executá-lo em outro dia, ele acrescenta exemplos para o novo período. Use a conta demo em ambiente de desenvolvimento.

## Água: meta diária e lembretes

### Alarme na tela e intervalo

O topo do sistema exibe **Água**, consumo diário e o tempo até o próximo aviso. Com lembretes ativados, aparece um aviso na tela nos horários configurados. O aviso de água oferece apenas **Já bebi 250 ml**, que registra esse volume. Feche pelo X para dispensar sem registrar nem desativar os próximos intervalos. Para outros volumes, abra Planejamento → Água. A escolha é lembrada neste navegador para aquele intervalo.

Para começar, abra **Planejamento → Água → Configurar aviso de 1 em 1 hora**, revise a meta e os horários e salve. O botão preenche 60 minutos e ativa os avisos no formulário; você pode mudar o intervalo antes de salvar. As configurações existentes são preservadas até salvar.

Os 60 minutos são uma opção de organização, não uma recomendação clínica. O [NHS orienta beber líquidos regularmente ao longo do dia](https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/), sem estabelecer um intervalo universal em minutos. Necessidades variam, inclusive com calor, exercício, gravidez e condições de saúde. Água dos alimentos e outras bebidas também contribuem para a hidratação; esta tela registra apenas os volumes que você informa. Se houver restrição de líquidos, siga a orientação de quem acompanha sua saúde.

O som fica ativado por padrão e é liberado após a primeira interação com a página. Use o ícone de som no topo para silenciar ou reativar durante a sessão. O alarme visual e sonoro exige o sistema aberto e conexão com a API; abas em segundo plano podem sofrer atraso do navegador. Não é um despertador do celular. A contagem segue o fuso do perfil, e os lembretes param ao atingir a meta registrada.

1. Abra **Planejamento → Água → Configurar meta e lembretes**.
2. Informe a sua meta em litros e o tamanho do copo em mililitros. A meta é definida por você; o sistema não calcula uma recomendação de saúde.
3. Ative os lembretes, escolha o intervalo e os horários de início e fim, e salve.
4. Quando beber, clique em **Bebi … ml**. Para outro volume, use **Outra quantidade**.
5. Acompanhe o total, a barra de progresso e quanto falta. Use o lápis para corrigir um registro ou a lixeira para excluí-lo.

Os lembretes chegam ao **sino**, com contador de não lidas e atalho **Registrar água**. O servidor verifica os horários a cada minuto e o frontend atualiza as notificações a cada minuto. Só existe um aviso por intervalo; não são acumulados avisos de intervalos perdidos enquanto a API estava desligada. Quando o consumo registrado atingir a meta, os próximos lembretes daquele dia param. No dia seguinte o total diário começa em zero, preservando o histórico no banco. A data segue o fuso horário configurado no perfil.

Os avisos dependem da API em execução. Não são notificações push do celular, SMS ou WhatsApp. Receber um lembrete não registra água automaticamente. A tela apresenta os consumos do dia atual.

## Assistente IA: reorganização semanal e compras

Abra **Assistente IA** no topo. Há cinco áreas: **Conversar**, **Rotina do mês**, **Cadastrar rotina**, **Reorganizar semana** e **Compras**.

### Rotina do mês: a IA remonta sua rotina

Em **Assistente IA → Rotina do mês** (ou pelo botão **Remontar minha rotina com IA**), a IA analisa todos os seus cadastros e monta uma **semana-modelo**, que se repete durante um ciclo mensal.

**O que é preservado.** Trabalhos e rotinas sem **Permitir reorganização pela IA** (por exemplo, o emprego CLT) nunca são alterados. Rotinas de descanso e compromissos religiosos mantêm o dia; só o horário pode ser ajustado.

**O que a IA avalia.** Cada alternativa recebe uma pontuação de 0 a 100, comparada com a rotina atual:

- conflitos entre atividades e com o almoço (12h–13h) e o jantar (19h–19h30);
- atividades flexíveis que terminam depois do limite escolhido (padrão 22h) e atividade física depois das 21h, que pode atrapalhar o sono;
- treinos em dias seguidos, sem recuperação;
- dias com mais de 11 horas comprometidas (quando a carga vem só de compromissos fixos, aparece como aviso);
- rotinas flexíveis sem horário (como um treino de flauta ainda sem agenda) e as sessões semanais das metas ativas, que recebem horários livres.

**Alternativas.** **Manter a rotina atual**, **Ajuste mínimo**, **Saúde e equilíbrio** e **Desempenho e foco**. Cada ajuste mostra o horário anterior, o novo e o motivo. A alternativa recomendada aparece destacada. Escreva no campo de prioridades, por exemplo “dormir melhor” ou “estudar para a faculdade”, para orientar a recomendação. Também é possível mudar o horário de início das atividades e o limite de término.

**Aviso "Sem espaço".** Aparece quando a IA não encontra horário livre para todas as sessões semanais de uma rotina ou meta, respeitando o limite de horário, 15 minutos de folga entre atividades, almoço e jantar e no máximo uma sessão por dia. Exemplo: “Estudar faculdade EAD: coloquei 4 de 5 sessões semanais; não sobrou horário livre de 45 min para 1 sessão.” A sugestão continua válida, só com menos sessões. Para caber tudo, reduza a frequência ou a duração no cadastro, ou amplie o horário em **Preferências para montar a rotina**. O mesmo aviso aparece nas propostas montadas pela conversa.

**Testar cada sugestão.** Em cada alternativa, **Ver como fica** abre a rotina desenhada, sem salvar nada:

- **Semana:** grade de segunda a domingo com trabalho e compromissos fixos (cinza), rotinas (verde) e metas (lilás). O que é novo ou muda de horário tem contorno laranja; a posição anterior aparece tracejada.
- **Mês do ciclo:** cada dia do ciclo com as rotinas e metas daquele dia e a quantidade de compromissos fixos.

Compare quantas sugestões quiser. Depois clique em **Selecionar esta rotina** (no card ou dentro da visualização) e, no final da lista, em **Confirmar rotina selecionada**. Uma janela de confirmação resume o que vai mudar; só **Confirmar e aderir** aplica a rotina.

**Aprovação.** Nada muda antes de você clicar em **Confirmar e aderir**. Ao aderir:

- os horários das rotinas mudam para todas as semanas, e ajustes pontuais pendentes dessas rotinas a partir de hoje são substituídos;
- as sessões das metas são criadas até o fim do ciclo, sem duplicar datas que já tinham sessão;
- começa um novo ciclo, de hoje até o fim do mês. Se faltarem menos de 10 dias, o ciclo vai até o fim do mês seguinte.

Se os cadastros mudarem depois da sugestão, a aprovação é recusada e é preciso gerar a rotina de novo.

### Acompanhamento e avaliação do ciclo

Durante o ciclo, **Rotina do mês** mostra o período, os dias restantes e o desempenho: atividades concluídas, puladas e sem registro, além das atividades com menor adesão. Marque as atividades como concluídas ou puladas na agenda para a análise ficar precisa.

Nos **três últimos dias do ciclo**, uma notificação por dia convida para a avaliação. Cada dia tem 5 perguntas (notas de 1 a 5 e um campo livre):

1. **Adesão à rotina:** quanto conseguiu seguir, energia, encaixe dos horários, peso da rotina e a atividade mais difícil.
2. **Saúde e descanso:** sono, descanso e lazer, estresse, benefício das atividades físicas e horários que atrapalharam.
3. **Resultados e próximo mês:** avanço nas metas, produtividade, satisfação, vontade de manter a rotina e o que mudar.

As respostas ficam salvas no ciclo. Se perder um dia, a avaliação anterior continua disponível. Ao montar a rotina do próximo ciclo, a IA usa o desempenho e as respostas:

- atividades com menos de 50% de adesão recebem sugestão de outro horário;
- atividades com 80% ou mais de adesão tendem a ser mantidas;
- energia baixa, estresse alto ou sono ruim aumentam o peso de horários mais cedo e de dias menos carregados;
- se você quer manter a rotina, está satisfeito e não há conflitos, a recomendação é **Manter a rotina atual**, que renova o ciclo sem alterar horários.

Quando o ciclo termina sem uma nova rotina aprovada, uma notificação lembra de concluir a avaliação e montar o próximo.

### Preparar rotinas para reorganização

Em **Planejamento → Rotinas → Editar**, marque **Permitir reorganização pela IA (somente após aprovação)** apenas em atividades flexíveis, como corrida ou treino pessoal. As rotinas existentes começam com essa opção desativada. Mantenha aulas, cultos e compromissos de horário fixo sem essa permissão. Jornadas de trabalho e lembretes não são movidos.

### Deixar a IA definir o horário

Em **Planejamento → Rotinas** ou **Planejamento → Metas**, marque **Deixar a IA definir o horário** quando não quiser escolher os horários você mesmo. Na rotina, informe também **Sessões por semana** e **Minutos por sessão**; na meta, esses campos já fazem parte do formulário. A lista de horários ou de sessões pode ficar vazia.

Na próxima análise em **Assistente IA → Reorganizar semana**, cada alternativa mostra a seção **Novos horários sugeridos pela IA**, com os itens marcados como **Novo**:

- A IA completa apenas o que falta para chegar às sessões por semana. Uma rotina com 3 sessões semanais e 1 horário cadastrado recebe até 2 sugestões.
- As sugestões ficam em dias diferentes, distribuídas pela semana, em horários futuros e livres. Elas respeitam compromissos fixos, as pausas da análise, o intervalo entre atividades e o limite de 23h. Metas com prazo não recebem sessões depois dessa data.
- Se não houver espaço para todas as sessões, a alternativa informa quantos horários foram encontrados.
- **Nada é salvo antes da aprovação.** Ao clicar em **Aprovar esta alternativa**, a rotina passa a ter um horário que se repete toda semana naquele dia, e a meta recebe sessões pendentes apenas naquela semana. Se a agenda ou os cadastros mudarem depois da análise, a aprovação é recusada e é preciso gerar uma nova análise.
- Rotinas com essa opção também podem ter os horários remanejados em reorganizações futuras, como as rotinas que permitem reorganização pela IA.

Para metas, a sugestão vale semana a semana: repita a análise nas semanas seguintes para receber novas sessões.

Na área **Cadastrar rotina**, você pode pedir, por exemplo: “Adicione corrida todos os dias, mais tempo de estudo e treino de flauta”. Frequências diárias explícitas são respeitadas quando há espaço; as escolhas e limitações aparecem antes de confirmar. Isso não é uma prescrição de atividade física. Novas atividades só são cadastradas após sua aprovação.

### Quando surgir um imprevisto

Depois de salvar um imprevisto futuro, um painel flutuante oferece uma análise da semana correspondente, **de domingo a sábado**, incluindo seus compromissos cadastrados.

- O planejamento usa, por padrão, o período de **7h a 23h**, preserva a duração das atividades e reserva 15 minutos entre os novos encaixes.
- Almoço de 12h a 13h e pausa de 19h a 19h30 podem ser preservados pela opção da análise. Revise essas hipóteses conforme sua rotina real.
- As alternativas são **Menor mudança**, **Mais foco nos estudos** e **Rotina equilibrada**. Opções iguais são agrupadas; podem aparecer uma, duas ou três.
- Confira os horários anteriores e propostos. **Aprovar esta alternativa** aplica apenas uma opção, em uma transação.
- A movimentação de rotinas vale apenas para as ocorrências daquela semana e mantém o agendamento recorrente. Sessões pendentes de metas só podem mudar se a opção correspondente estiver habilitada. As movimentações são dentro do próprio dia; não transferem rotinas para outro dia no MVP.
- Atividades concluídas, puladas ou já iniciadas não são reorganizadas. Se não houver espaço ou dois compromissos fixos coincidirem, o sistema explica o conflito e impede aplicar aquela alternativa.
- Se a agenda mudar depois da análise, a aprovação é recusada: use **Atualizar análise**.

Você pode minimizar ou fechar o painel. Para recuperar a proposta pendente, abra **Assistente IA → Reorganizar semana** e selecione uma data daquela semana. Também pode pedir no chat “Reorganize minha semana” ou “Reorganize minha próxima semana”. A reorganização ajusta horários existentes e só sugere novos horários para rotinas e metas marcadas com **Deixar a IA definir o horário**; para as demais, cadastre as sessões/rotinas antes.

Somente modelos gratuitos são usados por essas duas novas análises. Se o provedor estiver sem chave, limitado ou indisponível, o sistema mostra **Planejamento local** ou **Simulação local**, com alternativas e cálculos feitos pelo servidor; não apresenta uma resposta local como se tivesse vindo do modelo.

### Planejar uma compra com a IA

Abra **Financeiro → Analisar compra com IA** ou **Assistente IA → Compras**.

1. Descreva o produto desejado. Se já tiver uma compra planejada, selecione-a para reavaliar sem duplicar a reserva no cálculo.
2. Informe o preço conhecido, se houver, dinheiro realmente disponível, entrada, custos extras e reserva mensal mínima. O saldo previsto não é tratado como saldo em banco.
3. Informe a taxa mensal real do cartão. Use **0** somente se a oferta for efetivamente sem juros. Com taxa em branco, não é sugerido parcelamento.
4. A pesquisa usa fontes públicas e páginas de Mercado Livre, AliExpress, Terabyte, KaBuM!, Pichau e Amazon Brasil. Também é possível colar até seis links HTTPS dessas lojas.
5. Confira a data da consulta e os dados publicados: preço em reais, nota, quantidade de avaliações e vendas, quando disponíveis. Os critérios iniciais são 100 avaliações, nota 4,5/5 e 100 vendas, ajustáveis na tela. Dados ausentes não são inventados. O domínio de um marketplace não confirma que o vendedor do anúncio é oficial.
6. Se as lojas ou buscas bloquearem a consulta, use os links diretos de pesquisa, confira o anúncio e informe o preço. A análise orçamentária continua disponível, mas o sistema não afirma ter verificado o anúncio bloqueado.
7. Confira as estratégias: poupar antes de comprar, comprar à vista com o dinheiro declarado ou usar o menor prazo de parcelas que caiba na simulação. Frete, tributos, CET, preço final e limite do cartão precisam ser confirmados na loja.
8. **Salvar compra no planejamento** exige confirmação e reavalia o orçamento. Isso cria ou atualiza uma compra planejada, sem fazer pedido, pagar, contratar crédito ou movimentar dinheiro.

No financeiro, marque **Renda variável ou incerta** em freelancer, bônus e comissões. A simulação também reconhece nomes comuns dessas rendas e trata recebimentos avulsos não confirmados como incertos. Rendas variáveis futuras são excluídas; as já recebidas entram no mês do registro.

O cálculo considera despesas, compras e caixinhas já comprometidas, contas vencidas não confirmadas e uma margem igual à maior entre a reserva informada e 10% da renda considerada. Essa margem é uma hipótese conservadora da simulação, não uma regra financeira universal. Valores duplicados entre o orçamento antigo e as contas usam a maior estimativa de despesas. Os cenários de parcelas verificam cada mês do prazo, até 24 parcelas. Se houver contas vencidas sem confirmação ou nenhum cenário compatível, o sistema pede revisão dos dados em vez de recomendar nova dívida. Nenhum cenário garante que você não terá dificuldades futuras.

As últimas dez análises de compra ficam disponíveis em **Análises anteriores**. Atualize a pesquisa e os dados financeiros antes de tomar a decisão.

## Finanças: salário, despesas, compras e caixinhas

Abra **Financeiro** no menu. O atalho antigo **Planejamento → Finanças** também leva a essa tela. Existem duas abas: **Contas e calendário** e **Relatórios**.

### Contas, recebimentos e vencimentos

1. Clique em **Nova conta** e escolha **Conta a pagar** ou **Valor a receber**.
2. Informe nome, valor, categoria, descrição e primeiro vencimento. Escolha **Uma única vez** ou **Todo mês**, com data final opcional.
3. A conta aparecerá somente no calendário do **Financeiro**. **Minha agenda** reúne rotinas, metas, trabalho, lembretes e imprevistos. Use o seletor de mês para consultar as próximas ocorrências. Dias 29, 30 e 31 são ajustados ao último dia dos meses menores.
4. Clique no item do calendário ou da lista para consultar seus detalhes e alterar a situação.

- **Paga / Recebida:** informe a data real. Se for depois do vencimento original, o motivo do atraso é obrigatório.
- **Adiada:** informe uma nova data, posterior ao vencimento atual e não anterior a hoje, e explique o motivo. Só aquela ocorrência muda; os próximos meses continuam com o vencimento habitual.
- **Não paga / Não recebida:** explique o motivo. O valor continua em aberto.
- **Pendente:** remove a confirmação atual e restaura o vencimento original. O histórico permanece.

Quando uma data prevista passa sem confirmação de pagamento, a ocorrência aparece automaticamente como **Não paga**, mesmo que tivesse sido adiada. Abra-a para registrar o motivo, uma nova previsão ou o pagamento. Isso não registra movimentação bancária automaticamente.

O card mostra o motivo mais recente, a data de pagamento quando houver e o **Histórico de alterações**, incluindo os motivos anteriores. Alterar uma conta mensal não apaga esse histórico. Meses já registrados preservam seu valor; o novo valor do cadastro vale para ocorrências ainda não registradas. Após existir histórico, tipo, primeiro vencimento e repetição não podem mudar: encerre a recorrência e crie outro cadastro quando necessário.

**Excluir conta** remove o cadastro, as ocorrências e o histórico, após confirmação. Para encerrar só a repetição, use **Editar conta → Repetir até**, preservando os meses com histórico.

### Relatórios financeiros

A aba **Relatórios** apresenta entradas e saídas previstas dos últimos seis meses, despesas por categoria e a situação das contas do mês selecionado. O saldo previsto usa valores a receber menos contas a pagar; o saldo realizado usa somente recebimentos e pagamentos confirmados.

Os totais consideram a **data prevista atual**. Um adiamento para outro mês transfere o valor para esse mês; o item continua consultável no mês original com sua nova data, mas não entra duas vezes nos totais. O saldo realizado é agrupado por mês do vencimento atual, não é um extrato bancário pela data efetiva de pagamento.

### Orçamento, compras e caixinhas

Na parte inferior do Financeiro, abra **Orçamento estimado, compras e caixinhas**. Os registros anteriores continuam disponíveis. O orçamento é uma simulação mensal independente e não é somado novamente aos relatórios de contas.

Nas rendas e despesas antigas, use **Adicionar vencimento** para abrir o cadastro de uma conta com o nome e o valor já preenchidos; revise a data e salve. O vencimento fica vinculado à renda ou despesa original. Ao abrir novamente, o sistema recupera a conta vinculada, sem criar uma cópia.

1. Em **Rendas**, cadastre o salário líquido e outras entradas mensais.
2. Em **Despesas**, cadastre os gastos mensais, como aluguel, alimentação, transporte e assinaturas.
3. Em **Caixinhas**, defina o nome, o valor do objetivo, quanto já está guardado e quanto pretende reservar a cada mês.
4. Em **Compras planejadas**, informe o preço total, a entrada ou valor já guardado e em quantos meses quer dividir o restante.
5. Confira o **Saldo livre / mês**, a parcela calculada e se cada objetivo cabe no orçamento. Use o lápis para ajustar qualquer registro e a lixeira para removê-lo.

O cálculo é:

```text
Disponível antes dos objetivos = renda mensal − despesas mensais
Parcela planejada = (preço da compra − entrada/valor guardado) ÷ meses
Saldo livre = disponível − parcelas de todas as compras − reservas das caixinhas
Prazo mínimo de uma compra = restante ÷ saldo disponível após os outros objetivos
```

Parcelas e prazos são arredondados para cima; a última parcela pode ser menor por ajuste de centavos. Quando não existe saldo positivo após os outros compromissos, o sistema informa que a compra não tem prazo viável no orçamento atual. O prazo mínimo de cada compra considera as outras compras e caixinhas já cadastradas; ao mudar um objetivo, os demais são recalculados.

**Exemplo:** renda de R$ 5.000, despesas de R$ 3.000 e caixinha de R$ 500/mês deixam R$ 1.500 para uma compra. Um notebook de R$ 3.000, sem entrada, cabe em no mínimo 2 meses. Se você escolher 3 meses, a parcela será de R$ 1.000 e o saldo livre mensal será de R$ 500.

Os cálculos não incluem juros, taxas, inflação ou rendimento. As caixinhas são reservas de planejamento: nenhum dinheiro é transferido. Atualize **Já guardado / entrada** manualmente quando separar dinheiro ou pagar parte da compra; os saldos não aumentam com a passagem do mês. Ao atingir o objetivo, sua reserva mensal deixa de comprometer o orçamento. Evite cadastrar a mesma parcela em Compras e também em Despesas, ou a mesma reserva em Compra e Caixinha, para não contar o valor duas vezes. Não use os mesmos valores guardados em objetivos diferentes.

## 1. Dashboard: acompanhar o dia

Mostra um resumo dos dados reais da sua conta:

- Quantas rotinas estão programadas para hoje.
- Quantas atividades da agenda foram concluídas, incluindo rotinas, lembretes, períodos de trabalho, sessões de metas e imprevistos.
- Quantas sessões de metas estão planejadas para hoje.
- Uma lista das primeiras oito atividades do dia, com seus horários.

Clique em **Abrir minha agenda** para ver o calendário completo. Os números não representam o progresso das tarefas do Kanban: essas tarefas têm acompanhamento próprio na aba Trabalho.

## 2. Minha agenda: visualizar e organizar o tempo

### Início e cores das atividades

O calendário não projeta atividades antes de **17/10/2026**, início deste projeto. Rotinas, turnos de trabalho e lembretes recorrentes respeitam também a data em que foram criados, no fuso do perfil. Um horário adicionado depois começa a aparecer a partir da própria criação. Os registros já criados pela IA seguem a mesma regra, sem precisar refazer o cadastro ou excluir histórico.

As cores identificam o tipo: **verde para rotinas**, **amarelo para lembretes**, **azul para trabalho**, **roxo para metas** e **laranja para imprevistos**. As cores aparecem nos filtros, nos eventos do calendário e no painel do dia.

Datas anteriores continuam navegáveis, mas sem atividades do projeto. As recorrências futuras continuam enquanto o cadastro estiver ativo; não existe uma data final automática para rotinas e jornadas. Para encerrar novas repetições, pause ou desative o cadastro correspondente.

O calendário usa células maiores e títulos de até duas linhas, com até três compromissos visíveis por dia no mês. Quando houver mais, clique no dia para ver o restante. Em telas menores, o painel do dia fica abaixo e o calendário permite rolagem horizontal para preservar a leitura.

### Marcas de rotina nos dias que passaram

Nas visões de mês e semana, cada dia que já passou e tinha rotinas ganha uma marca no canto inferior direito. Clique nela para ver o motivo:

- **✓ verde — dia completo:** todas as rotinas do dia foram concluídas.
- **! amarelo — dia parcial:** houve ação, mas nem tudo foi concluído. A janela lista as rotinas puladas (com o motivo informado), as concluídas e as que ficaram sem nenhuma ação.
- **✗ vermelho — dia sem registro:** nenhuma rotina foi concluída nem pulada; o dia passou em branco.

O dia de hoje ainda não recebe marca. **Ver o dia** abre o painel daquele dia para você registrar o que faltou.

### Navegação no calendário

Quando o dia tiver mais compromissos do que cabe na célula, clique em **+ atividades**. Uma lista com rolagem mostra todos os compromissos daquela data, incluindo os outros tipos mesmo se houver filtro no calendário. Clique em qualquer item para abrir o card de detalhes e concluir, pular ou voltar a pendente. Ao fechar o card, você retorna à lista do dia.

Clique no nome de um compromisso dentro do mês ou da semana para abrir seu card de detalhes. Ele mostra data, horário, descrição e status daquele dia, com as ações **Concluir**, **Pular neste dia** e **Voltar a pendente**. O skip permite informar um motivo opcional. A ação atualiza a agenda e vale só para aquela ocorrência. **Editar cadastro** abre o formulário do registro original. Para apenas selecionar o dia, clique no número ou no espaço livre da célula.

- **Mês:** visão geral das datas e atividades. Clique em um dia para abrir seus detalhes.
- **Semana:** atividades da semana, começando na segunda-feira.
- **Dia:** foco em uma data, com um seletor para trocar de dia.
- **Hoje:** volta à data atual.
- **Setas:** avançam ou voltam um mês, uma semana ou um dia, conforme a visualização.
- **Filtros:** mostram tudo ou somente rotinas, trabalho, metas, lembretes ou imprevistos.

O calendário usa horários e datas reais dos registros. As tarefas do Kanban não aparecem como compromissos: elas não possuem data e horário no modelo atual.

### Painel do dia

Em **Minha agenda**, selecione a data e use as ações de cada atividade: **Concluir**, **Pular neste dia** ou **Voltar a pendente**. Isso vale para rotinas, períodos de trabalho, lembretes, sessões de metas e imprevistos. Ao pular, confirme no modal; o motivo é opcional. Você pode desfazer uma conclusão ou um skip voltando a pendente. Cada turno de trabalho tem acompanhamento próprio. A alteração vale apenas para a ocorrência e não conclui o trabalho inteiro, a meta inteira nem as próximas repetições.

O **Progresso do dia** considera todas as atividades programadas da agenda. Concluídas aumentam o percentual; puladas continuam no total, mas aparecem separadamente. Voltar a pendente retira a conclusão do cálculo. Ações da agenda não concluem tarefas do Kanban, não registram água e não movimentam caixinhas.

No painel da data selecionada:

1. Escolha o tipo de cadastro em **Adicionar à agenda**.
2. Clique em **Adicionar**.
3. Preencha o formulário e salve.
4. Use o lápis para editar e a lixeira para excluir.
5. Nas rotinas, use o botão de confirmação para registrar a conclusão da ocorrência daquele dia.

**Atenção:** editar uma rotina ou jornada altera o cadastro recorrente. A lixeira de uma atividade abre a confirmação de exclusão do cadastro inteiro, incluindo seus vínculos; ela não remove apenas a ocorrência visível. Para retirar somente um horário ou uma sessão, edite o cadastro e remova a linha correspondente.

## 3. Planejamento: cadastrar e manter seus planos

Todas as áreas têm busca por nome, filtros de status e cartões com ações de edição e exclusão. **Todos** inclui registros pausados. A busca ignora diferenças de acentuação e maiúsculas.

### Rotinas

Use para hábitos e atividades recorrentes, como caminhar, estudar ou organizar a casa.

O formulário contém:

- Nome e **categoria**, escolhida em uma lista com as categorias padrão e as que você já usa em outras rotinas. Para criar uma nova, selecione **+ Nova categoria…** e digite o nome; ela passa a aparecer na lista nas próximas rotinas.
- Opção **Permitir reorganização pela IA (somente após aprovação)**.
- Opção **Deixar a IA definir o horário**, que exibe **Sessões por semana** e **Minutos por sessão**.
- Opção **Ativo**.
- Horários da semana: dia, início e fim.

Adicione uma linha para cada dia ou intervalo. Exemplo: caminhada na segunda e na quarta, das 07:00 às 07:40, exige duas linhas. O início deve ser anterior ao fim. Horários sobrepostos dentro do mesmo cadastro são rejeitados.

Uma rotina sem horários pode ser salva, mas só aparece no calendário depois de receber um agendamento. Com **Deixar a IA definir o horário** marcado, esse agendamento pode vir das sugestões da reorganização semanal, depois da sua aprovação. Desmarcar **Ativo** preserva o registro e o retira da agenda.

### Metas

Use para objetivos com prazo e dedicação planejada.

O formulário contém:

- Título, descrição e prazo opcional.
- Frequência desejada: de 1 a 7 sessões por semana.
- Duração desejada: de 15 a 240 minutos por sessão.
- Prioridade, **Deixar a IA definir o horário** e status.
- Sessões na agenda: data, início, fim e status de cada sessão.

**Frequência e duração são preferências de planejamento.** Elas não criam sessões automaticamente neste formulário. Com **Deixar a IA definir o horário** marcado, a reorganização semanal sugere as sessões que faltam, que só são salvas após aprovação. Use **Adicionar** em **Sessões na agenda** para reservar cada período. A duração de uma sessão manual é definida pelos horários que você informar.

Você pode editar ou remover sessões individualmente dentro do formulário. Limpar o prazo remove a data limite da meta.

### Trabalho: cadastro e jornada

O trabalho agrupa suas tarefas e jornadas. Seu cadastro tem apenas **Ativo/Inativo**, sem status de execução. **A fazer**, **Em andamento** e **Concluído** pertencem às tarefas do Kanban. Na agenda, concluir ou pular um turno afeta somente a ocorrência daquele dia.

Em **Trabalho → Trabalhos e jornadas**, cadastre:

- Nome, empresa, cargo, modalidade e local.
- Status e opção **Ativo**.
- Jornada por dia da semana, com início e fim.
- Início e fim da pausa, se houver.
- Tarefas vinculadas ao trabalho, com título, descrição e status.

Informe os dois horários da pausa ou deixe ambos vazios. A pausa precisa ficar dentro da jornada. Use **Adicionar** para incluir outros dias ou tarefas. Os itens podem ser alterados ou removidos antes de salvar.

### Trabalho: Kanban de tarefas

Em **Trabalho → Kanban de tarefas**, selecione o trabalho e clique em **Nova tarefa** (ou **Adicionar tarefa**, na coluna **A fazer**). Informe:

- **Título** (obrigatório) e **descrição**;
- **Projeto** e **repositório ou link** (por exemplo, o endereço do GitHub; links que começam com http abrem em nova aba);
- **Prioridade** (alta, média ou baixa), **prazo** e **estimativa em minutos**.

Toda tarefa nova entra em **A fazer**. Em cada coluna, as tarefas ficam em ordem de prioridade: primeiro as de prioridade alta, por último as de prioridade baixa. A cor na borda do cartão indica a prioridade.

**Abrir a tarefa.** Clique na linha da tarefa para abrir o card com todas as informações, o tempo trabalhado e o histórico. Os botões mudam conforme a situação:

- **A fazer:** **Iniciar** move a tarefa para **Em andamento** e começa a contar o tempo; **Cancelar** fecha o card sem mudar nada.
- **Em andamento, com o tempo contando:** **Pausar** para o tempo naquele momento; **Excluir** remove a tarefa.
- **Em andamento, pausada:** **Continuar** retoma a contagem de onde parou, no mesmo dia ou em outro.
- Em qualquer situação, **Editar** altera os dados, e **Mover para** muda a coluna, uma alternativa ao arraste que funciona no celular e no teclado.

**Mudar de coluna.** Ao arrastar a tarefa para outra coluna (ou usar **Mover para**), informe o **motivo**. Por exemplo: de **Em andamento** para **Concluído** (“Entregue ao cliente”), de **Concluído** de volta para **Em andamento** (“Cliente pediu ajuste”) ou de **Em andamento** para **A fazer** (“Aguardando o cliente”). Só iniciar uma tarefa de **A fazer** dispensa o motivo. Os motivos ficam no histórico do card.

**O tempo nunca zera.** Concluir ou voltar para **A fazer** pausa o tempo. Ao voltar para **Em andamento**, ele continua de onde parou. Excluir a tarefa remove também o tempo registrado.

**Mudar a ordem.** Arraste a tarefa para cima ou para baixo dentro da mesma coluna. Se ela for colocada entre tarefas de outra prioridade, a prioridade é ajustada para combinar com a nova posição (por exemplo, levar uma tarefa baixa para o topo a torna alta), e a mudança fica no histórico.

Em **Planejamento → Trabalho → Editar**, a lista **Tarefas do Kanban** permite cadastrar título, descrição, projeto e prioridade. Status e tempo são controlados somente no Kanban.

### Lembretes

Use para compromissos rápidos que precisam de um aviso ou registro de horário.

O formulário contém:

- Título, descrição e horário.
- Repetição: **Uma vez**, **Todos os dias** ou **Toda semana**.
- Data, quando a repetição for **Uma vez**.
- Dia da semana, quando a repetição for **Toda semana**.
- Opção **Ativo** para manter ou pausar o lembrete.

Ao trocar a repetição, o sistema limpa os campos incompatíveis. Por exemplo, um lembrete que vira diário deixa de ter uma data única. Os filtros permitem consultar todos, ativos, pausados e concluídos, quando houver registros nesse estado.

Cadastrar um lembrete não configura envio de e-mail, push ou agendamento externo de notificações. O front mostra os registros disponibilizados pelo backend.

### Imprevistos

Use para compromissos pontuais que alteram sua programação.

Preencha título, descrição opcional, data, início, fim, prioridade e status. Altere para **Resolvido** ou **Cancelado** quando necessário. Editar um imprevisto não reorganiza automaticamente as outras atividades.

## Como funcionam os formulários e as exclusões

- Campos com **\*** são obrigatórios.
- **Adicionar** inclui uma linha de horário, sessão ou tarefa.
- **Remover** retira a linha do formulário; a alteração é aplicada somente ao salvar.
- **Cancelar**, o botão de fechar e a tecla **Esc** fecham o formulário sem salvar.
- **Salvar alterações** grava o cadastro e seus itens vinculados juntos. Se alguma parte falhar, a transação é desfeita.
- Confira o erro exibido no formulário quando o salvamento for recusado.
- Durante o salvamento, os campos e botões de fechamento ficam bloqueados.
- A exclusão de um registro exige confirmação e não pode ser desfeita.

Excluir uma rotina também remove horários e execuções vinculadas. Excluir um trabalho remove jornadas e tarefas. Excluir uma meta remove suas sessões. Esses efeitos são informados na confirmação.

Evite editar o mesmo registro simultaneamente em duas abas: o salvamento envia a lista completa de itens vinculados do formulário aberto.

## Cabeçalho: notificações, configurações e IA

### Sino: notificações

Consulte todas as notificações ou somente as não lidas. Você pode:

- Marcar uma notificação ou todas como lidas.
- Editar título, mensagem e prioridade.
- Excluir uma notificação com confirmação.

### Engrenagem: configurações

Atualize nome, data de nascimento, ocupação, estado civil, fuso horário e indicação de filhos. O e-mail aparece apenas para consulta. Clique em **Salvar perfil** para gravar.

O calendário utiliza datas de referência em `America/Sao_Paulo`. A aplicação ainda possui consultas legadas que dependem do fuso do servidor; alterar o perfil não converte automaticamente todos os horários cadastrados.

### Assistente IA

Abra **Assistente IA**, escreva sua mensagem e clique em **Enviar**. Descreva atividades para montar sua rotina ou faça perguntas sobre organização.

- Precisa de `OPENROUTER_API_KEY` e do provedor configurados no backend.
- A conversa permanece enquanto o painel estiver aberto; fechar o painel ou sair da conta limpa o histórico da interface.
- O histórico enviado ao provedor é limitado às seis mensagens anteriores.
- A aba **Conversar** monta rotinas (veja “Montar a rotina conversando com a IA”), gera a rotina do mês, reorganiza a semana ou encaminha para compras; nenhuma alteração é aplicada sem confirmação.
- Pedidos de rotina são entendidos e encaixados pelo próprio sistema, sem depender do modelo de IA. O modelo é usado para perguntas gerais e explicações; se o configurado estiver lento ou indisponível, o sistema tenta modelos gratuitos de reserva (`OPENROUTER_FALLBACK_MODELS`) e, se nenhum responder, mostra uma orientação no lugar do erro.

### Sair

Clique em **Sair** para solicitar a revogação do token no backend, limpar a sessão local e retornar ao login. Se a API estiver indisponível, a sessão local ainda será removida.

## Roteiro rápido para testar

1. Entre na conta demo e confira os cartões do Dashboard.
2. Abra a agenda, selecione um dia e alterne entre mês, semana e dia.
3. Crie uma rotina com dois horários; edite um deles e salve.
4. Crie uma meta com uma sessão e confirme que aparece na data correta.
5. Crie um trabalho com jornada, pausa e uma tarefa.
6. No Kanban, mova a tarefa, edite a descrição e confira a persistência ao recarregar.
7. Crie um lembrete semanal para domingo e depois transforme em diário.
8. Registre um imprevisto e altere o status para resolvido.
9. Teste a exclusão de um registro criado para o teste, conferindo a confirmação.
10. Abra o sino, edite uma notificação e marque-a como lida.
11. Atualize o perfil e finalize com **Sair**.

## Gráficos do Dashboard

O Dashboard também apresenta gráficos com filtro de 7 dias, 14 dias ou 6 semanas:

- **Ritmo de conclusão:** percentual de execuções e sessões concluídas entre os registros existentes em cada dia. Dias sem registros ficam como lacunas; não representam conclusão zero.
- **Conclusões por categoria:** quantidade de conclusões distribuída pela categoria da rotina, além de Lembretes e Metas.
- **Tempo em tarefas:** total cronometrado nas tarefas do Kanban do trabalho dentro do período escolhido, incluindo uma tarefa que esteja com o tempo contando agora. O tempo de rotinas, metas e jornadas de trabalho não entra nesse total.
- **Mapa de horários:** minutos trabalhados nas tarefas, agrupados por dia da semana e hora em que o cronômetro estava ativo.
- **Tempo por tarefa:** as tarefas com mais tempo no período, com o trabalho a que pertencem.

O painel é atualizado quando uma tarefa muda e a cada minuto. Quando não há histórico, a tela mostra um estado vazio em vez de números de exemplo.

## Pedir e aprovar ajustes pela assistente

No painel **Assistente IA → Reorganizar semana**, escolha uma data, revise as preferências e gere as alternativas. Confira os horários e clique em **Aprovar esta alternativa** para aplicar só uma opção. Também é possível pedir a reorganização no chat; a mensagem gera uma proposta para revisão, sem execução automática. As ocorrências semanais preservam os horários recorrentes; a agenda é revalidada antes de aprovar.

Na conversa, **Enter** envia a mensagem e **Shift+Enter** insere uma nova linha.

## Montar a rotina conversando com a IA

Em **Assistente IA → Conversar** (ou **Cadastrar rotina**), descreva o que você quer com frequência, dias, horários ou período. O sistema entende o pedido, encaixa cada atividade nos seus horários livres (sem conflito com trabalho, compromissos fixos e o que já está cadastrado) e mostra uma proposta para revisar. **Nada é salvo antes de você clicar em Confirmar e salvar.**

Exemplos que funcionam:

- “Quero treinar flauta 3 vezes por semana, 30 minutos.”
- “Academia segunda, quarta e sexta de manhã e estudar inglês 2 vezes por semana.”
- “Quero correr todos os dias de manhã por 40 minutos.”
- “Caminhada terça e quinta às 7h, 30 minutos, e meditar 10 minutos todos os dias.”
- “Trabalho de segunda a sexta das 8h às 18h com almoço das 12h às 13h e sábado das 8h às 12h.”
- “Monte minha rotina com tudo que já cadastrei, focando em saúde e desempenho.”

**Como o pedido é lido:**

- **Dias e horários informados** (“terça e quinta às 7h”, “das 19h às 23h”) viram horários fixos, exatamente como você disse.
- **Frequência e duração** (“3 vezes por semana”, “40 minutos”, “1 hora por dia”) sem horário fazem a IA escolher os horários livres. “De manhã”, “à tarde”, “à noite” e “antes de dormir” orientam o período; dias citados (“segunda, quarta e sexta”, “fim de semana”) limitam os dias.
- Sem frequência ou duração, valem padrões revisáveis (por exemplo, 3 sessões de 45 minutos para atividade física e estudos, 30 minutos para música).
- Os horários escolhidos priorizam saúde: evitam treino tarde da noite, dois treinos no mesmo dia e sobrecarga; com “estudo”, “foco” ou “desempenho” no pedido, estudos vão para os horários de mais energia.

**Cadastros que você já tem são atualizados, não duplicados.** Se você já tem “Treino Flauta”, o pedido “treinar flauta 3 vezes por semana” coloca os horários nessa rotina. Na proposta, cada item aparece como **Novo** ou **Atualizar cadastro**. Ao atualizar, os horários antigos são reaproveitados para manter o histórico de execuções; os novos horários substituem os anteriores daquela rotina.

**Correções e perguntas.** Para corrigir, escreva na conversa (por exemplo, “quero ler 20 minutos 3 vezes por semana”); a proposta anterior é substituída e as atividades já pedidas continuam nela. Se faltar o horário de um trabalho novo, a IA pergunta antes de propor, para não encaixar outras atividades em cima dele.

**Montar a rotina inteira.** “Monte minha rotina”, “reavalie minha rotina” ou o botão **Remontar minha rotina com IA** geram, na própria conversa, a proposta de **Rotina do mês** com as alternativas e a pontuação (veja a seção correspondente). Rotinas ainda sem horário recebem sugestões.

**O que a conversa não faz.** Exclusões (“remova a corrida de sábado”) são feitas no Planejamento, por segurança. Pedidos sobre a semana ou um imprevisto vão para **Reorganizar semana**; compras vão para **Compras**. Outras perguntas (“como dormir melhor?”) são respondidas pelo modelo de IA; se ele estiver indisponível, a resposta explica como montar a rotina mesmo assim.

A confirmação aplica tudo em uma transação: se algo falhar, nada é salvo. Se os seus cadastros mudarem depois da proposta, a confirmação é recusada e basta enviar a mensagem de novo. A mesma proposta não pode ser aplicada duas vezes, e propostas pendentes podem ser recuperadas na aba **Cadastrar rotina**.

**Enter** envia; **Shift+Enter** insere uma linha.

## Planejamento gratuito com cálculo local

Para descrições reconhecidas com dias e intervalos explícitos — por exemplo, jornadas divididas, freelancer, aulas e compromissos pessoais — o sistema pode extrair os horários localmente e calcular janelas para estudo, corrida e descanso. Esse caminho não chama o provedor, não usa créditos e continua exigindo revisão e confirmação.

As sugestões partem de até três corridas de 30 minutos, três sessões de estudo de 45 minutos nos próximos sete dias e pausas de 30 minutos. Os dias e intervalos são mostrados na proposta para alteração. São reservados intervalos de 15 minutos entre atividades; deslocamentos e necessidades individuais de sono não são estimados.

A interpretação local é limitada aos formatos reconhecidos e deve ser conferida, principalmente quando a descrição associa vários compromissos ao mesmo dia. Descrições que não forem reconhecidas seguem para a IA gratuita. Corrigir uma proposta existente também pode depender do provedor. Horários ausentes ou ambíguos não devem ser tratados como certeza.
# Aparência do sistema

Em **Configurações → Aparência**, escolha **Claro**, **Escuro** ou **Automático**. O modo automático acompanha o tema do dispositivo e muda junto com ele. A escolha é aplicada imediatamente e fica salva neste navegador, sem precisar clicar em Salvar alterações. Em um navegador sem preferência salva, o LifeAI abre no tema escuro.

O tema inclui agenda, dashboard, planejamento, finanças, água, notificações e modais. As transições respeitam a opção de reduzir movimentos do dispositivo.


### Categorias e repetições financeiras

Em **Financeiro**, ao criar ou editar uma conta, escolha uma categoria sugerida (moradia, supermercado, transporte, saúde, assinaturas e outras) ou digite uma categoria própria. As rendas possuem sugestões como salário, freelance e reembolso. Categorias também estão disponíveis no orçamento, compras e caixinhas, e são levadas ao usar **Adicionar vencimento**.

Em **Repetição**, escolha: uma vez, semanal, a cada 14 dias, mensal, bimestral, trimestral, semestral ou anual. Informe o primeiro vencimento e, se quiser, uma data final. Cada ocorrência aparece no calendário e pode ser paga, adiada ou marcada como não paga separadamente. A cada 14 dias significa um intervalo fixo de 14 dias, não duas datas fixas por mês. O valor informado é por vencimento.

Os totais e gráficos consideram todos os vencimentos do mês. Dias como 31 e 29 de fevereiro são ajustados ao último dia do mês, preservando o dia original nas próximas ocorrências. Contas com histórico não permitem mudar tipo, início ou repetição: crie outra conta para uma nova recorrência. As contas existentes mantêm suas repetições atuais.

Ao usar **Adicionar vencimento** no orçamento, a conta fica vinculada ao registro de origem. Clicar novamente abre o vencimento salvo, com descrição, datas, categoria e repetição. Alterações de nome, valor e categoria feitas nesse modal também atualizam o registro do orçamento. Vencimentos criados antes desse vínculo continuam acessíveis pelo calendário; não são associados automaticamente por nome. Compras e caixinhas continuam sendo metas de planejamento, sem vencimento de conta.


### Dados salvos e conferência dos cadastros

As escolhas dos formulários são gravadas ao clicar em **Salvar**. Confira os campos verificados e as regras de orçamento, vencimentos e histórico em [Conferência de persistência](AUDITORIA-PERSISTENCIA.md).


Quando uma renda ou despesa do orçamento possui vencimento vinculado, sua participação no resumo respeita o mês selecionado no Financeiro. Antes do primeiro vencimento, o valor não entra no total. Repetições trimestrais entram apenas nos meses de vencimento. O cadastro continua disponível para edição, com a primeira data e um aviso quando não houver vencimento no mês. Registros sem vencimento continuam como estimativas mensais.

### Planejar despesas atrasadas junto com compras

1. Abra **Financeiro → Planejar atrasos e compras**. A área também aparece em **Orçamento estimado, compras e caixinhas**, abaixo dos cadastros.
2. As contas vencidas e ainda não pagas aparecem automaticamente. Clique em uma delas para conferir o motivo, confirmar pagamento, adiar ou editar os dados.
3. Para uma dívida que ainda não existe no sistema, clique em **Adicionar despesa atrasada**. Informe nome, categoria, valor atualizado com juros/multas, descrição e o vencimento original. O cadastro começa como ocorrência única, para não repetir a dívida todo mês. Não cadastre novamente uma dívida já listada.
4. Cadastre as compras desejadas em **Compras planejadas**. Marque uma ou várias para calcular juntas. O cálculo considera o que falta, descontando os valores já guardados.
5. Informe dinheiro extra já disponível e a reserva mensal mínima. Esse dinheiro deve ser separado da reserva e dos valores já guardados nas compras.
6. Clique em **Comparar até duas opções**. Uma usa a sobra após compromissos e reserva para quitar atrasos antes de comprar. A outra usa 70% dessa sobra e preserva 30% de folga adicional. Ambas priorizam dívidas antes da compra à vista e mostram a projeção mês a mês, por até 24 meses.
7. Clique em **Escolher e salvar estratégia**. A escolha fica no banco e pode ser consultada nas simulações recentes. Ela não paga dívidas, não faz pedidos, não contrata crédito e não transforma datas previstas em pagamentos confirmados.

O planejamento usa rendas fixas, variáveis já recebidas, contas, outras compras e caixinhas. Não assume bônus ou freelancer futuro. Contas explicitamente vinculadas ao orçamento são contadas uma vez. Cadastros independentes são tratados como compromissos separados. Uma reserva mínima de simulação de 10% da renda é mantida, ou o valor informado se for maior; isso não garante ausência de aperto financeiro. Se nenhum cenário couber, o sistema informa isso sem inventar uma alternativa. Valores e condições de dívidas precisam ser atualizados após negociação com o credor.



### Mensagens para a Assistente IA

A comunicação é por texto. Digite sua mensagem e pressione **Enter** ou clique em **Enviar**. Use **Shift+Enter** para quebrar a linha. O mesmo vale para descrever sua rotina no modo **Cadastrar rotina**.
### Cancelar uma mensagem no assistente

Enquanto **Conversar** ou **Cadastrar rotina** aguarda uma resposta, clique em **Cancelar envio**. O texto fica preservado, o campo é liberado e uma resposta atrasada não aparece na conversa. Trocar de modo ou fechar o painel também interrompe a espera da solicitação em andamento. Ao alternar entre os modos no mesmo painel, cada campo mantém seu próprio texto.

O cancelamento interrompe a espera no aplicativo. Se o servidor já recebeu a mensagem, ele pode terminar o processamento e manter uma proposta pendente; ela continua exigindo sua aprovação para alterar cadastros ou agenda. Cancelar não desfaz cadastros nem ações que você já confirmou.
### Retorno das mensagens e reavaliação da rotina

Ao enviar em **Conversar** ou **Cadastrar rotina**, sua mensagem aparece imediatamente com o estado **Enviando**. Depois, o sistema mostra **Enviada**, **Falhou** ou **Envio cancelado**, junto com a resposta, os detalhes que faltam ou a mensagem de erro. O retorno é trazido para a área visível da conversa. Em caso de falha, o texto fica no campo para você corrigir e tentar novamente. Após confirmar cadastros, a conversa mantém uma confirmação visível.

**Cadastrar rotina** diferencia proposta pronta de cadastro salvo: a proposta fica aguardando sua revisão e só vira cadastro ao clicar em **Confirmar e cadastrar**. Se uma correção falhar, a proposta anterior permanece identificada como anterior. Nas abas **Reorganizar semana** e **Compras**, uma mensagem indica que a análise terminou e quantas alternativas foram encontradas; uma tentativa que falhou não reapresenta a análise antiga como se fosse uma resposta nova.

O botão **Remontar minha rotina com IA**, no topo do assistente, abre **Rotina do mês** e gera uma nova proposta (veja a seção correspondente). Em **Reorganizar semana**, a análise trata apenas da semana escolhida. Ele consulta novamente os cadastros atuais de rotinas, trabalhos, tarefas agrupadas nos trabalhos, metas, lembretes e imprevistos. Também usa os horários e as situações atuais das ocorrências da semana. A resposta informa quando a consulta foi feita e aponta rotinas ou trabalhos sem horários, metas sem sessões naquela semana e rotinas que não permitem reorganização. Itens marcados com **Deixar a IA definir o horário** aparecem como aguardando horário definido pela IA, e as sugestões ficam nas alternativas.

Use esse botão novamente depois de cadastrar ou editar atividades. Ele não depende de uma cópia antiga do contexto da conversa. O botão **Reavaliar minha rotina cadastrada**, em Cadastrar rotina, leva à mesma análise. A análise verifica o que já está salvo; uma proposta de novos cadastros ainda não confirmada não faz parte da agenda.

As alternativas respeitam compromissos fixos e as permissões de flexibilidade. Se não houver ajuste possível, o retorno informa isso e mostra os pontos que precisam de cadastro ou revisão. Criar um hábito novo continua sendo feito em **Cadastrar rotina**; a reavaliação não inventa sessões que não existem nem altera horários sem aprovação. Os financeiros continuam sendo analisados separadamente em **Compras** e no **Financeiro**.

### Reavaliar os cadastros e a rotina

Após criar ou editar atividades, use **Sugerir melhorias com dados atuais** ou escreva “Reavalie minha rotina considerando os novos itens”. O pedido funciona em Conversar e em Cadastrar rotina.

A análise consulta novamente rotinas, trabalhos, tarefas do Kanban, metas, lembretes e imprevistos. Mostra os nomes dos itens novos, alterados e removidos desde a última análise da mesma semana. Na primeira revisão, estabelece a referência para as próximas comparações. Abra **Ver todos os itens conferidos** para consultar o inventário.

As alternativas são recalculadas para a semana escolhida. Cadastros sem horário são apontados para preenchimento; tarefas do Kanban não ganham horário automaticamente. Compromissos fixos permanecem preservados. Para permitir mudanças de horário em uma rotina, habilite **Permitir reorganização pela IA**. Os ajustes só são aplicados após aprovar uma alternativa. Se os cadastros mudarem depois da sugestão, gere uma nova análise antes de aprovar.

### Precisão das análises de rotina e finanças

Em **Planejamento → Rotinas** ou **Trabalho**, edite cada compromisso e informe o tempo para se arrumar, a ida e a volta, em minutos. A análise semanal e a mensal reservam esses intervalos além do horário da atividade. Zero confirma que não há tempo adicional; vazio significa que falta informação, e a análise mostra essa pendência.

Em atividades divididas em blocos no mesmo dia, o preparo e a ida ficam antes do primeiro bloco e a volta depois do último. Marque a opção de voltar para casa entre os blocos ou no almoço somente se isso acontecer: nesse caso, os deslocamentos e o preparo também são reservados entre os blocos. Os tempos informados não são estimativas de trânsito em tempo real.

A análise mensal continua usando uma **semana-modelo** para o ciclo indicado. Agora consulta também lembretes, imprevistos, sessões já marcadas fora do ciclo e ajustes pontuais. Esses compromissos bloqueiam o horário do respectivo dia da semana no modelo para evitar conflito em qualquer data; isso pode deixar menos espaço livre nas outras semanas. A tela informa essa limitação. A pontuação é uma comparação pelos critérios da simulação; não garante uma rotina ótima ou resultados de saúde. Nenhuma sugestão altera a agenda antes da aprovação.

Na conversa, você pode pedir **“Avalie minha rotina semanal”**, **“Analise minha rotina mensal”** ou **“Analise minhas finanças”**. Cada pedido consulta os registros atuais. Quando nada mudou, alternativas iguais podem continuar sendo o resultado correto; a resposta deve explicar os critérios e impedimentos concretos.

No financeiro, **Conferir itens e projeção mês a mês** mostra as receitas e despesas de cada mês e os valores comprometidos em compras, caixinhas e reserva. A análise:

- usa o vínculo entre uma conta e seu registro de orçamento para evitar duplicação; registros independentes são somados;
- respeita o primeiro vencimento, recorrência, adiamento e mês do pagamento confirmado;
- inclui renda variável apenas quando recebida, sem antecipar freelancer e bônus futuros;
- reduz o comprometimento projetado quando uma compra ou caixinha completa o valor restante;
- verifica déficits posteriores à compra e exige nova análise se as condições da estratégia mudaram antes da confirmação.

Os cálculos são projeções dos dados cadastrados. Não confirmam saldo bancário, saldo disponível em cada dia, limite do cartão, trânsito, juros ou valores ainda não informados. Revise os registros e gere novamente a análise após qualquer mudança.

### Rotina remota ou presencial

No cadastro ou edição da rotina, escolha **Remota** ou **Presencial**. Em remota, os campos de ida, volta e retorno entre blocos ficam ocultos; ao salvar, os deslocamentos são zerados e a IA não os inclui na agenda. O preparo continua opcional.

Em presencial, informe os minutos de ida e volta; use 0 se não houver tempo de trajeto. Os valores ficam no banco e são usados nas análises semanal e mensal. Rotinas que já tinham deslocamento positivo foram identificadas como presenciais; as demais podem ser classificadas ao editar.

### Seletores de data, hora e filtros de período

Os campos de data abrem um calendário compacto sobre o formulário, sem aumentar o modal. Clique no mês ou ano do calendário para navegar. Use **Hoje** para selecionar a data atual; campos opcionais também permitem limpar a escolha. O financeiro usa o mesmo padrão para selecionar o mês de referência.

Nos horários, escolha a hora e os minutos e clique em **Confirmar horário**. Há atalhos de cinco em cinco minutos e um campo para informar qualquer minuto exato. O formato é de 24 horas. Clique fora ou pressione Esc para fechar o seletor.

Em **Dashboard → Histórico de atividades**, o filtro mantém os últimos sete dias como padrão. Os atalhos incluem hoje, 7, 15, 30, 90 dias e um ano. Para outro intervalo, escolha **De** e **Até** no calendário e clique em **Aplicar**. É possível consultar um único dia ou qualquer período passado de até **365 dias**, incluindo as duas datas. Datas futuras ficam indisponíveis nesse histórico.

### Modelo da assistente e visualização semanal

A configuração atual usa `nvidia/nemotron-3.5-super-vl:free` para conversa e preparação de cadastros. As reservas do provedor são modelos gratuitos com suporte a respostas JSON. A disponibilidade depende do OpenRouter; gratuito não garante ausência de filas ou limites.

O modelo interpreta e explica. O planejador local continua validando horários, preparo, deslocamento e conflitos, e o sistema calcula os valores financeiros. A troca do modelo não substitui essas regras nem dispensa a aprovação das propostas.

Em **Ver como fica → Semana**, consulte a grade de dias e horários. Role dentro do calendário para ver os demais horários e, em telas pequenas, os demais dias. Clique em uma atividade para abrir seus detalhes ou no cabeçalho do dia para ver a programação completa. Os horários anteriores das atividades movidas ficam disponíveis abaixo da grade.

Em **Mês do ciclo**, cada dia apresenta até três atividades e indica quantas outras existem. Clique no dia para abrir outro modal com todos os itens, horários, duração e indicação de atividade nova, mantida, fixa ou alterada. Fechar esse modal retorna à sugestão sem salvar alterações.
