---
snip: 43
title: Unified Bech32m Addresses and Viewing Keys for Starknet
description: Specify Bech32m Unified Addresses (UA), shielded/public receivers, and viewing/detection keys to enable a multi‑asset shielded pool and privacy‑by‑default UX.
author: <Abdel> (@AbdelStark)
discussions-to: https://community.starknet.io/
status: Draft
type: Standards Track
category: Interface
created: 2025-10-08
requires:
---

## Abstract

This SNIP defines **Unified Addresses (UA)** for Starknet using **Bech32m** with HRPs:

- `strk` — public address receiver (legacy‑compatible, checksummed)
- `strkx` — shielded receiver (opaque, versioned)
- `strku` — **Unified Address** that _bundles one or more receivers_ and guides senders to the highest‑privacy option they support

It also defines **Unified Viewing Keys** (full/incoming/outgoing) and **Detection Keys** to enable scalable scanning for a future **multi‑asset shielded pool** (MASP). This proposal is **Interface‑only**: on‑chain address/types remain `felt252`. Cryptographic circuit details for the MASP are out of scope and will be specified in a follow‑up Core SNIP.

## Motivation

- **Privacy‑by‑default UX:** Users should share a single address string while wallets automatically choose a shielded receiver when possible.
- **Safety & compatibility:** Bech32m gives robust checksums and HRP scoping; hex remains accepted for backward compatibility.
- **Scalability:** Viewing/Detection Keys let wallets scan at high throughput without trial‑decrypting every output.
- **Multi‑asset reality:** Starknet is multi‑asset; UA avoids per‑asset privacy silos and confusing multiple address formats.

## Specification

> The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

### 1. Encodings and HRPs

All strings use **Bech32m** (separator `'1'`, checksum length 6). Mixed case **MUST** be rejected. Unless otherwise stated:

- **Public**: `strk1` + data (versioned)
- **Shielded**: `strkx1` + data (versioned, opaque)
- **Unified**: `strku1` + data (versioned, TLV list of receivers)

**Length limits**:

- `strk` and `strkx`: **MUST** be ≤ **90** characters.
- `strku`: MAY exceed 90; wallets **SHOULD** display with copy buttons/QRs and line‑wrap when necessary.

All payloads start with a **5‑bit version** `v` followed by kind‑specific bytes encoded with `convertbits(8→5, pad=true)`.

### 2. Public receiver (`hrp = "strk"`, v0)

**Input**: canonical 251‑bit Starknet address `A` (`felt252`, big‑endian).  
**Encoding**:

1. Serialize `A` to **32 bytes** big‑endian (left‑pad with zeros).
2. Enforce top 5 bits zero (follows from `A < 2^251`).
3. Data = `v=0 || convertbits(bytes,8→5,pad=true)`.

**Decoding**:

- Verify Bech32m and case.
- Extract `v` (MUST be 0); reconvert to **exactly 32 bytes**; reject if top 5 bits non‑zero.

This yields a **canonical** textual form for each on‑chain address.

### 3. Shielded receiver (`hrp = "strkx"`, v0)

**Body**: opaque, versioned bytes for a MASP‑style note receiver (e.g., diversifier, pk_d, network tag, memo policy).  
Exact structure is defined in a **separate Core SNIP (MASP)**. This SNIP only defines the **container**:

- Encoding: `v || convertbits(body,8→5,pad=true)`
- Decoding: verify Bech32m; return `v` and raw `body` to higher layers.

Wallets/explorers **MUST NOT** reinterpret `strkx` as public addresses.

### 4. Unified Address (UA) (`hrp = "strku"`, v0)

A UA bundles multiple receivers so senders can pick the most private one they support.

#### 4.1 UA payload layout (v0)

```bash
ua_v0 := flags (1 byte) || receiver_list

receiver_list := receiver_entry || receiver_entry || ...

receiver_entry := type (1 byte) || length (2 bytes, big-endian) || value (length bytes)
```

- `flags` (bitfield):

  - bit 0 (PUBLIC_FALLBACK_ALLOWED): if 0, wallets MUST prompt before using any public receiver.
  - other bits **MUST** be zero for v0 and **MUST** be ignored if unknown.

