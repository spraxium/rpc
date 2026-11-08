# Manutenção do Spraxium RPC

## Estrutura

| Diretório | Responsabilidade |
| --- | --- |
| `proto/` | Contrato Protobuf compartilhado pelas linguagens |
| `packages/protocol/src/json/` | Validação e representação JSON |
| `packages/client/src/` | Cliente Node.js, transporte e cancelamento |
| `packages/spraxium/src/handlers/` | Decorators e descoberta dos handlers |
| `packages/spraxium/src/execution/` | Permissões, concorrência e execução |
| `packages/spraxium/src/transport/` | Listener HTTP/2 e autenticação das chamadas |
| `packages/spraxium/src/sharding/` | Roteamento e mensagens entre processos |
| `packages/spraxium/src/integration/` | DI, inicialização e encerramento do framework |
| `examples/` | Aplicações de referência com NestJS, Hono, Fastify e Java |

Os imports públicos ficam em `src/index.ts` de cada pacote. Os demais arquivos representam responsabilidades internas. O cliente depende do protocolo e do ConnectRPC; ele pode ser usado em backends que não carregam Discord.js nem o framework.

O [tutorial de integração](getting-started.md) acompanha a configuração do bot e do backend. Para experimentar com o framework local compatível, execute `pnpm example:prepare --framework ../framework`, preencha o `.env` da raiz e use `pnpm example:bot` junto de um dos comandos `example:nest`, `example:hono` ou `example:fastify`. A preparação instala arquivos empacotados em `.local/`; não altera o lockfile principal.

## Como acompanhar uma chamada

1. `createRpcClient` resolve as opções e monta `NodeRpcClient` com uma `ConnectRpcConnection`.
2. `NodeRpcClient.call` valida os dados, cria o sinal de cancelamento e chama o transporte.
3. `RpcServer` autentica o token, aplica os limites e envia a chamada ao dispatcher.
4. No modo direto, `RpcExecutor` encontra o handler, verifica permissões e reserva uma posição de execução.
5. `RpcInvocation` valida o schema, executa o método na instância original do DI e serializa o resultado.
6. O transporte devolve o DTO ao cliente, que libera o controle da chamada em `finally`.

O registro acontece por `imports: [RpcModule]` no módulo da aplicação e por `defineRpc(...)` no array de plugins. `RpcModuleLifecycle` coleta as instâncias durante o carregamento dos módulos. No boot, ele usa o mesmo `RpcRegistry` criado pelo DI. O listener só abre depois dos hooks de prontidão dos providers.

## O que muda com shards

O processo pai mantém o listener e um `RpcShardDispatcher`. Ele escolhe o shard pela guild ou pelo `singletonShard` configurado. Cada chamada pendente tem um `RpcPendingRequest`, responsável pelo ID, timeout, cancelamento e conclusão.

No processo filho, `RpcShardWorker` recebe a mensagem e usa seu executor local. Ele separa duas coisas:

- `active`: chamadas que ainda estão executando, com seus sinais de cancelamento.
- `RpcRequestHistory`: IDs já recebidos, mantidos até o prazo original para evitar execução duplicada.

O histórico usa um conjunto para consultar IDs e uma fila por prazo, implementada como um array com a menor deadline na posição zero. Inserir ou remover uma entrada move apenas o caminho entre pais e filhos. Assim, uma chamada nova não precisa percorrer todo o histórico. Os testes de `request-history.test.ts` cobrem prazos fora de ordem, duplicação e limpeza.

Os manifests dos shards precisam concordar em nome, roteamento e permissões. A representação normalizada do primeiro manifest fica em cache para as comparações seguintes.

## Regras que precisam permanecer verdadeiras

