# Pay an API $0.11 in USDC and get a research report back

No API key. No account. No signup. Your agent hits an endpoint, gets `402 Payment
Required`, pays with stablecoin, and gets the result — in about 100 seconds.

This is [x402](https://x402.org) against the You.com Finance Research API, running on
Base. The whole client is [~110 lines](./x402-you-research.js).

```
[1] POST /v1/finance_research (no payment)  ← HTTP 402 Payment Required
      price   0.110000 USDC · exact / eip155:8453 · USD Coin
[2] sign EIP-3009 authorization             (no gas — the payer sends no on-chain tx)
      sig     0x9e5f8aae…  132 hex chars = 65-byte secp256k1
[3] retry with payment attached             ← HTTP 202 · ✔ PAYMENT SETTLED success=true
      tx      https://basescan.org/tx/0xa6d0e79d…
[4] SIWX (CAIP-122) auth on the result URL  ← HTTP 202 (accepted)
[5] report delivered                        11.2 KB · 15 sources · 103s
```

## Quickstart

```bash
cd examples/x402-finance-research
npm install
```

**1. Make a wallet.** Any EOA works — this makes a fresh one:

```js
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
const pk = generatePrivateKey()
console.log(privateKeyToAccount(pk).address, pk)
```

**2. Fund it** with a couple of USDC on **Base**. You don't need ETH — the `exact`
scheme signs an EIP-3009 authorization and a facilitator settles it, so the payer
pays no gas.

**3. Rehearse for free.** `DRY=1` signs the payment and stops before submitting it:

```bash
DRY=1 PRIVATE_KEY=0x... node x402-you-research.js "Should I buy NVDA?"
```

**4. Run it.**

```bash
PRIVATE_KEY=0x... node x402-you-research.js "Should I buy NVDA?"
```

`MAX_USDC` (default `0.15`) is a hard ceiling — the script throws before producing a
signature if the price is above it. `EFFORT` is `standard` (~$0.055), `deep` (~$0.11),
or `exhaustive`.

## Gotchas

Four things that will cost you an afternoon if nobody tells you:

**`api.you.com` speaks x402 v2, not v1.** Requirements arrive in a `payment-required`
response header, not the JSON body. The widely-referenced `x402-fetch@1.x` crashes on
it with `Cannot read properties of undefined (reading 'map')`. Use `@x402/fetch@2.x`
plus `@x402/evm`.

**The result is async and gated by SIWX.** Paying returns a `jobId` and a `poll_url`;
the report arrives 1–3 minutes later. That URL requires a
[Sign-In-With-X](https://docs.x402.org/extensions/sign-in-with-x) (CAIP-122) signature
proving the same wallet paid — sent base64-encoded in a `SIGN-IN-WITH-X` header.

**The SIWX challenge comes back in a `401` JSON body**, not a `402` header — so the
stock `wrapFetchWithSIWx` helper won't fire. Read `body['sign-in-with-x']` yourself.

**You generate the `nonce` and `issuedAt`.** The server doesn't send them, and
`createSIWxPayload` only copies fields through. Omit them and the payload fails schema
validation. The nonce must be alphanumeric.

## The payer must be a plain EOA

The result endpoint currently advertises `type: "eip191"` with `signatureScheme: null` —
plain `personal_sign` only. Smart-contract wallets that sign via ERC-1271/ERC-6492
(Coinbase Base Account, most modern smart wallets) will pay successfully but then fail
at the result-fetch step. Use a plain private-key account until smart-wallet signature
verification ships.

## Handle the key like a hot wallet

The private key sits in plaintext wherever you put it. Fund it with what you intend to
spend and nothing more, keep `MAX_USDC` tight, and never commit the file.

## Related

- [`you-finance`](../../skills/you-finance/SKILL.md) — the skill that routes finance
  questions to this API, with `YDC_API_KEY` or keyless MPP/x402 payment.
- [Finance Research API reference](https://you.com/docs/api-reference/finance-research/v1-finance_research)
- [You.com API keys](https://you.com/platform/api-keys) if you would rather use a key
  than a wallet.
