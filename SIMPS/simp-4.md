---
simp: 2
title: Cairo Contract Comment Standard
status: Draft
type: SRC
author: Abdelhamid Bakhta <abdelhamid.bakhta@gmail.com>
created: 2022-06-03
---

## Simple Summary

A standard for writing comments on Cairo contracts.

Inspired by Natspec comments for Solidity.

## Abstract

The following standard allows for the implementation of a standard API for tokens within smart contracts.
This standard provides basic functionality to transfer tokens, as well as allow tokens to be approved so they can be spent by another on-chain third party.

## Motivation

A standard interface allows any tokens on StarkNet to be re-used by other applications: from wallets to decentralized exchanges.


## Specification

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



#### transferFrom

Transfers `amount` amount of tokens from address `sender` to address `recipient`, and MUST fire the `Transfer` event.

The `transferFrom` method is used for a withdraw workflow, allowing contracts to transfer tokens on your behalf.
This can be used for example to allow a contract to transfer tokens on your behalf and/or to charge fees in sub-currencies.
The function SHOULD `throw` unless the `sender` account has deliberately authorized the sender of the message via some mechanism.

*Note* Transfers of 0 values MUST be treated as normal transfers and fire the `Transfer` event.

``` cairo
    func transferFrom(
            sender: felt, 
            recipient: felt, 
            amount: Uint256
        ) -> (success: felt):
    end
```



#### approve

Allows `spender` to withdraw from your account multiple times, up to the `amount` amount. If this function is called again it overwrites the current allowance with `amount`.

``` cairo
    func approve(spender: felt, amount: Uint256) -> (success: felt):
    end
```


#### allowance

Returns the amount which `spender` is still allowed to withdraw from `owner`.

``` cairo
    func allowance(owner: felt, spender: felt) -> (remaining: Uint256):
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



#### Approval

MUST trigger on any successful call to `approve(address _spender, uint256 _value)`.

``` cairo
@event
func Approval(owner: felt, spender: felt, value: Uint256):
end
```

## Implementation

#### Example implementations are available at
- [OpenZeppelin implementation](https://github.com/OpenZeppelin/cairo-contracts/tree/main/src/openzeppelin/token/erc20)


## History


## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
