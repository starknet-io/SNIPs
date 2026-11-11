---
snip: 41
title: Session Keys for Smart Accounts
description: Session key management and paymaster interaction protocol for Starknet smart accounts.
author: Chipi Pay (@chipi-pay), Omar Espejel (@omarespejel)
discussions-to: https://community.starknet.io/t/snip-session-keys-for-smart-accounts/116131
status: Draft
type: Standards Track
category: SRC
created: 2026-02-06
requires: SNIP-5, SNIP-6, SNIP-9, SNIP-12
---

## Simple Summary

Standard interface for time-limited, call-limited, fee-capped, selector-restricted session keys on Starknet smart accounts, including the protocol for paymaster discovery and interaction with session-enabled accounts.

## Abstract

This SNIP defines:

1. An `ISessionKeyManager` trait and `SessionData` struct for on-chain session key management
2. A session signature format: `[session_pubkey, r, s, valid_until]`
3. A validation algorithm for session-signed transactions, including a per-transaction fee cap and a storage write budget
4. An admin selector blocklist that session keys MUST NOT bypass
5. A paymaster-account interaction protocol covering discovery, `OutsideExecution` construction, and signature passthrough
6. A canonical SNIP-12 typed data format for session-aware `OutsideExecution` hashing

Together, these components enable any compliant wallet to create session keys that any compliant paymaster can sponsor, without forking, custom integrations, or hash format negotiation.

## Motivation

Session keys are the most impactful UX improvement for on-chain applications. They allow users to delegate limited, time-bounded authority to a secondary key, enabling gasless and popup-free interactions for gaming, DeFi automation, social apps, recurring payments, and autonomous AI agents.

**Current state**: Multiple teams have independently built session key implementations, each optimized for different use cases.

| Team | Approach | Signature Format | Paymaster Compatible |
|------|----------|-----------------|---------------------|
| Argent | Backend guardian | 3+ elements | Native |
| Braavos | External library | Proof-based | Partial |
| Cartridge | Controller + passkeys | WebAuthn | Custom |
| Chipi Pay | On-chain validation | 4 elements | Via AVNU |
| starknet-agentic | Agent account + spending policies | 3 elements | No |

Each of these approaches serves real use cases well. Argent's guardian model is battle-tested at consumer scale. Braavos' library approach keeps wallet contracts simple. Cartridge's passkey integration serves gaming. Bibliotheca DAO's Arcade Accounts pioneered the concept. This SNIP does not propose replacing any of them. It proposes a shared interface layer that enables interoperability.

This diversity creates coordination challenges:

- **Paymaster integration complexity**: Integrating a custom session account with AVNU's paymaster revealed that implementation details matter: incorrect caller fields, SNIP-12 timestamp type mismatches (Felt vs U128), and missing SRC-5 interface registration caused signature validation failures, all on the account side. AVNU's paymaster works correctly with properly configured accounts. This experience demonstrates the value of a shared specification.
- **dApp fragmentation**: Applications must build separate session integrations for each wallet.
- **Audit duplication**: Each implementation requires its own security review. Nethermind's AuditAgent (AI-powered auditing tool) scanned the reference implementation four times; Argent, Braavos, and Cartridge each have separate audit surfaces.

**A standard enables**: any paymaster works with any session account, any dApp SDK works with any session wallet, and the community shares a single audited specification.

**Why now**: Starknet's account ecosystem is converging on native passkeys (WebAuthn/secp256r1) for owner authentication. Cartridge's Controller, Braavos' Hardware Signer, and discussions in the [SNIP-6 forum thread](https://community.starknet.io/t/snip-starknet-standard-account/95665) confirm this direction. Passkeys make self-custodial wallets the default onboarding path: no seed phrases, just biometrics. But passkeys solve *authentication*: they prove who you are. Session keys solve *authorization*: they define what a delegate can do. As passkey-based wallets become the default, session key standardization becomes essential: every new user who onboards via Face ID will need scoped, revocable delegation for dApps, agents, and automated workflows. These are complementary layers of the same UX stack.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### Part A: Session Key Interface

Compliant accounts MUST implement the following interface:

```cairo
#[derive(Drop, Copy, Serde)]
struct SessionData {
    valid_until: u64,
    max_calls: u32,
    max_fee_per_tx: u128,
    allowed_entrypoints_len: u32,
}

#[starknet::interface]
trait ISessionKeyManager<TContractState> {
    /// Adds a new session key or updates an existing one.
    /// MUST only be callable by the account owner.
    /// MUST reset the session's transaction usage on update (see Part C).
    /// MUST clear stale entrypoints before writing new ones (see Part E).
    /// max_fee_per_tx is in fri; 0 makes the session paymaster-only (see Part C).
    fn add_or_update_session_key(
        ref self: TContractState,
        session_key: felt252,
        valid_until: u64,
        max_calls: u32,
        max_fee_per_tx: u128,
        allowed_entrypoints: Array<felt252>
    );

    /// Revokes a session key.
    /// MUST only be callable by the account owner.
    /// MUST clear all stored entrypoints for the session.
    /// After revocation, the session MUST fail validation and get_session_data
    /// MUST return all fields as zero.
    fn revoke_session_key(ref self: TContractState, session_key: felt252);

    /// Returns the configuration of a given session key.
    /// A session with valid_until == 0 is considered non-existent or revoked.
    fn get_session_data(self: @TContractState, session_key: felt252) -> SessionData;
}
```

