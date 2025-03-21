---
snip: 64
title: Custom Errors for Fungible and Non-Fungible Tokens
author: Jack Boyuan Xu <jxu@ethsign.xyz>
discussions-to: $DISCUSSION_LINK
status: Review
type: Standards Track
category: SRC
created: 2023-12-13
requires: SNIP-2, SNIP-3
---

## Abstract

With the native ability to return complex error messages in Cairo v1, this SNIP defines a standard set of structured and decodable errors designed to give the most relevant and concise revert information for [SNIP-2](snip-2.md) and [SNIP-3](snip-3.md) tokens.

## Motivation

Vague error messages are the bane of every developer's existence, yet this is precisely what we currently have when it comes to tokens. For example, if a user tried to transfer more [SNIP-2](snip-2.md) tokens than their balance allows with the current OpenZeppelin implementation, they would receive the failure reason `u256_sub Overflow`. To the average user and even developers, this is extremely ambiguous and unhelpful.

Standardized errors allow everyone to expect more concise, helpful, and consistent error messages across testing and production environments.

## Specification

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

The following errors are generated by converting all values into a `felt252`, appending them to an array, and passing it into a `panic` call.

ERC-20 and ERC-721 are used instead of SNIP-2 and SNIP-3 due to their prevalence within the Starknet ecosystem.

### SNIP-2 / ERC-20 Errors

- #### `['ERC20InsufficientBalance', <sender: ContractAddress>, <balance: u256>, <needed: u256>]`

  - Used in transfers.
  - Indicates the sender has insufficient balance for the transfer.
  - _`balance` MUST be less than `needed`._

- #### `['ERC20InvalidSender', <sender: ContractAddress>]`

  - Used in transfers.
  - Indicates a prohibited `sender`.
  - _RECOMMENDED for prohibited transfers from the zero or any blacklisted address._
  - _MUST NOT be used for approvals_
  - _MUST NOT be used for balance or allowance requirements._

- #### `['ERC20InvalidReceiver', <receiver: ContractAddress>]`

  - Used in transfers.
  - Indicates a prohibited `receiver`.
  - _RECOMMENDED for prohibited transfers to the zero or any blacklisted address._
  - _MUST NOT be used for approvals._

- #### `['ERC20InsufficientAllowance', <spender: ContractAddress>, <allowance: u256>, <needed: u256>]`

  - Used in transfers.
  - Indicates the spender has insufficient allowance for the transfer.
  - _`allowance` MUST be less than `needed`._

- #### `['ERC20InvalidApprover', <approver: ContractAddress>]`

  - Used in approvals.
  - Indicates a prohibited `approver`.
  - _RECOMMENDED for prohibited approvals from the zero or any blacklisted address._
  - _MUST NOT be used for transfers._

- #### `['ERC20InvalidSpender', <spender: ContractAddress>]`
  - Used in approvals.
  - Indicates a prohibited `spender`.
  - _RECOMMENDED for prohibited approvals to the zero or any blacklisted address._
  - _MUST NOT be used for transfers._

### SNIP-3 / ERC-721 Errors

- #### `['ERC721InvalidOwner', <owner: ContractAddress>]`

  - Used in balance queries.
  - Indicates a prohibited `owner`.
  - _RECOMMENDED for addresses that should not own tokens, such as the zero or any blacklisted address._
  - _MUST NOT be used for transfers._

- #### `['ERC721NonexistentToken', <token_id: u256>]`

  - Indicates a `token_id` that has not been minted or does not exist.
  - _`token_id` MUST be non-minted or burned._

- #### `['ERC721IncorrectOwner', <sender: ContractAddress>, <token_id: u256>, <owner: ContractAddress>]`

  - Used in transfers.
  - Indicates a mismatch between the provided `owner` and the actual `owner` of `token_id`.
  - _`sender` MUST NOT be `owner`._
  - _MUST NOT be used for approvals._

