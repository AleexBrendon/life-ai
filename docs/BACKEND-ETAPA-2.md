# Back-end — segunda entrega incremental

## Aprovação das recomendações de IA

O fluxo legado de POST /api/ai/recommendations/:id/approve agora lê a agenda atual
e executa a alteração dentro da mesma transação Prisma, com isolamento Serializable.
O contrato de sucesso continua sendo { success, data: { recommendation, execution } }.

Antes de executar, verifica:

- Proposta pendente pertencente ao usuário autenticado.
- Ação e alvo compatíveis com alteração de rotina, com horários válidos.
- Ocorrência ainda pendente, com um único horário identificável naquele dia.
  Propostas antigas identificam a rotina, não o horário; casos ambíguos retornam 409.
- Rotina, horário e execução sem edição posterior à criação da proposta.
- Preservação da duração e recusa de ocorrências passadas ou já iniciadas,
  considerando o fuso do usuário.
- Conflitos com os horários efetivos de outras rotinas, trabalho, sessões de metas,
  imprevistos e lembretes. Considera preparo, deslocamento e pausas de trabalho.
  Ocorrências puladas/perdidas e imprevistos cancelados/resolvidos não bloqueiam.

A proposta é reivindicada com atualização condicional de PENDING para APPROVED.
Uma aprovação repetida ou rejeição que já venceu a disputa impede nova execução.
A gravação da execução e do resultado participa da mesma transação; falhas revertem
também a reivindicação. Conflitos de serialização/unicidade retornam 409, solicitando
atualização, sem retentativa automática de uma proposta possivelmente desatualizada.
Falhas inesperadas retornam 500 com mensagem genérica e log sem detalhes de dados.

O executor recebe explicitamente o horário revalidado, mantém a verificação de
propriedade da rotina e não escolhe o primeiro entre múltiplos horários. O resultado
informa os horários anteriores efetivos quando já existia uma execução reagendada.
Somente a ocorrência da data é alterada; o horário semanal permanece igual.
A requisição de recomendação agora rejeita datas inexistentes, como 2026-02-30.

## Limite por usuário nas gerações

O middleware executa depois da autenticação e usa contador Lua atômico no Redis,
compartilhado pelas instâncias da API. A cota padrão é de 10 requisições por usuário
em uma janela de 60 segundos a partir da primeira chamada. Todas estas rotas POST
compartilham a mesma cota:

- /api/ai/chat
- /api/ai/setup/preview
- /api/ai/week/preview
- /api/ai/routine/preview
- /api/ai/shopping/analyze
- /api/ai/recommendations

Excesso retorna 429 com Retry-After em segundos. Redis indisponível retorna 503 para
essas gerações. Consultas, aprovações, aplicações e rejeições não consomem essa cota.
O limite também conta requisições de geração que depois falhem na validação ou no
provedor. Não representa limite financeiro, mensal ou de concorrência simultânea.

Variáveis opcionais documentadas em backend/.env.example:

```dotenv
AI_RATE_LIMIT_REQUESTS=10
AI_RATE_LIMIT_WINDOW_SECONDS=60
```

Valores devem ser inteiros positivos; configuração inválida impede inicialização
do roteador. Os valores padrão se aplicam quando as variáveis não estão definidas.

## Verificação

Na pasta backend:

```powershell
npm run test:unit
npm run test:backend
npm run test:database
```

Os novos testes unitários verificam conflitos, expiração, duração, seleção de
ocorrência e as respostas HTTP do limitador com cliente Redis simulado.
test:backend usa Prisma e o PostgreSQL PGlite em memória, acessado exclusivamente
por socket local em porta aleatória, e executa todas as migrações em uma base nova.
Verifica aprovação, repetição, isolamento entre usuários, novo conflito e rollback
real após escrita. Não acessa o banco da aplicação nem executa chamadas ao provedor.

PGlite não substitui um teste de carga/concorrência no PostgreSQL de produção.
As falhas de serialização e perda da reivindicação também têm testes unitários,
mas não houve teste de disputa entre múltiplas instâncias reais de PostgreSQL/Redis.
As suítes antigas de integração/segurança que dependem do .env.test não foram
executadas nesta entrega.

Não há nova migração de banco nem alteração de front-end nesta entrega.
A migração da etapa 1 continua pendente de aplicação/verificação no banco real.
Outros itens da auditoria — preservação de histórico por vigência, sessão,
paginação, trabalhadores e observabilidade geral — permanecem para entregas futuras.
