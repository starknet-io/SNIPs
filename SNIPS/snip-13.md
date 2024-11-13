---
snip: 13
title: Index `Transfer` and `Approval` events in ERC20s
author: Natan Granit <natan@starkware.co>
status: Draft
type: Standards Track
created: 2024-05-05
---

## Abstract

Events in Starknet consist of two felt arrays, `keys` and `data`, the former is analogous to topics on Ethereum. Similarly to Ethereum, Starknet’s json-rpc allows you to filter over event keys via the `starknet_getEvents` method.

In this SNIP we suggest updating StarkGate's ERC20s (including ETH, STRK, USDC [and others](https://github.com/starknet-io/starknet-addresses/blob/master/bridged_tokens/mainnet.json)) to index more fields in the `Transfer` and `Approval` events in order to allow filtration over the sender or receiver.

## Motivation

Dapps, for example exchanges that operate on Starknet, need to track transfers from & to specific addresses. At the moment, Starknet's json-rpc only allows receiving all `Transfer` or `Approval` events from a given ERC20 in a particular block range. This SNIP would enable filtering those events, allowing filtering by `from` or `to` in `Transfer` events and by `owner` or `spender` in `Approval` events.

This is already the case on Ethereum and other EVM chains. Due to limitations in early iterations of Cairo, events had only one key corresponding to the event name. This lead to only being able to filter over all transfer events, which is far from ideal.

## Backward Compatability

**This change is NOT backward compatible**. All DAPPs listening to ERC20 transfer and approval events will have to adjust their events decoding, in order to look for fields in the `keys` array instead of in the `data` array.

## Specification

Starknet's json-rpc [`starknet_getEvents` method](https://github.com/starkware-libs/starknet-specs/blob/76bdde23c7dae370a3340e40f7ca2ef2520e75b9/api/starknet_api_openrpc.json#L798), takes an `EventFilter` object, which contains a nested list of keys to be matched against. For example, if the user sent an event filter containing $\big[[k_1, k_2], [\;], [k_3]\big]$, then the node should return events whose first key is $k_1$ or $k_2$, and the third key is $k_3$, and the second key is unconstrained and can take any value. This functionality is supported by various Starknet SDKs, for example, see the following [starknet.js tutorial](https://www.starknetjs.com/docs/guides/events#without-transaction-hash) to see how to filter events.

Currently, these are the `Transfer` and `Approval` events in all StarkGate's ERC20s:

```rust
    /// Emitted when tokens are moved from address `from` to address `to`.
    #[derive(Copy, Drop, PartialEq, starknet::Event)]
    struct Transfer {
        // #[key] - Not indexed, to maintain backward compatibility.
        from: ContractAddress,
        // #[key] - Not indexed, to maintain backward compatibility.
        to: ContractAddress,
        value: u256
    }

    /// Emitted when the allowance of a `spender` for an `owner` is set by a call
    /// to [approve](approve). `value` is the new allowance.
    #[derive(Copy, Drop, PartialEq, starknet::Event)]
    struct Approval {
        // #[key] - Not indexed, to maintain backward compatibility.
        owner: ContractAddress,
        // #[key] - Not indexed, to maintain backward compatibility.
        spender: ContractAddress,
        value: u256
    }
```
This SNIP basically suggests to uncomment the above `#[key]` annotations:

```rust
    /// Emitted when tokens are moved from address `from` to address `to`.
    #[derive(Drop, PartialEq, starknet::Event)]
    struct Transfer {
        #[key]
        from: ContractAddress,
        #[key]
        to: ContractAddress,
        value: u256
    }

    /// Emitted when the allowance of a `spender` for an `owner` is set by a call
    /// to `approve`. `value` is the new allowance.
    #[derive(Drop, PartialEq, starknet::Event)]
    struct Approval {
        #[key]
        owner: ContractAddress,
        #[key]
        spender: ContractAddress,
        value: u256
    }
```
That is, a transfer from 0x1 to 0x2 of 100 tokens, now emits:

`keys`: [selector(“Transfer”)]

`data`: [0x1, 0x2, 100, 0]

The first two felts in the data array are the values of `from` and `to` correspondingly, and the last two felts are the low and high 128bits of the u256 of the amount.

If this SNIP is accepted, the emitted event will change to:

`keys`: [selector(“Transfer”), 0x1, 0x2]

`data`: [100, 0]

Where `selector(x)` is the [sn_keccak](https://docs.starknet.io/documentation/architecture_and_concepts/Cryptography/hash-functions/#starknet_keccak) of `x`    .

## Security Considerations

Dapps who did not change their code to parse events differently may break after the ERC20 contracts are upgraded.

We considered whether or not the change suggested in this SNIP can be leveraged to cause more damage. The scenario we analyzed is the following: can an exchange that did not change its code be led to thinking that a transfer has been made to its account, thus crediting an account on the exchange, while in fact no such transaction took place.

We claim that this is not possible. Currently, DAPPs take the `from` and `to` values from the first and second members of the `data` array. After the change, the first and second members of the `data` array would be `amount_low` and `amount_high` correspondingly. Since both `amount_low` and `amount_high` are enforced to be 128bit numbers, and thus contain 124 leading zeros, these can not collide with an account address on Starknet, which is [necessarily](https://docs.starknet.io/documentation/architecture_and_concepts/Smart_Contracts/contract-address/) the result of a hash computation.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
