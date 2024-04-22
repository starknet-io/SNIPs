---
snip: $SNIP_ID
title: Token Standard
author: $AUTHOR
status: Draft
type: SRC
created: $SNIP_DATE
---

## Simple Summary

A standard interface for tokens.

Inspired by [SNIP-2](snip-2.md) and [EIP-20](https://eips.ethereum.org/EIPS/eip-20).

## Abstract

The following standard allows for the implementation of a standard API for tokens within smart contracts.

This standard provides basic functionality to transfer tokens, as well as allow tokens to be approved so they can be spent by another on-chain third party.

The standard uses _snake case_ interfaces, the de-facto standard on Starknet, but optionally adds _camel case_ for backwards compatibility.

## Motivation

A standard interface allows any tokens on StarkNet to be re-used by other applications: from wallets to decentralized exchanges.

## Specification

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### Methods

#### name

Returns the name of the token - e.g. `"MyToken"`.

OPTIONAL - This method can be used to improve usability,
but interfaces and other contracts MUST NOT expect these values to be present.

```cairo
fn name(self: @TContractState) -> ByteArray
```


#### symbol

Returns the symbol of the token. E.g. "HIX".

OPTIONAL - This method can be used to improve usability,
but interfaces and other contracts MUST NOT expect these values to be present.

```cairo
fn symbol(self: @TContractState) -> ByteArray
```


#### decimals

Returns the number of decimals the token uses - e.g. `8`, means to divide the token amount by `100000000` to get its user representation.

OPTIONAL - This method can be used to improve usability,
but interfaces and other contracts MUST NOT expect these values to be present.

``` cairo
fn decimals(self: @TContractState) -> u8
```


#### total_supply

Returns the total token supply.

```cairo
fn total_supply(self: @TContractState) -> u256
```


#### balance_of

Returns the account balance of the account with address `account`.

``` cairo
fn balanceOf(self: @TContractState, account: ContractAddress) -> u256
```


#### transfer

Transfers `amount` amount of tokens to address `recipient`, and MUST fire the `Transfer` event.
The function SHOULD `throw` if the message caller's account balance does not have enough tokens to spend.

*Note* Transfers of 0 values MUST be treated as normal transfers and fire the `Transfer` event.

``` cairo
fn transfer(
        ref self: @TContractState, recipient: ContractAddress, amount: u256
    ) -> bool
```


#### transfer_from

Transfers `amount` amount of tokens from address `sender` to address `recipient`, and MUST fire the `Transfer` event.

The `transfer_from` method is used for a withdraw workflow, allowing contracts to transfer tokens on your behalf.

This can be used for example to allow a contract to transfer tokens on your behalf and/or to charge fees in sub-currencies.

The function SHOULD `throw` unless the `sender` account has deliberately authorized the sender of the message via some mechanism.

*Note* Transfers of 0 values MUST be treated as normal transfers and fire the `Transfer` event.

``` cairo
fn transfer_from(
        ref self: @TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256
    ) -> bool
```


#### approve

Allows `spender` to withdraw from your account multiple times, up to the `amount` amount. If this function is called again it overwrites the current allowance with `amount`.

``` cairo
fn approve(
        ref self: @TContractState, spender: ContractAddress, amount: u256
    ) -> bool
```


#### allowance

Returns the amount which `spender` is still allowed to withdraw from `owner`.

``` cairo
fn allowance(
        self: @TContractState, owner: ContractAddress, spender: ContractAddress
    ) -> u256
```


### Events

#### Transfer

MUST trigger when tokens are transferred, including zero value transfers.

A token contract which creates new tokens, or _mints_ tokens, SHOULD trigger a Transfer event with the `from_` address set to `0x0` when tokens are created.

``` cairo
#[derive(Drop, starknet::Event)]
struct Transfer {
    #[key]
    from: ContractAddress,
    #[key]
    to: ContractAddress,
    value: u256
}
```


#### Approval

MUST trigger on any successful call to `approve(address _spender, uint256 _value)`.

``` cairo
#[derive(Drop, starknet::Event)]
struct Approval {
    #[key]
    owner: ContractAddress,
    #[key]
    spender: ContractAddress,
    value: u256
}
```


## Implementation

#### Example implementations are available at
- [OpenZeppelin implementation](https://github.com/OpenZeppelin/cairo-contracts/tree/main/src/openzeppelin/token/erc20)


## Backwards Compatibility

For backwards compatibility, the `total_supply`, `balance_of`, and `transfer_from` methods may in addition ALSO be implemented in _camel case_. This is purely optional and should not replace the methods defined above.


## Security Considerations

Note that some smart contract systems may rely on the _camel case_ API defined in [SNIP-2](./snip-2.md). These methods are optional under this standard. Make sure to implement those too if your application targets an integration with these existing systems.


## History

This standard builds on the previous ERC-20 inspired [SNIP-2](snip-2.md) standard. It is fully compatible with SNIP-2 if an implementation choses to implement the optional _camel case_ interfaces (see section "Backwards Compatibility").


## Copyright

Copyright and related rights waived via [MIT](../LICENSE).