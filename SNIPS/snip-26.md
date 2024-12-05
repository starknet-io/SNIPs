---
snip: 26
title: Access Control for Function Call Delegation
description: This SNIP aims to introduce access control standards to allow linking wallets together and performing actions on behalf of another wallet.
author: Jordan Bettencourt <jordan@ethsign.xyz>, Jack Xu <jxu@ethsign.xyz>
discussions-to: https://community.starknet.io/t/snip-access-control-for-function-call-delegation/114821
status: Draft
type: Standards Track
category: Core
created: 2024-10-02
---

# Abstract

SNIP-26 aims to introduce access control standards to allow linking wallets together, permitting an external wallet to perform specified smart contract actions on behalf of a primary wallet, with varying levels of restriction.

# Motivation

When interacting with a wide variety of smart contracts, most users do not independently review smart contract code and can inadvertently approve access to valuables in their primary wallet. In addition, there are instances where a simple mistake occurs and tokens could be spent, let alone cases in which smart contracts maliciously intend to deceive a user. Without consistently reviewing third-party code and fully understanding what actions are occurring within each transaction, the only option to safeguard valuables in a primary wallet is to use an external, relatively empty account for smart contract interaction. Users can use this external delegate wallet to protect their privacy and limit exposure, safeguarding valuables in their primary vault wallet.

# Specification

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

# Interfaces

```rust
use starknet::ContractAddress;
use starknet_function_permit::permit_struct::{Permit, PermitSignature};

#[starknet::interface]
pub trait IFunctionPermit<TContractState> {
    fn get_permit_hash(self: @TContractState, permit: Permit) -> felt252;

    fn is_valid_permit(
        self: @TContractState,
        src5_selector: felt252,
        params: Span<felt252>,
        operator: ContractAddress,
        permit_data_index: u32,
        permit: Permit,
        permit_signature: PermitSignature,
    ) -> felt252;
}

#[starknet::interface]
pub trait ISRC6<TState> {
    fn is_valid_signature(self: @TState, hash: felt252, signature: Array<felt252>) -> felt252;
}

pub mod FunctionPermitConstants {
    pub const SRC_PERMIT_MAGIC_VALUE: felt252 = selector!("SRC_PERMIT_MAGIC_VALUE");
    pub const SRC_PERMIT_DELEGATE_ALL_FUNCTIONS: felt252 = selector!("SRC_PERMIT_DELEGATE_ALL_FUNCTIONS");
    pub const SRC_PERMIT_DELEGATE_ALL_PARAMS: felt252 = selector!("SRC_PERMIT_DELEGATE_ALL_PARAMS");
    pub const PERMIT_VALIDATION_ERROR: felt252 = 'PERMIT_VALIDATION_ERROR';
    pub const PERMIT_SIGNATURE_ERROR: felt252 = 'PERMIT_SIGNATURE_ERROR';
}
```

```rust
use starknet::{ContractAddress};
use starknet_function_permit::permit_sample_impl::{HashFelt252Span, HashPermitDataSpan};

#[derive(Drop, Serde, Copy, Hash)]
pub struct Permit {
    pub src_permit_magic_value: felt252,
    pub nonce: felt252,
    pub data: Span<PermitData>,
}

#[derive(Drop, Serde, Copy, Hash)]
pub struct PermitData {
    pub src5_selector: felt252,
    pub params: Span<felt252>,
    pub operator: ContractAddress,
    pub valid_from: u64,
    pub valid_until: u64,
}

#[derive(Drop, Serde)]
pub struct PermitSignature {
    pub from: ContractAddress,
    pub signature: Array<felt252>,
}
```

# Behavior Specification

## A SNIP-26-compliant `Permit` MUST contain:

- `src_permit_magic_value` for validation.
- `nonce` for distinguishing between permit calls.
- `data` containing all `PermitData` entries.
- A valid hash implementation (see implementation for example using poseidon).

## A SNIP-26-compliant `PermitData` MUST contain:

- `src5_selector` to restrict the permit to a specific function call, or the `SRC_PERMIT_DELEGATE_ALL_FUNCTIONS` wildcard to permit all functions within a contract.
- `params` to restrict the function params that a permitted wallet can submit in a function call, or the `SRC_PERMIT_DELEGATE_ALL_PARAMS` wildcard to permit usage of any params in a function call.
- `operator` to restrict the permitted wallet address.
- `valid_from` to restrict a permit’s start timestamp.
- `valid_until` to restrict a permit’s end timestamp.
- A valid hash implementation (see implementation for example).

## A SNIP-26-compliant contract MUST:

- Implement `get_permit_hash` as defined.
- Implement `is_valid_permit` as defined.

### `is_valid_permit` should return `SRC_PERMIT_MAGIC_VALUE` if a `Permit` at the provided `permit_data_index` meets the following criteria:

Permit-specific criteria:

