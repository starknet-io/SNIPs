---
snip: 2
title: Token Standard
status: Draft
type: SRC
author: Abdelhamid Bakhta <abdelhamid.bakhta@gmail.com>, Moody Salem <moody@ekubo.org>
created: 2022-06-03
---

## Simple Summary

A standard interface for tokens.

Inspired by [EIP-20](https://eips.ethereum.org/EIPS/eip-20), tailored for Starknet.

## Abstract

The following standard allows for the implementation of a standard API for tokens within smart contracts.
This standard provides basic functionality to transfer tokens, as well as allow tokens to be approved so they can be spent by another on-chain third party.

## Motivation

A standard interface allows any tokens on StarkNet to be re-used by other applications: from wallets to decentralized exchanges.


## Specification

## Token
### Methods

**NOTES**:
 - The following specifications use syntax from Cairo `2.0.2`


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

  // Returns the total supply of the token, i.e. the maximum value of the sum of all balances.
  fn totalSupply(self: @TContractState) -> u256;

  // Returns the balance of the given account.
  fn balanceOf(self: @TContractState, account: ContractAddress) -> u256;

  // Transfers the specified amount of tokens from the caller address to the recipient. Reverts with insufficient balance.
  fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256);
}
```

### Events

There is only a single event in this simplified ERC20 specification, which is emitted from the write method of the interface and any SHOULD be emitted from any
other balance-changing custom methods that are added to the contract.

#### Transfer

MUST trigger when tokens are transferred, including zero value transfers.

A token contract which creates new tokens SHOULD trigger a Transfer event with the `from` argument set to `0x0` when tokens are created.

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
