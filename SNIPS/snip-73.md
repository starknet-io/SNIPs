---
snip: 73
title: Starknet Inscription Standard
author: Ben77 <codingqi@gmail.com>, 
BryanIngte<BryanIngte@gmail.com>, 
TimoWinder<timowinder@proton.me>, 
Cryptonerdcn<cryptonerdcn@gmail.com>
discussions-to: 
status: Draft
type: Standards Track
category: SRC
created: 2024--01-11
---

## Simple Summary

This is an inscription standard adapted for the Cairo-vm on Starknet, it provides compatibility with other inscription standards and cross-chain capabilities.

## Abstract

This Standard, `SNRC-20` is designed to streamline operations by minimizing unnecessary components prevalent in traditional inscription standards like BRC-20. It leverages the Poseidon HASH algorithm, optimized for Zero-Knowledge Proofs, facilitating efficient off-chain hash computation and L2->L1 messaging.

## Motivation

The motivation behind SNRC-20 is to provide a robust and efficient standard for inscription. Since Starknet does not use the UTXO model or EVM, it is inefficient to directly use standards similar to BRC-20 or ETHS.
By adopting off-chain calculations and hash transmission, SNRC-20 significantly reduces on-chain workload, leading to improved transaction efficiency and lower costs.

## Specification

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

## Overview

Due to the presence of many unnecessary parts in the traditional BRC-20 inscription, SNRC-20 adopts the approach of Off-Chain calculation and transmission of hashes for inscription.
SNRC-20 defines three primary operations for inscription: `deploy`, `mint`, and `transfer`. These operations incorporate off-chain calculations with on-chain confirmations, maintaining integrity while ensuring flexibility.
SNRC-20 inscribes the operations' hash of inscription on the L2->L1 message, allowing it to be verified on Ethereum L1.
SNRC-20 also includes interfaces for SNRC-20-compatible smart contracts and indexing methodologies.

