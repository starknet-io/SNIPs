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
### Methods

**NOTES**:
 - The following specifications use syntax from Cairo `0.8.1` (or above)


#### name

Returns the name of the token - e.g. `"MyToken"`.

OPTIONAL - This method can be used to improve usability,
but interfaces and other contracts MUST NOT expect these values to be present.


``` cairo
    func name() -> (name: felt):
    end
```


#### symbol

Returns the symbol of the token. E.g. "HIX".

OPTIONAL - This method can be used to improve usability,
but interfaces and other contracts MUST NOT expect these values to be present.

``` cairo
    func symbol() -> (symbol: felt):
    end
```

#### decimals

Returns the number of decimals the token uses - e.g. `8`, means to divide the token amount by `100000000` to get its user representation.

OPTIONAL - This method can be used to improve usability,
but interfaces and other contracts MUST NOT expect these values to be present.

``` cairo
    func decimals() -> (decimals: felt):
    end
```


#### totalSupply

Returns the total token supply.

``` cairo
    func totalSupply() -> (totalSupply: Uint256):
    end
```



#### balanceOf

Returns the account balance of another account with address `account`.

``` cairo
    func balanceOf(account: felt) -> (balance: Uint256):
    end
```



#### transfer

Transfers `amount` amount of tokens to address `recipient`, and MUST fire the `Transfer` event.
The function SHOULD `throw` if the message caller's account balance does not have enough tokens to spend.

*Note* Transfers of 0 values MUST be treated as normal transfers and fire the `Transfer` event.

``` cairo
    func transfer(recipient: felt, amount: Uint256) -> (success: felt):
    end
```



### Events


#### Transfer

MUST trigger when tokens are transferred, including zero value transfers.

A token contract which creates new tokens SHOULD trigger a Transfer event with the `from_` address set to `0x0` when tokens are created.

``` cairo
@event
func Transfer(from_: felt, to: felt, value: Uint256):
end
```



## Backwards Compatibility

As mentioned in the beginning, this SNRC is forward compatible with [SNRC-2](./snrc-2.md), SNRC-2 is backward compatible with this SNRC. In order to support backward compatibility with SNRC-2, we also mentioned backward compatible code in the Reference Implementation.

## Implementation
#### Example implementations are available at
- [Moss implementation](https://github.com/)

## History

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
