#!/usr/bin/env node
//
// Buy a You.com finance research report with USDC on Base — no API key, no account.
//
//   npm install   (from this directory)
//   PRIVATE_KEY=0x... node x402-you-research.js "Should I buy NVDA?"
//
//   DRY=1 signs the payment and stops before submitting it — free dress rehearsal.
//
// Flow: 402 Payment Required -> sign EIP-3009 -> settled on Base -> SIWX-authed result.
//
import { randomBytes } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { ExactEvmScheme } from '@x402/evm'
import { createSIWxPayload, encodeSIWxHeader } from '@x402/extensions'
import { decodePaymentResponseHeader, wrapFetchWithPayment, x402Client } from '@x402/fetch'
import { privateKeyToAccount } from 'viem/accounts'

const ENDPOINT = 'https://api.you.com/v1/finance_research'
const ORIGIN = 'https://api.you.com'
const NETWORK = 'eip155:8453' // Base mainnet
const MAX_USDC = Number(process.env.MAX_USDC ?? '0.15') // hard spend ceiling
const EFFORT = process.env.EFFORT ?? 'deep' // standard | deep | exhaustive
const DRY = process.env.DRY === '1'

const question = process.argv[2]
if (!process.env.PRIVATE_KEY || !question) {
  console.error('usage: PRIVATE_KEY=0x... node x402-you-research.js "your question"')
  process.exit(1)
}

// The payer must be a plain EOA — see "Gotchas" in the README.
const account = privateKeyToAccount(process.env.PRIVATE_KEY)

// ── 1. Pay the 402 ──────────────────────────────────────────────────────────
// Reject anything above the cap BEFORE a signature exists.
const selectWithCap = (_version, requirements) => {
  const chosen = requirements.find((r) => r.network === NETWORK && r.scheme === 'exact')
  if (!chosen) throw new Error(`no exact/${NETWORK} option offered`)
  const usdc = Number(chosen.amount) / 1e6
  if (usdc > MAX_USDC) throw new Error(`price ${usdc} USDC exceeds cap ${MAX_USDC} — not signing`)
  console.log(`price: ${usdc} USDC -> ${chosen.payTo}`)
  return chosen
}

let calls = 0
const tracingFetch = async (input, init) => {
  // The paid retry is request #2. In DRY mode we stop it before it leaves.
  if (DRY && ++calls > 1) {
    const hdr = [...input.headers].find(([k]) => /^(x-)?payment(-signature)?$/i.test(k))
    console.log(`DRY RUN — signed but not submitted\nheader: ${hdr?.[0]} (${hdr?.[1].length} B)`)
    process.exit(0)
  }
  return fetch(input, init)
}

const client = new x402Client(selectWithCap).register(NETWORK, new ExactEvmScheme(account))
const fetchWithPay = wrapFetchWithPayment(tracingFetch, client)

console.log(`payer: ${account.address}`)
const submit = await fetchWithPay(ENDPOINT, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ input: question, research_effort: EFFORT }),
})
const job = await submit.json()
if (!submit.ok) {
  console.error(`failed ${submit.status}:`, job)
  process.exit(1)
}

const receipt = submit.headers.get('payment-response')
if (receipt) {
  const r = decodePaymentResponseHeader(receipt)
  console.log(`settled: success=${r.success}\ntx: https://basescan.org/tx/${r.transaction}`)
}
console.log(`jobId: ${job.jobId}`)

// ── 2. Fetch the result, proving you paid (SIWX / CAIP-122) ─────────────────
// The result URL is gated by Sign-In-With-X. You.com returns the challenge in a
// 401 JSON body (not a 402 header), so the stock wrapFetchWithSIWx doesn't apply.
async function siwxFetch(url) {
  const first = await fetch(url)
  if (first.status !== 401) return { res: first, body: await first.json().catch(() => null) }

  // Not every 401 is a SIWX challenge — rate limits and proxy errors land here too.
  const challenge = (await first.json().catch(() => null))?.['sign-in-with-x']
  if (!challenge?.supportedChains) throw new Error('401 carried no sign-in-with-x challenge')
  const chain = challenge.supportedChains.find((c) => c.chainId === NETWORK)
  if (!chain) throw new Error(`challenge offers no ${NETWORK} option`)
  if (chain.type !== 'eip191') throw new Error(`server wants ${chain.type}; this signs eip191`)

  // The server sends no nonce/issuedAt and createSIWxPayload only copies them
  // through — so the client generates them.
  const info = {
    ...challenge.info,
    chainId: NETWORK,
    type: chain.type,
    nonce: randomBytes(16).toString('hex'), // must be alphanumeric
    issuedAt: new Date().toISOString(),
  }
  const payload = await createSIWxPayload(info, account)
  const res = await fetch(url, { headers: { 'SIGN-IN-WITH-X': encodeSIWxHeader(payload) } })
  return { res, body: await res.json().catch(() => null) }
}

// poll_url is server-supplied and gets the SIWX signature, so it must stay on-origin:
// an absolute URL would override the base and send proof-of-wallet to another host.
if (!job.poll_url) throw new Error(`no poll_url in the response: ${JSON.stringify(job)}`)
const pollUrl = new URL(job.poll_url, ORIGIN)
if (pollUrl.origin !== ORIGIN) throw new Error(`poll_url points off-origin: ${pollUrl.origin}`)
const started = Date.now()
while (Date.now() - started < 300_000) {
  const { res, body } = await siwxFetch(pollUrl)
  if (res.status === 401 || res.status === 403) {
    console.error(`auth failed ${res.status}:`, body)
    process.exit(1)
  }
  if (res.ok && body && body.status !== 'pending' && body.status !== 'running') {
    // Terminal but not successful — you already paid, so say why rather than crashing.
    if (!body.output) {
      console.error(`\njob ended as ${body.status}:`, body)
      process.exit(1)
    }
    console.log(`\n--- report (${body.output.sources?.length ?? 0} sources) ---\n`)
    console.log(body.output.content)
    process.exit(0)
  }
  process.stdout.write(`\rresearching… ${Math.round((Date.now() - started) / 1000)}s`)
  await sleep(5000)
}
console.error('\ntimed out — the job may still finish; re-poll the same URL')
process.exit(1)
