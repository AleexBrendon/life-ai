# Melhorias do frontend e backend

## Interface

A paleta e o destaque do próximo compromisso já existiam no código inspecionado e foram preservados. A fonte variável agora usa o nome de família correto, Inter Variable. O dashboard atualiza o relógio a cada 30 segundos e diferencia o acesso secundário à agenda da ação principal. A agenda ganhou títulos de 16 px, horários de 14 px, etiquetas de 12 px e ações de pelo menos 44 px. Os espaçamentos menores de mobile foram alinhados à escala de 16/24 px. Preferência por movimento reduzido é respeitada.

## API e operação

- Configuração obrigatória de PostgreSQL, Redis, JWT e porta validada antes de escutar conexões.
- Helmet e middleware final para erros de JSON, payload excessivo, conflito e registro ausente; sem detalhes sensíveis nas respostas.
- Login e cadastro compartilham limite de 30 requisições por endereço em 15 minutos no Redis, com incremento/expiração atômicos. Excesso retorna 429 e Retry-After; Redis indisponível retorna 503. O endereço é convertido em hash na chave. A aplicação usa req.ip sem confiar em cabeçalhos de proxy enviados pelo cliente. Em infraestrutura com proxy, configure trust proxy apenas para os proxies efetivamente confiáveis.
- Encerramento por SIGINT/SIGTERM cancela agendadores, aguarda requisições e fecha Prisma/Redis, com limite de 15 segundos.
- GET /api/health/live verifica o processo; /api/health, /api/health/ready e o caminho antigo /api/health/health verificam dependências.
- Avisos de início recuperam ciclos atrasados nos cinco minutos anteriores ao compromisso. Não avisam após o início. Mantêm a chave única de deduplicação, processam usuários em lotes de 100 e isolam falhas por usuário. O relógio é atualizado durante o processamento. Ainda é utilizado o dashboard como origem das atividades.

## Compatibilidade das consultas

GET /api/planner/:kind preserva o envelope { success, data } e as consultas antigas. Parâmetros opcionais:

- limit: inteiro de 1 a 100.
- offset: inteiro de 0 a 100000.
- from e to: datas reais YYYY-MM-DD; restringem o histórico de execuções nas rotinas.

A ordenação usa createdAt e id para desempate. A paginação é optativa: consumidores antigos continuam recebendo os dados completos. Uma migração futura dos consumidores deve considerar as necessidades de histórico da agenda antes de impor limites padrão.

## Verificação sem alterar dados

No frontend: npm test, npm run build e npm run lint.

No backend: npm run test:unit executa schemas, utilitários e regressões de runtime com configuração isolada, sem conexões ao banco ou Redis. A suíte existente completa continua disponível via npm test; integração e segurança têm comandos próprios. Essas suítes podem limpar o banco de testes e não foram executadas nesta alteração. O setup exige uma URL explícita em .env.test, nome de banco contendo test e destino diferente dos arquivos .env de desenvolvimento da raiz e do backend. Nenhum arquivo de credenciais foi alterado.

Não houve migração, remoção de dados, commit ou deploy. A inspeção visual automatizada ficou indisponível por falha de acesso à janela/navegador; o build não substitui revisão visual em desktop e mobile. O lint completo apresenta erros em componentes fora dos arquivos alterados.
