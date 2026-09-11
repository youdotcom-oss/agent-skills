# Direct x402 REST client for paid You.com endpoints

On-demand reference for the direct-client path: a local script pays USDC on Base for a paid You.com API call (Research, Finance Research, or search/contents) with no API key and no account. This is guidance plus a compact skeleton, not a copy of a runnable file. Adapt it to the host; do not ship it verbatim as an executable script from this skill.

Before coding, verify the live request shape, auth, payment behavior, and pricing parameters for the specific endpoint through the You.com Docs MCP `searchDocs` tool. If Docs MCP is unavailable, use the canonical API reference pages under https://you.com/docs/api-reference.

## The 5-step flow

1. **`402 Payment Required`** — `POST` to the paid endpoint with no payment returns `402`. The priced requirements travel in a `payment-required` response header (x402 v2), not the JSON body.
2. **Sign EIP-3009 authorization** — the client signs an off-chain authorization; the payer sends no on-chain transaction and pays no gas. A facilitator settles the payment on Base.
3. **Settled on Base** — retry the original request with the payment attached. The settlement receipt comes back in a `payment-response` header (`success`, `transaction`). Paid report endpoints then return a job id and a poll URL; simpler endpoints return the result directly.
4. **SIWX (CAIP-122) auth on the result URL** — if the result endpoint is SIWX-gated (confirm in Docs MCP), prove the same wallet paid with a base64-encoded `SIGN-IN-WITH-X` header.
5. **Result poll or direct read** — managed report endpoints are async (roughly 1-3 minutes); poll until the status is terminal. Priced search/contents calls return the result on the retry.

## Dependencies and the version trap

Use `@x402/fetch@2.x` with `@x402/evm`, `@x402/extensions`, and `viem`. Do **not** use `x402-fetch@1.x`: it crashes on x402 v2 with `Cannot read properties of undefined (reading 'map')` because it expects requirements in the JSON body. `api.you.com` speaks x402 v2.

## Rules and gotchas

Treat these as hard requirements, not suggestions:

- **Requirements live in a header, not the body.** x402 v2 returns payment requirements in the `payment-required` response header. Reading them from the JSON body is the v1 bug that breaks `x402-fetch@1.x`.
- **The SIWX challenge comes back in a `401` JSON body**, not a `402` header, so the stock `wrapFetchWithSIWx` helper does not fire. Read `body['sign-in-with-x']` yourself. This applies only where the result endpoint is SIWX-gated; confirm the result-auth model in Docs MCP.
- **Not every `401` is a SIWX challenge.** Rate limits and proxy errors also return `401`. Check for `supportedChains` before treating a `401` as a challenge; fail fast otherwise.
- **The client generates the `nonce` and `issuedAt`.** The server sends neither, and `createSIWxPayload` only copies fields through. Omit them and the payload fails schema validation. The nonce must be alphanumeric.
- **The payer must be a plain EOA.** Smart-contract wallets that sign via ERC-1271/ERC-6492 (Coinbase Base Account, most modern smart wallets) pay successfully but then fail at the SIWX result-fetch step, which advertises `type: "eip191"` (plain `personal_sign` only). Use a plain private-key account until smart-wallet signature verification ships.
- **Any server-supplied result/task URL must stay on-origin.** Resolve it against `https://api.you.com`. Reject any absolute off-origin URL (it would send proof-of-wallet to another host) and fail fast if the URL is missing.
- **On a terminal non-success status, report `status` + `body`.** Do not dereference an absent output or result field — the user already paid, so say why instead of crashing on an undefined field.
- **Parse untrusted `401` bodies defensively.** Server-controlled JSON drives control flow; guard every field access and fall back to a clear error rather than throwing on shape.

## Spend discipline

- Enforce a hard `MAX_USDC` cap and check it **before** a signature exists. If the offered price exceeds the cap, stop without signing.
- `DRY=1` is a rehearsal mode: sign the payment and stop before submitting it, so the user can verify the signed header without spending.

## Skeleton

The shape to implement, not the full file. Confirm the exact endpoint path, result-auth model, and field names via Docs MCP before coding.

```text
request POST <paid endpoint> (no payment)
  -> 402  (requirements in payment-required header)
selectWithCap(version, requirements)
  -> pick exact / eip155:8453, fail if none
  -> usdc = amount / 1e6; throw if usdc > MAX_USDC
  -> return chosen requirement
sign EIP-3009 authorization (no gas; facilitator settles)
  -> if DRY=1: log signed header, exit 0
retry request with payment attached
  -> 202, payment-response header: success, transaction
  -> body: result, or { jobId, poll_url } for async reports
resolve any server-supplied result/task URL against https://api.you.com
  -> reject if origin !== https://api.you.com
  -> fail fast if missing
loop for async reports (timeout ~5m, sleep 5s):
  fetch result/task URL
    if 401 and SIWX-gated:
      challenge = body['sign-in-with-x']; if no supportedChains, fail fast
      chain = find supportedChains chainId === eip155:8453, type === eip191
      info = { ...challenge.info, chainId, type, nonce (alphanumeric), issuedAt (ISO) }
      retry with SIGN-IN-WITH-X = encodeSIWxHeader(createSIWxPayload(info, account))
  if res.status in (401, 403): report auth failure, exit 1
  if status terminal:
    if no output/result: report status + body, exit 1   # paid but failed
    deliver result
```

## Related

- MCP-composition alternative: the Coinbase Payments MCP path (see the references in the `you-research` and `you-finance` skills) when the host can run both MCP servers and you want no key management or manual signing.
- You.com API reference: https://you.com/docs/api-reference
