---
snip: 107
title: Immutable Component Config
authors: Eric Nordelo <eric.nordelo39@gmail.com>
discussions-to: https://community.starknet.io/t/immutable-component-config/114434
status: Draft
type: Standards Track
category: SRC
created: 2024-08-15
---

## Simple Summary

A standard method to configure components by setting constants from the implementing contract, avoiding
unnecessary storage access if these constants were to be saved in storage.

## Abstract

This standard proposes a mechanism to allow setting components’ configurable constants in the implementing contracts
without needing to save them in storage. Component providers can leverage this standard to make them configurable while
keeping the constants hardcoded in the bytecode, removing the extra storage reads required if storage were to be used for
this matter.

## Motivation

Library and protocol developers often want to make components configurable over a set of parameters to leverage
flexibility for the final users. In Solidity, immutable variables and/or virtual functions are often used to provide this
kind of flexibility, since they are hardcoded into the bytecode, not requiring storage reads for accessing the value
later, even when they can be initialized in construction time. Cairo doesn’t implement these immutable or virtual
mechanisms, but this SNIP proposes a standard to allow users of the component to set these bytecode constants in the
implementing contracts.

## Specification

The keywords "**MUST**", "**MUST NOT**", "**REQUIRED**", "**SHALL**", "**SHALL NOT**", "**SHOULD**", "**SHOULD NOT**", "**RECOMMENDED**", "**MAY**", and "**OPTIONAL**" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### `ImmutableConfig` trait

Components that use a set of one-time configurable constants, should provide an `ImmutableConfig` trait inside the
component module, and this trait **MUST** contain only associated constants, and an **OPTIONAL** single function
named `validate`, which specification is described in the last section.

In the following example, we can see how a component provides the `ImmutableConfig` trait and requires an implementation
of it to be in scope for the specification of the embeddable functions, accessing the constant value
`Immutable::FEE_DENOMINATOR` even when it hasn't been defined yet.

```cairo
#[starknet::component]
pub mod MyERC2981Component {

    #[storage]
    struct Storage {
        (...)
    }

    /// Constants expected to be defined at the contract level used to configure the component
    /// behavior.
    ///
    /// - `FEE_DENOMINATOR`: The denominator with which to interpret the fee.
    pub trait ImmutableConfig {
        const FEE_DENOMINATOR: u256;
    }

    #[embeddable_as(ERC2981Impl)]
    impl ERC2981<
        TContractState,
        +HasComponent<TContractState>,
        impl Immutable: ImmutableConfig,
        +Drop<TContractState>,
    > of IERC2981<ComponentState<TContractState>> {
        fn royalty_info(
            self: @ComponentState<TContractState>, token_id: u256, sale_price: u256
        ) -> (ContractAddress, u256) {
            (...)

            let royalty_amount = sale_price
                * royalty_fraction
                / Immutable::FEE_DENOMINATOR;

            (receiver, royalty_amount)
        }
    }

    (...)
}
```

Contracts implementing the component **MUST** provide an implementation of `ImmutableConfig` specifying the values for each configurable constant.

```cairo
#[starknet::contract]
pub mod MyContract {
    use super::MyERC2981Component::ImmutableConfig;
    use super::MyERC2981Component;

    component!(path: MyERC2981Component, storage: erc2981, event: ERC2981Event);

    #[abi(embed_v0)]
    impl ERC2981Impl = MyERC2981Component::ERC2981Impl<ContractState>;

    impl ERC2981Config of MyERC2981Component::ImmutableConfig {
        const DEFAULT_FEE_DENOMINATOR: u256 = 10_000;
    }

    (...)
}
```

### `DefaultConfig` implementation

Sometimes even while we want some constants to be configurable, we want to provide default values for them, that can be
used if the implementing contract doesn’t need to modify the default values. For this, a default implementation named
`DefaultConfig` **MAY** be provided, and **MUST** be a sibling of the component itself (direct child of the parent module).

Example:


```cairo
#[starknet::component]
pub mod MyERC2981Component {

    #[storage]
    struct Storage {
        (...)
    }

    /// Constants expected to be defined at the contract level used to configure the component
    /// behavior.
    ///
    /// - `FEE_DENOMINATOR`: The denominator with which to interpret the fee.
    pub trait ImmutableConfig {
        const FEE_DENOMINATOR: u256;
    }

    (...)
}

/// Default implementation of MyERC2981Component Immutable Config.
///
/// The default fee denominator is set to 10_000.
pub impl DefaultConfig of MyERC2981Component::ImmutableConfig {
    const FEE_DENOMINATOR: u256 = 10_000;
}
```

Contracts implementing the component **MAY** use the `DefaultConfig` by bringing it into scope:

```cairo
#[starknet::contract]
pub mod MyContract {
    use super::{MyERC2981Component, DefaultConfig};

    component!(path: MyERC2981Component, storage: erc2981, event: ERC2981Event);

    #[abi(embed_v0)]
    impl ERC2981Impl = MyERC2981Component::ERC2981Impl<ContractState>;

    (...)
}
```

Note that we are not defining the implementation, just importing the default one.

### `validate` function

Sometimes, the constants specified in the `ImmutableConfig` should be validated to ensure implementing contracts
don't set incorrect values that may break the component behavior. To address this, an **OPTIONAL** `validate`
function **SHOULD** be added to the `ImmutableConfig` trait with the following specification:

1. The `ImmutableConfig` trait **MUST** provide a default implementation for the `validate` function asserting the
correctness of the set of constants.
2. The default implementation **MUST NOT** be overridden by the `ImmutableConfig` implementations used in the implementing contract.
3. The `validate` function **MUST** panic if the values are incorrect and silently pass otherwise.
4. The `validate` function **MUST** be called in the component's initializer function if there's one.
5. If there's no initializer function in the component, the function **MUST** be called in the implementing contracts' constructor.


## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