- #### `['ERC721InvalidSender', <sender: ContractAddress>]`

  - Used in transfers.
  - Indicates a prohibited `sender`.
  - _RECOMMENDED for addresses that should not transfer tokens, such as the zero or any blacklisted address._
  - _MUST NOT be used in approvals._
  - _MUST NOT be used for ownership or approval requirements._

- #### `['ERC721InvalidReceiver', <receiver: ContractAddress>]`

  - Used in transfers.
  - Indicates a prohibited `receiver`.
  - _RECOMMENDED for addresses that should not receive tokens, such as the zero or any blacklisted address._
  - _MUST NOT be used for approvals._

- #### `['ERC721InsufficientApproval', <operator: ContractAddress>, <token_id: u256>]`

  - Used in transfers.
  - _`isApprovedForAll(owner, operator)` MUST be false for the `token_id` owner and `operator`._
  - _`getApproved(token_id)` MUST NOT be `operator`._

- #### `['ERC721InvalidApprover', <approver: ContractAddress>]`

  - Used in approvals.
  - Indicated a prohibited `approver`.
  - _RECOMMENDED for addresses that should not approve tokens, such as the zero or any blacklisted address._

- #### `['ERC721InvalidOperator', <operator: ContractAddress>]`
  - Used in approvals.
  - Indicates a prohibited `operator`.
  - _RECOMMENDED for addresses that should not be the operator, such as the zero or blacklisted address._
  - _The `operator` MUST NOT be the caller._
  - _MUST NOT be used for transfers._

## Implementation