`SessionData` describes a session's configuration, not how it is stored. How an implementation tracks the transactions a session has used is implementation-defined (see Part C, Transaction limit enforcement), and implementations SHOULD document how clients can determine it. Revocation likewise only fixes observable behavior: implementations MAY zero the stored fields or record an explicit revoked state.

**Component architecture**: The reference implementation provides session key management as a reusable `SessionKeyComponent` that any account can embed, not just OpenZeppelin-based accounts. The embedding contract implements a `HasAccountOwner` trait with a single function:

```cairo
pub trait HasAccountOwner<TContractState> {
    fn assert_only_self(self: @TContractState);
}
```

This trait has **zero OpenZeppelin dependencies**. Any wallet framework (Argent, Braavos, Cartridge, or custom) can implement it by delegating to their own owner check. The `SpendingPolicyComponent` (Part H) is fully independent with its own storage and can be embedded alongside or separately.

**Wallet integration pattern** (5 steps):
1. Add `component!()` declaration for `SessionKeyComponent` (and optionally `SpendingPolicyComponent`)
2. Implement `HasAccountOwner`: delegate `assert_only_self()` to your own owner check
3. Call `session_key.is_session_allowed_for_calls()` in `__validate__`
4. Record the transaction against the session's limit after signature verification (`session_key.consume_session_call()` in the reference implementation)
5. Optionally call `spending_policy.check_and_update_spending()` in `__execute__`

This design makes session keys a **reusable building block** rather than a monolithic contract that other wallets must fork. The key differentiator is that session key functionality is embeddable by any wallet with minimal integration effort.

**Storage layout** (non-normative): The reference implementation uses two maps:
- `session_keys: Map<felt252, SessionData>`: session public key to session data
- `session_entrypoints: Map<(felt252, u32), felt252>`: (session public key, index) to allowed selector

Implementations MAY use any layout that meets the storage write budget in Part C. Packing the per-session data read on every transaction into a single felt (for example with `StorePacking`) is RECOMMENDED.

The `allowed_entrypoints_len` field in `SessionData` indicates how many selectors are in the session's whitelist. A value of `0` means the session has no whitelist restriction (all non-admin selectors are allowed).

### Part B: Session Signature Format

Compliant accounts MUST support two signature formats in `__validate__` and `is_valid_signature`:

**Owner signature** (2 elements):
```
[r, s]
```
Standard ECDSA signature verified against the account's public key. Grants full account control.

**Session signature** (4 elements):
```
[session_pubkey, r, s, valid_until]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | `session_pubkey` | `felt252` | Public key of the session key pair |
| 1 | `r` | `felt252` | ECDSA signature r component |
| 2 | `s` | `felt252` | ECDSA signature s component |
| 3 | `valid_until` | `felt252` | Expiration timestamp; MUST be safely convertible to `u64` |

The `valid_until` field is a `felt252` that MUST be converted to `u64` using `try_into()` with pattern matching. Implementations MUST NOT use `unwrap()`. If the conversion fails (value exceeds `u64::MAX`), the validation MUST return `0` (invalid) rather than panicking.

```cairo
let valid_until: u64 = match (*signature.at(3)).try_into() {
    Option::Some(v) => v,
    Option::None => { return 0; }  // Safe failure, no panic
};
```

Signature lengths other than 2 or 4 MUST be rejected by returning `0`.

### Part C: Validation Algorithm

`__validate__` MUST perform the following steps for 4-element (session) signatures:

**Step 1**: Safe conversion of `valid_until` from `felt252` to `u64`. Return `0` on overflow.

**Step 2**: Check expiration. `block_timestamp` MUST be `<=` `valid_until`. If expired, return `0`.

**Step 3**: Check session exists. Read `SessionData` for `session_pubkey`. If the session's `valid_until` is `0`, the session does not exist or was revoked. Return `0`.

**Step 4**: Check transaction limit. If the session has already authorized `max_calls` transactions (see Transaction limit enforcement below), the session is exhausted. Return `0`.

**Step 4b**: Check fee cap. If `max_fee_per_tx == 0`, the session is paymaster-only. Return `0`. Otherwise, if the transaction's maximum possible fee exceeds `max_fee_per_tx` (see Fee cap below), return `0`.

**Step 5**: Check admin blocklist. For EVERY call in the transaction, verify the selector is not in the admin blocklist (see Part D). If any call targets a blocked selector, return `0`.

**Step 5b** (RECOMMENDED): Check self-call block. If `allowed_entrypoints_len == 0`, verify that no call targets the account contract itself (`call.to != get_contract_address()`). If any call is a self-call, return `0`. This eliminates the entire class of privilege escalation via self-calls.

**Step 6**: Check selector whitelist. If `allowed_entrypoints_len > 0`, verify every call's selector appears in the session's allowed entrypoints list. If any selector is not found, return `0`. If `allowed_entrypoints_len == 0`, all non-self, non-admin selectors are allowed (skip this check).

**Step 7**: Verify ECDSA signature. Compute the message hash and verify the ECDSA signature `(r, s)` against `session_pubkey`. Return `0` on failure.

**Step 8**: Record the transaction. ONLY after all validation steps pass, record the transaction against the session's limit. Implementations whose limit mechanism needs no storage write for this transaction (see below) skip the write. Return `VALIDATED`.

**`max_calls` semantics**: `max_calls` counts **transactions**, not individual calls: a transaction containing 5 calls counts once. It is an upper bound. Implementations MUST NOT let a session authorize more than `max_calls` self-paid transactions (through `__validate__`), and MUST NOT let it authorize more than `max_calls` sponsored transactions (through `execute_from_outside_v2`). Implementations MAY enforce a single combined limit across both paths instead. A session MAY end up authorizing fewer than `max_calls` transactions (see nonce anchoring below).

**Critical ordering**: Step 8 (recording the transaction) MUST occur AFTER Step 7 (signature verification). Recording before verification causes off-by-one failures for `max_calls = 1` sessions.

#### Transaction limit enforcement

How the limit is enforced is implementation-defined. Examples:

- **Counter**: a per-session counter, incremented in Step 8 and reset by `add_or_update_session_key`. This costs one storage write per transaction.
- **Nonce anchoring** (self-paid path): on the session's first self-paid transaction, at account nonce `a`, store `a + max_calls`. Afterwards, accept only transactions with `tx_info.nonce < a + max_calls`, with no further writes. The account nonce is shared with the owner and with other sessions, so their transactions also use up the range and the session may get fewer than `max_calls` transactions. This is compliant.
- **Bounded nonce range** (sponsored path): accept only SNIP-9 nonces from a range of `max_calls` values reserved for the session. Each SNIP-9 nonce can be used once, so the SNIP-9 replay-protection write also enforces the limit.

#### Fee cap

The fee cap applies to self-paid transactions (`__validate__`), where the account pays the fee. Implementations MUST compute an upper bound on the fee the transaction can be charged from the transaction's own fee fields (`get_execution_info().tx_info`), and MUST reject the transaction if that bound exceeds `max_fee_per_tx`. For V3 transactions, a conservative bound is:

```
max_fee = sum over resource_bounds of (max_amount * max_price_per_unit)
        + tip * max_amount of the L2 gas bound
