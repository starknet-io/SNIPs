---
snip: X
title: Pluggable Signer Interface for Smart Accounts
description: A curve-agnostic signer trait and canonical signature envelope that lets any Starknet smart account verify Ed25519, secp256k1, P-256 (WebAuthn), RSA, and BLS signatures through a single interface.
author: Carlos Castillo (@haycarlitos), Omar Espejel (@omarespejel)
discussions-to: https://community.starknet.io/t/snip-pluggable-signer-interface-for-smart-accounts/116190
status: Draft
type: Standards Track
category: SRC
created: 2026-04-16
requires: SNIP-5, SNIP-6, SNIP-9, SNIP-12, Session Keys SNIP (starknet-io/SNIPs#163, `SNIPS/snip-x.md`)
reference-impl: https://github.com/haycarlitos/shhh-wallet-cairo/tree/v8.4 (commit 3975532, V8.4, declared 2026-05-15)
---

## Simple Summary

Standard interface for curve-agnostic signature verification on Starknet smart accounts. Defines an `ISigner` trait, a canonical signer-kind tag registry, and a tagged signature envelope so that one account contract can verify signatures from Phantom, MetaMask, passkeys, hardware wallets, OAuth providers, and Starknet-native keys without rolling new contracts for each curve.

## Abstract

This SNIP defines:

1. An `ISigner` trait with three methods: `verify(message_hash, pubkey, signature)`, `kind()`, `validate_pubkey(pubkey)`. Verifier classes are stateless: pubkey material is passed in on every call.
2. A canonical kind-tag registry covering six battle-tested primitives (STARK, SECP256K1, ED25519, P256, RSA_2048, BLS12_381) and seven envelope variants (WEBAUTHN_P256, EIP191_SECP256K1, EIP712_SECP256K1, DKIM_RSA, JWT_RS256, JWT_ES256, JWT_ES256_APPLE_SUB).
3. Three signature envelope shapes routed by a version tag: single-owner V2, threshold V2 (N-of-M with mixed kinds across owners), and the 4-element session-key envelope from the Session Keys SNIP. Outer routing is the account's responsibility; verifier classes only see the kind-specific payload.
4. An integration protocol with SNIP-9 outside execution and the draft Session Keys SNIP, so that session keys and pluggable owner signatures coexist cleanly.
5. A library-call dispatch architecture (one separately-declared verifier class per kind, governance-rotatable from inside the account) with address-salt rules that prevent cross-kind confusion.

Together, these components mean a single audited account contract family can serve every major wallet type on Earth — and paymasters can sponsor any of them without per-wallet integration work.

## Motivation

Starknet's account model already permits arbitrary signature schemes: every account is a contract, and `__validate__` can verify anything. In practice, every team that has shipped a non-STARK-curve account has done so by forking a reference implementation and writing curve-specific validation inline. The result is a proliferation of narrow account classes that don't interoperate.

**Current state** — battle-tested implementations that would each benefit from a shared interface:

| Team / project              | Primary signer             | Fork surface                                                  |
|-----------------------------|----------------------------|---------------------------------------------------------------|
| Ready                      | STARK + guardian (STARK)   | Owner + guardian + escape flow, STARK-only curve              |
| Braavos                     | STARK + hardware signer    | Hardware signer via external library                          |
| Cartridge Controller        | WebAuthn P-256             | Custom SNIP-12 envelope, passkey-specific                     |
| Clave                       | WebAuthn P-256             | Passkey-specific                                              |
| Chipi Pay (this repo)       | STARK + session keys       | Session key component, shared via SNIP-sessions               |
| Shhh Wallet (Garaga)        | Ed25519 (Phantom)          | Full custom account; audited 2026-04-20 (see below)           |
| Starknet-by-example / OZ    | STARK ECDSA                | Reference-only, no multi-curve                                |
| zkLogin-style proposals     | JWT (RSA/ES256)            | Research stage; no production deployments                     |

Each is correct for its niche. None can verify a signature produced by another. A user who holds a Phantom wallet cannot use Ready's guardian recovery; a Cartridge passkey cannot sign a Chipi session-key invocation; zkLogin JWTs cannot share an account class with any of the above.

**This SNIP was motivated directly by the April 2026 security review of the Shhh wallet.** Two converging signals: a Nethermind-AuditAgent scan run on 2026-04-13 by Henri (a repo collaborator; three structural findings) followed by Omar Espejel's human Codex/Cairo audit on 2026-04-20 ([report](https://gist.github.com/omarespejel/dddcc2b7df4e8b8bb47af9d1936f8a3e); twelve findings). Three of Omar's findings converged on the same root cause Henri's scan first surfaced:

1. **H-2 — SRC-5 interface ID mismatch.** The Shhh wallet advertised SNIP-9 V2 support but registered a custom interface ID and signed a custom byte envelope. The audit correctly noted that dapps, SDKs, and paymasters probing for SNIP-9 V2 would get incorrect results. The root cause was not bad intent — it was that there is no standard way to say "this account uses Ed25519 for owner signatures."
2. **M-1 — `caller == 0` sentinel ambiguity.** The contract accepted both `0` and `'ANY_CALLER'` as unrestricted sentinels because SNIP-9 and the Phantom-specific path had diverged. Again: no standard envelope, no standard dispatcher.
3. **I-1 — Custom calls-hash collision risk.** The audit downgraded this to Informational but flagged that custom Poseidon packing instead of SNIP-12 typed data created standards drift.

The fix for all three is the same: stop rolling custom signature envelopes. Use a standard dispatcher that knows how to verify each curve, a standard SNIP-12 hash for the message, and a standard kind-tag on the signature. That standard does not exist today. This SNIP proposes it.

**Why now.** Three forces make 2026 the right year to land a signer SNIP:

- **Garaga v1.0.1** shipped production-ready Cairo implementations of Ed25519, secp256k1, and P-256 verification with msm hints. The cryptographic primitives are now cheap enough (~33M l2_gas for Ed25519) to be a normal account-contract dependency.
- **The Session Keys SNIP** (authored by Chipi Pay and Omar Espejel) was merged into the official [`starknet-io/SNIPs`](https://github.com/starknet-io/SNIPs) repository on 2026-03-03 via [PR #163](https://github.com/starknet-io/SNIPs/pull/163), currently sitting at `SNIPS/snip-x.md` with status `Draft` pending number assignment. It standardizes the *authorization* layer — what a delegated key is allowed to do. This SNIP proposes the complementary *authentication* layer — which curve an owner key uses and how it is verified. The two together form the complete modular-account stack.
- **Passkey onboarding** is becoming the consumer default (Cartridge, Clave, Braavos). Without a shared signer interface, every new passkey wallet is another integration cliff for paymasters and SDKs.
- **Production SDKs already ship the consumer half.** Chipi's gasless-wallet SDK (`@chipi-stack` v14.7.0) creates passkey-backed Starknet accounts, signs via WebAuthn inside the device secure enclave, and submits through a paymaster with optional session keys — i.e. the `WEBAUTHN_P256` authentication kind and the Session Keys SNIP (#163) authorization layer, live in production today. What it dispatches to on-chain is still a bespoke per-wallet verification path; this SNIP is the standard signer interface that distribution layer is missing.

**A standard enables:**
- Any paymaster sponsors any wallet — signer-type discovery is on-chain and uniform.
- A dapp SDK written once works across Phantom, MetaMask, passkey, and STARK wallets.
- Starknet.js, Ready Wallet, Braavos can add non-STARK signer support without hardcoding each implementation.
- Audit surface consolidates: one `ISigner` trait + six Garaga/OZ components audited once, reused everywhere.

**Market coverage.** The twelve canonical kinds in Part B (six Tier-1 curves plus six Tier-2 envelope variants) enumerate essentially every cryptographic-signer primitive shipping in production hardware and consumer software in 2026:

- **Crypto self-custody wallets** (secp256k1 + Ed25519 + STARK) ≈ 100% of existing hot wallets on any chain.
- **Mobile biometric devices** (WebAuthn P-256) ≈ every iPhone, modern Android, and Mac — roughly 4–5B devices.
- **Email identity** (DKIM_RSA + JWT_RS256 + JWT_ES256) ≈ every active Gmail / Outlook / iCloud / workplace account — roughly 4–5B humans.
- **Enterprise / government ID** (P-256 + RSA_2048) ≈ every PIV/CAC/eIDAS-issued credential.
- **Validator and institutional keys** (BLS12_381) ≈ every L1 validator and large-DAO multisig.

The schemes deliberately excluded from the canonical registry — TOTP, SMS one-time codes, plaintext passwords — are not cryptographic signers but authentication *methods* that need a ZK envelope to become one. Part B reserves `'ZK_TOTP'`, `'ZK_JWT'`, `'ZK_EMAIL'`, and `'ZK_TLS'` kinds for follow-up SNIPs that specify those envelopes.

The practical consequence: **every major signing device humans use today — including those carried by users who have never held a crypto wallet — gets a one-line integration path into Starknet smart accounts.** That is the ceiling-raising effect the sessions SNIP set up, and this SNIP delivers.

**Concrete use cases unlocked per kind:**

| Kind tag             | Flow made possible                                                                                                |
|----------------------|-------------------------------------------------------------------------------------------------------------------|
| `'SECP256K1'`        | EVM user bridges USDC via CCTP to a Starknet app and signs with their existing MetaMask — no new wallet required. |
| `'EIP191_SECP256K1'` | Dapp UX parity with Ethereum: MetaMask popup reads "Sign this message" exactly as on L1.                          |
| `'ED25519'`          | Solana user deposits into a Starknet yield pool and signs everything with Phantom.                                |
| `'WEBAUTHN_P256'`    | Consumer signup with Face ID — no seed phrase, no app install. Passkey users outnumber crypto users ≈20:1.        |
| `'P256'` (raw)       | Corporate treasury signs Starknet multisig with work-issued PIV smart card.                                       |
| `'JWT_RS256'`        | "Sign in with Google" provisions a Starknet account. Google accounts (≈3B) become the onboarding funnel.           |
| `'JWT_ES256'`        | "Sign in with Apple" for iOS-first consumer apps (≈1B Apple IDs).                                                 |
| `'DKIM_RSA'`         | Email-based recovery ("send a signed email from your Gmail"); compliance-grade approval workflows.                |
| `'RSA_2048'`         | Regulated institution signs on-chain with existing eIDAS or YubiKey PIV hardware.                                  |
| `'BLS12_381'`        | Ethereum or Cosmos validators reuse their existing BLS key to vote on Starknet governance.                         |
| `'STARK'`            | Native Starknet wallets + session delegation (status quo preserved, no change).                                   |

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### Part A: The `ISigner` Trait

The pluggable-signer architecture splits the *account* (which holds owner records + governance state) from the *verifier* (a separately-declared class that knows one signing primitive). The account stores `(kind_tag → verifier_class_hash)` and dispatches each owner-signed message to the matching verifier class via `library_call_syscall`. Verifier classes are stateless: they hold no storage of their own and receive the owner pubkey as a parameter on every call.

Compliant verifier classes MUST implement:

```cairo
#[starknet::interface]
pub trait ISigner<TContractState> {
    /// Verifies that `signature` authorizes `message_hash` under
    /// `pubkey`. MUST be pure (no storage writes). MUST return
    /// `true` only when the signature is cryptographically valid
    /// AND its envelope has been fully consumed (no trailing data).
    ///
    /// `pubkey` is the per-owner key material stored on the account
    /// (length and layout vary by kind — see Part B). `signature`
    /// is the kind-specific payload from the envelope routing
    /// in Part C (NOT the full outer envelope).
    fn verify(
        self: @TContractState,
        message_hash: felt252,
        pubkey: Span<felt252>,
        signature: Span<felt252>,
    ) -> bool;

    /// Returns the canonical kind tag (Part B) this verifier
    /// implements. Used by paymasters and SDKs for routing.
    fn kind(self: @TContractState) -> felt252;

    /// Returns `true` iff `pubkey` is a structurally valid public
    /// key for this verifier's kind. MUST be pure. MUST validate
    /// per-kind length AND curve membership where the underlying
    /// primitive supports a non-panicking check (e.g.
    /// `secp256_ec_new_syscall` for secp256k1 / P-256 families).
    /// MAY panic for BLS12-381 where the underlying subgroup check
    /// is panic-on-failure — the calling account's transaction
    /// reverts atomically and the security outcome is identical to
    /// returning `false`.
    ///
    /// Called by the embedding account at every owner-registration
    /// site (`execute_add_owner`, `execute_rotate_owner`,
    /// `finalize_recovery`, `bootstrap_from_sessions` in the
    /// reference impl) BEFORE the new owner record is committed to
    /// storage, so a malformed pubkey cannot poison the
    /// multi-owner / threshold pathways.
    fn validate_pubkey(self: @TContractState, pubkey: Span<felt252>) -> bool;
}
```

Why this shape (rationale beyond RFC 2119):

- **`verify` takes `pubkey` as a parameter** because verifier classes are stateless library-call'd code — they run in the *account's* storage context and don't carry per-deployment state. The account reads the owner's stored pubkey, passes it to the verifier, and the verifier reads zero storage. This makes verifiers independently auditable (one class hash = one curve = one implementation) and lets a single account class serve N owners on N different curves.
- **`kind` instead of `signer_kind`** is a style change; the semantic identical to the v0.1 draft.
- **`validate_pubkey` is mandatory** because owner registration is the only point where the account can reject a malformed key before it lands in the owner_set and poisons subsequent multi-owner / threshold flows (an off-curve BLS12-381 pubkey passes a shape-only check but bricks every threshold OE that includes that owner).
- **`owner_commitment` is NOT in the trait** in V1; the reference implementation provides it as a free helper function (`src/signer/interface.cairo::owner_commitment`) that the account uses for address-salt derivation (Part E). Keeping it out of the trait simplifies verifier-class audit scope.

**SRC-5 interface ID**:

```
ISIGNER_ID = starknet_keccak("ISigner_V1")
           = 0x94c5a761f34b25a4e603c651ac0e1fc4fad9cdb5517f7fa1bb54044c7e5ef8
```

The canonical label `"ISigner_V1"` refers to the three-method trait shape defined here. Any breaking trait-shape change in a future version (adding a fourth required method, changing a parameter or return type, removing a method) MUST bump to `"ISigner_V2"` with a fresh starknet_keccak-derived ID, and the migration window MUST register both IDs during transition.

Accounts MUST register `ISIGNER_ID` via SRC-5 at construction so that paymasters, wallets, and dapps can discover signer support. The reference implementation registers the ID both on native V8 deploys and inside the sessions-wallet migration path so post-upgrade accounts look identical to fresh deployments via SRC-5 probing.

### Part B: Canonical Kind-Tag Registry

Compliant accounts MUST use one of the following `felt252` kind tags to identify their signer type. Tags are ASCII short-strings so they are human-readable in explorers and logs.

**Tier 1 — Primitive curves (MUST-support targets for library components):**

| Kind tag         | Algorithm            | Canonical message form  | Real-world signers in production                                                                                               |
|------------------|----------------------|-------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| `'STARK'`        | Stark-curve ECDSA    | felt252 hash            | Ready, Braavos, OpenZeppelin account, Ledger Starknet app, relayers                                                           |
| `'SECP256K1'`    | secp256k1 ECDSA      | 32-byte hash            | MetaMask (≈100M installs), Rainbow, Trust Wallet, Coinbase Wallet, Rabby, Frame, WalletConnect, Ledger, Trezor, GridPlus       |
| `'ED25519'`      | Edwards25519 EdDSA   | arbitrary byte string   | Phantom (≈10M MAU), Solflare, Backpack, Glow, Keplr, Leap, Near wallet, SSH agents, GPG                                         |
| `'P256'`         | NIST P-256 ECDSA     | 32-byte hash            | Enterprise PIV smart cards, eIDAS government eIDs, Apple DeviceCheck, corporate PKI                                            |
| `'RSA_2048'`     | RSA-PKCS1 + SHA-256  | 32-byte hash            | YubiKey PIV slot, DocuSign, many EU eIDAS eIDs, TLS certificate PKI                                                            |
| `'BLS12_381'`    | BLS12-381 G1         | 48-byte hash            | Ethereum validators (≈1M), Cosmos validators, Eigenlayer AVSs, threshold-sig networks                                          |

**Tier 2 — Envelope variants (RECOMMENDED for library components):**

| Kind tag                 | Inner curve  | Envelope                                     | Real-world signers / integration target                                                                   |
|--------------------------|--------------|----------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| `'WEBAUTHN_P256'`        | P-256        | `authenticatorData \|\| sha256(clientData)`  | Apple passkeys (Face ID / Touch ID, ≈2B iPhones), Android passkeys, Windows Hello, 1Password, YubiKey, Titan Key |
| `'EIP191_SECP256K1'`     | secp256k1    | `"\x19Ethereum Signed Message:\n" + len`     | Every EVM wallet's `personal_sign` UI — MetaMask, Rainbow, Trust, WalletConnect                           |
| `'EIP712_SECP256K1'`     | secp256k1    | EIP-712 typed data                           | Permit2, Uniswap, OpenSea, any EIP-712-signing dapp                                                       |
| `'DKIM_RSA'`             | RSA-2048     | Canonicalized email headers                  | Every Gmail, Outlook, iCloud, or corporate email sender that publishes DKIM (≈4-5B accounts)              |
| `'JWT_RS256'`            | RSA-2048     | JWS compact serialization                    | Google OAuth (≈3B accounts), Microsoft/Entra ID, Okta, Auth0, enterprise SSO                              |
| `'JWT_ES256'`            | P-256        | JWS compact serialization                    | Sign in with Apple (≈1B Apple IDs), single-tenant — each account stores its own per-user Apple key       |
| `'JWT_ES256_APPLE_SUB'`  | P-256        | JWS + `poseidon(sub)` identity binding       | Sign in with Apple, multi-tenant — one Apple key serves many users; pubkey is 5 felts `[x_low, x_high, y_low, y_high, poseidon(sub_bytes)]` so a wallet provider can deploy thousands of accounts behind one Apple signing key without cross-tenant impersonation |

**Tier 3 — Reserved for follow-up SNIPs:**

`'MULTISIG_K_OF_N'`, `'GUARDIAN'`, `'WEIGHTED'`, `'ZK_JWT'`, `'ZK_EMAIL'`, `'ZK_TLS'`, `'ZK_TOTP'`.

**Non-normative exclusions.** Shared-secret schemes (TOTP/HOTP/OTP, SMS codes, plaintext passwords) are intentionally **not** assigned kind tags. They do not produce on-chain-verifiable signatures. Implementations that want TOTP-like UX MUST express it as a `ZK_TOTP` circuit or bridge it through WebAuthn on the user's device.

**Kind-tag registration policy.** New kinds (including Tier 3) SHOULD be proposed as amendments to this SNIP once at least one production implementation exists and an independent auditor has reviewed the verifier component. Reserved names above are listed to prevent squatting; anyone MAY implement them, but the canonical encoding MUST be defined in an amendment before library components embed it.

### Part C: Signature Envelope Format

Owner signatures arrive at the account as the `signature: Span<felt252>` parameter of `execute_from_outside_v2`. The first felt is a **version tag** that selects one of three envelope shapes. Verifier classes do not see the outer envelope — the account strips the version tag and dispatches the kind-specific payload to the registered verifier class via `library_call`.

**Three envelope variants:**

```
1. Single-owner V2:
   [ SIG_VERSION_V2_SNIP12 ('V2_SNIP12'), owner_id (u32), kind_tag, ...payload ]

2. Threshold V2 (N-of-M, mixed kinds across owners):
   [ SIG_VERSION_V2_THRESHOLD ('V2_THRESHOLD'), n (u32),
     env_1_len, owner_id_1, kind_tag_1, ...payload_1,
     env_2_len, owner_id_2, kind_tag_2, ...payload_2,
     ...,
     env_n_len, owner_id_n, kind_tag_n, ...payload_n ]

3. Session key (per Session Keys SNIP #163):
   [ session_pubkey, r, s, valid_until ]
```

**Routing matrix.** Accounts MUST dispatch by `signature.len()` first, then by `signature[0]`:

| `signature.len()` | `signature[0]` | Interpretation                                                                                |
|-------------------|----------------|-----------------------------------------------------------------------------------------------|
| 0                 | n/a            | Self-call (accept only if `caller == self`)                                                   |
| 4                 | n/a            | Session-key signature (per Session Keys SNIP #163)                                            |
| ≥ 3               | `'V2_SNIP12'`  | Single-owner V2 envelope; `owner_id = signature[1]`, `kind_tag = signature[2]`                |
| ≥ 4               | `'V2_THRESHOLD'`| Threshold V2 envelope; `n = signature[1]`, then `n` inner envelopes consumed as length-prefixed sub-spans |
| anything else     | any            | MUST revert                                                                                   |

**Inner-envelope verification** (both single-owner and each inner of a threshold):

1. `owner_id < owner_count`; otherwise revert.
2. Owner is not revoked; otherwise revert.
3. **Owner has `ROLE_OWNER` role** (audit C-1 fix). Guardians and recovery-only roles MUST NOT contribute to signature validity for arbitrary OEs; otherwise revert with a distinct error. **Implementations MAY exempt designated single-call selectors from this requirement** (typically the recovery-initiation entry point) so a guardian whose kind is on any registered curve can sign their own recovery proposal — see the "Selector-scoped role relaxation" note below.
4. `kind_tag == owners[owner_id].kind`; otherwise revert.
5. `verifier_classes[kind_tag] != 0`; otherwise revert.
6. Read `pubkey` from the owner's stored bytes; raise the `inside_verifier` reentrancy flag (Part F).
7. `library_call → ISignerLibraryDispatcher::verify(message_hash, pubkey, kind_payload)`.
8. Lower the `inside_verifier` flag.
9. If verifier returned `false`, revert.

**Threshold aggregation** (only for `V2_THRESHOLD`):

10. Reject duplicate `owner_id` across the n inner envelopes.
11. Sum `weight[owner_id_i]` across all valid envelopes.
12. Require `sum(weight_i) >= owner_set.threshold`; otherwise revert.

**Selector-scoped role relaxation (non-normative, RECOMMENDED for accounts that support guardian recovery).** Step 3 above MAY be relaxed for a closed set of single-call selectors known at the account-class level. **Critically: the relaxation NEVER extends to threshold envelopes (`V2_THRESHOLD`)** — every inner of a threshold MUST still satisfy `ROLE_OWNER`, regardless of the selector being called. Multi-guardian recovery flows (M-of-N guardians) are explicitly out of scope for this SNIP. The reference implementation relaxes the single-owner V2 check exactly for `initiate_recovery` and ONLY when all of these are simultaneously true:

- The OE's `calls` field contains exactly one call (`len == 1`).
- That call's `to` address equals the account itself (`get_contract_address()`).
- That call's selector equals `selector!("initiate_recovery")` (the SNIP-defined recovery-initiation entry point — implementations using a different name MUST document the analog).
- The first felt of that call's calldata (the `proposer` argument) equals the signer's `owner_id` from the V2_SNIP12 envelope. This binds the on-chain audit trail to the guardian who actually signed and prevents a guardian from naming a different guardian as proposer.

If all four conditions hold AND the signer's role is `ROLE_GUARDIAN` (not revoked), the inner-envelope verification (steps 4-9) proceeds as if the signer were `ROLE_OWNER`. Verifier-class dispatch is identical — a guardian whose kind is `ED25519` (Phantom), `SECP256K1` (MetaMask), `WEBAUTHN_P256` (passkey), or any other registered curve signs the same SNIP-12 typed-data envelope an owner would sign for any other selector.

`cancel_recovery` and `finalize_recovery` stay outside the relaxation: cancel remains `ROLE_OWNER`-only (the security primitive that lets an active owner veto a malicious guardian during the timelock window), and finalize remains permissionless (the post-timelock state machine has no role check at all).

The threshold envelope (`V2_THRESHOLD`) does NOT carry the relaxation: every inner of a threshold MUST satisfy `ROLE_OWNER`. Multi-guardian recovery flows (M-of-N guardians) are out of scope for this SNIP; implementations that need them MAY follow up with a separate proposal that defines a threshold envelope variant scoped to guardian roles.

**Kind-specific payload layouts** (`...payload` from the envelopes above):

```
ED25519:             [Ry_low, Ry_high, s_low, s_high, msg_len, msg_bytes..., hints...]
SECP256K1:           [r_low, r_high, s_low, s_high, v]
EIP191_SECP256K1:    [r_low, r_high, s_low, s_high, v]
EIP712_SECP256K1:    [r_low, r_high, s_low, s_high, v]
P256:                [r_low, r_high, s_low, s_high]
WEBAUTHN_P256:       [r_low, r_high, s_low, s_high,
                      auth_data_len, auth_data..., client_data_len, client_data...]
JWT_ES256:           [r_low, r_high, s_low, s_high,
                      jwt_len, jwt_bytes..., y_parity, challenge_offset]
JWT_ES256_APPLE_SUB: [r_low, r_high, s_low, s_high,
                      jwt_len, jwt_bytes..., y_parity, challenge_offset,
                      sub_offset, sub_len]
STARK:               [r, s]
RSA_2048:            [sig_limbs...]                          // 64 × u32 or 32 × u64
JWT_RS256:           [jwt_len, jwt_bytes..., sig_limbs...]
DKIM_RSA:            [header_len, header_bytes..., sig_limbs...]
BLS12_381:           [sig_compressed_len, sig_compressed..., precomputed_lines...]
```

### Part D: Integration with SNIP-9 V2 (Outside Execution)

Compliant accounts MUST use SNIP-12 typed-data hashing for `OutsideExecution` message hashes. This fixes audit finding H-2 from the Shhh V7 audit (ibid.) by removing the incentive to ship custom hash encodings.

Implementations MAY additionally offer a fallback hash format (e.g. the felt-timestamp variant used by the Chipi Pay paymaster prior to SNIP-9 V2 finalization) to preserve compatibility with paymasters that have not yet upgraded. Fallback paths MUST be clearly documented and MUST NOT be the default path.

The verify order inside `execute_from_outside_v2` MUST be:

1. Caller check (`'ANY_CALLER'` OR `caller == outside_execution.caller`). `caller == 0` MUST be rejected (audit M-1).
2. Time window bounds, including an upper cap on window length (audit M-2; RECOMMENDED cap is 7200 seconds for `'ANY_CALLER'` payloads).
3. Nonce replay check.
4. Bounds: `calls.len() ≤ MAX_CALLS`, `signature.len() ≤ MAX_SIGNATURE_FELTS`, total calldata ≤ `MAX_TOTAL_CALLDATA_FELTS` (audit M-3).
5. Read first felt of `signature` as kind tag.
6. Dispatch to the matching `ISigner::verify` implementation.
7. Multicall, atomic: on any subcall failure, revert (audit H-1).

### Part E: Address-Salt Binding

To prevent cross-kind address collisions, the deployment salt for a pluggable-signer account MUST be:

```
salt = poseidon([signer_kind, owner_commitment])
```

This guarantees that the same underlying key material (for example, a Secp256k1 key that was re-encoded as an RSA public exponent) deployed under two different kinds yields two distinct Starknet addresses.

### Part F: Library-Call Dispatch Architecture (Non-Normative, Recommended)

The reference implementation does **not** embed verifier logic as in-class Cairo components. Instead, each kind is a separately-declared **verifier class** that the account loads on demand via `library_call_syscall`. The account stores `verifier_classes: Map<felt252, ClassHash>` (`kind_tag → verifier_class_hash`), and the dispatch site (`src/account.cairo:463-473`) reads the registered class hash, builds an `ISignerLibraryDispatcher`, and calls `verify(message_hash, pubkey, payload)` against it. Verifier classes hold no storage of their own — the dispatcher runs in the *account's* storage context but the verifier itself only reads its three call parameters.

This is a deliberate departure from the Cairo-component pattern used by the Session Keys SNIP. Three reasons:

1. **One account class, many curves.** With component embedding, every kind an account supports adds bytes to that account's class hash — Ready + Phantom + passkey would be three different account classes. With library_call dispatch, a single audited `ShhhAccount` class serves N kinds; adding a new curve declares one new verifier class and (under governance) registers it. No account redeploy, no fresh address derivation, no fresh audit of the orchestration logic.
2. **Independently auditable verifiers.** Each verifier class is one Sierra binary that implements one curve. The audit scope of `Ed25519Verifier` is "does Garaga's `is_valid_eddsa_signature` get fed the right inputs and is the envelope fully consumed" — nothing more. The orchestration code that decides *whether* to call a verifier lives in the account class and is audited once.
3. **Governance-rotatable.** A vulnerability in a single curve's verifier is fixed by declaring a patched verifier class and proposing `add_verifier_class(kind_tag, new_class_hash)` through the same timelocked governance path (`ADD_VERIFIER_CLASS`, 48h timelock, unanimous owner approval in the reference). Existing accounts pick up the fix on their next signature without redeploying. The `verifier_classes` map is the explicit governance-rotatable seam; absent it, every kind upgrade would force a fresh account address and a manual fund migration.

Wallets integrate in five steps:

1. **Declare the verifier classes** for the kinds your account will support (or reuse already-declared ones — see the reference impl's `docs/class-hashes.md` for live mainnet class hashes).
2. **Store `verifier_classes: Map<felt252, ClassHash>`** in your account storage and seed it at construction with the kinds the deploying user authorizes.
3. **At every signature-check site**, look up `class_hash = verifier_classes[kind_tag]`, build `ISignerLibraryDispatcher { class_hash }`, and call `verify(message_hash, pubkey, payload)`. Revert if `class_hash` is zero or the dispatcher returns `false`. Wrap the call in a reentrancy flag (the reference impl uses `inside_verifier`) so a malicious verifier class cannot syscall back into the owner-mutation API mid-verify.
4. **At every owner-registration site** (initial deploy, add_owner, rotate_owner, finalize_recovery), look up the same class hash and call `validate_pubkey(pubkey)` before committing the owner record to storage. This is the M-1 / M-2 guard from the 2026-05-10 audit cycle — without it, an off-curve pubkey can be planted in the owner set and used to brick threshold flows.
5. **Register `ISIGNER_ID` + the kind-specific SRC-5 ID** at construction (Part G), and use the address-salt rule in Part E so the kind is bound into the deterministic address.

Verifier-class governance interacts with the rest of the account in two non-obvious ways implementers MUST handle:

- **Removing a verifier class while an owner of that kind still exists** strands that owner. The reference impl requires `REMOVE_VERIFIER` to additionally pass an invariant: no active owner record references the removed kind tag.
- **Rotating a verifier class hash** changes the binary that interprets stored pubkey bytes. The reference impl forbids in-place rotation when the new verifier reports a different pubkey schema (`validate_pubkey` MUST accept the same stored bytes); a curve migration with a different pubkey schema requires registering a new kind tag (`'ED25519_V2'`) and migrating owners one at a time through the timelocked owner-rotation path.

### Part G: SRC-5 Discovery

Accounts MUST register:

- `ISRC6_ID` (SNIP-6, standard account)
- `ISRC9_V2_ID` (SNIP-9 V2)
- `ISIGNER_ID` (this SNIP)
- A kind-specific SRC-5 ID (`ISIGNER_ED25519_ID`, `ISIGNER_SECP256K1_ID`, etc.) for precise discovery

Paymasters and dapps MUST probe `ISIGNER_ID` first, then read the per-owner `kind` from the account's owner-set view (or call the verifier class's `kind()` directly via SNIP-5 discovery on the registered verifier class hash) to confirm the concrete curve before constructing a signature.

## Rationale

### Why a single trait instead of curve-specific interfaces

Every curve needs the same three operations: verify a signature, declare the curve it implements, and reject malformed pubkeys before they reach storage. A single trait means paymasters and SDKs write one dispatcher, not six, and the account orchestration code that decides *when* to call those operations is identical across kinds.

### Why kind-tag envelopes instead of per-class contracts

Per-class contracts are already what everyone does, and the result is that no two account classes interoperate. Tagged envelopes let one class support multiple kinds if the implementer wishes, while still making single-kind classes the recommended default for audit simplicity.

### Why SNIP-12 is required for outside execution

Because the audit report that motivated this SNIP identified exactly this as the root cause of interface-mismatch vulnerabilities. Custom hash encodings drift; SNIP-12 is the fixed point.

### Why shared-secret schemes are excluded

A signer must verify that *the account owner* authorized a specific message. TOTP and bare passwords authorize *possession of a shared secret*; anyone who scrapes the chain after the secret is placed on-chain can forge future signatures. The only way to make these schemes secure is to wrap them in a ZK proof, at which point the kind is `ZK_TOTP`, not `TOTP`.

### Why address-salt binds the kind tag

Without salt binding, a key re-encoded across curves could map to the same address, letting an attacker who compromised one encoding impersonate the other. Binding the salt eliminates the attack without any per-kind code.

## Backwards Compatibility

- **SNIP-6** (standard account): unchanged. `ISigner::verify` is the recommended implementation of `is_valid_signature` for non-STARK curves, but `is_valid_signature` itself is unchanged.
- **SNIP-9 V2** (outside execution): unchanged on the protocol level. This SNIP tightens the integration requirements (Part D).
- **Session Keys SNIP** ([starknet-io/SNIPs#163](https://github.com/starknet-io/SNIPs/pull/163), merged 2026-03-03): designed to coexist. The 4-element session signature format is explicitly preserved; kind-tagged owner envelopes can never collide with it. An account implementing both SNIPs exposes session-key delegation (authority scoping) and pluggable owner signers (curve choice) as two orthogonal layers.
- **Existing accounts** (Ready, Braavos, Cartridge, Clave, OZ reference): remain valid. They MAY adopt `ISigner` incrementally to expose their existing curve support through the standard interface.

## Security Considerations

1. **Envelope malleability**: accounts MUST reject any inner envelope whose `kind_tag` does not match the stored `kind` of `owners[owner_id]` (Part C inner-envelope verification step 4). A verifier class itself MAY additionally cross-check its own `kind()` return value against the dispatched kind tag, but the account-level check is the authoritative guard. An account that accepts envelopes for a kind it does not store is an attack surface.
2. **Trailing data**: verifiers MUST confirm the envelope deserializer consumed the entire payload (Shhh audit M-4). Trailing felts after a valid structure MUST be rejected.
3. **Curve subversion**: for Ed25519 and BLS, verifiers MUST follow the reference implementation's handling of small-subgroup / torsion points. For RSA, public exponents MUST be fixed (65537 RECOMMENDED) and never read from the signature.
4. **Message binding**: `verify()` operates on a pre-computed `message_hash`. Integrations MUST NOT call `verify()` with a hash that is not bound to the execution context (nonce, chain id, caller, calls). SNIP-12 typed data is the recommended hash.
5. **Kind squatting**: kind tags outside the canonical registry in Part B SHOULD be rejected by paymasters and SDKs. The registry is the authoritative list.
6. **Key-validation on deploy**: constructors MUST validate that the supplied key material is in-range for the chosen curve (Shhh audit L-1). Out-of-range values create bricked accounts.
7. **Verifier-class reentrancy**: because `library_call_syscall` runs the verifier in the *account's* storage context, a malicious verifier class can attempt to syscall back into the account's owner-mutation API mid-verify. Accounts MUST raise a reentrancy flag (the reference impl uses `inside_verifier`) around every `library_call → verify` and `library_call → validate_pubkey` site, and every owner-mutation entry point MUST assert the flag is unset. Reentrancy guards on `verify` alone are insufficient — `validate_pubkey` is called at owner-registration time and is equally exposed (audit M-1, 2026-05-10).
8. **Verifier-class rotation governance**: adding or rotating an entry in `verifier_classes` is a privileged operation. Implementations MUST gate `add_verifier_class` / `remove_verifier_class` behind the same governance path that gates owner changes (the reference impl uses a 48-hour timelock with unanimous owner approval for `ADD_VERIFIER_CLASS`). Removing a verifier class whose kind tag is still referenced by an active owner MUST be rejected. Rotating to a verifier with an incompatible pubkey schema MUST require a fresh kind tag, not in-place replacement (Part F).
9. **Selector-scoped role relaxation (guardian-OE recovery initiation)**: implementations that expose the optional relaxation described in Part C MUST gate it on every condition stated there — single-call OEs, self-targeting, the specific recovery-initiation selector, and `proposer == signer_owner_id`. Omitting any one condition reintroduces the audit C-1 attack surface (the original 2026-05-07 finding was guardians silently becoming co-owners by virtue of having an OE-verify-time role of ROLE_GUARDIAN). The relaxation MUST NOT extend to `cancel_recovery` (owner-only veto right) or to threshold envelopes. Reference impl: `_is_single_initiate_recovery_call` at `src/account.cairo` is the audited canonical predicate; integrators porting the pattern SHOULD use a byte-for-byte equivalent rather than recoding the check.

## Reference Implementation

The reference implementation lives at [`haycarlitos/shhh-wallet-cairo`](https://github.com/haycarlitos/shhh-wallet-cairo/tree/v8.4), tag **`v8.4`** (commit **`3975532`**, declared on Starknet mainnet 2026-05-15). V8.4 deploys a single `ShhhAccount` class that dispatches signature verification to ten separately-declared verifier classes via `library_call_syscall`:

| Kind tag             | Verifier class               | Primitive used                                                                |
|----------------------|------------------------------|-------------------------------------------------------------------------------|
| `STARK`              | `StarkVerifier`              | `core::ecdsa::check_ecdsa_signature`                                          |
| `ED25519`            | `Ed25519Verifier`            | Garaga v1.0.1 `is_valid_eddsa_signature`                                      |
| `SECP256K1`          | `Secp256k1Verifier`          | `starknet::secp256_trait::recover_public_key`                                 |
| `P256`               | `P256Verifier`               | `starknet::secp256_trait::is_valid_signature` (P-256, raw)                    |
| `WEBAUTHN_P256`      | `WebAuthnP256Verifier`       | `is_valid_signature<Secp256r1Point>` over `sha256(authData ‖ sha256(clientData))` with on-chain `webauthn.get` type + base64url challenge binding |
| `EIP191_SECP256K1`   | `EIP191Secp256k1Verifier`    | `recover_public_key` over `keccak256("\x19Ethereum Signed Message:\n32" ‖ msg)` — accepts MetaMask `personal_sign` directly |
| `EIP712_SECP256K1`   | `EIP712Secp256k1Verifier`    | EIP-712 typed-data: domain bound to `{name:"Shhh", version:"1", chainId, salt:account_address}`, struct = `MessageHash{hash}` — accepts MetaMask `eth_signTypedData_v4` structured popup |
| `JWT_ES256`          | `JwtES256AppleVerifier`      | RFC 7515 JWT signed with ECDSA P-256: verifier hashes `header_b64 ‖ "." ‖ base64url(payload_decoded)`, recovers under stored IdP pubkey, scans decoded payload for nonce + hardcoded `https://appleid.apple.com` issuer — accepts "Sign in with Apple" tokens directly (single-tenant) |
| `JWT_ES256_APPLE_SUB`| `JwtES256AppleSubVerifier`   | Same recipe + multi-tenant safety: stored pubkey is 5 felts (4 P-256 coords + `poseidon(sub)`), verifier additionally checks `poseidon(payload_decoded[sub_offset..sub_offset+sub_len]) == stored_sub_hash`. Lets one Apple signing key authenticate many distinct end users on different accounts. |
| `BLS12_381`          | `Bls12_381MinSigVerifier`    | BLS12-381 min-sig-size (drand DST `BLS_SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_NUL_+`): 48-byte G1 signatures, 96-byte G2 pubkeys. Garaga `hash_to_curve_bls12_381` + `multi_pairing_check_bls12_381_2P_2F` with on-chain pubkey-G2 negation. Off-chain hint generation via the `garaga` Python package today; tracked upstream PR adds `bls_calldata_builder` to npm for in-browser signing. |

Cross-language fixtures (`@noble/ed25519`, `ethers.js`, `@noble/curves`) sign one canonical SNIP-12 hash across all four curves so the audit surface is "one hash, four verifiers, one envelope shape."

Verification evidence on commit `3975532` (tag `v8.4`):

- **`scarb build`** — green under Scarb 2.14, Cairo 2.14, Sierra 1.7, snforge 0.59.0
- **`scarb fmt --check`** — clean
- **`snforge test`** — 259 passed, 0 failed, 0 ignored (includes 9 BLS12-381 happy-path + edge-case regressions plus the M-1 / M-2 / M-3 negative regressions from the 2026-05-10 V8.2 audit, executed against the `EvilReentrantVerifier` / `EvilReturnTrueVerifier` / `EvilPanicVerifier` test helpers).
- **Mutation testing** (`scripts/mutation-test.sh`) — 10 of 10 mutants killed; no documented gaps
- **Fuzz testing** — 7 `#[fuzzer]` tests × 256 runs = 1792 random sweeps across authorization, timelock, and M-3 bounds
- **Mainnet declared** — 15 V8.x classes declared on Starknet mainnet:
  - 2026-04-28: initial 6 (V8.0 `ShhhAccount` + 5 verifier classes)
  - 2026-05-05: +4 verifier classes (`EIP191Secp256k1Verifier`, `EIP712Secp256k1Verifier`, `JwtES256AppleVerifier`, `JwtES256AppleSubVerifier`)
  - 2026-05-06: +1 (`Bls12_381MinSigVerifier`)
  - 2026-05-07: V8.1 `ShhhAccount` redeclare (audit closeout against the 2026-05-07 self-review)
  - 2026-05-10: V8.2 redeclare of `ShhhAccount` + all 10 verifier classes (full M-1 closure via `validate_pubkey` on the `ISigner` trait — trait-shape change forced fresh hashes for every class)
  - 2026-05-11: V8.3 `ShhhAccount` redeclare (audit closeout against the 2026-05-10 V8.2 self-review — H-1 `finalize_recovery`, M-1 `inside_verifier` symmetry, M-2 `bootstrap_from_sessions`, M-3 evil-verifier negative tests). Verifier class hashes unchanged from V8.2.
  - 2026-05-15: V8.4 `ShhhAccount` redeclare (closes the 2026-05-12 pre-merge review C-1 `bootstrap_from_sessions_signed` pubkey-binding gate + L-1, and the 2026-05-14 pre-declare re-review). Adds `bootstrap_from_sessions_signed` (stranded-state recovery) + guardian-OE `initiate_recovery`. Verifier class hashes unchanged from V8.2.

  Active classes for new deploys: V8.4 `ShhhAccount` + 10 V8.2 verifier classes. V8.0 / V8.1 / V8.2 / V8.3 `ShhhAccount` remain declared for legacy recognition and are deprecated. Every class hash matches its deterministic prediction byte-for-byte. Cumulative declare cost across the 15 classes: ~327 STRK. Live class-hash table maintained in [`docs/class-hashes.md`](./class-hashes.md).

The V8 codebase incorporates the twelve findings from the [2026-04-20 Codex/Cairo audit](https://gist.github.com/omarespejel/dddcc2b7df4e8b8bb47af9d1936f8a3e) as regression tests. Each audit finding has a dedicated `test_*` that fires the guard on real contract code — the audit history is reviewable in the commit log (Phase 0 → Phase 10).

V8 also extends the reference to cover the full modular-account stack:

- **Multi-owner storage** with weighted threshold, roles (OWNER / GUARDIAN / RECOVERY_ONLY), tombstone-based removal.
- **Deterministic addresses**: `salt = poseidon(primary_kind, primary_pubkey_hash)`.
- **Timelocked governance**: propose/execute/cancel state machine for every structural mutation.
- **Guardian recovery**: 7-day window, additive, single-owner cancel.
- **Sessions-wallet migration**: atomic `upgrade(V8) + bootstrap_from_sessions(...)` lets existing `chipi-pay/sessions-smart-contract` wallets (Session Keys SNIP #163 reference impl) migrate into V8 in one OE.
- **Session keys + spending policies** (Session Keys SNIP #163) coexist with owner signatures via the length-routed envelope — pluggable-signer SNIP and #163 are designed to stack.

This is the first Cairo codebase that ships all four signer kinds with identical envelope surfaces, proven end-to-end, and passes a mutation sweep that confirms every audit guard is load-bearing.

## Test Cases

Reference test suites for a compliant implementation MUST include, per kind:

- **Positive vector** (valid signature from a real wallet, on-chain execution succeeds)
- **Wrong owner** (valid signature under a different key, MUST revert)
- **Malformed envelope** (truncated payload, trailing data, wrong kind tag, MUST revert with controlled errors)
- **Curve-specific edge cases** (Ed25519 small-subgroup R, secp256k1 high-s malleability, P-256 point-not-on-curve, WebAuthn tampered clientDataJSON, RSA padding attacks)

Cross-kind tests:

- Two accounts with identical raw key bytes but different `primary_kind` MUST yield different addresses (Part E).
- An envelope with `kind_tag = X` submitted against an owner whose stored `kind = Y` MUST revert before reaching `library_call`.
- The 4-element session-key envelope MUST be correctly dispatched to the session-key path, not to owner verification.

## Acknowledgments

- **Henri ([@l-henri](https://github.com/l-henri))** — collaborator on the Shhh project. Ran the Nethermind AuditAgent scan on the V7 commit range on 2026-04-13, one week before Omar's human review, surfacing the three structural findings (unrestricted `__execute__`, non-atomic multicall, dead upgrade component) that triggered the V8 rewrite. Per the Nethermind AuditAgent license this is a credit to Henri as the collaborator who ran and triaged the scan, not a claim that the code is "audited by Nethermind."
- **Chipi Pay and Omar Espejel** — Session Keys SNIP ([starknet-io/SNIPs#163](https://github.com/starknet-io/SNIPs/pull/163)), which established the modular-account pattern this SNIP extends.
- **Garaga team (Keep Starknet Strange)** — Ed25519, secp256k1, and P-256 verification primitives that make curve-agnostic signer verification practical on Starknet today.

## Copyright

Copyright and related rights waived via [MIT](https://opensource.org/license/mit).
