---
snip: 6
title: Standard Account Interface
author: Eric Nordelo <eric.nordelo39@gmail.com>
discussions-to: https://community.starknet.io/t/snip-starknet-standard-account/95665
status: Draft
type: Standards Track
category: SRC
created: 2023-07-06
---

## Simple Summary

A standard interface for accounts.

## Abstract

The following standard allows for the implementation of a standard API for smart contracts acting as accounts in Starknet. It provides basic functionality for sending transactions through the contract, as well as functionality for validating signatures supporting interoperability among accounts, protocols, and dapps.


## Motivation

With native Account Abstraction, Starknet has a lot of flexibility in the management of accounts rather than having their behavior determined at the protocol level. Different use cases are and will continue to bring different implementations of accounts to the ecosystem.

Having a Standard Account Interface supports different dapps, protocols, and standard contracts (like tokens) that often require interaction with accounts in a predictable way, either by recognizing them or by expecting certain features that may not be implemented otherwise.

## Specification

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### Interfaces

*Every SNIP-6 compliant account must implement the `SRC6` and `SRC5` (from [SNIP-5](./snip-5.md)) interfaces*:

```cairo
/// @title Represents a call to a target contract
/// @param to The target contract address
/// @param selector The target function selector
/// @param calldata The serialized function parameters
struct Call {
    to: ContractAddress,
    selector: felt252,
    calldata: Array<felt252>
}

/// @title SRC-6 Standard Account
trait ISRC6 {
    /// @notice Execute a transaction through the account
    /// @param calls The list of calls to execute
    /// @return The list of each call return value (serialized)
    fn __execute__(calls: Array<Call>) -> Array<Span<felt252>>;

    /// @notice Assert whether the transaction is valid to be executed
    /// @param calls The list of calls to execute
    /// @return The string 'VALID' represented as felt when is valid
    fn __validate__(calls: Array<Call>) -> felt252;

    /// @notice Assert whether a given signature for a given hash is valid
    /// @param hash The hash of the data
    /// @param signature The signature to validate
    /// @return The string 'VALID' represented as felt when the is valid
    fn is_valid_signature(hash: felt252, signature: Array<felt252>) -> felt252;
}

/// @title SRC-5 Standard Interface Detection
trait ISRC5 {
    /// @notice Query if a contract implements an interface
    /// @param interface_id The interface identifier, as specified in SRC-5
    /// @return `true` if the contract implements `interface_id`, `false` otherwise
    fn supports_interface(interface_id: felt252) -> bool;
}
```

Notice that, ff the signature, the return value of `is_valid_signature` MUST be the same that the one expected from the `__validate__` entrypoint, that can be obtained doing:

```
let VALIDATED: felt252 = 'VALID';
```

## Backwards Compatibility

Currently there are multiple accounts using `bool` as the `is_valid_signature` return value. While in the future we expect that most of the accounts will migrate to this standard, in the meantime, we recommend dapps and protocols using this feature to check for both `true` or `'VALID'`.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).