```

This computation MUST NOT overflow or panic. `max_amount` is a `u64` and `max_price_per_unit` is a `u128`, so implementations SHOULD accumulate in `u256` and return `0` on failure, as with `valid_until` in Part B. Implementations MUST reject session-signed transactions whose fee they cannot bound, for example transaction versions without V3 resource bounds.

The cap is read from transaction info, so it does not change the session signature format or the message hash. A cap of `0` makes the session paymaster-only: it can still sign SNIP-9 `OutsideExecution`s but cannot send self-paid transactions. Fees on the self-paid path are therefore bounded by `max_fee_per_tx × max_calls` for the life of the session.

#### Storage write budget

Session bookkeeping runs on every session transaction, so in high-volume uses such as games its cost scales with transactions per player times the number of players. After a session is set up, implementations SHOULD perform at most one storage write per session-signed transaction for the checks in this Part, including replay protection beyond the protocol nonce, and none where the account nonce already provides it. Implementations SHOULD NOT rewrite unchanged storage fields just to update a counter. Optional extensions such as Part H add their own writes and are outside this budget.

### Part D: Admin Selector Blocklist

The following selectors MUST be blocked for session keys regardless of whitelist configuration:

```cairo
selector!("upgrade")                    // Prevents contract replacement
selector!("add_or_update_session_key")  // Prevents session creation
selector!("revoke_session_key")         // Prevents session revocation
selector!("__execute__")                // Prevents nested execution privilege escalation
selector!("set_public_key")             // Prevents owner key rotation (OZ PublicKeyImpl)
selector!("setPublicKey")               // Prevents owner key rotation (OZ PublicKeyCamelImpl)
selector!("execute_from_outside_v2")    // Prevents nested SNIP-9 double-consumption
selector!("set_spending_policy")        // Prevents session key from modifying spending limits
selector!("remove_spending_policy")     // Prevents session key from removing spending limits
```

**Rationale for `set_spending_policy`/`remove_spending_policy`**: If the Spending Policy Extension (Part H) is implemented, session keys MUST NOT be able to modify or remove their own spending limits. Without this blocklist entry, a session key could call `set_spending_policy` to raise its own caps or `remove_spending_policy` to eliminate them entirely, defeating the purpose of spending restrictions.

**Rationale for `__execute__`**: A session key that can call `__execute__` directly can pass arbitrary nested calls. Since `__execute__` checks that the caller is `0` (sequencer) or `self` (the account), and the account calling its own `__execute__` satisfies this check, the nested calls would execute with full account privileges, bypassing all session restrictions. This was identified as a High severity finding by Nethermind's AuditAgent in February 2026.

**Rationale for `set_public_key`/`setPublicKey`**: OpenZeppelin's `AccountComponent` embeds `PublicKeyImpl` and `PublicKeyCamelImpl`, exposing owner key rotation. A session key calling these functions achieves full account takeover. Identified as a High severity finding by Nethermind's AuditAgent (scan 3).

**Rationale for `execute_from_outside_v2`**: Allowing session keys to call `execute_from_outside_v2` creates nested SNIP-9 execution, potentially causing double nonce consumption or double call-counter increments. Identified as a Low severity finding by Nethermind's AuditAgent (scan 3).

Implementations MAY extend this blocklist with additional selectors but MUST NOT remove any of the nine listed above.

**Self-call block (RECOMMENDED)**: In addition to the blocklist, implementations SHOULD block ALL calls where `call.to == get_contract_address()` when `allowed_entrypoints_len == 0` (empty whitelist). This eliminates the entire class of privilege escalation via self-calls, protecting against any future OZ embedded impl or upgrade exposing new privileged selectors. The denylist approach is inherently fragile: each of three Nethermind AuditAgent scans found selectors not in the blocklist. The self-call block converts this from an open-ended problem to a closed one.

### Part E: Stale Entrypoint Cleanup

When `add_or_update_session_key` is called for an existing session, the implementation MUST clear old entrypoints before writing new ones.

If a session previously had `N` allowed entrypoints and is being updated to `M` entrypoints where `M < N`, indices `M` through `N-1` MUST be set to `0` in storage. Failure to do this leaves stale selectors that the whitelist check may incorrectly match.

The simplest correct approach is to clear ALL `N` old entrypoints before writing the `M` new ones:

```cairo
// Clear old entrypoints
let old_session = self.session_keys.read(session_key);
let mut i = 0;
loop {
    if i >= old_session.allowed_entrypoints_len { break; }
    self.session_entrypoints.write((session_key, i), 0);
    i += 1;
};

