---
snip: 42
title: Bech32m Address Encoding for Starknet
description: Introduce Bech32m-encoded, checksummed, HRP‑scoped addresses (public and shielded) to improve UX, safety, and enable privacy primitives.
author: <Abdel> (@AbdelStark)
discussions-to: https://community.starknet.io/t/snip-42-bech32m-address-encoding-for-starknet/116000
status: Draft
type: Standards Track
category: Interface
created: 2025-10-08
requires: 
---

## Abstract

This SNIP specifies a **Bech32m** address format for Starknet with **human‑readable part (HRP)** prefixes and typed payloads. It adds checksums and clear network/type scoping for addresses, and defines two initial HRPs:

- `strk` — **public** (legacy-compatible) Starknet contract/account addresses  
- `strkx` — **shielded** (privacy) addresses, as an opaque payload defined by a separate SNIP

Bech32m encoding provides strong error detection and copy/paste resilience missing from the current `0x…` hex format, and its typed/HRP namespace is a convenient prerequisite for future privacy features.

## Motivation

- **Safety & UX**: Hex addresses lack checksums; users can send funds to mistyped destinations with no protocol‑level detection. Bech32m includes a robust checksum and rejects mixed‑case or malformed strings.
- **Namespacing & Interop**: HRPs allow **network** and **address‑kind** scoping (e.g., public vs. shielded), eliminating ambiguous strings in wallets, explorers, bridges, and CLIs.
- **Privacy Roadmap**: Shielded/stealth addresses need an **opaque, versionable envelope** distinct from public addresses. Bech32m’s data part cleanly carries typed payloads without UI ambiguity.
- **Determinism**: A canonical encoding eliminates multiple textual representations for the same 251‑bit Starknet address.

## Specification

> The key words “**MUST**”, “**MUST NOT**”, “**REQUIRED**”, “**SHALL**”, “**SHALL NOT**”, “**SHOULD**”, “**SHOULD NOT**”, “**RECOMMENDED**”, “**MAY**”, and “**OPTIONAL**” in this document are to be interpreted as described in RFC 2119.

### 1. Scope

This specification defines a **textual encoding** for addresses. It **does not** change consensus, hashing, or the on‑chain address size/semantics (`felt252` / 251‑bit). It is primarily an **Interface** change for wallets, SDKs, RPCs, explorers, and tooling.

### 2. Bech32m Basics (normative recap)

- Address = `hrp` + `'1'` + `data` + `checksum`  
- Variant: **Bech32m** (constant `0x2bc830a3` for checksum computation)
- Charset: `"qpzry9x8gf2tvdw0s3jn54khce6mua7l"`
- **Case**: all‑lowercase or all‑uppercase (mixed case **MUST** be rejected)
- **Length**: total length **MUST** be ≤ 90 characters
- **HRP**: ASCII `[a-z0-9]` only; **MUST NOT** contain `'1'`.  
- **Separator**: exactly one `'1'`, after the HRP.
- **Checksum**: 6 characters; implementations **MUST** verify Bech32m, not Bech32.

### 3. HRPs and Address Kinds

HRPs define network and semantics. This SNIP introduces:

| HRP     | Kind     | Data payload (this SNIP)                        | Notes                               |
| ------- | -------- | ----------------------------------------------- | ----------------------------------- |
| `strk`  | Public   | 32‑byte canonical Starknet address (v0 format)  | Backward‑compatible with legacy hex |
| `strkx` | Shielded | Opaque payload (v0 envelope, defined elsewhere) | For privacy flows (separate SNIP)   |

> Additional HRPs (e.g., for testnets) **MAY** be introduced by future SNIPs (e.g., `strkt`, `strks`). Clients **MUST NOT** infer a network solely from the HRP unless the HRP is standardized.

### 4. Data Payloads

#### 4.1 Common Envelope

To enable evolution, the **first 5 bits** of the data part encode a **version** (`v`), followed by a **kind‑specific body**:

```bash
data := version(5 bits) || body(…)
```

- Initial version: `v = 0`
- Future versions **MAY** change encoding rules; clients **MUST** reject unknown versions unless in a permissive “display only” path.

#### 4.2 Public Address (`hrp = "strk"`, v0)

- **Canonical input**: a 251‑bit Starknet address `A` (big‑endian), validated `A < 2^251`.
- **Serialization**:
  1. Represent `A` as exactly **32 bytes** big‑endian (left‑padded with zeros).
  2. **MUST** enforce that the **top 5 bits** (bits 255..251) are zero (this follows from `A < 2^251`).
  3. Convert bytes from 8‑bit to 5‑bit groups using the standard `convertbits(8→5, pad=true)` procedure.
  4. Prepend the 5‑bit version `v=0`.
- **Decoding**:
  1. Verify Bech32m checksum and case rules.
  2. Extract `v`; if `v != 0`, **reject** (or present as opaque if in a viewer).
  3. Reassemble 5‑bit groups (after the version) back to bytes with `convertbits(5→8, pad=false)` if possible; or `pad=true` with strict length check.
  4. Require exactly 32 bytes; require top 5 bits zero; interpret as big‑endian integer `< 2^251`.
- **Uniqueness**: This fixed‑width, `pad=true` encoding yields a **canonical** representation (no multiple encodings of the same address).

> Rationale: fixed 32‑byte framing matches ecosystem expectations and makes round‑trips deterministic.

#### 4.3 Shielded Address (`hrp = "strkx"`, v0)

- **Body**: **opaque** bytes (versioned). The internal structure (e.g., diversifier, viewing key tag, network tag, memo policy) is **out of scope** and **MUST** be specified in a dedicated **privacy SNIP**.  
- **Canonicalization**:
  - Producers **MUST** use `convertbits(8→5, pad=true)` and include `v=0`.
  - Decoders **MUST** treat unknown `v` as unsupported.
