<div align="center">
  <img src=".github/assets/spraxium-logo.png" alt="Spraxium logo" width="88" />
  <h1>Spraxium RPC</h1>
  <p>Call your Discord bot from a backend, script, or worker.</p>
  <p><a href="https://spraxium.com/en/guide/rpc-overview">English docs</a> · <a href="https://spraxium.com/pt/guide/rpc-overview">Documentação em português</a> · <a href="https://spraxium.com/es/guide/rpc-overview">Documentación en español</a></p>
</div>

## English

Use RPC when a separate process needs something from your Spraxium bot. A dashboard can ask for a guild's name and get JSON back. The Discord token stays in the bot.

Put `@spraxium/rpc` in the bot and `@spraxium/rpc-client` in your backend. Use Spraxium framework 0.10.0 or a later 0.10 patch. Follow the three files under [First call](#first-call). For a web project with `@spraxium/http`, keep the route in your backend and [move the bot call](#migrate-from-http). [Full guide](https://spraxium.com/en/guide/rpc-quickstart) · [HTTP migration](https://spraxium.com/en/guide/rpc-http-migration)

## Português

Use RPC quando um painel, script ou worker roda em outro processo e precisa de algo do bot. O backend pode pedir o nome de um servidor e receber JSON. O token do Discord fica no bot.

Instale `@spraxium/rpc` no bot e `@spraxium/rpc-client` no backend. Use o framework Spraxium 0.10.0 ou um patch posterior da série 0.10. Siga os três arquivos de [primeira chamada](#first-call). Se usa `@spraxium/http`, mantenha a rota web no backend e [migre a chamada ao bot](#migrate-from-http). [Guia completo](https://spraxium.com/pt/guide/rpc-quickstart) · [Migração do HTTP](https://spraxium.com/pt/guide/rpc-http-migration)

## Español

Usa RPC si un panel, script o worker corre en otro proceso y necesita datos del bot. El backend puede pedir el nombre de un servidor y recibir JSON. El token de Discord se queda en el bot.

Instala `@spraxium/rpc` en el bot y `@spraxium/rpc-client` en el backend. Usa Spraxium 0.10.0 o un parche posterior de la rama 0.10. Sigue los tres archivos de [la primera llamada](#first-call). Si usas `@spraxium/http`, mueve la ruta web al backend y [cambia la llamada al bot](#migrate-from-http). [Guía completa](https://spraxium.com/es/guide/rpc-quickstart) · [Migración de HTTP](https://spraxium.com/es/guide/rpc-http-migration)

## First call

~~~sh
# Bot
pnpm add @spraxium/rpc@0.10.0

# Backend
pnpm add @spraxium/rpc-client@0.10.0
~~~

Generate a secret and set it as `SPRAXIUM_RPC_TOKEN` in both processes.

Gere um segredo e defina `SPRAXIUM_RPC_TOKEN` nos dois processos.

Genera un secreto y configura `SPRAXIUM_RPC_TOKEN` en los dos procesos.

~~~sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
~~~

**Bot · `spraxium.config.ts`**

~~~ts
import { defineConfig } from '@spraxium/core';
import { defineRpc } from '@spraxium/rpc';

export default defineConfig({
  plugins: [
    defineRpc({
      token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
      permissions: ['bot:read'],
    }),
  ],
});
~~~

**Bot · `app.module.ts`**

~~~ts
import { Module } from '@spraxium/common';
import { RpcHandler, RpcModule } from '@spraxium/rpc';

class HealthService {
  @RpcHandler('bot.health', {
    routing: 'singleton',
    permissions: ['bot:read'],
  })
  health() {
    return { ready: true };
  }
}

@Module({ imports: [RpcModule], providers: [HealthService] })
export class AppModule {}
~~~

Start the bot as usual using this module. Keep any imports and providers you already use.

Inicie o bot como de costume com esse módulo. Mantenha os imports e providers que já usa.

Inicia el bot como siempre con este módulo. Conserva los imports y providers que ya tienes.

**Backend · `check-bot.ts`**

~~~ts
import { createRpcClient } from '@spraxium/rpc-client';

type BotRpc = {
  'bot.health': { input: null; output: { ready: boolean } };
};

const rpc = createRpcClient<BotRpc>({
  url: 'http://127.0.0.1:4300',
  token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
});

try {
  const status = await rpc.call('bot.health', null, { timeoutMs: 3_000 });
  console.log(status.ready);
} finally {
  rpc.close();
}
~~~

This prints `true`. Keep the service token in the backend. Use HTTPS when the processes run on different hosts.

A chamada imprime `true`. Guarde o token no backend. Use HTTPS entre máquinas.

La llamada muestra `true`. Guarda el token en el backend. Usa HTTPS entre máquinas.

## Migrate from HTTP

Keep your public URL, such as `GET /guilds/:guildId`, in the backend. Check the user's access there. Replace the bot's `BotBridge.getGuild(guildId)` call with a handler like this one.

Mantenha a URL pública, como `GET /guilds/:guildId`, no backend e confira ali o acesso do usuário. Troque a chamada `BotBridge.getGuild(guildId)` do bot pelo handler abaixo.

Conserva la URL pública, como `GET /guilds/:guildId`, en el backend y comprueba allí el acceso del usuario. Cambia la llamada `BotBridge.getGuild(guildId)` del bot por el siguiente handler.

~~~ts
import { Inject, Injectable } from '@spraxium/common';
import { Code, RpcError, RpcHandler } from '@spraxium/rpc';
import { Client } from 'discord.js';

@Injectable()
export class GuildRpcService {
  constructor(@Inject(Client) private readonly discord: Client) {}

  @RpcHandler('guild.get', { routing: 'guild', permissions: ['guild:read'] })
  guild({ guildId }: { guildId: string }) {
    const guild = this.discord.guilds.cache.get(guildId);
    if (!guild) throw new RpcError('Guild not found.', Code.NotFound);
    return { id: guild.id, name: guild.name };
  }
}
~~~

Register `GuildRpcService` and give the backend's credential `guild:read`. Call it from the route after the user check. A typed client can declare `'guild.get': { input: { guildId: string }; output: { id: string; name: string } }` in its contract.

Registre `GuildRpcService`, dê `guild:read` ao token e chame o método na rota depois de conferir o acesso.

Registra `GuildRpcService`, da `guild:read` al token y llama al método en la ruta después de revisar el acceso.

~~~ts
const guild = await rpc.call('guild.get', { guildId }, { timeoutMs: 3_000 });
~~~

After moving your last route, remove `HttpModule`, `defineHttp` and `@spraxium/http`.

Depois de migrar a última rota, remova `HttpModule`, `defineHttp` e `@spraxium/http`.

Cuando migres la última ruta, quita `HttpModule`, `defineHttp` y `@spraxium/http`.

All examples are written in TypeScript. Run `pnpm build`, then start the bot and one backend from the [examples guide](https://spraxium.com/en/guide/rpc-backends). The standalone client examples include an ESM entry point and a CommonJS entry point built from `commonjs.cts`. [Example source](examples) · [Contributing](CONTRIBUTING.md)

For a coding agent, open the [migration skill](SKILL.md) and name the routes to move. Read the migration walkthrough in [English](https://spraxium.com/en/guide/rpc-http-migration), [português](https://spraxium.com/pt/guide/rpc-http-migration), or [español](https://spraxium.com/es/guide/rpc-http-migration).
