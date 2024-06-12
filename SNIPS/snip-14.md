---
snip: $SNIP_ID
title: Contract Class Hash Syscall
author: $SNIP_AUTHOR <$SNIP_AUTHOR_EMAIL>
status: Living
type: Meta
created: $SNIP_DATE
---

## Simple Summary

Introduce a new syscall `get_class_hash_at`, aimed to get a contract class hash at a certain address.

## Abstract

Starknet adopted a system of contract classes to reduce duplication of deployed bytecode. It works in the following way: to deploy a piece of code that has never been deployed before, you must first _declare_ it. You are effectively "declaring" a class to the Starknet network. From this point onward, one may instantiate this class by requesting the sequencer to deploy it at a certain address. The simple usecase goes: you declare a fungible token contract, the sequencer stores the code once; then, any number of deployments of the exact same smart contract will not further bloat the chain's storage. This is different from the way Ethereum and the Ethereum Virtual Machine (EVM) works. In EVM world, if you deploy a hundred times an ERC20 contract, the chain will store a copy of the code a hundred times. More information: <https://docs.starknet.io/architecture-and-concepts/smart-contracts/contract-classes/>

While there is a way for one to check the [class hash of a deployed contract at the RPC level](https://github.com/starkware-libs/starknet-specs/blob/master/api/starknet_api_openrpc.json#L444) (`starknet_getClassHashAt` method), there is no way to perform this at the smart contract level. In EVM world, this is achieved using the `EXTCODEHASH` opcode. The purpose is for a contract to check on-chain whether another contract is an instantiation of a particular class. This is more precise/powerful (and more costly?) than [SNIP-5](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-5.md) (inspired by ERC-165).

## Motivation

At Kakarot, we utilize `replace_class_hash` syscall for upgrades at the contract level, as well as use class hashes as mediums of checking a contract's version. We need the ability to check a contract's class hash. We currently achieve this by enforcing every Kakarot Account to store its own class hash in a storage variable.

We would benefit from a syscall that would enable a contract to check a particular class hash at an address.

## Specification

One might want to name the syscall in the same way as the corresponding RPC method.

```rust
extern fn get_class_hash_at_syscall(
    contract_address: ContractAddress
) -> SyscallResult<ClassHash> implicits(GasBuiltin, System) nopanic;
```

Alternative API:

```rust
extern fn class_hash_syscall(
    contract_address: ContractAddress
) -> SyscallResult<ClassHash> implicits(GasBuiltin, System) nopanic;
```

### Arguments

contract_address: The contract address one wants to know the class hash of.

### Returns

Returns the `ClassHash` if the contract is deployed, an `Result::Error` if the contract is not deployed

## Implementation

We will require help from the Starkware team to define precisely the implementation.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
