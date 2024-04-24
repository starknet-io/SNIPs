---
snip: $SNIP_ID
title: Tokenized Vaults
author: Nils Bundi <nbundi@proton.me>, Johannes Escherich <0xJohannes@pm.me>
status: Draft
type: SRC
created: $SNIP_DATE
---

## Simple Summary

A standard interface for tokenized vaults.

Inspired by [EIP-4626](https://eips.ethereum.org/EIPS/eip-4626).

## Abstract

The following standard allows for the implementation of a standard API for tokenized vaults representing shares of a single underlying [SNIP-2](./snip-2.md) asset. This standard extends the SNIP-2 token and provides basic functionality for depositing and withdrawing underlying assets, minting and burning vault shares and reading balances and other basic information. It is inspired by the [EIP-4626](https://eips.ethereum.org/EIPS/eip-4626) standard for EVM chains.

## Motivation

Tokenized vaults are a widely used pattern across many DeFi applications including lending markets, aggregators, and interest bearing tokens. It is enabled by the standardization of simple tokens with the SNIP-2 standard. However, other than SNIP-2 tokens, current vaults expose diverse interfaces making integration difficult for protocols, aggregators and wallets which have to implement adapters for each standard. This is inefficient and error prone.

The proposed "tokenized vaults" standard will lower the integration effort for yield-bearing vaults and tokens, result in better UX and increase security for users.

## Specification

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).


### SNIP-2 Compatibility

All tokenized vaults MUST implement the SNIP-2 standard including its optional metadata extensions.

The SNIP-2 operations `balance_of`, `transfer`, `total_supply`, etc. MUST operate on the vault shares.

Calls to `transfer` or `transfer_from` MAY revert if vault shares are non-transferable or some conditions, required by the tokenized vault implementation, for a succesful transfer are not met.

The SNIP-2 optional operations `name` and `symbol` SHOULD reflect the underlying asset's `name` and `symbol` in some way.

All tokenized vaults MUST implement a set of additional functions enabling the management of the vault's underlying assets.

### Definitions:

- _asset_: The underlying token managed by the vault
- _share_: The unit of ownership in the vault's asset and represented by the vault's token
- _fee_: An amount of assets or shares charged to the user by the vault by certain vault functions
  (e.g. deposit/withdraw/mint/burn/etc).
- _slippage_: Any difference between computed share price and economic realities of
  a vault deposit/withdrawal, which is not accounted by fees.

### Methods

#### asset

Returns the address of the underlying token.

The returned address MUST represent a SNIP-2 token contract.

MUST _NOT_ revert.

```cairo
fn asset(self: @TContractState) -> ContractAddress
```

#### total_assets

Returns the total amount of the underlying tokens "managed" by the vault.

SHOULD include any compounding that occurs from yield.

MUST be inclusive of any fees that are charged against assets in the Vault.

MUST _NOT_ revert.

```cairo
fn total_assets(self: @TContractState) -> u256;
```

#### convert_to_shares

Simulates the amount of shares that the vault would exchange for an amount of `assets` provided, in the current block.

MUST NOT be inclusive of any fees that are charged against assets in the vault.

MUST NOT show any variations depending on the caller.

MUST NOT reflect slippage or other on-chain conditions, when performing the actual exchange.

MUST NOT revert.

```cairo
fn convert_to_shares(self: @TContractState, assets: u256) -> u256;
```

#### convert_to_assets

Simulates the amount of assets that the vault would exchange for an amount of `shares` provided, in the current block.

MUST NOT be inclusive of any fees that are charged against assets in the vault.

MUST NOT show any variations depending on the caller.

MUST NOT reflect slippage or other on-chain conditions, when performing the actual exchange.

MUST NOT revert.

```cairo
fn convert_to_assets(self: @TContractState, shares: u256) -> u256;
```

#### max_deposit

Returns the maximum amount of the underlying token that can be deposited into the vault for the `receiver`, through a `deposit` call.

MUST NOT take into account caller's available asset balance (i.e. `balanceOf` of `asset` for caller).

MUST factor in both global and user-specific limits, like if deposits are entirely disabled (even temporarily) it MUST return 0.

MUST return `2 ** 256 - 1` if there is no limit on the maximum amount of assets that may be deposited.

MUST NOT revert.

```cairo
fn max_deposit(self: @TContractState, receiver: ContractAddress) -> u256
```

#### preview_deposit

Simulate the effects of an asset deposit at the current block.

MUST return as close to and no more than the exact amount of vault shares that would be minted in a `deposit` call in the same transaction. I.e. `deposit` should return the same or more `shares` as `preview_deposit` if called in the same transaction.

MUST NOT account for deposit limits like those returned from `max_deposit` and should always act as though the deposit would be accepted, regardless if the user has enough tokens approved, etc.

MUST be inclusive of deposit fees.

MUST NOT revert due to vault specific user/global limits. MAY revert due to other conditions that would also cause `deposit` to revert.

Note that any unfavorable discrepancy between `convert_to_shares` and `preview_deposit` SHOULD be considered slippage in share price or some other type of condition, meaning the depositor will lose assets by depositing.

```cairo
fn preview_deposit(self: @TContractState, assets: u256) -> u256
```

#### deposit

Mints `shares` vault shares to `receiver` by depositing exactly `assets` of underlying tokens.

MUST emit the `Deposit` event.

MUST support SNIP-2 `approve` / `transferFrom` on `asset` as a deposit flow.
MAY support additoinal deposit flows.

MUST revert if all of `assets` cannot be deposited (due to deposit limit being reached, slippage, the user not approving enough underlying tokens to the vault contract, etc).

```cairo
fn deposit(ref self: @TContractState, assets: u256, receiver: ContractAddress) -> u256
```

#### max_mint

Returns the maximum amount of shares that can be minted from the vault for the `receiver`, through a `mint` call.

MUST NOT take into account caller's available asset balance (i.e. `balanceOf` of `asset` for caller).

MUST factor in both global and user-specific limits, like if mints are entirely disabled (even temporarily) it MUST return 0.

MUST return `2 ** 256 - 1` if there is no limit on the maximum amount of shares that may be minted.

MUST NOT revert.

```cairo
fn max_mint(self: @TContractState, receiver: ContractAddress) -> u256
```

#### preview_mint

Simulate the effects of a vault token mint at the current block.

MUST return as close to and no fewer than the exact amount of assets that would be deposited in a `mint` call in the same transaction. I.e. `mint` should return the same or fewer `assets` as `preview_mint` if called in the same transaction.

MUST NOT account for mint limits like those returned from `max_mint` and should always act as though the mint would be accepted, regardless if the user has enough tokens approved, etc.

MUST be inclusive of deposit fees.

MUST NOT revert due to vault specific user/global limits. MAY revert due to other conditions that would also cause `mint` to revert.

Note that any unfavorable discrepancy between `convert_to_assets` and `preview_mint` SHOULD be considered slippage in share price or some other type of condition, meaning the depositor will lose assets by minting.

```cairo
fn preview_mint(self: @TContractState, shares: u256) -> u256
```

#### mint

Mints exactly `shares` vault shares to `receiver` by depositing `assets` of underlying tokens.

MUST emit the `Deposit` event.

MUST support SNIP-2 `approve` / `transferFrom` on `asset` as a mint flow.
MAY support additional mint flows.

MUST revert if all of `shares` cannot be minted (due to deposit limit being reached, slippage, the user not approving enough underlying tokens to the vault contract, etc).

```cairo
fn mint(ref self: @TContractState, shares: u256, receiver: ContractAddress) -> u256
```

#### max_withdraw

Returns the maximum amount of the underlying asset that can be withdrawn from the `owner` balance in the vault, through a `withdraw` call.

MUST factor in both global and user-specific limits, like if withdrawals are entirely disabled (even temporarily) it MUST return 0.

MUST NOT revert.

```cairo
fn max_withdraw(self: @TContractState, owner: ContractAddress) -> u256
```

#### preview_withdraw

Simulate the effects of an asset withdrawal, at the current block.

MUST return as close to and no fewer than the exact amount of Vault shares that would be burned in a `withdraw` call in the same transaction. I.e. `withdraw` should return the same or fewer `shares` as `previewWithdraw` if called in the same transaction.

MUST NOT account for withdrawal limits like those returned from maxWithdraw and should always act as though the withdrawal would be accepted, regardless if the user has enough shares, etc.

MUST be inclusive of withdrawal fees.

MUST NOT revert due to vault specific user/global limits. MAY revert due to other conditions that would also cause `withdraw` to revert.

Note that any unfavorable discrepancy between `convertToShares` and `previewWithdraw` SHOULD be considered slippage in share price or some other type of condition, meaning the depositor will lose assets by depositing.

```cairo
fn preview_withdraw(self: @TContractState, assets: u256) -> u256
```

#### withdraw

Burns `shares` from `owner` and sends exactly `assets` of underlying token to `receiver`.

MUST emit the `Withdraw` event.

MUST support a withdraw flow where the shares are burned from `owner` directly where `owner` is `msg.sender`.

MUST support a withdraw flow where the shares are burned from `owner` directly where `msg.sender` has SNIP-2 approval over the shares of `owner`.

MAY support additional withdraw flows.

MUST revert if all of `assets` cannot be withdrawn (due to withdrawal limit being reached, slippage, the owner not having enough shares, etc).

MAY support an asynchronous withdrawal process with an additional _request_ step performed in separate methods.

```cairo
fn withdraw(ref self: @TContractState, assets: u256, receiver: ContractAddress, owner: ContractAddress) -> u256
```

#### max_redeem

Returns the maximum amount of vault shares that can be redeemed from the `owner` balance in the Vault, through a `redeem` call.

MUST return the maximum amount of shares that could be transferred from `owner` through `redeem` and not cause a revert, which MUST NOT be higher than the actual maximum that would be accepted (it should underestimate if necessary).

MUST factor in both global and user-specific limits, like if redemption is entirely disabled (even temporarily) it MUST return 0.

MUST NOT revert.

```cairo
fn max_redeem(self: @TContractState, owner: ContractAddress) -> u256
```

#### preview_redeem

Simulate the effects of a share redeemption, at the current block.

MUST return as close to and no more than the exact amount of assets that would be withdrawn in a `redeem` call in the same transaction. I.e. `redeem` should return the same or more `assets` as `preview_redeem` if called in the same transaction.

MUST NOT account for redemption limits like those returned from `max_redeem` and should always act as though the redemption would be accepted, regardless if the user has enough shares, etc.

MUST be inclusive of withdrawal fees.

MUST NOT revert due to vault specific user/global limits. MAY revert due to other conditions that would also cause `redeem` to revert.

Note that any unfavorable discrepancy between `convertToAssets` and `previewRedeem` SHOULD be considered slippage in share price or some other type of condition, meaning the depositor will lose assets by redeeming.

```cairo
fn preview_redeem(self: @TContractState, shares: u256) -> u256
```

#### redeem

Burns exactly `shares` from `owner` and sends `assets` of underlying tokens to `receiver`.

MUST emit the `Withdraw` event.

MUST support a redeem flow where the shares are burned from `owner` directly where `owner` is `msg.sender`.

MUST support a redeem flow where the shares are burned from `owner` directly where `msg.sender` has EIP-20 approval over the shares of `owner`.

MAY support additional redeem flows.

MUST revert if all of `shares` cannot be redeemed (due to withdrawal limit being reached, slippage, the owner not having enough shares, etc).

MAY support an asynchronous redemption process with an additional _request_ step performed in separate methods.

```cairo
fn redeem(ref self: @TContractState, shares: u256, receiver: ContractAddress, owner: ContractAddress) -> u256
```

### Events

#### Deposit

`sender` has exchanged `assets` for `shares`, and transferred those `shares` to `owner`.

MUST be emitted when tokens are deposited into the Vault via the `mint` and `deposit` methods.

```cairo
#[derive(Drop, starknet::Event)]
struct Deposit {
    #[key]
    sender: ContractAddress,
    #[key]
    owner: ContractAddress,
    assets: u256,
    shares: u256
}
```

#### Withdraw

`sender` has exchanged `shares`, owned by `owner`, for `assets`, and transferred those `assets` to `receiver`.

MUST be emitted when shares are withdrawn from the vault with `redeem` or `withdraw` functions.

```cairo
#[derive(Drop, starknet::Event)]
struct Withdraw {
    #[key]
    sender: ContractAddress,
    #[key]
    receiver: ContractAddress,
    #[key]
    owner: ContractAddress,
    assets: u256,
    shares: u256
}
```

## Implementation

An implementation of the standard can be found here https://github.com/vesuxyz/protocol/blob/dev/src/v_token.cairo.

Note that this implementation needs to be adjusted for your specific use case.


## Backwards Compatibility

The tokenized vault standard is fully backward compatible with the SNIP-2 standard and has no known compatibility issues with other standards.


## Security Considerations

The tokenized vault standard defines a standard API aimed at making the management and integration of yield-bearing vaults more efficient and secure.

The standard does _not_ govern any aspect of the source of yield or the details of the implementation of the standard for a specific source of yield.

Hence, the standard does NOT guarantee safety of an implementation of the standard or its yield source.

The methods `total_assets`, `convert_to_shares` and `convert_to_assets` are estimates useful for display purposes,
and do _not_ have to confer the _exact_ amount of underlying assets their context suggests.

The `preview` methods simulate the respective values as closely as possible to the _true_ value. Therefore, they are manipulable by altering the on-chain conditions and are not always safe to be used as price oracles. 

The `convert` methods estimate the values possibly in a non-exact manner. Thus, these estimations may be implemented in a robust way and serve as price oracles.

When integrating a tokenized vault it is thus important to understand the use cases for the different methods and integrate these accordingly.


## History

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