// Write new session data and entrypoints
// ...
```

### Part F: Paymaster-Account Interaction Protocol

This section defines how paymasters discover and interact with session-enabled accounts.

#### F.1: Discovery

Paymasters SHOULD use a multi-tier detection strategy for session support:

1. **SRC-5 detection** (primary): Call `supports_interface(SESSION_KEY_INTERFACE_ID)` to detect session key support, and `supports_interface(ISRC9_V2_ID)` to detect SNIP-9 V2 support.
2. **ABI fallback** (secondary): If SRC-5 returns no results or errors, fetch the account's class hash and inspect its ABI for `execute_from_outside_v2` or `execute_from_outside` entry points.
3. **Graceful error handling**: If `supports_interface()` reverts (many custom accounts don't implement SRC-5), the paymaster MUST NOT propagate the error. It SHOULD treat this as "interface not detected" and fall back to ABI inspection.

Compliant accounts MUST register the `ISessionKeyManager` interface ID via SRC-5. The interface ID is computed per SNIP-5 as the XOR of the Extended Function Selectors of the `ISessionKeyManager` trait (see Part G).

#### F.2: OutsideExecution Construction

Paymasters build `OutsideExecution` structs per SNIP-9 V2. For session-enabled accounts:

- The `caller` field SHOULD be `0x0` (ANY_CALLER) to allow any whitelisted relayer to submit the transaction. Restricting to a specific caller address is also valid but limits which relayers can submit.
- The `nonce` MUST be unique and not previously used by the account. Accounts MAY require nonces to follow a structure that reduces storage writes, for example "nonce channels", where one storage cell holds a bitmap covering up to 128 nonces so replay protection updates an existing cell instead of writing a new one per nonce. A paymaster that picks an arbitrary nonce defeats this. A standard nonce encoding or discovery method is an open issue (see Open Issues).
- `execute_after` and `execute_before` define the validity window. `execute_after` MUST be strictly less than the current block timestamp, and `execute_before` MUST be strictly greater.

#### F.3: Signature Passthrough

Paymasters MUST pass session signatures (4 elements) unmodified to the account's `execute_from_outside_v2`. The paymaster MUST NOT interpret, modify, or strip any elements of the session signature. The account validates the signature internally.

#### F.4: Hash Format

This SNIP defines the canonical SNIP-12 typed data format for `OutsideExecution` hashing, using `u128` timestamps to match OpenZeppelin's `SRC9Component` and current ecosystem practice.

**OutsideExecution Type String**:

```
OutsideExecution(Caller:ContractAddress,Nonce:felt,Execute After:u128,Execute Before:u128,Calls:Call*)Call(To:ContractAddress,Selector:selector,Calldata:felt*)
```

Paymasters MUST construct `OutsideExecution` TypedData using `u128` for the "Execute After" and "Execute Before" fields. This produces the same struct type hash as OpenZeppelin's `SRC9Component`, ensuring signature compatibility with all standard accounts (Argent, Braavos, and any OZ-based account).

**Domain Separator** (SNIP-12 Revision 1):

```
{
  name: "Account.execute_from_outside",
  version: 2,          // numeric, NOT shortstring '2'
  chainId: <chain_id>, // from get_tx_info()
  revision: 1
}
```

**Domain Type Hash**:
```
StarknetDomain(name:shortstring,version:shortstring,chainId:shortstring,revision:shortstring)
```
Hash: `0x1ff2f602e42168014d405a94f75e8a93d640751d71d16311266e140d8b0a210`

**Call Type Hash**:
```
Call(To:ContractAddress,Selector:selector,Calldata:felt*)
```
Hash: `0x3635c7f2a7ba93844c0d064e18e487f35ab90f7c39d00f186a781fc3f0c2ca9`

**Hash computation**:

```
// 1. Domain hash
domain_hash = poseidon(DOMAIN_TYPE_HASH, "Account.execute_from_outside", 2, chain_id, 1)

// 2. Call hashes (arrays pre-hashed per Rev 1)
for each call:
    calldata_hash = poseidon(call.calldata)
    call_hash = poseidon(CALL_TYPE_HASH, call.to, call.selector, calldata_hash)

calls_array_hash = poseidon(all call_hashes)

// 3. Struct hash
struct_hash = poseidon(
    OUTSIDE_EXECUTION_TYPE_HASH,
    caller,
    nonce,
    execute_after,     // u128
    execute_before,    // u128
    calls_array_hash
)

