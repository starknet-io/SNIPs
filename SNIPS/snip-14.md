---
snip: 14
title: Non-fungible Tokenbound Accounts
author: Darlington Nnam <darlingtonnnam@gmail.com>, Ademola Kelvin <adegbiteademola1999@gmail.com>
discussions-to: https://community.starknet.io/t/snip-72-non-fungible-tokenbound-accounts/112479
status: Review
type: Standards Track
category: SRC
created: 2024-01-08
---

## Simple Summary
An interface and registry for smart contract accounts owned by non-fungible tokens

## Abstract

This proposal defines a system that assigns Starknet accounts to all non-fungible tokens (ERC-721). These tokenbound accounts allow NFTs to own assets and interact with applications, without requiring changes to existing smart contracts or infrastructure.

## Motivation

The ERC-721 standard enabled an explosion of non-fungible token applications. Some notable use cases have included breedable cats, generative artwork, and exchange liquidity positions.

However, NFTs cannot act as agents or associate with other on-chain assets. This limitation makes it difficult to represent many real-world non-fungible assets as NFTs.

For example:
- A character in a role-playing game that accumulates assets and abilities over time based on actions they have taken.
- An automobile composed of many fungible and non-fungible components.
- An investment portfolio composed of multiple fungible assets.
- A punch pass membership card granting access to an establishment and recording a history of past interactions

This proposal aims to utilize the power of native account abstraction, to give every NFT the same rights as a Starknet user. This includes the ability to self-custody assets, execute arbitrary operations, and control multiple independent accounts. By doing so, this proposal allows complex real-world assets to be represented as NFTs using a common pattern that mirrors Starknet's existing ownership model.

This is accomplished by defining a singleton registry that assigns unique, deterministic smart contract account addresses to all existing and future NFTs. Each account is permanently bound to a single NFT, with control of the account granted to the holder of that NFT.

The pattern defined in this proposal does not require any changes to existing NFT smart contracts. It is also compatible out of the box with nearly all existing infrastructure that supports Starknet accounts, from on-chain protocols to off-chain indexers. Tokenbound accounts are compatible with every existing on-chain asset standard and can be extended to support new asset standards created in the future.

By giving every NFT the full capabilities of a Starknet account, this proposal enables many novel use cases for existing and future NFTs.

## Specification

The keywords “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

ERC-721 is used instead of SNIP-3 due to its prevalence within the Starknet ecosystem.

## Overview
The system outlined in this proposal has two main components:

- A singleton registry for tokenbound accounts
- A common interface for tokenbound account implementations

<img src="../assets/snip-14/snip-14.png" width="100%" alt="ERC6551 illustration">

The following diagram illustrates the relationship between NFTs, NFT holders, tokenbound accounts, and the Registry.

## Registry
The registry is a singleton contract that serves as the entry point for all tokenbound account address queries. It has three functions:

- `create_account` - creates the tokenbound account for an NFT given an implementation address
- `get_account` - computes the tokenbound account address for an NFT given an implementation address

