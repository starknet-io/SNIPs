---
snip: 2
title: Token Standard
author: Abdelhamid Bakhta <abdelhamid.bakhta@gmail.com>, Moody Salem <moody@ekubo.org>
status: Draft
type: Standards Track
discussions-to: https://github.com/starknet-io/SNIPs/discussions/34
category: SRC
created: 2022-06-03
---

## Simple Summary

A standard interface for tokens.

Inspired by [EIP-20](https://eips.ethereum.org/EIPS/eip-20), tailored for Starknet.

## Abstract

The following standard allows for the implementation of a standard API for tokens within smart contracts.
This standard provides basic functionality to transfer tokens. Features such as approvals and allowances are omitted as they are not required for Starknet due to account abstraction.

## Motivation

A standard interface allows any tokens on Starknet to be re-used by other applications: from wallets to decentralized exchanges.

## Specification

The following specification uses syntax from Cairo `v2.1.0`.

#### Full ABI

```cairo
use starknet::{ContractAddress};

#[starknet::interface]
trait SRC2<TContractState> {
  // Returns the short string representation of the name of the token
  fn name(self: @TContractState) -> felt252;

  // Returns the short string representation of the symbol of the token
  fn symbol(self: @TContractState) -> felt252;

  // Returns the number of decimals that should be used for interpreting the token balances.
  fn decimals(self: @TContractState) -> u8;

  // Returns the total supply of the token, i.e. the value of the sum of all non-zero balances.
  fn totalSupply(self: @TContractState) -> u256;

  // Returns the balance of the given account.
  fn balanceOf(self: @TContractState, account: ContractAddress) -> u256;

  // Transfers the specified amount of tokens from the caller address to the recipient.
  // Reverts with insufficient balance iff balanceOf(caller) < amount
  fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256);
}
```

### Events

There is only a single event in this token specification, which is emitted from the write method of the interface and MUST be emitted from any
other balance-changing methods that are added to the contract.

#### Transfer

MUST trigger when token balances change for any address, especially when the `#transfer` method is called.

A token contract which creates new tokens MUST trigger a `Transfer` event with the `from` argument set to `0x0` when tokens are created.

```cairo
#[derive(starknet::Event, Drop)]
struct Transfer {
  from: ContractAddress,
  to: ContractAddress,
  amount: u256,
}
```

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
