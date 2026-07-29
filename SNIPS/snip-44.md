---
snip: 44
title: STRK20 Viewing Key Derivation
description: Defines an interoperable account-leaf derivation for STRK20 viewing keys.
author: Adrien Lacombe (@adrienlacombe)
discussions-to: TBD
status: Draft
type: Standards Track
category: SRC
created: 2026-07-16
---

## Simple Summary

Derive the private STRK20 viewing key from the account's existing leaf private
key using a purpose-bound HMAC-SHA256 construction performed inside the wallet
or hardware device.

## Abstract

STRK20 wallets need a stable private viewing key to discover and decrypt a
user's private state. Wallets that derive this key differently cannot recover
the same private history after restoring the same Starknet account.

This SNIP defines one derivation profile, `account-leaf-v1`. The profile uses
the private scalar of the account's normal single-key signer as the secret key
to a context-bound HMAC-SHA256 derivation. The account private key never leaves
the software wallet, hardware wallet, or secure element that already holds it.

The construction supports both Stark-curve and secp256k1 account leaf keys. It
does not introduce a separate HD path and does not derive secret material from
a signature. The resulting viewing key is a canonical Stark-curve scalar
scoped to a chain, account, and STRK20 pool.

## Motivation

An STRK20 pool associates a Starknet account with the public x-coordinate of a
private viewing key. The private key is then used to discover and decrypt
private state. Once a public viewing key has been registered, losing the
corresponding private key can make historical private state unrecoverable.

A hardware wallet can apply a KDF to an account leaf private key internally
without exporting that key. HMAC-SHA256 is widely supported by hardware
wallets and secure elements and does not require a ZK-friendly hash for this
off-chain operation.

Using the existing account leaf avoids an additional viewing-key HD path and
the recovery assumptions that accompany it. It also avoids deterministic
signature compatibility requirements, signer-specific nonce behavior, and the
risk of exposing a signature from which the viewing key can be reconstructed.

Interoperability requires wallets to agree on the account leaf, context
serialization, HMAC input, and mapping into the Stark-curve scalar range.

## Scope

This SNIP covers the single private scalar currently called the STRK20
`viewing_key`. That scalar grants access to private STRK20 state and is also
used by the protocol in computations beyond passive incoming-note detection.
It MUST therefore be handled as highly sensitive secret material.

The unified full, incoming, outgoing, and detection key containers described
by [SNIP-43](./snip-43.md) are separate concepts. This SNIP neither defines
those containers nor changes their intended key separation.

This profile applies to accounts controlled by one canonical Stark-curve or
secp256k1 leaf private key. Selecting a key for multisignature, threshold,
passkey, social-recovery, or other account schemes with no single canonical
leaf is outside scope.

This SNIP does not define a dapp-facing wallet RPC method and does not change
STRK20 contracts.

Random viewing-key generation, backup, export, import, and portability for
accounts that cannot use this deterministic profile are out of scope. They
should be addressed by a separate SNIP.

## Specification

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT,
RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

### Definitions

- **Account**: the Starknet account contract address whose STRK20 state is
  being accessed.
- **Account leaf private key**: the private scalar used by the account's
  canonical single-key signer, after all normal wallet derivation and any
  curve-specific grinding.
- **Account key scheme**: either Stark-curve or secp256k1 for this revision.
- **Pool**: the STRK20 privacy-pool contract for which the key is used.
- **Registered public key**: the public x-coordinate stored by the pool for an
  account.
- **Wallet boundary**: the software wallet, hardware wallet, secure element,
  or combination of those components trusted to handle the viewing key.

### Assumed pool interface