The registry is permissionless, immutable, and has no owner. The complete source code for the registry can be found in the [Registry Implementation section](https://github.com/Starknet-Africa-Edu/TBA/blob/main/src/registry/registry.cairo).

The registry MUST deploy all tokenbound accounts using the `deploy_syscall` so that each account address is deterministic. Each tokenbound account address SHALL be derived from the unique combination of its implementation address, token contract address, token ID, and optionally a salt.

The registry MUST implement the following interface:

```rust
#[starknet::interface]
trait IRegistry<TContractState> {
    /// @notice Emitted when a new tokenbound account is deployed/created
    /// @param account_address the deployed contract address of the tokenbound account
    /// @param token_contract the contract address of the NFT
    /// @param token_id the ID of the NFT
    #[derive(Drop, starknet::Event)]
    struct AccountCreated {
        account_address: ContractAddress,
        token_contract: ContractAddress,
        token_id: u256,
    }

    /// @notice deploys a new tokenbound account for an NFT
    /// @param implementation_hash the class hash of the reference account
    /// @param token_contract the contract address of the NFT
    /// @param token_id the ID of the NFT
    /// @param salt random salt for deployment
    /// @param chain_id id of chain to be deployed to
    fn create_account(ref self: TContractState, implementation_hash: felt252, token_contract: ContractAddress, token_id: u256, salt: felt252, chain_id: felt252) -> ContractAddress;

    /// @notice calculates the account address for an existing tokenbound account
    /// @param implementation_hash the class hash of the reference account
    /// @param token_contract the contract address of the NFT
    /// @param token_id the ID of the NFT
    /// @param salt random salt for deployment
    /// @param chain_id id of chain to be deployed to
    fn get_account(self: @TContractState, implementation_hash: felt252, token_contract: ContractAddress, token_id: u256, salt: felt252, chain_id: felt252) -> ContractAddress;
}
```

## Account Implementation
The account implementation is an opinionated, flexible, and audited tokenbound account implementation. We included a number of components which can help with quickly spinning up an account implementation.

All tokenbound accounts SHOULD be created via the singleton registry.

All tokenbound account implementations MUST implement [SRC-5](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-5.md) interface detection.

All tokenbound account implementations MUST implement the following interface:

```rust
#[starknet::interface]
pub trait IAccount<TContractState> {
    /// @notice gets the NFT owner
    /// @param token_contract the contract address of the NFT
    /// @param token_id the token ID of the NFT
    fn owner(self: @TContractState) -> ContractAddress;

    /// @notice returns the contract address and token ID of the associated NFT
    fn token(self: @TContractState) -> (ContractAddress, u256, felt252);

    /// @notice returns the current state of the account
    fn state(self: @TContractState) -> u256;

    /// @notice check that account supports TBA interface
    /// @param interface_id interface to be checked against
    fn supports_interface(self: @TContractState, interface_id: felt252) -> bool;
}   
```

## Rationale
### Singleton Registry
This proposal specifies a single, canonical registry. It purposefully does not specify a common interface that can be implemented by multiple registry contracts. This approach enables several critical properties.

### Counterfactual Accounts
All tokenbound accounts exist in a counterfactual state prior to their creation. Thus tokenbound accounts can receive assets prior to contract creation. A singleton account registry ensures a common addressing scheme is used for all tokenbound account addresses deployed using the `deploy_syscall`.

### Trustless Deployments
A single ownerless registry ensures that the only trusted contract for any tokenbound account is the implementation. This guarantees the holder of a token, access to all assets stored within a counterfactual account using a trusted implementation.

Without a canonical registry, some tokenbound accounts may be deployed using an owned or upgradable registry. This may lead to the loss of assets stored in counterfactual accounts and increase the scope of the security model that applications supporting this proposal must consider.

### Single Entry Point
A single entry point for querying account addresses and `AccountCreated` events simplifies the complex task of indexing tokenbound accounts in applications that support this proposal.

### Implementation Diversity
A singleton registry allows diverse account implementations to share a common addressing scheme. This gives developers significant freedom to implement innovative features in a way that can be easily supported by client applications.

### Registry vs Factory
The term “registry” was chosen instead of “factory” to highlight the canonical nature of the contract and emphasize the act of querying account addresses (which occurs regularly) over the creation of accounts (which occurs only once per account).

### Account Ambiguity
The specification proposed above allows NFTs to have multiple tokenbound accounts. During the development of this proposal, alternative architectures were considered which would have assigned a single tokenbound account to each NFT, making each tokenbound account address an unambiguous identifier.

However, these alternatives present several trade-offs.

First, due to the permissionless nature of smart contracts, it is impossible to enforce a limit of one tokenbound account per NFT. Anyone wishing to utilize multiple tokenbound accounts per NFT could do so by deploying an additional registry contract.

Second, limiting each NFT to a single tokenbound account would require a static, trusted account implementation to be included in this proposal. This implementation would inevitably impose specific constraints on the capabilities of tokenbound accounts. Given the number of unexplored use cases this proposal enables and the benefit that diverse account implementations could bring to the non-fungible token ecosystem, it is the authors’ opinion that defining a canonical and constrained implementation in this proposal is premature.

Finally, this proposal seeks to grant NFTs the ability to act as agents on-chain. In current practice, on-chain agents often utilize multiple accounts. A common example is individuals who use a “hot” account for daily use and a “cold” account for storing valuables. If on-chain agents commonly use multiple accounts, it stands to reason that NFTs ought to inherit the same ability.

### Backwards Compatibility
This proposal seeks to be maximally backward compatible with existing non-fungible token contracts. As such, it does not extend the ERC-721 standard.

Additionally, this proposal does not require the registry to perform an ERC-165 interface check for ERC-721 compatibility prior to account creation. This maximizes compatibility with non-fungible token contracts that pre-date the ERC-721 standard (such as CryptoKitties). It also allows the system described in this proposal to be used with semi-fungible or fungible tokens, although these use cases are outside the scope of the proposal.

Smart contract authors may optionally choose to enforce interface detection for ERC-721 in their account implementations.

## Reference Implementation

### Registry Implementation
https://github.com/horuslabsio/TBA/blob/main/src/registry/registry.cairo

### Reference Account Implementation
https://github.com/horuslabsio/TBA/blob/main/src/accountV3/accountV3.cairo

## Security Considerations
### Fraud Prevention
In order to enable trustless sales of tokenbound accounts, decentralized marketplaces will need to implement safeguards against fraudulent behavior by malicious account owners.

Consider the following potential scam:

- Alice owns an ERC-721 token X, which owns tokenbound account Y
- Alice deposits 10ETH into account Y
- Bob offers to purchase token X for 11ETH via a decentralized marketplace, assuming he will receive the 10ETH stored in account Y along with the token
- Alice withdraws 10ETH from the tokenbound account and immediately accepts Bob’s offer
- Bob receives token X, but account Y is empty

To mitigate this sort of fraudulent behavior by malicious account owners, we've added two optional methods: `lock` and `is_locked` which decentralized marketplaces SHOULD implement for protection against these sorts of scams at the marketplace level.

### Ownership Cycles
All assets held in a tokenbound account may be rendered inaccessible if an ownership cycle is created. The simplest example is the case of an ERC-721 token being transferred to its own tokenbound account. If this occurs, both the ERC-721 token and all of the assets stored in the tokenbound account would be permanently inaccessible, since the tokenbound account is incapable of executing a transaction that transfers the ERC-721 token.

Ownership cycles can be introduced in any graph of n>0 tokenbound accounts. On-chain prevention of cycles with depth>1 is difficult to enforce given the infinite search space required, and as such is outside the scope of this proposal. Application clients and account implementations wishing to adopt this proposal are encouraged to implement measures that limit the possibility of ownership cycles.

## History

This SNIP is inspired by:

- [EIP-6551](https://eips.ethereum.org/EIPS/eip-6551)

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
