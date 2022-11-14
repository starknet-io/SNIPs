---
snip: 3
title: Non-Fungible Token Standard
status: Draft
type: SRC
author: Abdelhamid Bakhta <abdelhamid.bakhta@gmail.com>
created: 2022-06-03
---

## Simple Summary

A standard interface for non-fungible tokens, also known as deeds.

Inspired by [EIP-721](https://eips.ethereum.org/EIPS/eip-721).

## Abstract

See https://eips.ethereum.org/EIPS/eip-721#abstract.

## Motivation

See https://eips.ethereum.org/EIPS/eip-721#motivation.

## Specification

### Methods

**NOTES**:
 - The following specifications use syntax from Cairo `0.8.1` (or above)

### balanceOf

Count all NFTs assigned to an owner.

NFTs assigned to the zero address are considered invalid, and this function throws for queries about the zero address.

``` cairo
    func balanceOf(owner: felt) -> (balance: Uint256):
    end
```

### ownerOf

Find the owner of an NFT.

NFTs assigned to zero address are considered invalid, and queries about them do throw.

``` cairo
    func ownerOf(tokenId: Uint256) -> (owner: felt):
    end
```

### safeTransferFrom

Transfers the ownership of an NFT from one address to another address.

Throws unless `get_caller_address` is the current owner, an authorized operator, or the approved address for this NFT.

Throws if `from_` is not the current owner.

``` cairo
    func safeTransferFrom(
            from_: felt, 
            to: felt, 
            tokenId: Uint256, 
            data_len: felt,
            data: felt*
        ):
    end
```

### transferFrom

``` cairo
    func transferFrom(from_: felt, to: felt, tokenId: Uint256):
    end
```

### approve

``` cairo
    func approve(approved: felt, tokenId: Uint256):
    end
```

### setApprovalForAll

``` cairo
    func setApprovalForAll(operator: felt, approved: felt):
    end
```

### getApproved

``` cairo
    func getApproved(tokenId: Uint256) -> (approved: felt):
    end
```

### isApprovedForAll

``` cairo
    func isApprovedForAll(owner: felt, operator: felt) -> (isApproved: felt):
    end
```

### Events

#### Transfer

``` cairo
    @event
    func Transfer(from_: felt, to: felt, tokenId: Uint256):
    end
```

#### Approval

``` cairo
    @event
    func Approval(owner: felt, approved: felt, tokenId: Uint256):
    end
```

#### ApprovalForAll

``` cairo
    @event
    func ApprovalForAll(owner: felt, operator: felt, approved: felt):
    end
```

## Implementation

#### Example implementations are available at
- [OpenZeppelin implementation](https://github.com/OpenZeppelin/cairo-contracts/tree/main/src/openzeppelin/token/erc721)


## History


## Copyright

Copyright and related rights waived via [MIT](../LICENSE).