STRK20 does not yet have a SNIP or frozen public specification; the protocol
is currently described informally in the
[official announcement](https://www.starknet.io/blog/make-all-erc-20-tokens-private-with-strk20/).
This SNIP therefore states the pool behavior it relies on.

For each account address, the pool stores at most one registered public
viewing key: the x-coordinate of `k * G` for that account's private viewing key
`k`. The registered key is readable on-chain, is immutable for the current
pool generation, and is the value that recovery matches against.

If a published STRK20 specification contradicts any of these assumptions,
that specification prevails and this SNIP requires revision. A normative
STRK20 reference MUST be added before this SNIP advances to Review.

### Stark-curve scalar range

Let `n` be the Stark-curve order and `H` its lower-half boundary:

```text
n = 0x0800000000000010ffffffffffffffffb781126dcae7b2321e66a241adc64d2f
H = floor(n / 2)
```

An STRK20 private viewing key `k` is canonical when:

```text
1 <= k < H
```

The strict upper bound is intentional. Implementations MUST NOT interpret the
range as inclusive.

The corresponding public viewing key is the x-coordinate of `k * G`, where
`G` is the Stark-curve generator. The account key scheme does not change the
curve used for the STRK20 viewing key.

### Account leaf private key

The input secret `d` MUST be the exact private scalar used by the account's
normal single-key signer:

```text
1 <= d < q
```

Here `q` is the order of the account signer's curve. For a Stark-curve account,
`q = n`. For a secp256k1 account:

```text
q = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141
```

The wallet MUST serialize `d` as exactly 32 bytes in unsigned big-endian order:

```text
account_leaf_private_key_be32 = I2OSP(d, 32)
```

`I2OSP(value, length)` is the unsigned big-endian integer encoding from
[RFC 8017](https://www.rfc-editor.org/rfc/rfc8017) and MUST fail if `value`
does not fit in `length` bytes.

The profile starts after the wallet's normal account-key derivation. A
hierarchical wallet or device MUST select the same path and curve-specific
processing used to obtain the account signer. It MUST NOT derive a new child
path for STRK20. It MUST NOT use a session, delegated, or ephemeral key in
place of the account's canonical leaf.

The account key scheme is used to locate and validate the leaf key but is not
included in the KDF input. The same 32-byte leaf scalar and derivation context
therefore produce the same viewing key for Stark-curve and secp256k1 accounts.
This behavior is intentional.

### Derivation context

Every derivation MUST use the following context:

```text
DerivationContext {
    version:         1,
    chain_id:        felt252,
    account_address: felt252,
    pool_address:    felt252,
    key_index:       u128
}
```

`key_index` MUST be `0` for the current STRK20 pool generation. It is reserved
for a future pool generation that supports explicit key rotation. Wallets MUST
NOT increment it locally for a pool whose registered public key is immutable.

The context is serialized as fixed-width bytes:

```text
context_bytes =
    I2OSP(version, 4) ||
    I2OSP(chain_id, 32) ||
    I2OSP(account_address, 32) ||
    I2OSP(pool_address, 32) ||
    I2OSP(key_index, 16)
```

The serialized context is exactly 116 bytes. Implementations MUST NOT use
variable-width integer encodings or omit leading zero bytes.

### `account-leaf-v1` derivation

The profile identifier is the ASCII string `account-leaf-v1`. The HMAC domain
separator is the exact, case-sensitive ASCII string
`STRK20_ACCOUNT_LEAF_V1`.

The profile uses HMAC-SHA256 as specified by
[RFC 2104](https://www.rfc-editor.org/rfc/rfc2104) and
[RFC 6234](https://www.rfc-editor.org/rfc/rfc6234):

```text
limit = 2^256 - (2^256 mod n)

function derive_viewing_key(account_leaf_private_key_be32, context_bytes):
    require length(account_leaf_private_key_be32) == 32
    require length(context_bytes) == 116

    for counter from 0 to 2^32 - 1:
        data =
            ASCII("STRK20_ACCOUNT_LEAF_V1") ||
            context_bytes ||
            I2OSP(counter, 4)

        digest = HMAC-SHA256(
            key = account_leaf_private_key_be32,
            data = data,
        )
        candidate = OS2IP(digest)

        if candidate >= limit:
            continue

        x = candidate mod n
        if x == 0:
            continue

        k = min(x, n - x)
        if 1 <= k < H:
            return k

    fail
```

`OS2IP` is the unsigned big-endian decoding from RFC 8017. Rejecting values at
or above `limit` before reducing modulo `n` removes modulo bias. A conforming
implementation MUST perform that rejection rather than applying an
unconditional reduction.

Folding `x` and `n - x` to the same lower-half scalar gives a unique scalar
for each public x-coordinate. The retry also handles the negligible cases
where the reduced candidate is zero or folds to exactly `H`.

Any change to the account-leaf definition, domain separator, serialization,
HMAC construction, context, or scalar mapping requires a new profile
identifier and domain separator.

### Hardware-wallet integration

A hardware wallet or secure element MUST perform the profile without exporting
the account leaf private key. A dedicated command SHOULD:

1. accept the normal account-key selector, such as its derivation path and key
   scheme;
2. accept the complete derivation context;
3. derive or load the normal account leaf private key internally;
4. execute `account-leaf-v1` internally;
5. request user confirmation identifying the account, chain, and pool; and
6. return only the viewing key, encoded as exactly 32 unsigned big-endian
   bytes, to the companion wallet.

The account-key selector and transport encoding are device-specific and do not
alter the KDF. The companion wallet MUST select the same account leaf used by
the account and SHOULD verify its public key against the account's recorded
owner public key before requesting derivation.

The command MUST use a fixed domain separator and fixed input structure. It
MUST NOT expose a general HMAC oracle keyed by the account private key and MUST
NOT accept a caller-selected domain separator.

The current
[Ledger Starknet app](https://github.com/LedgerHQ/app-starknet/) version
`2.4.1` at
[commit c46bfab](https://github.com/LedgerHQ/app-starknet/tree/c46bfabd3f5ba4f403b8d885f4801aaf0ab23e9c)
does not expose such a command. Its documented
[APDU interface](https://github.com/LedgerHQ/app-starknet/blob/c46bfabd3f5ba4f403b8d885f4801aaf0ab23e9c/docs/apdu.md)
returns public keys and signatures, not a purpose-bound KDF output. It
therefore requires a dedicated application command before it can implement
this profile. Its existing raw-hash signing command MUST NOT be used as a
substitute for `account-leaf-v1`.

### Persistence

For every account and pool, the wallet SHOULD persist at least:

```text
{
    profile_id: "account-leaf-v1",
    version: 1,
    chain_id,
    account_address,
    pool_address,
    key_index,
    account_key_scheme,
    account_key_fingerprint,
    account_derivation_path,
    registered_public_key
}
```

`account_key_fingerprint` is implementation-defined and MUST be derived only
from public information, such as a hash of the account signer's public key. It
MUST NOT be derived from the private key or viewing key.

`account_derivation_path` is REQUIRED when the account leaf is hierarchical
and is omitted otherwise. Neither the key scheme nor path is part of the KDF;
they help the wallet locate the same account leaf.

This metadata MUST be kept in wallet-private storage. Publishing it on-chain
is NOT RECOMMENDED because it may fingerprint wallet software or custody
arrangements and is not required for derivation.

Once a pool has a registered public viewing key, that key is authoritative. A
wallet MUST NOT register a different key merely because its account signer or
local metadata changed.

### Recovery

To recover an existing STRK20 account, a wallet:

1. reads the registered public viewing key for `account_address` from the
   selected pool;
2. recovers or selects the account's original leaf private key;
3. derives `account-leaf-v1` with the exact chain, account, pool, and key
   index;
4. computes the public x-coordinate of the candidate viewing key; and
5. accepts the candidate only if it exactly equals the registered public key.

Failure to find a match MUST NOT cause the wallet to register a replacement,
discard local private history, or report a zero balance as authoritative. The
wallet SHOULD explain that the original account leaf key or separately
retained viewing key is required.

Backup, import, and recovery without the original account leaf are outside the
scope of this SNIP.

### Account-key rotation

The viewing key is bound to the account leaf private key. Replacing that leaf
produces a different viewing key even when the account contract address is
unchanged.

Before account-key rotation, signer replacement, or account migration, a
wallet MUST retain the existing viewing key in secure storage. It MUST NOT
silently derive and register a replacement using the new account leaf.

If a future STRK20 pool supports viewing-key rotation, that pool requires a
separate migration specification covering access to historical private state.

### Wallet and dapp boundary

STRK20 dapps request private operations from a compatible wallet. They do not
derive or receive viewing keys.

A wallet implementation:

- MUST keep the account leaf private key inside its existing secret boundary;
- MUST keep the viewing key inside the wallet boundary;
- MUST NOT expose either secret through a public dapp RPC;
- MUST NOT allow a dapp to choose the account-key selector, domain separator,
  derivation context, or KDF counter; and
- MAY expose a non-secret capability indicating support for
  `account-leaf-v1`.

## Rationale

### Why derive from the account leaf?

The account leaf is already the secret shared by software and hardware wallets
that control the same single-key account. Using it avoids an additional HD
path that a standalone leaf-key import cannot reproduce.

HMAC-SHA256 acts as a purpose-bound pseudorandom function. Revealing a derived
viewing key does not reveal the account private key under the security
assumptions of HMAC-SHA256. A separate viewing-key child is therefore not
required to protect the account key.

This choice deliberately couples viewing-key recovery to the original account
leaf. The account-key rotation requirements make that tradeoff explicit.

### Why not derive from a signature?

A signature-derived construction depends on a particular deterministic
signature algorithm, nonce conversion, canonicalization rule, and signer
interface. Equivalent account keys can otherwise produce different viewing
keys across wallet implementations.

A disclosed derivation signature also discloses the derived viewing key. A
dedicated KDF command has a smaller interface and does not create a reusable
signature or require blind signing.

### Why HMAC-SHA256?

Viewing-key derivation is off-chain and does not need a ZK-friendly hash.
HMAC-SHA256 has a standardized byte-oriented interface and is commonly
available in hardware wallets and secure elements.

The fixed domain separator prevents cross-protocol reuse of the account key as
an HMAC key. The complete context prevents accidental viewing-key reuse across
accounts, chains, or pools.

### Why omit the account key scheme from the KDF?

The leaf scalar is serialized identically for both supported account key
schemes. Omitting the curve identifier makes the profile depend only on the
actual secret scalar and STRK20 context, not wallet-specific key metadata.

This also avoids changing the viewing key if the same scalar is represented by
a different supported signer implementation. The key scheme remains local
metadata needed to validate and locate the leaf.

### Why use the lower half of the Stark-curve order?

STRK20 accepts canonical private keys below half the Stark-curve order. The
points `k * G` and `(n - k) * G` share the same x-coordinate, so lower-half
folding preserves public-key matching while providing one canonical private
representation.

## Test Cases

The following vectors use this common context:

```text
version         = 1
chain_id        = 0x534e5f5345504f4c4941  ("SN_SEPOLIA")
account_address = 0x1234
pool_address    = 0x5678
key_index       = 0

version_be4 =
  0x00000001
chain_id_be32 =
  0x00000000000000000000000000000000000000000000534e5f5345504f4c4941
account_address_be32 =
  0x0000000000000000000000000000000000000000000000000000000000001234
pool_address_be32 =
  0x0000000000000000000000000000000000000000000000000000000000005678
key_index_be16 =
  0x00000000000000000000000000000000

domain_separator_ascii = "STRK20_ACCOUNT_LEAF_V1"
domain_separator_hex =
  0x5354524b32305f4143434f554e545f4c4541465f5631
```

All values with a fixed byte length include leading zero bytes as required.

### Primary vector

The same vector applies to a Stark-curve or secp256k1 account leaf whose
private scalar is `1`.

```text
account_leaf_private_key =
  0x0000000000000000000000000000000000000000000000000000000000000001
kdf_counter = 0
hmac_sha256_output =
  0x3ed14752a332877b8097f5bc9b24c89689a29a5d10266060345df8685c8efdad
reduced_scalar =
  0x06d14752a33287048097f5bc9b24c898851b195c83d081015f8f889c9c22e164
viewing_key =
  0x012eb8ad5ccd790c7f680a4364db37673265f91147173130bed719a511a36bcb
public_key_x =
  0x0435ada564d3bb1c5ac7caac8aa5fdc7dfa5de1aea83ff660099ea619a08c7a5
```

### Rejection-sampling vector

This vector verifies that an implementation rejects a digest at or above
`limit` and increments the counter instead of reducing the first digest.

```text
account_leaf_private_key =
  0x0000000000000000000000000000000000000000000000000000000000000005
counter_0_hmac_sha256_output =
  0xfd90c57fe6b814ea57268d16153d1c86312344f3e5e77ec22630ad48e6e9b96c
counter_0_result = rejected
kdf_counter = 1
hmac_sha256_output =
  0xae52983668004e406e69bfc4a7acfa9765c032128ee6705566e0eb44bde2061a
reduced_scalar =
  0x0652983668004cdb6e69bfc4a7acfa9d5829af10e9e4d238e8759be17c9db13f
viewing_key =
  0x01ad67c997ffb3359196403b585305625f57635ce102dff935f1066031289bf0
public_key_x =
  0x04366caa68f40c9467a805b2646bcca3ac60c320c165564f69bc2de4b668e7ed
```

Negative tests MUST also verify rejection of:

- an account leaf scalar outside its signing curve's valid range;
- variable-width or little-endian encodings;
- a context of any length other than 116 bytes;
- a caller-selected domain separator or KDF counter;
- a reduced scalar equal to zero or folding to `H`; and
- a candidate public key that does not equal the registered public key.

## Implementation

Wallet implementations SHOULD separate the following internal operations:

```text
select_account_leaf(account) -> secret scalar
derive_viewing_key(account_leaf, context) -> canonical Stark scalar
derive_public_x(viewing_key) -> felt252
match_registered_key(candidate_public_x, pool_public_x) -> boolean
```

Account leaf material SHOULD use non-copying secret containers where practical
and SHOULD be zeroized after use. A viewing-key provider supplied to STRK20
proving and discovery code SHOULD return the already selected key rather than
allow the dapp request to choose derivation inputs.

Implementations MUST add positive and negative tests for:

- account leaf selection and 32-byte serialization for each supported key
  scheme;
- fixed-width context serialization;
- exact domain-separator bytes;
- HMAC-SHA256 output;
- rejection before modulo reduction;
- lower-half folding and retry;
- public-key matching;
- account-key rotation behavior; and
- rejection of dapp-controlled derivation inputs.

The vectors above MUST be reproduced by at least two independent
implementations before this SNIP advances to Review. A hardware-wallet
implementation MUST additionally reproduce equivalent device-loadable vectors
using a vendor-supported test seed.

## Backwards Compatibility

This SNIP requires no contract, consensus, transaction, or public wallet-RPC
change. No deployed STRK20 wallet derivation algorithm has been identified
that must be frozen as a legacy profile.

Existing registered viewing keys remain authoritative. Handling a key created
by an earlier demonstration or an algorithm outside this SNIP is out of scope.
Wallets MUST NOT replace such a key automatically.

Existing hardware-wallet applications that expose only public-key and signing
commands are not automatically compatible. They require a dedicated internal
KDF command or another secure implementation of `account-leaf-v1`.

## Security Considerations

The viewing key reveals private STRK20 history and can participate in protocol
computations. It MUST NOT be treated as a harmless read-only API token.

The security of the derived key cannot exceed the entropy of the account leaf
private key. Wallets MUST generate account keys with cryptographically secure
entropy or derive them from an appropriately protected seed.

HMAC-SHA256 is used as a fixed, purpose-bound PRF. Implementations MUST NOT
expose a generic HMAC interface keyed by the account leaf, permit arbitrary
domain separators, or make the private scalar available to the companion
wallet.

A compromised companion wallet that can invoke an approved hardware
derivation command may obtain the viewing key. Hardware wallets SHOULD display
that the operation grants access to private STRK20 history and SHOULD identify
the account, chain, and pool before confirmation.

The KDF binds the full context. An incorrect chain, account, pool, or key index
produces a different viewing key. Wallets MUST validate the active context and
MUST compare the derived public x-coordinate with the on-chain registered key
during recovery.

Changing the account leaf changes the viewing key. Wallets MUST retain the
existing viewing key before signer rotation or account migration. A new signer
must not be interpreted as authority to replace an immutable registered
viewing key.

Implementations MUST use constant-time cryptographic libraries where
available, minimize copies of the account leaf and viewing key, and zeroize
temporary secret material.

Private metadata can reveal the account key scheme, derivation path, or custody
arrangement. Wallets SHOULD authenticate that metadata and MUST NOT publish it
unless a later standard defines a necessary public use.

## History

- 2026-07-16: Initial draft.
- 2026-07-17: Define HD and deterministic-signature derivation candidates.
- 2026-07-28: Align the signature candidate with the Ledger Starknet app and
  replace the common Poseidon KDF with HMAC-SHA256.
- 2026-07-28: Confirm that no deployed legacy derivation profile is required.
- 2026-07-28: Replace the two-profile design with the single
  `account-leaf-v1` profile; remove the dedicated viewing-key HD path and
  deterministic-signature derivation.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