- `type` (receiver type codes, v0):

  - `0x01` — **Shielded MASP v0** (`strkx` payload bytes)
  - `0x00` — **Public v0** (32‑byte canonical Starknet address)

- A UA **MAY** contain multiple shielded receivers (future pools/versions) and optionally a public receiver for compatibility.

**Bech32m data**: `v=0 || convertbits(ua_v0,8→5,pad=true)`.

#### 4.2 Receiver selection rules (normative)

Given a UA, a sender wallet:

1. Builds a **capability set** of receivers it supports for the **asset being sent**.
2. Sorts supported receivers by **priority** (highest first):  
   **Shielded MASP v0** > **Public v0**.
3. Picks the first supported receiver.
   - If the first supported is **public** and UA `PUBLIC_FALLBACK_ALLOWED == 0`, the wallet **MUST** prompt for explicit consent before proceeding.

Wallets **MUST** ignore unknown `type` values (future‑proofing) while preserving them when re‑serializing UAs.

### 5. Viewing Keys & Detection Keys

To enable scalable scanning and optional audits, define the following textual containers (Bech32m):

- **Unified Full Viewing Key**: `strkvu1` + data  
  Contains one or more per‑receiver viewing keys (TLV list mirroring UA). Grants read access to **incoming + outgoing** metadata needed for full accounting.

- **Unified Incoming Viewing Key**: `strkvi1` + data  
  Allows detection and decryption of **incoming** notes only (no spend).

- **Detection Key**: `strkdk1` + data  
  A lightweight key (derived from the incoming viewing key) that lets light clients filter outputs using short **detection tags** without trial decryption.

**Notes**:

- Exact key derivation (KDFs, PRFs, domain sep) and ciphertext formats are defined in the MASP Core SNIP.
- Detection tags MUST be **unlinking** and short (e.g., 1–2 bytes) to bound false positives while keeping privacy; the tag computation function is normative in the MASP SNIP.

### 6. MASP Hooks (non‑normative sketch; to be specified in Core SNIP)

- **Assets**: each ERC‑20‑like asset has a 32‑byte `asset_id` (Poseidon‑based or equivalent) preventing collisions across networks/classes.
- **Notes**: commitments include `(diversifier, pk_d, value, asset_id, rho, r, …)`.
- **Nullifiers**: derived from a nullifier key and note position; unique on spend.
- **Actions**: transactions carry spends/outputs, encrypted payloads, detection tags, and a fee action.
- **Fees**: default in STRK; optionally any asset (allow‑list).
- **Relaying/AA**: define a “private paymaster” flow where a ZK proof authorizes gas sponsorship without linking to the sender; optionally include Privacy‑Pools‑style innocence proofs.

This SNIP references these concepts only to shape the **interfaces** above.

### 7. RPC & SDK Changes

**Parsing & formatting:**

- All endpoints that accept “addresses” **MUST** accept:
  - canonical hex `0x…` (legacy)
  - `strk…`, `strkx…`, or `strku…` (Bech32m)
- Add optional request/response parameter `encoding: "hex" | "bech32m"`; default **SHOULD** remain hex in responses for backward compatibility.

**Discovery:**

- Add `starknet_parseAddress(string)` →

```bash
{
kind: "public" | "shielded" | "unified",
hrp: "strk" | "strkx" | "strku",
version: 0,
// for public:
hex: "0x…",
// for shielded:
payload: "0x…", // opaque bytes
// for unified:
flags: 0|1,
receivers: [
{ type: "masp0", payload: "0x…" },
{ type: "public0", hex: "0x…" }
]
}
```

- SDKs **SHOULD** expose UA builders and selection logic as a shared utility.

**Explorers/Indexers:**

- Dual search index (hex ↔ Bech32m).
- Display Bech32m by default with a “copy‑as‑hex” fallback.

### 8. Backwards Compatibility

- Protocol/consensus unchanged; on‑chain still uses `felt252`.
- Hex continues to work everywhere.
- Migration path:
  1. Ship libraries + test vectors.
  2. Wallets/SDKs accept both; display Bech32m by default.
  3. Explorers adopt dual indexing.
  4. RPC opt‑in for Bech32m outputs.