- The current block timestamp falls between `permit.data.valid_from` and `permit.data.valid_until`.
- `operator` strictly equals `permit.data.operator`.
- `src5_selector` strictly equals `permit.data.src5_selector` OR `permit.data.src5_selector` strictly equals the `SRC_PERMIT_DELEGATE_ALL_FUNCTIONS` wildcard constant.
- `params` strictly equals `permit.data.params` OR `permit.data.params` is of length 1 AND contains a value strictly equal to the `SRC_PERMIT_DELEGATE_ALL_PARAMS` wildcard constant.
- `permit.src_permit_magic_value` strictly equals the `SRC_PERMIT_MAGIC_VALUE` constant.

`is_valid_permit` should throw `PERMIT_VALIDATION_ERROR` if any of the above criteria is not met.

Signature-specific criteria:

- `permit_signature` is a valid signature of the generated hash of the provided `permit`.

`is_valid_permit` should throw `PERMIT_SIGNATURE_ERROR` if the above criterion is not met.

# Rationale

The requirements for validating the permit are designed to ensure secure and flexible function call delegation. Here's the rationale behind each requirement:

- **Timestamp validation:** Ensures permits have a limited lifespan, reducing the risk of unauthorized use if a permit is compromised.
- **Strict operator matching:** Prevents unauthorized parties from using the permit, ensuring only the designated operator can execute the delegated function.
- **Function selector matching:** Allows for precise control over which functions can be delegated, with the option to delegate all functions using a wildcard.
- **Parameter matching:** Enables fine-grained control over the exact parameters that can be used in delegated calls, with a wildcard option for flexibility.
- **Magic value validation:** Acts as a safeguard against accidental misuse and ensures that only properly formatted permits are processed.
- **Signature verification:** Confirms that the permit was indeed created by the authorizing wallet, preventing forgery and unauthorized delegations.

These requirements strike a balance between security and flexibility, allowing users to delegate specific functions with precise control while maintaining the integrity of the delegation process.

# Reference Implementation

```rust
use core::{hash::{Hash, HashStateTrait, HashStateExTrait}, poseidon::{poseidon_hash_span}};
use starknet_function_permit::{permit_struct::{Permit, PermitData}};

pub impl HashFelt252Span<S, +HashStateTrait<S>, +Drop<S>> of Hash<Span<felt252>, S> {
    fn update_state(state: S, value: Span<felt252>) -> S {
        state.update_with(poseidon_hash_span(value))
    }
}

pub impl HashPermitDataSpan<S, +HashStateTrait<S>, +Drop<S>> of Hash<Span<PermitData>, S> {
    fn update_state(state: S, value: Span<PermitData>) -> S {
        let value_len = value.len();
        if value_len == 0 {
            return state;
        }
        let mut i = 1;
        let mut state_new = state.update_with(*value.at(0));
        loop {
            if i == value_len {
                break;
            }
            state_new = state_new.update_with(*value.at(i));
        };
        state_new
    }
}

#[starknet::contract]
mod FunctionPermit {
    use starknet::{ContractAddress, get_block_timestamp};
    use core::{poseidon::{PoseidonTrait}};
    use starknet_function_permit::{
        permit_interface::{
            FunctionPermitConstants, IFunctionPermit, ISRC6Dispatcher, ISRC6DispatcherTrait
        },
        permit_struct::{PermitSignature}
    };
    use super::{HashStateTrait, HashStateExTrait, Permit};

    #[storage]
    struct Storage {}

    #[abi(embed_v0)]
    impl FunctionPermitImpl of IFunctionPermit<ContractState> {
        fn get_permit_hash(self: @ContractState, permit: Permit) -> felt252 {
            PoseidonTrait::new().update_with(permit).finalize()
        }

        fn is_valid_permit(
            self: @ContractState,
            src5_selector: felt252,
            params: Span<felt252>,
            operator: ContractAddress,
            permit_data_index: u32,
            permit: Permit,
            permit_signature: PermitSignature,
        ) -> felt252 {
            let current_timestamp = get_block_timestamp();
            let data = *permit.data.at(permit_data_index);
            assert(
                FunctionPermitConstants::SRC_PERMIT_MAGIC_VALUE == permit.src_permit_magic_value
                    && (data.src5_selector == src5_selector
                        || data
                            .src5_selector == FunctionPermitConstants::SRC_PERMIT_DELEGATE_ALL_FUNCTIONS)
                    && (data.params == params
                        || (data.params.len() == 1
                            && *data
                                .params
                                .at(0) == FunctionPermitConstants::SRC_PERMIT_DELEGATE_ALL_PARAMS))
                    && data.operator == operator
                    && data.valid_from <= current_timestamp
                    && data.valid_until > current_timestamp,
                FunctionPermitConstants::PERMIT_VALIDATION_ERROR
            );
            let permit_hash = self.get_permit_hash(permit);
            let from_account = ISRC6Dispatcher { contract_address: permit_signature.from };
            assert(
                from_account.is_valid_signature(permit_hash, permit_signature.signature) == 'VALID',
                FunctionPermitConstants::PERMIT_SIGNATURE_ERROR
            );
            FunctionPermitConstants::SRC_PERMIT_MAGIC_VALUE
        }
    }
}
```

# Security Considerations

## Offchain Permit Revocations

Since permit digital signatures are generated off-chain with no on-chain state-keeping, permits cannot be revoked once signed. Signers should be aware of this and utilize `valid_from` and `valid_until` to restrict their permit use.