// 4. Final message hash
message_hash = poseidon("StarkNet Message", domain_hash, account_address, struct_hash)
```

**Implementation note**: The reference implementation additionally supports a felt-timestamp variant as a fallback (see `account.cairo:381-390`). This is an implementation detail, not part of this specification. Compliant implementations SHOULD use the u128 format defined above.

#### F.5: Call Consumption in SNIP-9 Path

When `execute_from_outside_v2` processes a session signature:

1. Whitelist enforcement MUST happen BEFORE signature validation
2. Recording the transaction against the session's limit (`_consume_session_call` in the reference implementation) MUST happen AFTER successful signature validation
3. Call execution happens last

This ordering prevents:
- Unauthorized selectors from consuming gas via failed signature validation
- Off-by-one errors where a valid session with `max_calls = 1` fails because the counter was incremented before verification

#### F.6: Fees on the Sponsored Path

On the SNIP-9 path the relayer pays the transaction fee, so `max_fee_per_tx` (Part C) does not apply. When a paymaster charges the user in tokens, the fee is a token `transfer` call inside the `OutsideExecution` that the session signs. That transfer is bounded only by the session's selector whitelist and by any Part H spending policy for the token. Wallets SHOULD set a Part H policy for the fee token on sessions used in this mode.

### Part G: SRC-5 Interface ID

Compliant accounts MUST register the `ISessionKeyManager` interface ID via SRC-5.

The interface ID is computed per SNIP-5 as the XOR of the Extended Function Selectors of the trait, i.e. the `starknet_keccak` of each full function signature including parameter and return types:

```
interface_id = starknet_keccak("add_or_update_session_key(felt252,u64,u32,u128,Array<felt252>)")
             ^ starknet_keccak("revoke_session_key(felt252)")
             ^ starknet_keccak("get_session_data(felt252)->(u64,u32,u128,u32)")
             = 0x9da822b09dda470480ed02c12ae8745d4ac010023df23c6db0314abe5cdc02
```

This enables paymasters and dApps to detect session key support via `supports_interface()` without needing to know the specific account implementation or class hash.

Earlier drafts of this SNIP derived the ID from function names only. Because names do not change when parameters do, accounts implementing an earlier revision of the interface would have advertised the same ID as accounts implementing this one. Accounts that do not implement this revision of `ISessionKeyManager` MUST NOT register the ID above.

### Part H: Spending Policy Extension (OPTIONAL)

Implementations MAY support per-token spending limits for session keys via the `ISessionSpendingPolicy` interface. This extension adds per-call and rolling-window cumulative caps on ERC-20 operations performed by session keys.

```cairo
#[derive(Drop, Copy, Serde, starknet::Store)]
struct SpendingPolicy {
    max_per_call: u256,       // Maximum amount per individual call
    max_per_window: u256,     // Maximum cumulative amount per time window
    window_seconds: u64,      // Duration of the rolling window (e.g. 86400 for 24h)
    spent_in_window: u256,    // Amount spent in current window
    window_start: u64,        // Timestamp when current window started
}

