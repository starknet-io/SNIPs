---
snip: 10
title: simple token
author: Xiang (@wenzhenxiang), Ben77 (@ben2077), Mingshi S. (@newnewsms)
status: Draft
type: Standards Track
category: SRC
created: 2023-10-28
---

## Simple Summary
Simple token designed for smart contract wallet

## Abstract

This SNRC is a new asset designed based on the contract wallet, and is forward compatible with [SNRC-2](./snrc-2.md)，to keep token assets simple, this SNRC removes some functions of SNRC-2.

## Motivation

[SNRC-2](./snrc-2.md) tokens are Ethereum-based standard tokens that can be traded and transferred on the Ethereum network. But the essence of SNRC-2 is based on the EOA wallet design. EOA wallet has no state and code storage, and the Starknet wallet is different, it's defult smart contract wallet.

we think the token contract should be simpler, more functions are taken care of by the smart contract wallet.

Our proposal is to design a simpler token asset based on the smart contract wallet, 

It aims to achieve the following goals:

1. Keep the token asset contract simple, only need to be responsible for the transaction function
2. approve and allowance functions are not managed by the token contract , approve and allowance should be configured at the user level instead of controlled by the asset contract, increasing the user's more playability , while avoiding part of the SNRC-2 contract risk.
3. Remove the transferForm function, and a better way to call the other party's token assets is to access the other party's own contract instead of directly accessing the token asset contract.
4. Forward compatibility with SNRC-2 means that all fungible tokens can be compatible with this proposal.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

Compliant contracts MUST implement the following interface:


## Token
### Interface


An interface is a set of function signatures with concrete type parameters, usually represented by a `trait`. These are meant to be implemented as `external` by contracts complying with such interface. For example:

```cairo
#[starknet::interface]
trait ISimpletoken<TContractState> {
    fn totalSupply(self: @TContractState) -> u256;
    fn balanceOf(self: @TContractState, account: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256);
    fn name(self: @TContractState) -> felt252;
    fn symbol(self: @TContractState) -> felt252;
    fn decimals(self: @TContractState) -> u8;

}
```




### Events


#### Transfer

MUST trigger when tokens are transferred, including zero value transfers.

A token contract which creates new tokens SHOULD trigger a Transfer event with the `from` address set to `0x0` when tokens are created.

``` cairo
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
    }
    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        value: u256,
    }
```



## Backwards Compatibility

As mentioned in the beginning, this SNRC is forward compatible with [SNRC-2](./snrc-2.md), SNRC-2 is backward compatible with this SNRC. In order to support backward compatibility with SNRC-2, we also mentioned backward compatible code in the Reference Implementation.

## Implementation
#### Example implementations are available at
- [Moss implementation]([https://github.com/mossdapp/simpletoken-cairo])

## History

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
