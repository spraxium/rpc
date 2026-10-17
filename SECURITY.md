# Security Policy

## Reporting a Vulnerability

Report vulnerabilities privately to **hello@spraxium.com**, following the framework's security reporting channel. Include the affected package and version, reproduction steps and expected impact. Do not disclose vulnerabilities in public GitHub issues.

Packages in scope:

- `@spraxium/rpc-protocol`
- `@spraxium/rpc-client`
- `@spraxium/rpc`

## Security Model

The RPC endpoint is a privileged backend interface. Keep service tokens server-side and grant only required handler permissions. Authentication identifies a service, not a Discord user or tenant. A handler must enforce guild ownership, user authorization and application-specific access; routing by guild ID does not grant access to that guild.

Remote listeners require TLS or an explicit trusted TLS proxy configuration. Cleartext is intended for loopback or that declared private proxy hop. Store credentials in environment/secret storage, rotate by temporarily configuring separate token IDs, and never put secrets in payloads or method names.

The gateway bounds payload/envelope size, time, concurrency and credential rate. A handler without permissions must explicitly opt into authenticated access. Unknown errors are redacted; only deliberate `RpcError` messages are exposed. Logs exclude authorization headers, payloads and raw exception messages.

There is no implicit wildcard permission, client-side retry or exactly-once mutation guarantee. Deadlines cannot interrupt synchronous or uncooperative application code. Cooperative cancellation, application validation and durable idempotency are application responsibilities.

CI uses a frozen lockfile and an explicit install-script allowlist. Local compatibility archives and generated credentials are ignored by Git.
