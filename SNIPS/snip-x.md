---
snip: TBD
title: Expose Keccak-f[1600] Permutation Syscall
description: Proposes a syscall to expose the raw Keccak-f[1600] permutation for flexible and gas-efficient cryptographic library development.
author: wh173-c47 (@wh173-c47)
discussions-to: https://community.starknet.io/t/snip-x-expose-keccak-f-1600-permutation-syscall/115770
status: Draft
type: Standards Track
category: Core
created: 2025-07-13
---

## Simple Summary

A new syscall, `keccak_f1600_process_block`, should be added to expose the raw `keccak-f[1600]` permutation on a given 1600-bit state.

## Abstract

This proposal details the addition of a low-level syscall that provides direct access to the `keccak-f[1600]` state permutation, an operation already implemented within the Starknet OS for the `keccak` builtin. Exposing this function directly enables efficient and gas-cheap implementations of various Keccak-family hash functions (e.g., SHAKE, cSHAKE) and is a critical enabler for advanced cryptographic primitives, such as certain Post-Quantum signature schemes. The proposed syscall mirrors the functionality of `sha256_process_block`, ensuring a consistent and developer-friendly interface for core cryptographic operations.

## Motivation

The Starknet OS contains a highly optimized implementation of the `keccak-f[1600]` permutation. However, developers cannot access this function directly, forcing any project requiring other Keccak-family functions—most notably the SHAKE extendable-output functions (XOFs)—to implement the entire permutation in pure Cairo. A pure Cairo implementation is significantly more expensive in terms of gas and computation, acting as a major barrier to the adoption of important cryptographic schemes. The key motivations are:

1.  **Enable Efficient PQC**: Several NIST-selected Post-Quantum Cryptography (PQC) signature schemes, such as Falcon, rely heavily on SHAKE. The high cost of a pure Cairo SHAKE implementation makes these PQC schemes prohibitively expensive. This syscall is a foundational step to bringing practical PQC to Starknet.
2.  **Support Modern Cryptography**: SHAKE128 and SHAKE256 are critical components in modern cryptographic standards. A native, gas-efficient implementation would make a wide range of protocols economically viable on Starknet.
3.  **API Consistency**: The Starknet syscall interface already provides `sha256_process_block`. Adding a corresponding `keccak_f1600_process_block` creates a more complete and consistent cryptographic toolkit.

## Rationale

The `keccak` builtin is a memory-mapped interface designed for the specific task of Keccak-256 hashing. It is unsuitable for constructing other hash functions that require direct manipulation of the state *between* permutations, such as the squeeze phase of SHAKE.

An alternative considered was to add distinct syscalls for each desired Keccak-family function. This approach was rejected because it is not modular and leads to significant API bloat. Every new cryptographic primitive requiring a Keccak variant would necessitate a new set of dedicated syscalls.

The proposed solution—a new, discrete syscall—is the most direct and minimal approach. It provides a single, well-defined function that developers can use as a "black box" permutation. This mirrors the design of the `sha256_process_block` syscall, establishing a clear pattern for low-level cryptographic primitives. It provides maximum flexibility to developers with minimal changes to the Starknet OS.

## Specification

A new syscall, keccak_f1600_process_block, will be added to the Starknet OS. To provide a developer-friendly interface that aligns with Cairo's memory model, the syscall will operate on a mutable struct reference rather than an array, which is cumbersome to modify.

**State Representation**: The 1600-bit Keccak state will be represented by a KeccakState struct, allowing for direct and efficient member access.

```rust
#[derive(Drop, Serde)]
pub struct KeccakState {
    s0: u64, s1: u64, s2: u64, s3: u64, s4: u64,
    s5: u64, s6: u64, s7: u64, s8: u64, s9: u64,
    s10: u64, s11: u64, s12: u64, s13: u64, s14: u64,
    s15: u64, s16: u64, s17: u64, s18: u64, s19: u64,
    s20: u64, s21: u64, s22: u64, s23: u64, s24: u64
}
```

**Interface**:
The syscall takes a mutable reference to a KeccakState struct and permutes its members in place.

```rust
// Cairo corelib representation
pub extern fn keccak_f1600_process_block_syscall(ref state: KeccakState) -> SyscallResult<()>;
```

**Inputs**:
*   `state`: A mutable reference to a KeccakState struct.

**Behavior**:
1. The syscall reads the 25 u64 members from the referenced KeccakState struct.
2. It applies the keccak-f[1600] permutation to this state.
3. It writes the 25 u64 values of the permuted state back into the members of the original state struct.
4. The syscall does not need to perform a length check, as the KeccakState struct has a fixed, compile-time-validated size.

## Backwards Compatibility

This proposal is fully backwards compatible. It introduces a new syscall and does not alter any existing functionality or state. Existing contracts will be unaffected.

## Test Cases

Test cases are mandatory for this SNIP as it affects consensus.

The core keccak-f[1600] permutation logic is already implemented and utilized by the existing keccak builtin. As such, it is presumed to be thoroughly tested against established cryptographic standards.

The testing effort for this SNIP should therefore focus on the integration and correctness of the new syscall interface, not on re-validating the underlying permutation. The required tests must verify the end-to-end data path:

1.  Data Marshalling: Verify that the syscall correctly reads the state from the KeccakState struct passed from a Cairo contract.
2.  Test vectors from the official Keccak specification and the FIPS 202 standard.
3.  Return State: Verify that the syscall correctly writes the permuted state back into the original KeccakState struct.

## Implementation

The Starknet OS already contains an optimized implementation of the `keccak-f[1600]` permutation. This proposal requires exposing that existing logic through a new syscall. The implementation should be analogous to the existing `sha256_process_block` syscall.

## Security Considerations

The security of the `keccak-f[1600]` permutation is well-established and standardized by NIST. This proposal does not modify the underlying cryptographic algorithm. The primary security consideration shifts to the application layer. Developers using this low-level primitive are responsible for correctly implementing the padding, domain separation, and state management required by the specific protocol they are building. Documentation must clearly state that this syscall is a raw primitive and must be used with care to avoid creating insecure implementations.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
