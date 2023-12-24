---
snip: 53
title: Simple NFT
author: Xiang (@wenzhenxiang), Ben77 (@ben2077), Mingshi S. (@newnewsms)
status: Draft
type: Standards Track
category: SRC
created: 2023-11-21
---

## Simple Summary
Simple nft designed for smart contract wallet

## Abstract

This SNRC is a new asset designed based on the contract wallet, and is forward compatible with [SNRC-3](./snrc-3.md)，to keep nft assets simple, this SNRC removes some functions of SNRC-3.

## Motivation

[SNRC-3](./snrc-3.md) nfts are Ethereum-based standard nfts that can be traded and transferred on the Ethereum network. But the essence of SNRC-3 is based on the EOA wallet design. EOA wallet has no state and code storage, and the Starknet wallet is different, it's defult smart contract wallet.

we think the nft contract should be simpler, more functions are taken care of by the smart contract wallet.

Our proposal is to design a simpler nft asset based on the smart contract wallet, 

It aims to achieve the following goals:

1. Keep the NFT contract simple, only need to be responsible for the transaction function
2. approve functions are not managed by the NFT contract , approve should be configured at the user level instead of controlled by the nft contract, increasing the user's more playability , while avoiding part of the ERC-721 contract risk.
3. Remove the safeTransferFrom function, and a better way to call the other party's nft assets is to access the other party's own contract instead of directly accessing the nft asset contract.
4. Forward compatibility with ERC-721 means that all nft can be compatible with this proposal.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

Compliant contracts MUST implement the following interface:


## Token
### Interface


An interface is a set of function signatures with concrete type parameters, usually represented by a `trait`. These are meant to be implemented as `external` by contracts complying with such interface. For example:

```cairo
#[starknet::interface]
trait ISimpleNFT<TContractState> {
    fn balanceOf(self: @TContractState, account: ContractAddress) -> u256;
    fn ownerOf(self: @TContractState, token_id: u256) -> ContractAddress;
    fn transferFrom(ref self: TContractState, from: ContractAddress, to: ContractAddress, token_id: u256);
}

//
// SimpleNFTMetadata
//

#[starknet::interface]
trait ISimpleNFTMetadata<TContractState> {
    fn name(self: @TContractState) -> felt252;
    fn symbol(self: @TContractState) -> felt252;
    fn tokenURI(self: @TContractState, token_id: u256) -> felt252;
}

```




### Events

#### Transfer

MUST trigger when nfts are transferred

A nft contract which creates new nfts SHOULD trigger a Transfer event with the `from` address set to `0x0` when nfts are created.

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
        tokenId: u256,
    }
```



## Backwards Compatibility

As mentioned in the beginning, this SNRC is forward compatible with [SNRC-3](./SNRC-3.md), SNRC-3 is backward compatible with this SNRC. In order to support backward compatibility with SNRC-3, we also mentioned backward compatible code in the Reference Implementation.

## Implementation
#### Example implementations are available at
- [Moss implementation]([https://github.com/mossdapp/simplenft-cairo])

## History

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
