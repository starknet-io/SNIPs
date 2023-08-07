---
snip: $SNIP_ID
title: Simplified Fungible Token Standard
status: Draft
type: Standards Track
author: Moody Salem <moody@ekubo.org>
created: 2023-08-04
---

## Simple Summary

A simplified standard for smart contracts that wish to track fungible ownership of an asset.

## Abstract

This specification is a subset of the [SNIP-2](./snip-2.md) specification, tailored for the Starknet network.
Starknet developers may choose to implement this specification to reduce the attack surface of their token contracts.

Integrators should avoid relying on the `#approve` and `#allowance` methods of [SNIP-2](./snip-2.md) for maximum compatibility
with all token contracts.

## Motivation

The fungible token specification described in [SNIP-2](./snip-2.md) contains methods for managing a token allowance,
i.e. a balance that one address is allowed to spend on behalf of another, that have been used to attack users [many times in the past](https://revoke.cash/exploits).

This simplified token specification is ABI-compatible with the `#transfer` and `#balanceOf` methods, but
removes the `#approve`, `#allowance` and `#transferFrom` methods, conferring the following benefits:
- **Safety**: no approvals persisting across transactions
- **Simplicity**: implementation can be written in minutes (less risk of bugs)
- **UX**: more explicit spending of user tokens from the wallet
- **Gas efficiency**: No tracking of allowances for transient spending use cases
- **Developer experience**: No need to manage inter-contract approvals and allowances

These improvements are possible only because of Starknet's native account abstraction.
Since tokens can be transferred to contracts in the same transaction that those contracts are called,
it's not necessary to send a separate approve transaction.

## Specification

### Methods

#### fn transfer(ref self: TStorage, recipient: ContractAddress, amount: u256);

Transfers `amount` tokens from the caller to the `recipient`, emitting a `Transfer` event.

This method **MUST** revert if the caller has insufficient balance. 
This method **MUST** return true.
This allows integrators to ignore the returned boolean, but keeps the implementation compatible with existing SNIP-2 integrations.

#### fn balanceOf(self: @TStorage, account: ContractAddress) -> u256;

Checks the balance of the given `account`. The `balanceOf` result **MUST NOT** change for a sender without a transfer, i.e.
this specification explicitly disallows rebasing tokens.

The value returned by `balanceOf` result **MUST** have a zero high component, i.e. be less than `2**128`. 
This allows integrators to ignore the second limb, but keeps the implementation compatible with existing SNIP-2 integrations.

### Events

#### Transfer

This event is emitted with 3 pieces of data. It **MUST** be emitted from any balance-changing event.
The event **SHOULD** be emitted for transfers with 0 `amount`. 

- `from`: The address from which the token was transferred, or address `0` if the amount was newly minted
- `to`: The address to which tokens were transferred, or address `0` if the amount was burned
- `amount`: How much token was transferred to the new address

## Implementation

```cairo
use starknet::{ContractAddress};

#[starknet::interface]
trait IERC20<TStorage> {
    // Transfers `amount` tokens from the caller to the `recipient`, emitting a `Transfer` event
    fn transfer(ref self: TStorage, recipient: ContractAddress, amount: u256) -> bool;
    // Checks the balance of the given `account`
    fn balanceOf(self: @TStorage, account: ContractAddress) -> u256;
}

#[starknet::contract]
mod ERC20 {
    use super::{IERC20, ContractAddress};
    use starknet::{get_caller_address};
    use traits::{Into, TryInto};
    use option::{OptionTrait};

    #[storage]
    struct Storage {
        balances: LegacyMap<ContractAddress, u128>, 
    }

    #[derive(starknet::Event, Drop)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        amount: u128,
    }

    #[derive(starknet::Event, Drop)]
    #[event]
    enum Event {
        Transfer: Transfer, 
    }

    #[external(v0)]
    impl IERC20Impl of super::IERC20<ContractState> {
        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let amount: u128 = amount.try_into().expect('AMOUNT_OVERFLOW');
            let caller = get_caller_address();
            self.balances.write(caller, self.balances.read(caller) - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            self.emit(Transfer { from: caller, to: recipient, amount });
            true
        }

        fn balanceOf(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account).into()
        }
    }
}
```

## Security considerations

Since there is no `#transferFrom` method, you must do accounting internally by recording the last balance of the 
token contract, and reading it to check how much is received in payments. Transfers will happen to your contract external to other calls.

## History

- [SNIP-2](./snip-2.md)
- [EIP-20](https://eips.ethereum.org/EIPS/eip-20#history)

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