#[starknet::interface]
trait ISessionSpendingPolicy<TContractState> {
    fn set_spending_policy(
        ref self: TContractState,
        session_key: felt252,
        token: ContractAddress,
        max_per_call: u256,
        max_per_window: u256,
        window_seconds: u64,
    );
    fn get_spending_policy(
        self: @TContractState,
        session_key: felt252,
        token: ContractAddress,
    ) -> SpendingPolicy;
    fn remove_spending_policy(
        ref self: TContractState,
        session_key: felt252,
        token: ContractAddress,
    );
}
```

**Tracked selectors**: Implementations SHOULD track the following ERC-20 selectors as spending operations:
- `transfer`: direct token transfer
- `approve`: token approval
- `increase_allowance` / `increaseAllowance`: allowance increase (snake_case and camelCase)

**Enforcement**: Spending checks MUST occur in `__execute__` (not `__validate__`), because spending state mutations in `__validate__` would be reverted on execution failure. For each call with a tracked selector:
1. Extract `u256` amount from calldata positions `[1]` (low) and `[2]` (high)
2. Check `amount <= policy.max_per_call`
3. Auto-reset window if `now >= window_start + window_seconds`
4. Check `spent_in_window + amount <= policy.max_per_window`
5. Update `spent_in_window`

If no policy is set for a (session_key, token) pair (i.e., `max_per_window == 0`), the call is unrestricted.

**Fees are not covered**: This extension does not bound transaction fees. Fees are not paid through tracked selectors and are charged even when execution reverts, so they cannot be checked in `__execute__`. Fees on the self-paid path are bounded by `max_fee_per_tx` (Part C). For fees charged in tokens on the sponsored path, see Part F.6.

**Admin blocklist requirement**: Implementations that support this extension MUST include `set_spending_policy` and `remove_spending_policy` in the admin selector blocklist (Part D). Without this, a session key could modify or remove its own spending limits, defeating the purpose of the restriction.

**Rationale**: This extension was proposed by keep-starknet-strange / Omar Espejel ([Issue #5](https://github.com/chipi-pay/sessions-smart-contract/issues/5)) and informed by starknet-agentic's working implementation. Spending limits are critical for DeFi automation and AI agent use cases where session keys need per-token caps beyond selector-level restrictions.

## Rationale

### On-chain vs Hybrid Enforcement

This SNIP mandates on-chain enforcement (the contract validates session parameters) rather than hybrid enforcement (a backend co-signs). On-chain enforcement provides trustless guarantees: the rules are visible, verifiable, and enforceable without trusting any off-chain party. Hybrid approaches (like Argent's guardian model) are practical and battle-tested but introduce a trust dependency on the guardian service.

Implementations are free to layer additional off-chain checks on top of the on-chain enforcement defined here.

### Blocklist vs Allowlist-Only

The admin selector blocklist (Part D) provides defense-in-depth even when the allowlist is empty. An empty `allowed_entrypoints` array means "allow all non-admin selectors", but admin functions are always blocked. Without the blocklist, a session key with an empty whitelist could call `upgrade()` and replace the contract code.

### Non-Atomic Multicall

This SNIP does not mandate atomic multicall behavior. Implementations MAY use non-atomic execution (failed subcalls return empty results without reverting the batch) or atomic execution (any failure reverts all). The reference implementation uses non-atomic execution by design, as some use cases benefit from partial success.

### U128 Timestamps for TypedData

The hash format (Part F.4) uses `u128` for timestamp fields, matching OpenZeppelin's `SRC9Component` and current ecosystem practice (AVNU paymaster, Argent, Braavos). Using `felt252` for timestamps produces a different struct type hash, which produces a different message hash, which breaks signature validation against standard accounts. This was proven empirically: the reference implementation's account contract initially used `felt` timestamps for SNIP-12 hashing, producing a different struct type hash than the ecosystem standard (`u128`). Switching to `u128` resolved the mismatch.

### `__execute__` in the Blocklist

Blocking `__execute__` for session keys prevents nested execution privilege escalation. Without this, a session key could call the account's `__execute__` function directly, which would then execute arbitrary calls as if they came from the account itself, bypassing all session restrictions. This was identified as a High severity vulnerability by Nethermind's AuditAgent in February 2026.

### Call Consumption After Validation

Recording a transaction against the session's limit after signature verification (not before) prevents an off-by-one error: with a counter, a session with `max_calls = 1` would otherwise fail on its first (and only) valid use because the counter would already be at 1 when the limit check runs. This was identified as a Low severity finding by Nethermind's AuditAgent in February 2026.

### Transaction Limits as Upper Bounds

Earlier drafts required a dedicated `calls_used` counter written on every transaction. For high-volume applications such as games, one extra storage write per transaction, across thousands of transactions a day and thousands of players, is a significant cost. Defining `max_calls` as an upper bound with an implementation-defined mechanism lets accounts reuse protection they already pay for: the protocol nonce on the self-paid path, and the SNIP-9 nonce on the sponsored path.

The cost is precision. Under nonce anchoring, a session can authorize fewer than `max_calls` transactions when other signers use the account, and a view call cannot report usage because it cannot read the account nonce. Clients can compute usage off-chain from `starknet_getNonce`. Limits are enforced per path because the two paths use different nonces: a single combined counter would bring back a write on every transaction. Implementations that want a combined limit MAY still enforce one.

### Fee Cap in the Core Session Record

Selector whitelists and the Part H spending policy control what a session can do with tokens, but not what it spends on fees. Without a fee cap, a session with no permission to transfer tokens can still drain the account through fees on the self-paid path. The cap belongs in the core session record rather than in Part H for two reasons. Fees are charged even when execution reverts, so the check has to happen in `__validate__`, while Part H runs in `__execute__`. And bounding the worst-case loss of a session is a baseline security property, not an optional feature.

Capping each transaction, combined with `max_calls`, bounds total fee exposure without any per-transaction storage write. A cumulative fee budget would need one.

### AI Agent Delegation

Session keys are a natural fit for autonomous AI agents that need restricted on-chain access. An AI trading bot, yield optimizer, or gaming agent requires:
- Time-bounded sessions (prevent permanent access)
- Function-scoped permissions (agent can only call whitelisted selectors)
- Call limits (prevent runaway execution loops)
- Fee caps (bound what the agent can spend on gas)
- Immediate revocability (emergency kill switch)
- Non-custodial delegation (agent never holds the owner key)

This maps directly to the `SessionData` structure defined in Part A. A standard session key interface enables any compliant agent framework to work with any compliant wallet, without custom integration per wallet vendor.

### Passkey Compatibility

This SNIP is independent of the owner's authentication method. The `ISessionKeyManager` interface defines how session keys are created, validated, and revoked, not how the owner proves identity. An account that uses passkeys (secp256r1/WebAuthn) for owner authentication can implement `ISessionKeyManager` without modification: the owner calls `add_or_update_session_key` using their passkey signature, and the session key itself uses standard Stark-curve ECDSA for lightweight, programmatic signing by dApps and agents.

This separation is deliberate. As the [SNIP-6 discussion](https://community.starknet.io/t/snip-starknet-standard-account/95665) evolves toward `Array<felt252>` signatures to accommodate passkeys and other authentication methods, the 4-element session signature format defined here remains compatible. It is already an array of `felt252` values.

## Security Considerations

### Denylist Fragility and Self-Call Block

The admin selector blocklist is defense-in-depth but inherently fragile. Across three Nethermind AuditAgent scans:
- Audit 1: Found `upgrade`, `add_or_update_session_key`, `revoke_session_key` missing
- Audit 2: Found `__execute__` missing
- Audit 3: Found `set_public_key`, `setPublicKey`, `execute_from_outside_v2` missing

Each audit discovered new selectors exposed by OZ embedded implementations. The self-call block (Step 5b) is the primary protection: it blocks ALL self-targeting calls for empty whitelists, eliminating the need to maintain a complete list of every privileged selector.

### Audit History

The reference implementation has been scanned four times by Nethermind's AuditAgent (AI-powered auditing tool):

**Audit 1 (January 2026)**, 10 findings:
- Finding #1 (High): Unrestricted `__execute__` caller. Defense-in-depth caller check added.
- Finding #2 (High): Session whitelist not enforced in `is_valid_signature`. Fixed.
- Finding #3 (High): Call-limit bypass via `calls_used` reset. Fixed via admin blocklist.
- Finding #4 (High): Session whitelist not enforced in `execute_from_outside_v2`. Fixed.
- Finding #5 (High): Session keys as ERC-1271 signers. Accepted tradeoff (no call context in `is_valid_signature`).
- Finding #6 (Medium): State modification in `is_valid_signature`. False positive (`@ContractState` is read-only).
- Finding #7 (Medium): Non-atomic multicall. By design.
- Finding #8 (Low): Session can revoke sessions. Fixed via admin blocklist.
- Finding #9 (Best Practice): DoS via unsafe `unwrap()`. Fixed with safe `try_into()` pattern.
- Finding #10 (Best Practice): Stale entrypoints on update. Fixed with pre-write cleanup.

**Audit 2 (February 2026)**, 3 findings:
- Finding #1 (High): Nested `__execute__` privilege escalation. Fixed by adding `__execute__` to admin blocklist.
- Finding #2 (Medium): Session hash does not bind full tx envelope. Accepted risk for paymaster compatibility.
- Finding #3 (Low): Call consumed before validation in SNIP-9 path. Fixed.

**Audit 3 (February 2026)**, 5 findings:
- Finding #1 (High): `set_public_key`/`setPublicKey` not in blocklist. Fixed (blocklist + self-call block).
- Finding #2 (High): Duplicate of #1. Same fix.
- Finding #3 (Low): Nested `execute_from_outside_v2` double-consumption. Fixed (blocklist + self-call block).
- Finding #4 (Low): Missing SRC-5 interface registration. Fixed.
- Finding #5 (Info): Malleable `valid_until` in SNIP-9 path. Fixed (bind to stored session).

**Audit 4 (February 2026)**, 0 findings:
- Clean bill of health. The self-call block and expanded blocklist eliminated the systemic vulnerability class.

### Session Hash Does Not Bind Full Transaction Envelope

Session signatures cover `(account_address, chain_id, nonce, valid_until, calls...)` but NOT fee/resource bounds, tip, or paymaster-related fields. Including envelope fields would require the session signer to know gas parameters at signing time, which breaks the gasless UX model where the paymaster determines fees after signing.

On the self-paid path, this would let a compromised session key, or anyone holding a signed session transaction, resubmit it with inflated resource bounds or tip and drain the account through fees, even if the session cannot transfer tokens. The fee cap (Part C, Step 4b) closes this: it is checked in `__validate__` against the transaction's own fee fields, so no signed envelope field is needed. On the sponsored path the relayer pays the fee. Fees charged to the user in tokens are covered by Part F.6.

### Admin Blocklist is Essential

Without the admin blocklist (Part D), session keys can escalate to owner privileges by calling `add_or_update_session_key` (to create an unrestricted session) or `upgrade` (to replace the contract with a malicious one). The blocklist MUST be enforced even when the allowlist is empty.

### Safe Type Conversion Prevents DoS

Using `try_into().unwrap()` for the `felt252` → `u64` conversion of `valid_until` causes a panic on overflow, which can be exploited for denial-of-service. Implementations MUST use `try_into()` with pattern matching and return `0` (invalid) on conversion failure.

### `is_valid_signature` and Call Context

`is_valid_signature(hash, signature)` receives no call context. It cannot enforce selector whitelists. This is an inherent limitation of the ERC-1271 interface. Compliant accounts MUST enforce whitelists in `__validate__` and `execute_from_outside_v2` where calls are available. The `is_valid_signature` function SHOULD still validate session existence and expiration, and the transaction limit where the implementation's mechanism allows it to be checked without transaction context.

`is_valid_signature` MUST be read-only (`@ContractState`) and MUST NOT record transactions against the session's limit.

### No Calldata Restriction

This SNIP restricts which selectors a session key can call, but does NOT restrict the calldata passed to those selectors. A session key authorized to call `transfer` can transfer any amount to any address. This is a deliberate design choice:

- **Gas cost**: On-chain calldata validation (e.g., checking transfer amounts or recipient addresses) adds significant gas overhead per call, especially for variable-length calldata.
- **Composability**: Different contracts encode calldata differently. A generic calldata restriction mechanism would need to understand each target contract's ABI.
- **Practical mitigation**: Applications that need calldata-level control can use dedicated wrapper contracts that enforce amount limits or recipient whitelists, then whitelist only those wrapper contracts in the session.

The `ISessionSpendingPolicy` extension (Part H) provides optional per-token spending limits as a separate module, addressing the most common calldata restriction need (ERC-20 amount caps) without requiring a generic calldata parsing mechanism.

### Replay Protection

- **Transaction replay**: Prevented by Starknet's transaction nonce (in `__validate__` path) and SNIP-9 nonce (in `execute_from_outside_v2` path)
- **Cross-chain replay**: Prevented by including `chain_id` in the message hash
- **Account confusion**: Prevented by including the account address in the message hash

## Open Issues

1. **SNIP-9 nonce encoding**: accounts that use structured nonces (Part F.2) need paymasters to construct nonces in that structure. This SNIP should define either a standard encoding or a way for the paymaster or session signer to obtain the next valid nonce from the account.
2. **Sponsored transaction limit**: this revision applies `max_calls` to sponsored transactions as well as self-paid ones. On the self-paid path the limit also bounds fee exposure; on the sponsored path it only guards against runaway execution. Whether it should remain mandatory there is open.
3. **Bulk revocation**: an optional per-account session epoch, recorded with each session when it is added so that bumping it once revokes every session in one write, could be standardized alongside `revoke_session_key`.

## Reference Implementation

This revision introduces the fee cap, mechanism-agnostic transaction limits and the SNIP-5 extended-selector interface ID. The reference implementation and production class hash below predate it and implement the previous revision of the interface.

- **Session account contract**: [github.com/chipi-pay/sessions-smart-contract](https://github.com/chipi-pay/sessions-smart-contract)
- **Architecture**: Reusable `SessionKeyComponent` and optional `SpendingPolicyComponent` that any OZ-based account can embed via the `HasAccountOwner` trait pattern
- **Paymaster integration**: Tested against [AVNU's open-source paymaster](https://github.com/avnu-labs/paymaster). A development fork (`openzep` branch) was used during debugging; root causes were identified on the account side (see Motivation). Upstream PR [avnu-labs/paymaster#62](https://github.com/avnu-labs/paymaster/pull/62) was closed after confirming AVNU's paymaster works correctly with properly configured accounts.
- **Production class hash**: `0x0484bbd2404b3c7264bea271f7267d6d4004821ac7787a9eed7f472e79ef40d1` (v33)
- **Network**: Starknet Mainnet
- **Tests**: 65 passing (21 session validation + 22 audit regression + 3 SNIP-9 compatibility + 19 spending policy)
- **Auditor**: Nethermind AuditAgent (AI-powered, January 2026, February 2026, 4 scans, final: 0 findings)
- **Dependencies**: OpenZeppelin Cairo Contracts v3.0.0, Starknet 2.14.0

### Reference Interface Definitions

```cairo
#[derive(Drop, Copy, Serde)]
pub struct SessionData {
    pub valid_until: u64,
    pub max_calls: u32,
    pub max_fee_per_tx: u128,
    pub allowed_entrypoints_len: u32,
}