- **Interoperability**: Wallets and explorers **MUST NOT** attempt to reinterpret `strkx` payloads as public addresses.

### 5. Examples (valid Bech32m)

For the legacy hex address `0x12235445` (big‑endian, canonically 32 bytes, mostly zero):

- **Public (`strk`)**  
  `strk1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqy3r23zsf6usjc`
- **Shielded (`strkx`)** (opaque payload shown here as legacy‑address framing only for illustration)  
  `strkx1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqy3r23zstjsgdx`

> Note: The literal `'1'` after the HRP is the Bech32m separator. The original examples shown without this separator are not valid Bech32/Bech32m syntax.

### 6. RPC, ABI, and Tooling

This SNIP proposes **Interface** changes only:

- **RPC**: Endpoints that accept or return addresses **SHOULD** accept **either** canonical hex (`0x…`) **or** Bech32m (`strk…`, `strkx…`) in request parameters. Responses **SHOULD** default to hex for backward compatibility and **MAY** add an opt‑in flag (e.g., `encoding: "bech32m"`) to return Bech32m.
- **Indexers & Explorers**: **SHOULD** support searching by both encodings and display a toggle/copy control.
- **Wallets/CLIs/SDKs**: **SHOULD**:
  - Display Bech32m by default for user‑facing contexts.
  - Validate checksums on paste and **refuse** mixed case or wrong HRP.
  - Offer copy buttons for both encodings during a transition period.
- **Contracts/ABIs**: No change; on‑chain parameters remain `felt252`. Encoding/decoding happens off‑chain (client side).

### 7. Backwards Compatibility

- **No consensus changes**.  
- Hex addresses remain valid throughout the stack.  
- A phased rollout is recommended:
  1. Publish reference libraries and test vectors.
  2. Add parsing/formatting to SDKs and wallets (display Bech32m; accept both).
  3. Add RPC opt‑ins and explorer support.
- Breaking changes are **NOT REQUIRED**; the system can operate in **dual‑format** indefinitely.

### 8. Rationale

- **Bech32m vs Bech32**: We choose **Bech32m** for future‑proofed checksumming across versions/kinds and to align with modern address conventions where the m‑constant improves robustness for non‑legacy payloads.
- **HRP Partitioning**: HRPs provide clear, human‑visible scoping (public vs shielded; per‑network later) without peeking into payload bytes.
- **Fixed‑width public payload**: Enforcing 32‑byte framing and top‑bit zeros yields a unique, deterministic textual representation of a 251‑bit address.

### 9. Test Cases

Implementations **MUST** pass at least the following:

1. **Round‑trip public address**  
   Input hex: `0x12235445`  
   Expect `strk1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqy3r23zsf6usjc`  
   Decoding **MUST** recover the exact 251‑bit value.
2. **Checksum & case**  
   - Any single‑character mutation in the above string **MUST** fail checksum.  
   - Mixed‑case inputs **MUST** be rejected.
3. **HRP validation**  
   - `strk…` **MUST NOT** decode as shielded; `strkx…` **MUST NOT** decode as public.
4. **Top‑bit enforcement**  
   - A 32‑byte payload with any of the top 5 bits set **MUST** be rejected for `strk` v0.
5. **Length limits**  
   - Addresses longer than 90 chars **MUST** be rejected.

> Additional vectors (including random addresses and boundary values) **SHOULD** be added under `assets/snip-42/`.

### 10. Reference Implementation (outline)

Implementations are straightforward and exist in most languages:

- **Core routines** (≈200 LOC):  
  - `bech32m_encode(hrp: str, version: u5, data: bytes) -> string`  
  - `bech32m_decode(addr: string) -> (hrp, version, data)`  
  - `convertbits(in: bytes, 8→5, pad=true)` and inverse  
  - Canonicalization checks (length, case, HRP charset, top‑bit rule)
- **Cairo / client SDKs**:  
  - Encoding/decoding is off‑chain; Cairo support is **optional** (for testing/contracts that wish to validate or format on‑chain, a Cairo library **MAY** be provided but is not required by this SNIP).

### 11. Security Considerations

- **Error detection**: Bech32m introduces a strong checksum and strict case rules, reducing successful typos and QR/read errors compared to hex.
- **HRP spoofing**: Wallets **MUST** verify the exact HRP (`strk` vs `strkx`) and **MUST NOT** silently coerce between kinds. UI **SHOULD** style or color‑code HRPs.
- **Phishing**: The alphabet avoids visually ambiguous characters; still, UIs **SHOULD** use monospaced fonts and avoid truncation that hides the HRP/separator area.
- **Opaque payloads**: For `strkx`, decoders **MUST** treat the payload as opaque unless a separate privacy SNIP defines its structure. Do **not** over‑interpret.
- **Inter‑network confusion**: When additional HRPs are introduced (testnets), clients **MUST** pin acceptable HRPs per network configuration to prevent cross‑network misroutes.
- **QR codes**: Bech32m is QR‑friendly; UIs **SHOULD** prefer lower‑case and avoid line breaks.

### 12. Deployment Considerations

- **Libraries**: Provide libs for Typescript, Rust, Python, Go; include no‑std variants where relevant.
- **SDK/RPC Flags**: Add a discoverable `supportsBech32m: true` capability flag and optional `encoding` parameter for responses.
- **Explorers**: Dual search index (hex ↔ Bech32m) and canonical display with copy buttons for both encodings during migration.

## Backwards Compatibility

This SNIP is fully backward compatible at the protocol level. Legacy hex strings remain valid input/output for all endpoints and tools. The Bech32m format adds an **additional**, safer representation.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