This component implementation can be used directly inside your tokens. See the full repository [here](https://github.com/EthSign/starknet-common-error-standards) with minimal [SNIP-2](snip-2.md)/ERC-20 and [SNIP-3](snip-3.md)/ERC-721 token implementations.

### SNIP-2 / ERC-20

```cairo
use starknet::ContractAddress;
#[starknet::interface]
trait IERC20Errors<TContractState> {
    fn throw_insufficient_balance(self: @TContractState, sender: ContractAddress, balance: u256, needed: u256);
    fn throw_invalid_sender(self: @TContractState, sender: ContractAddress);
    fn throw_invalid_receiver(self: @TContractState, receiver: ContractAddress);
    fn throw_insufficient_allowance(self: @TContractState, spender: ContractAddress, allowance: u256, needed: u256);
    fn throw_invalid_approver(self: @TContractState, approver: ContractAddress);
    fn throw_invalid_spender(self: @TContractState, spender: ContractAddress);
}
```

```cairo
#[starknet::component]
mod ERC20ErrorsComponent {
    use starknet::ContractAddress;
    use common_error_standards::components::ierc20_errors::IERC20Errors;

    #[storage]
    struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {}

    #[embeddable_as(ERC20ErrorsImpl)]
    impl ERC20Errors<TContractState, +HasComponent<TContractState>> of IERC20Errors<ComponentState<TContractState>> {
        fn throw_insufficient_balance(self: @ComponentState<TContractState>, sender: ContractAddress, balance: u256, needed: u256) {
            let data: Array<felt252> = array![
                'ERC20InsufficientBalance',
                sender.into(),
                balance.try_into().unwrap(),
                needed.try_into().unwrap()
            ];
            panic(data);
        }

        fn throw_invalid_sender(self: @ComponentState<TContractState>, sender: ContractAddress) {
            let data: Array<felt252> = array![
                'ERC20InvalidSender',
                sender.into(),
            ];
            panic(data);
        }

        fn throw_invalid_receiver(self: @ComponentState<TContractState>, receiver: ContractAddress) {
            let data: Array<felt252> = array![
                'ERC20InvalidReceiver',
                receiver.into(),
            ];
            panic(data);
        }

        fn throw_insufficient_allowance(self: @ComponentState<TContractState>, spender: ContractAddress, allowance: u256, needed: u256) {
            let data: Array<felt252> = array![
                'ERC20InsufficientAllowance',
                spender.into(),
                allowance.try_into().unwrap(),
                needed.try_into().unwrap(),
            ];
            panic(data);
        }

        fn throw_invalid_approver(self: @ComponentState<TContractState>, approver: ContractAddress) {
            let data: Array<felt252> = array![
                'ERC20InvalidApprover',
                approver.into(),
            ];
            panic(data);
        }

        fn throw_invalid_spender(self: @ComponentState<TContractState>, spender: ContractAddress) {
            let data: Array<felt252> = array![
                'ERC20InvalidSpender',
                spender.into(),
            ];
            panic(data);
        }
    }
}
```

### SNIP-3 / ERC-721

```cairo
use starknet::ContractAddress;
#[starknet::interface]
trait IERC721Errors<TContractState> {
    fn throw_invalid_owner(self: @TContractState, owner: ContractAddress);
    fn throw_nonexistent_token(self: @TContractState, token_id: u256);
    fn throw_incorrect_owner(self: @TContractState, sender: ContractAddress, token_id: u256, owner: ContractAddress);
    fn throw_invalid_sender(self: @TContractState, sender: ContractAddress);
    fn throw_invalid_receiver(self: @TContractState, receiver: ContractAddress);
    fn throw_insufficient_approval(self: @TContractState, operator: ContractAddress, token_id: u256);
    fn throw_invalid_approver(self: @TContractState, approver: ContractAddress);
    fn throw_invalid_operator(self: @TContractState, operator: ContractAddress);
}
```

```cairo
#[starknet::component]
mod ERC721ErrorsComponent {
    use starknet::ContractAddress;
    use common_error_standards::components::ierc721_errors::IERC721Errors;

    #[storage]
    struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {}

    #[embeddable_as(ERC721ErrorsImpl)]
    impl ERC721Errors<TContractState, +HasComponent<TContractState>> of IERC721Errors<ComponentState<TContractState>> {
        fn throw_invalid_owner(self: @ComponentState<TContractState>, owner: ContractAddress) {
            let data: Array<felt252> = array![
                'ERC721InvalidOwner',
                owner.into(),
            ];
            panic(data);
        }

        fn throw_nonexistent_token(self: @ComponentState<TContractState>, token_id: u256) {
            let data: Array<felt252> = array![
                'ERC721NonexistentToken',
                token_id.try_into().unwrap(),
            ];
            panic(data);
        }

        fn throw_incorrect_owner(self: @ComponentState<TContractState>, sender: ContractAddress, token_id: u256, owner: ContractAddress) {
            let data: Array<felt252> = array![
                'ERC721IncorrectOwner',
                sender.into(),
                token_id.try_into().unwrap(),
                owner.into(),
            ];
            panic(data);
        }

        fn throw_invalid_sender(self: @ComponentState<TContractState>, sender: ContractAddress) {
            let data: Array<felt252> = array![
                'ERC721InvalidSender',
                sender.into(),
            ];
            panic(data);
        }

        fn throw_invalid_receiver(self: @ComponentState<TContractState>, receiver: ContractAddress) {
            let data: Array<felt252> = array![
                'ERC721InvalidReceiver',
                receiver.into(),
            ];
            panic(data);
        }

        fn throw_insufficient_approval(self: @ComponentState<TContractState>, operator: ContractAddress, token_id: u256) {
            let data: Array<felt252> = array![
                'ERC721InsufficientApproval',
                operator.into(),
                token_id.try_into().unwrap(),
            ];
            panic(data);
        }

        fn throw_invalid_approver(self: @ComponentState<TContractState>, approver: ContractAddress) {
            let data: Array<felt252> = array![
                'ERC721InvalidApprover',
                approver.into(),
            ];
            panic(data);
        }

        fn throw_invalid_operator(self: @ComponentState<TContractState>, operator: ContractAddress) {
            let data: Array<felt252> = array![
                'ERC721InvalidOperator',
                operator.into(),
            ];
            panic(data);
        }
    }

}
```

## History

This SNIP is inspired by:

- [EIP-6093](https://eips.ethereum.org/EIPS/eip-6093)

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
