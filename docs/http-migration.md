# Move bot communication out of @spraxium/http

RPC replaces the communication between an external backend and bot services. Keep HTTP routes, web authentication, CORS, OAuth and dashboard user authorization in NestJS, Hono, Fastify or another backend. The bot exposes explicit RPC handlers through its existing modules. The [integration tutorial](getting-started.md) explains registration and client setup.

The public framework still lacks the required adapter hooks. Keep a working HTTP installation until a compatible framework/RPC release is available or your deployment uses a verified local build. Deprecation does not by itself make RPC a drop-in replacement for HTTP controllers.

## Replace BotBridge calls

The old `BotBridge` combines Discord lookups and moderation operations. Move those operations to a guild service that receives the Discord client through DI. Put `@RpcHandler` on a provider that delegates to that service, validates inputs and returns DTOs. Commands can inject the same service, so the bot has one implementation of its business rules.

The method names below are suggested application contracts. They are not built-in RPC methods. Implement and test the operations your application actually uses before removing its bridge dependency.

| Existing BotBridge call | Suggested method | Permission | Result |
| --- | --- | --- | --- |
| `getGuild` | `guild.get` | `guild:read` | Guild DTO or `null` |
| `getMember` | `guild.member.get` | `member:read` | Member DTO or `null` |
| `getMembers` | `guild.members.list` | `member:read` | Bounded page and cursor |
| `getBan` | `guild.ban.get` | `ban:read` | Ban DTO or `null` |
| `getBans` | `guild.bans.list` | `ban:read` | Bounded page and cursor |
| `banMember` | `guild.member.ban` | `member:ban` | Explicit success DTO |
| `unbanMember` | `guild.member.unban` | `member:ban` | Explicit success DTO |
| `kickMember` | `guild.member.kick` | `member:kick` | Explicit success DTO |
| `timeoutMember` | `guild.member.timeout` | `member:timeout` | Explicit success DTO |
| `removeTimeoutMember` | `guild.member.timeout.remove` | `member:timeout` | Explicit success DTO |
| `addRole` | `guild.member.role.add` | `member:roles` | Explicit success DTO |
| `removeRole` | `guild.member.role.remove` | `member:roles` | Explicit success DTO |

All these methods should use `routing: 'guild'` and a top-level decimal `guildId`. Validate user and role IDs as decimal strings as well. Choose whether a missing entity returns `null` or `NotFound`, and keep that behavior consistent across the contract, handler and HTTP mapping. Do not return a Discord.js instance and rely on `toJSON`; project only the fields the caller needs.

Use pagination for member and ban collections. Validate a maximum page size and return an explicit cursor instead of fetching every member or returning an unbounded cache. The RPC JSON byte limit is an additional boundary, not a substitute for pagination or Discord API permissions and rate limits.

## Preserve moderation rules

RPC token permissions authorize a backend service. They do not prove that an individual dashboard user may moderate a guild. The backend must verify the authenticated user's access, and the guild service must still enforce bot permissions, role hierarchy, protected roles and application rules. Never accept a payload field named `permissions` or `isAdmin` as proof of authorization.

Validate reasons, durations and action-specific options before calling Discord. Return deliberate public failures with `RpcError` and a standard `Code`; unexpected exceptions are redacted. Where audit records matter, store the actor, guild, action and result in application storage. Do not place secrets or entire Discord objects in those records.

For a mutation, persist an idempotency key before allowing retries from the backend. Scope the key to the authenticated service and operation, reject mismatched reuse, and save the result so a lost response can be recovered. The transport sends no automatic application retries. A network error can occur after Discord has already accepted the action.

## Migrate one route at a time

Add the RPC handler and shared contract while keeping the existing HTTP route working. Change the backend route to call the RPC client instead of `BotBridge`, then compare successful results, missing resources, invalid input and permission failures. Test cancellation and bot/shard unavailability as well as the happy path.

Once the migrated route works in deployment, remove its old HTTP controller or bridge usage. Keep unrelated HTTP controllers until they have their own backend replacement. Remove `HttpModule` and `@spraxium/http` only after no remaining bot feature depends on them. Signal remains available for one-way asynchronous events; RPC does not replace its delivery model.

The adapter is ready to replace a particular application's bridge when its operations, authorization and failure paths are tested on the compatible framework release. Full HTTP framework features, browser SDKs, streaming and cross-host shard orchestration are separate concerns and are not implemented by this package.