- Handlers RPC e comandos usam as instâncias que o framework criou. O RPC não deve reconstruir serviços de negócio.
- Permissões vêm das credenciais configuradas no bot. Dados enviados pelo cliente não concedem permissões.
- IDs Discord são strings decimais. Objetos Discord, datas, bigint, getters e serializadores personalizados não fazem parte do contrato JSON.
- Um timeout responde ao cliente, mas não interrompe código JavaScript síncrono nem desfaz uma operação externa.
- Um handler que ignora cancelamento continua ocupando sua posição até terminar. Liberar essa posição antes permite ultrapassar o limite de concorrência.
- O shutdown interrompe novas chamadas e drena as existentes antes dos providers. A conexão precisa ser fechada mesmo se a drenagem falhar.
- Uma chamada RPC não tem retry automático nem garantia de execução única após falha de rede. Mutações que possam ser repetidas precisam de idempotência na aplicação.
- `proto/` é a origem do contrato. Arquivos em `src/gen/` são gerados; alterações de schema passam pela verificação de compatibilidade.

## Como alterar o código

Mantenha uma classe por arquivo e injete dependências nas fronteiras de acesso externo. Separe contratos em `interfaces/` e `types/` quando houver uma estrutura compartilhada. Use métodos pequenos com nomes que descrevam a etapa executada; um método deve permitir acompanhar a ordem de validação, execução e limpeza.

Para adicionar uma operação de negócio, declare o handler em um provider do módulo da funcionalidade. Escolha `routing: 'guild'` ou `routing: 'singleton'`, defina as permissões e valide os argumentos com um schema síncrono. Atualize o contrato compartilhado do backend e adicione um teste para o comportamento da operação.

Use `responseSchema` quando a resposta também precisar de validação ou projeção. `RpcSchemaValidator` centraliza a exigência de schemas síncronos e a redação dos erros públicos. `RpcInvocation` mantém a ordem: validar entrada, executar o handler, conferir cancelamento, validar resposta e serializar. Uma chamada cancelada não deve continuar preparando uma resposta que será descartada.

A configuração simples aceita `token` e `permissions`; vários clientes usam `auth.tokens`. Não misture as duas formas. Flags de segurança precisam ser booleanas reais: a string `"false"` não pode habilitar uma conexão insegura ou afirmar que existe um proxy TLS. Tokens usam caracteres ASCII imprimíveis, com limite de tamanho para caber nos headers.

O caminho de leitura do JSON trabalha com o resultado de `JSON.parse`, que já não contém getters, protótipos personalizados nem ciclos. Por isso ele valida apenas números e profundidade. A escrita continua inspecionando os objetos JavaScript antes de serializar. O [ensaio do codec](performance.md) registra a medição e o comando para repeti-la.

Para alterar transporte ou cancelamento, acompanhe tanto a resposta que chega ao cliente quanto os recursos que continuam ativos no bot. Confira timers, listeners, posições de concorrência e chamadas IPC pendentes após sucesso, erro e shutdown.

Nos exemplos HTTP, o cliente RPC permanece aberto até as respostas em andamento terminarem. O NestJS usa `onApplicationShutdown`; o Hono marca as respostas durante o shutdown para fechar a conexão; o Fastify libera conexões HTTP ociosas em `onResponse` e fecha o RPC em `onClose`. Forçar o fechamento de todas as conexões pode interromper respostas que já começaram.

## Verificações

Na raiz do repositório:

```bash
pnpm exec biome format --write .
pnpm check
```

`pnpm check` valida o schema, os arquivos gerados, a formatação, os tipos, os testes e os pacotes instalados fora do workspace.

Para alterações em DI, módulos, ciclo de vida ou IPC:

```bash
pnpm test:framework --framework ../framework
```

Essa suíte instala os pacotes empacotados e executa processos separados. O framework precisa conter os hooks descritos em [compatibilidade](framework-compatibility.md).

Para alterações no protocolo ou transporte:

```bash
pnpm test:java
```

É necessário ter JDK 17+ e Maven 3.9+. O teste gera as classes Java a partir do mesmo schema e realiza chamadas gRPC contra o servidor Node.js.

Os testes de referência ficam em `packages/client/test/`, `packages/spraxium/test/` e `tests/interop/`. O projeto irmão `rpc-test/` cobre a integração NestJS com slash commands. Cada verificação deve acompanhar o comportamento alterado; formatação e renomeações não precisam de testes novos.