![mechanism](https://images2.imgbox.com/da/8e/3MAMB2eC_o.jpeg)

## Hash Calculation

SNRC-20 uses the Cairo language to calculate the hash of the inscription, so you can calculate it on-chain or off-chain(OPTIONAL).

### Calculate Deploy Operation's Hash

Consider the following inscription format, similar to [BRC-20](https://domo-2.gitbook.io/brc-20-experiment/):
```json
{ 
  "p": "snrc-20",
  "op": "deploy",
  "tick": "nwhp",
  "max": "19770525",
  "lim": "19770525" 
}
```

It's important to note that, since the default type of the Cairo virtual machine is `Felt252`, all numerical parameters should be of the u128 type, which ranges from `0` to `2^128-1` and can fit within 252 bits. The type requirements are as follows:

|  Key   | type  | Description |  
|  ----  | ----  | ----  |
| p  | Felt252(ShortString) | Protocol: Helps other systems identify and process snrc-20 events |
| op | Felt252(ShortString) | Operation: Type of event (Deploy, Mint, Transfer) |
| tick | Felt252(ShortString) | Ticker: A string identifier of the snrc-20 |
| max | Felt252(u128) | Max supply: set max supply of the snrc-20 |
| lim | Felt252(u128) | Mint limit: Limit per tx for users |

At the same time, to be compatible with the [ETHS](https://docs.ethscriptions.com/overview/protocol-specification#how-to-validate-a-datauri) standard, we also need to satisfy the validation of `contentURI`.

Therefore, the final Deploy inscription format involved in the calculation is as follows:

```json
data:,{ 
  "p": "snrc-20",
  "op": "deploy",
  "tick": "nwhp",
  "max": "19770525",
  "lim": "19770525" 
}
```

Next, we need to calculate the `Poseidon Hash` of the fixed part of the Mint inscription. The complete Cairo program code is as follows :

```rust,editable
use core::clone::Clone;
use core::serde::Serde;
use core::poseidon::PoseidonTrait;
use core::byte_array::ByteArrayTrait;
use core::hash::{HashStateTrait, HashStateExTrait};
use core::array::{ArrayTrait, SpanTrait};
use core::traits::{Into, TryInto};

fn main() -> felt252 {
    /// Replace this with your own data. Be careful you should stringify it first.
    let tick = 'nwhp';
    let max: u128 = 19770525;
    let lim: u128 = 19770525;
    let payload_pref: ByteArray = "data:,{\"p\":\"snrc-20\",\"op\":\"deploy\",\"tick\":\"";
    let payload_max: ByteArray = "\",\"max\":\"";
    let payload_lim: ByteArray = "\",\"lim\":\"";
    let payload_remain: ByteArray = "\"}";

    let mut output_array = ArrayTrait::<felt252>::new();
    let mut i: usize = 0;
    /// This is the same as `let serialized = payload.serialize(ref output_array);`
    /// , but it still not supported by the online compiler
    ///
    loop {
        if i >= payload_pref.len() {
            break;
        }
        let char = payload_pref.at(i).unwrap();
        char.serialize(ref output_array);
        i += 1;
    };
    tick.serialize(ref output_array);
    i=0;
    loop {
        if i >= payload_max.len() {
            break;
        }
        let char = payload_max.at(i).unwrap();
        char.serialize(ref output_array);
        i += 1;
    };
    i=0;
    max.serialize(ref output_array);
    loop {
        if i >= payload_lim.len() {
            break;
        }
        let char = payload_lim.at(i).unwrap();
        char.serialize(ref output_array);
        i += 1;
    };
    i=0;
    lim.serialize(ref output_array);
    loop {
        if i >= payload_remain.len() {
            break;
        }
        let char = payload_remain.at(i).unwrap();
        char.serialize(ref output_array);
        i += 1;
    };
    core::poseidon::poseidon_hash_span(output_array.span())
}
```

The return value of this Cairo program is

`916838225186069478585876038986673186814268706728240273539841908638806157666`

, represented in hex as

`0x206E97BD728106AAE642A8847107EF91922321FF00A4FEB7A99880D4D8BA962`.

This is the hash value corresponding to the Deploy operation.

Through this hash value, we will be able to identify what operations the user has performed on chain in the indexer, and restore the complete inscription by searching the hash table.

### Calculate Mint Operation's Hash

For any mint operation, we need to prepare the following standard inscription format similar to [BRC-20](https://domo-2.gitbook.io/brc-20-experiment/), but without `amt`:
```json
{ 
  "p": "snrc-20",
  "op": "mint",
  "tick": "tick"
}
```

At the same time, to be compatible with the [ETHS](https://docs.ethscriptions.com/overview/protocol-specification#how-to-validate-a-datauri) standard, we also need to satisfy the validation of `contentURI`. Therefore, the final Mint inscription format involved in the calculation is as follows:
```json
data:,{ 
  "p": "snrc-20",
  "op": "mint",
  "tick": "tick"
}
```

Next, we need to calculate the `Poseidon Hash` of the fixed part of the Mint inscription. The complete Cairo program code is as follows(The following code block is editable and runnable) :

```rust,editable
use core::serde::Serde;
use core::poseidon::PoseidonTrait;
use core::byte_array::ByteArrayTrait;
use core::hash::{HashStateTrait, HashStateExTrait};
use core::array::{ArrayTrait, SpanTrait};
use core::traits::{Into, TryInto};

fn main() -> felt252 {
    /// Replace this with your own data. Be careful you should stringify it first.
    let tick = 'nwhp';
    let payload_pref: ByteArray = "data:,{\"p\":\"snrc-20\",\"op\":\"mint\",\"tick\":\"";
    let payload_remain: ByteArray = "\"}";
    let mut output_array = ArrayTrait::<felt252>::new();
    let mut i: usize = 0;
    /// This is the same as `let serialized = payload.serialize(ref output_array);`
    /// , but it still not supported by the online compiler
    ///
    loop {
        if i >= payload_pref.len() {
            break;
        }
        let char = payload_pref.at(i).unwrap();
        char.serialize(ref output_array);
        i += 1;
    };
    tick.serialize(ref output_array);
    let mut i: usize = 0;
    loop {
        if i >= payload_remain.len() {
            break;
        }
        let char = payload_remain.at(i).unwrap();
        char.serialize(ref output_array);
        i += 1;
    };
    core::poseidon::poseidon_hash_span(output_array.span())
}

```

The return value of this Cairo program is

`1469956484733314490006856178496349941983860913245365919661958978345090908382`,

represented in hex as

`0x33FF744581AA76AFA81006908ADC9A41B68FACB15ECF5E980EF56F9910380DE`.


### Calculate Transfer Operation's Hash

For any transfer operation, we need to prepare the following standard inscription format similar to [BRC-20](https://domo-2.gitbook.io/brc-20-experiment/), but without `amt`:
```json
{ 
  "p": "snrc-20",
  "op": "transfer",
  "tick": "tick"
}
```

At the same time, to be compatible with the [ETHS](https://docs.ethscriptions.com/overview/protocol-specification#how-to-validate-a-datauri) standard, we also need to satisfy the validation of `contentURI`. Therefore, the final Transfer inscription format involved in the calculation is as follows:
```json
data:,{ 
  "p": "snrc-20",
  "op": "transfer",
  "tick": "tick"
}
```

Next, we need to calculate the `Poseidon Hash` of the fixed part of the Transfer inscription. The complete Cairo program code is as follows(The following code block is editable and runnable) :

```rust,editable
use core::serde::Serde;
use core::poseidon::PoseidonTrait;
use core::byte_array::ByteArrayTrait;
use core::hash::{HashStateTrait, HashStateExTrait};
use core::array::{ArrayTrait, SpanTrait};
use core::traits::{Into, TryInto};

fn main() -> felt252 {
    /// Replace this with your own data. Be careful you should stringify it first.
    let tick = 'nwhp';
    let payload_pref: ByteArray = "data:,{\"p\":\"snrc-20\",\"op\":\"transfer\",\"tick\":\"";
    let payload_remain: ByteArray = "\"}";
    let mut output_array = ArrayTrait::<felt252>::new();
    let mut i: usize = 0;
    /// This is the same as `let serialized = payload.serialize(ref output_array);`
    /// , but it still not supported by the online compiler
    ///
    loop {
        if i >= payload_pref.len() {
            break;
        }
        let char = payload_pref.at(i).unwrap();
        char.serialize(ref output_array);
        i += 1;
    };
    tick.serialize(ref output_array);
    let mut i: usize = 0;
    loop {
        if i >= payload_remain.len() {
            break;
        }
        let char = payload_remain.at(i).unwrap();
        char.serialize(ref output_array);
        i += 1;
    };
    core::poseidon::poseidon_hash_span(output_array.span())
}

```

The return value of this Cairo program is

`3186081088044837381540966151676090343793197013422856004776743671156846440042`,

represented in hex as

`0x70B420BAF038B3D467D80FD313B0D2AEDBEB46B7157CED682649D4507292E6A`.

## SNRC-20 Contract Implementation

An `SNRC-20` contract (a contract that can issue `SNRC-20` operations) MUST implements the following three functions:

### Deploy function
The Deploy function is used to actually inscribe the Deploy operation's inscription.
A Deploy operation requires the following six parameters:

|  Paramter   | type  | Description |  
|  ----  | ----  | ----  |
| Deploy_hash  | Felt252 | Hash of Deploy operation |
| Mint_hash | Felt252 | Hash of Mint operation |
| Transfer_hash | Felt252 | Hash of Transfer operation|
| Tick | Felt252(ShortString) | Ticker: A string identifier of the snrc-20 |
| Max | Felt252(u128) | Max supply: Max supply of the snrc-20 |
| Lim | Felt252(u128) | Mint limit: Limit per tx for users |

Where `deploy_hash`, `mint_hash`, `transfer_hash` are the `Poseidon Hash` corresponding to the Deploy, Mint, and Transfer inscriptions respectively.

An example:

```json
"Deploy_hash": "0x206E97BD728106AAE642A8847107EF91922321FF00A4FEB7A99880D4D8BA962"
"Mint_hash": "0x33FF744581AA76AFA81006908ADC9A41B68FACB15ECF5E980EF56F9910380DE"
"Transfer_hash": "0x70B420BAF038B3D467D80FD313B0D2AEDBEB46B7157CED682649D4507292E6A",
"Tick": "nwhp",
"Max": 19770525,
"Lim": 19770525
```

Then, the contract that complies with the `SNRC-20` standard will inscribe the above input into the `L2->L1` Message.

### Mint function
The Mint function is used to actually inscribe the Mint operation's inscription.
A Mint operation requires the following two parameters:

|  Paramter   | type  | Description |  
|  ----  | ----  | ----  |
| Mint_hash  | Felt252 | Hash of Mint operation |
| Amount | Felt252(u128) | Amount of mint  |

Referring to the `Lim` field in the previous `Deploy` operation example, we can set `Amount` to 19770525.

Therefore, the input value in this example should be:
```json
"Mint_hash": "0x33FF744581AA76AFA81006908ADC9A41B68FACB15ECF5E980EF56F9910380DE"
"Amount": 19770525
```

Then, the contract that complies with the `SNRC-20` standard will inscribe the above input into the `L2->L1` Message.

### Transfer function
The Transfer function is used to actually inscribe the Transfer operation's inscription.
A Transfer operation requires the following three parameters:

|  Paramter   | type  | Description |  
|  ----  | ----  | ----  |
| Transfer_hash  | Felt252 | Hash of Transfer operation |
| Sender  | Felt252(address) | Address of the sender |
| Recipient  | Felt252(address) | Address of the recipient |
| Amount | Felt252(u128) | Amount of transfer  |

For the Transfer operation, there is no `Lim` limit -- of course, you cannot transfer more than the amount of inscription balance you own.

Therefore, the input value in this example coulb be:
```json
"Transfer_hash": "0x70B420BAF038B3D467D80FD313B0D2AEDBEB46B7157CED682649D4507292E6A"
"Sender": "Sender's address"
"Recipient": "Recipient's address"
"Amount": 19770525
```

Then, the contract that complies with the `SNRC-20` standard will inscribe the above input into the `L2->L1` Message.

## L2->L1 Messaging

In the `SNRC-20` standard, we use the Messaging System to send the content of the inscriptions to Ethereum L1. This allows the inscriptions to be verified on Ethereum as well, providing new possibilities for cross-chain operations of inscription.

You MUST inscribe the outputs of `deploy`, `mint`, and `transfer` as the payloads, on the L2->L1 Message.

At the same time, you SHOULD deploy your own contract on L1 to consume these Messages.

## History

This SNIP is inspired by:

[BRC-20](https://domo-2.gitbook.io/brc-20-experiment/)
[ETHS](https://docs.ethscriptions.com/overview/protocol-specification#how-to-validate-a-datauri)

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
