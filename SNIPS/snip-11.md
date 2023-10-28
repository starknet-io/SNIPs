---
snip: 11
title: Contract wallet management token
status: Draft
author: Xiang (@wenzhenxiang), Ben77 (@ben2077), Mingshi S. (@newnewsms)
type: Standards Track
created: 2023-10-28
---

## Abstract

A proposal to manage simple tokens by the user's smart contract wallet, which provides a new way to manage assets, utilizes the programmability of the smart contract wallet, and also provides more playability.

## Motivation

EOA wallet has no state and code storage, and the smart contract wallet is different.

AA is a direction of the smart contract wallet, which works around abstract accounts. This SNRC can as a plug-in for wallets.

The smart contract wallet allows the user's own account to have state and code, bringing programmability to the wallet. We think there are more directions to expand. For example, token asset management, functional expansion of token transactions, etc.

The smart contract wallet interface of this ERC is for asset management and asset approval. It supports the simpletoken SNRC-10, and SNRC-2(ERC-20) is backward compatible with SNRC-10, so it can be compatible with the management of all fungible tokens in the existing market.

The proposal aims to achieve the following goals:

1. Assets are allocated and managed by the wallet itself, such as approve and allowance, which are configured by the user’s contract wallet, rather than controlled by the token asset contract, to avoid some existing ERC-20 contract risks.
2. Add the simpletoken_transfer function, the transaction initiated by the non-smart wallet itself or  will verify the allowance amount
3. Add simpletoken_approve, simpletoken_allowance, simpletoken_approve_for_all, simpletoken_is_approve_for_all functions. The user wallet itself supports approve and provides approve 
 for single token assets and all token assets.
4. user wallet can choose batch approve and batch transfer. 
5. Users can choose to add hook function before and after their simpletoken_transfer to increase the user's more playability
6. The user can choose to implement the simpletoken_receive function


## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

Compliant contracts MUST implement the following interface:

## TokenManage
### Interface


An interface is a set of function signatures with concrete type parameters, usually represented by a `trait`. These are meant to be implemented as `external` by contracts complying with such interface. For example:

```cairo
#[starknet::interface]
trait ISimpletokenManage<TContractState> {

    fn simpletoken_allowance(self: @TContractState, asset: ContractAddress, spender: ContractAddress) -> u256;
    fn simpletoken_transfer(ref self: TContractState, asset: ContractAddress, recipient: ContractAddress, amount: u256);
    fn simpletoken_approve(ref self: TContractState, asset: ContractAddress, spender: ContractAddress, amount: u256) -> bool;
    fn simpletoken_approve_for_all(ref self: TContractState, spender: ContractAddress, approved: bool) -> bool;
    fn simpletoken_is_approve_for_all(self: @TContractState, spender: ContractAddress) -> bool;

}
```


## Implementation
#### Example implementations are available at
- [Moss implementation](https://github.com/mossdapp/simpletokenmanage-cairo)

## History

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
