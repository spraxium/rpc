# Manutenção do RPC

O projeto tem três pacotes. `protocol` mantém os descritores Protobuf e a conversão JSON. `client` abre a conexão usada pelo backend. `spraxium` registra os handlers no bot e encaminha chamadas para os providers existentes. Só o adaptador depende do framework e do Discord.js.

## Caminho de uma chamada

`createRpcClient` resolve as opções e monta um `NodeRpcClient`. A conexão usa Connect ou gRPC e transporta o nome do método e bytes JSON. O cliente mantém seus recursos durante a vida da aplicação; `close()` cancela chamadas pendentes e libera a conexão.

No bot, `RpcServer` autentica a credencial e aplica os limites. `RpcExecutor` localiza o handler em `RpcRegistry`. `RpcInvocation` valida a entrada, executa o método na instância já criada pela DI e valida a resposta. Cada chamada cuida do próprio timer e dos listeners de cancelamento. Erros esperados usam `RpcError`; exceções inesperadas retornam um erro público sem detalhes internos.

Com shards, o gateway fica no processo pai. `RpcShardDispatcher` calcula o shard pelo `guildId` e envia uma mensagem IPC identificada. `RpcShardWorker` executa o handler no provider daquele shard. `RpcPendingRequest` encerra a espera quando chega uma resposta, expira o prazo ou morre o processo. Não existe broadcast para executar handlers.

## Onde alterar

| Mudança | Área |
| --- | --- |
| Opções e comportamento do cliente | `packages/client/src` |
| Regras de serialização e bytes | `packages/protocol/src` |
| Registro e descoberta de métodos | `packages/spraxium/src/handlers` |
| Permissões, execução e schemas | `packages/spraxium/src/execution` |
| Conexão, autenticação e limites | `packages/spraxium/src/transport` e `security` |
| IPC e roteamento | `packages/spraxium/src/sharding` |
| Registro do plugin e hooks | `packages/spraxium/src/integration` |
| Integrações JavaScript | `examples` |

Mantenha uma classe por arquivo e receba dependências pelo construtor. Interfaces e tipos ficam em arquivos próprios. Não adicione uma abstração só para repassar uma chamada. As funções públicas pequenas montam ou delegam para as classes responsáveis.

## Recursos e limites

Uma chamada cancelada continua ocupando sua vaga de execução até o handler terminar. Liberar a vaga antes disso permitiria mais trabalho real que o limite configurado. Passe o sinal de cancelamento para operações que o aceitam e evite bloquear o event loop.

A fila de requisições IPC pendentes é limitada. O histórico de IDs usa um conjunto e uma heap de prazos para evitar varrer todos os IDs em cada mensagem. Esse histórico evita repetição dentro do prazo da chamada; não guarda resultados depois de reiniciar o processo.

A codificação inspeciona objetos recebidos da aplicação antes de serializar. A decodificação recebe uma árvore de `JSON.parse`, então verifica profundidade e números sem repetir inspeções de getters ou ciclos. Preserve essa diferença ao otimizar o codec.

## Verificação

Execute `pnpm check` depois de alterar os pacotes. Ele confere protocolo, formatação, tipos, builds, testes e instalação isolada dos arquivos empacotados. A instalação temporária é criada na pasta temporária do sistema e removida ao terminar.

Execute `pnpm test:examples` ao mudar as integrações JavaScript e `pnpm test:interop` ao mudar o transporte gRPC. O primeiro inicia os seis backends e os clientes ESM/CommonJS, além de verificar a DI do bot. Nenhum deles usa token real do Discord.

As mudanças de integração com o framework também precisam dos testes de processo e de uma aplicação com os hooks compatíveis. `pnpm test:framework` usa a fixture instalada; não prepara outro checkout automaticamente. Consulte [compatibilidade](framework-compatibility.md) antes de validar ou publicar o adaptador.

Para mudar o transporte Protobuf, edite `proto/spraxium/rpc/v1/gateway.proto` e execute `pnpm proto:generate`. Nunca edite o binding gerado manualmente nem atualize o descriptor de compatibilidade apenas para esconder uma quebra.