#[starknet::interface]
pub trait ISessionKeyManager<TContractState> {
    fn add_or_update_session_key(
        ref self: TContractState,
        session_key: felt252,
        valid_until: u64,
        max_calls: u32,
        max_fee_per_tx: u128,
        allowed_entrypoints: Array<felt252>
    );
    fn revoke_session_key(ref self: TContractState, session_key: felt252);
    fn get_session_data(self: @TContractState, session_key: felt252) -> SessionData;
}
```

### Reference Validation (Pseudocode)

```
function validate(calls, signature):
    if signature.length == 0:
        return VALIDATED if caller == self, else 0

    if signature.length == 4:
        [session_pubkey, r, s, valid_until_felt] = signature

        valid_until = safe_convert_to_u64(valid_until_felt)  // return 0 on overflow
        if block_timestamp > valid_until: return 0

        session = storage.read(session_pubkey)
        if session.valid_until == 0: return 0
        if session_limit_reached(session): return 0  // counter or nonce anchor

        if session.max_fee_per_tx == 0: return 0  // paymaster-only
        max_fee = sum(b.max_amount * b.max_price_per_unit for b in tx.resource_bounds)
                + tx.tip * l2_gas_bound(tx).max_amount  // u256, no overflow
        if max_fee > session.max_fee_per_tx: return 0

        for call in calls:
            if call.selector in ADMIN_BLOCKLIST: return 0

        if session.allowed_entrypoints_len == 0:
            for call in calls:
                if call.to == self_address: return 0  // self-call block
        else:
            for call in calls:
                if call.selector not in session.allowed_entrypoints: return 0

        msg_hash = compute_hash(calls, valid_until)
        if not verify_ecdsa(msg_hash, session_pubkey, r, s): return 0

        record_session_tx(session)  // at most one storage write, none if nonce-anchored
        return VALIDATED

    if signature.length == 2:
        return delegate_to_oz_validate()

    return 0
