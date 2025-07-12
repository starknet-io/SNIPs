---
snip: 4
title: Cairo Comment Standard
author: Orlando Fraser <orlandothefraser@gmail.com>
status: Final
type: Informational
created: 2022-06-13
---

## Simple Summary

A standard for writing comments in Cairo contracts.

Inspired by [Natspec](https://docs.soliditylang.org/en/v0.8.14/natspec-format.html) comments for Solidity.

## Abstract

The following standard provides a consistent way for Cairo contracts and their functionality to be documented. I propose that initially this should just be informational, however in future it could be integrated into the Cairo compiler to allow automated documentation generation. 


## Motivation

A comment standard increases the readability of contracts which makes it easier to ensure their correct functionality. 


## Specification

All tags are optional. The following table explains the purpose of each tag and where it may be used. 

| Tag     | Description                               | Context                                               |
|---------|-------------------------------------------|-------------------------------------------------------|
| @title  | Description of the cairo file             | header                                                |
| @author | Name and contact details of the author(s) | header                                                |
| @notice | Explain to an end user what this does     | header, storage variable, function, event, interface  |
| @dev    | Explain to a developer any extra details  | header, storage variable, function, event, interface  |
| @param  | Documents a parameter                     | storage variable, function, event                     |
| @return | Documents a return variable               | storage variable, function                            |

### Headers 

A header comment is a comment block that can be placed at the top of each cairo file, immediately following the imports. The header contains general information about the contents of the file including a brief description and an author.

### Arrays 

When working with arrays, @param and @return tags should only be applied to the pointer variable and not for the length.  One can document the contents of the array in this single tag. 

### Example Contract
```
// SPDX-License-Identifier: MIT
#[starknet::contract]

use starknet::ContractAddress;
use starknet::get_caller_address;

//
// @title Simple Savings Account
// @author Vitalik Buterin - vitalik.buterin@ethereum.org
// @notice A contract to track users' savings in various pots
//

#[storage]
struct Storage {
    // @dev Stores the balances of each pot
    // @param address: Address of the user
    // @param pot_index: Index of the pot
    // @return amount: The amount stored
    balance: LegacyMap<(ContractAddress, u32), u256>
}

#[generate_trait]
impl SavingsImpl of SavingsTrait {
    // @dev Updates a user's balance in a specified pot
    // @param amount: Amount to increase the balance by
    // @param pot_index: Index of the pot
    #[external]
    fn increase_balance(ref self: ContractState, amount: u256, pot_index: u32) {
        let address = get_caller_address();
        let current = self.balance.read((address, pot_index));
        self.balance.write((address, pot_index), current + amount);
    }
}
```

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
