---
snip: 16
title: Contract wallet management nft
status: Draft
author: Xiang (@wenzhenxiang), Ben77 (@ben2077), Mingshi S. (@newnewsms)
type: Standards Track
created: 2023-11-21
---

## Abstract

A proposal to manage nfts by the user's smart contract wallet, which provides a new way to manage assets, utilizes the programmability of the smart contract wallet, and also provides more playability.

## Motivation

EOA wallet has no state and code storage, and the starknet smart contract wallet is different.

AA is a direction of the smart contract wallet, which works around abstract accounts. This SNRC can as a plug-in for wallets.

The smart contract wallet allows the user’s own account to have state and code, bringing programmability to the wallet. We think there are more directions to expand. For example, NFT asset management, functional expansion of NFT transactions, etc.


The proposal aims to achieve the following goals:

1. Assets are allocated and managed by the wallet itself or plugins. such as approve , which are configured by the user’s contract wallet, rather than controlled by the NFT asset contract, to avoid some existing [ERC-721](./erc-721) contract risks.

2. Add the nftTransfer function, the transaction initiated by the non-smart wallet itself or will verify the approves.

3. The user wallet itself supports approve. Add nftApprove,  nftGetApproved, Used to approve specify one asset under the nft contract.

4. add nftSetApprovalForOneAll, nftIsApprovedForOneAll, Used to approve specify all assets under the nft contract.

5. add nftSetApprovalForAllAll, nftIsApprovedForAllAll, Used approve for assets under all nft contracts.

6. The users can choose to add hook function before and after their nftTransfer to increase the user’s more playability

7. The user can choose to implement the nftReceive function


## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

Compliant contracts MUST implement the following interface:

## TokenManage
### Interface


An interface is a set of function signatures with concrete type parameters, usually represented by a `trait`. These are meant to be implemented as `external` by contracts complying with such interface. For example:

```cairo
#[starknet::interface]
trait INFTManage<TContractState> {

    fn nftTransfer(ref self: TContractState, asset: ContractAddress, to: ContractAddress, token_id: u256);
    fn nftApprove(ref self: TContractState, asset: ContractAddress, to: ContractAddress, token_id: u256);
    fn nftGetApproved(self: @TContractState, asset: ContractAddress, token_id: u256) -> ContractAddress;
    fn nftSetApprovalForOneAlll(ref self: TContractState, asset:ContractAddress, operator: ContractAddress, approved: bool);
    fn nftIsApprovedForOneAll(self: @TContractState, asset: ContractAddress, operator: ContractAddress) -> bool;
    fn nftSetApprovalForAllAll(ref self: TContractState, operator: ContractAddress, approved: bool);
    fn nftIsApprovedForAllAll(self: @TContractState, operator: ContractAddress) -> bool;

}
```


## Implementation
#### Example implementations are available at
- [Moss implementation](https://github.com/mossdapp/nftmanage-cairo)

## History

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