```

## Acknowledgments

This proposal builds on prior work across the Starknet ecosystem:

- **Bibliotheca DAO**: First session key implementation on Starknet (Arcade Accounts), pioneered by Chris Lexmond and Loaf, proving the concept before anyone else
- **Argent Labs / Ready**: Guardian model for session delegation, SNIP-9 co-authorship
- **Braavos**: Open-source session keys library, SNIP-9 co-authorship (delaaxe)
- **Cartridge**: Passkey infrastructure and gaming session validation (Controller, Flippy Flop at 127 TPS)
- **AVNU**: SNIP-29 paymaster standard, SNIP-9 co-authorship, open-source paymaster reference implementation
- **OpenZeppelin**: Cairo Contracts component architecture (`AccountComponent`, `SRC5Component`, `SRC9Component`) that makes session key extensions possible
- **Nethermind**: Four AuditAgent scans that identified critical vulnerabilities and shaped the admin blocklist, self-call block, and validation ordering. A human-led audit is a logical next step as the standard matures.
- **Medialane**: Tested every class hash from v25 through v33 on mainnet and provided consistent feedback on integration issues
- **Starknet Foundation**: Seed grant that funded development from day one, and ongoing guidance throughout the process. This work would not exist without their support.
- **EthSign**: Forum proposal for function call delegation (October 2024)
- **keep-starknet-strange / Omar Espejel**: Proposed `ISessionSpendingPolicy` ([Issue #5](https://github.com/chipi-pay/sessions-smart-contract/issues/5)), collaborated on spending policy design informed by starknet-agentic's working implementation
- **loothero**: Gas and fee-exposure review drawing on session accounts built and profiled on Argent and OpenZeppelin, which shaped the storage write budget, mechanism-agnostic transaction limits and the per-transaction fee cap

The fragmentation that motivates this standard is not a failure. It is the natural result of teams independently solving the same problem well. This SNIP aims to provide a coordination layer, not to replace any existing approach.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