### 9. Security Considerations

- **Checksum & case discipline**: Bech32m rejects mixed case and detects typos; wallets MUST surface checksum errors prominently.
- **HRP spoofing**: UIs MUST highlight HRP prominently; never auto‑coerce `strku`→`strk` or `strkx` without explicit consent.
- **Public fallback**: UA’s `PUBLIC_FALLBACK_ALLOWED` defaults to **0**; wallets MUST prompt before sending publicly.
- **Key scope**: Viewing/Detection Keys MUST be derivable in a way that prevents spend authority; documentation MUST make scopes explicit.
- **Network binding**: Implementations MUST bind HRPs to the active network (e.g., mainnet vs testnet HRPs in a future SNIP) to avoid cross‑network misuse.
- **P2P/Mempool surfaces**: When a MASP is introduced, client/network‑layer hardening (timing obfuscation, relays) is REQUIRED; tracked in the Core SNIP.

### 10. Test Cases

The following **v0** examples are provided for interoperability testing. (All are valid Bech32m strings; round‑trips MUST pass.)

#### 10.1 Public address round‑trip

- Input hex: `0x12235445`
- `strk` (v0) **encode →**

```bash
strk1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqy3r23zsp63rc2
```

- **Decode →** hex `0x0000000000000000000000000000000000000000000000000000000012235445`  
  (top 5 bits zero; interpret as `< 2^251`)

#### 10.2 Shielded receiver (opaque, sample payload)

- `strkx` (v0) **example →**

```bash
strkx1q8yxgcltjgu6zekqspuhk7acdvht8pevwqdga3t5wfah2cdp0cgcm0vy8zm4nlsfgj6uky7qkyjz
```

- Decoding yields `version = 0` and opaque bytes (length 43 in this sample).

#### 10.3 Unified Address with shielded + public

- `strku` (v0) **example (line‑wrapped for readability)** →

```bash
strku1qqqqsq2eepjx86uj8xskdsyq09ahhwrt96ecwtrsr28v2arj0d6krg
t7zxxmmppckavluz2ykh93qqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
qqqqqqqqqqqqy3r23zsgnztfs
```

- Contains two receivers (in TLV):
  - `type=0x01` MASP v0 (opaque 43‑byte payload)
  - `type=0x00` Public v0 (32‑byte canonical address for fallback)
- `flags=0x00` → public fallback **requires explicit consent**.

#### 10.4 Negative tests

- Change any single character in the strings above → checksum **MUST** fail.
- Mixed case (e.g., `Strk1…`) → **reject**.
- For `strk` v0: if decoded 32‑byte payload has any top‑5 bits set → **reject**.

(Reference vectors for more addresses, UA permutations, and mutated strings SHOULD be added under `assets/snip-xxx/`.)

## Rationale

- **Why Bech32m?** Strong checksum and forward compatibility for non‑legacy payloads; fits HRP namespace and QR‑friendly UX.
- **Why UA?** Prevents the “too many address formats” problem. Senders don’t need to understand pool versions; they just use the best receiver they support.
- **Why TLV?** Extensible and minimally prescriptive; unknown receiver types can be kept and forwarded.
- **Length rule for UA:** Real‑world UAs exceed 90 chars; we explicitly allow longer strings and require wallets to handle them ergonomically.
- **Viewing/Detection Keys:** Essential for practical light‑client UX; they keep scanning cost sublinear while maintaining privacy boundaries.

## Reference Implementation (outline)

Language‑agnostic utilities (~200 LOC typical):

- `convertbits(in: bytes, 8→5, pad=true)` and inverse
- Bech32m encode/decode (constant `0x2bc830a3`)
- UA TLV encoder/decoder and selection logic
- Public v0 canonicalizer (32‑byte big‑endian; top‑bit checks)

Cairo is **not required** (encoding is off‑chain), but a Cairo library MAY be provided for test tooling.

## Backwards Compatibility

This proposal introduces **additional** encodings only. Hex `0x…` continues to be accepted. No consensus or on‑chain ABI changes are required.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
