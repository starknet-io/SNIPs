---
snip: 5
title: Event subscription on starknet nodes
description: add event subscription on starknet nodes using JSON-RPC notifications
author: Matthieu Auger <matthieu.auger@gmail.com>
discussions-to: N/A
status: Draft
type: Standards Track
category: Interface
created: 2023-01-05

---

## Abstract

This SNIP proposes the addition of event subcription on StarkNet nodes using JSON-RPC notifications, allowing clients to subscribe to blockchain events and receive notifications in real-time.

## Motivation

Currently, StarkNet clients must poll the node for updates, resulting in increased network traffic and slower response times. Event subscription offer a more efficient means of receiving event notifications, reducing the burden on both clients and nodes.

## Specification

We will add a new method, `starknet_subscribe`, to the StarkNet JSON-RPC specification. This method will allow clients to subscribe to specific events or sets of events, and receive notifications when those events occur.

To create a subscription, the client will use the `starknet_subscribe` method:

```json
{"jsonrpc":"2.0","id":"0", "method": "starknet_subscribe", "params": ["sync"]}
```

The `event_name` parameter specifies the event or set of events to subscribe to.

The node will return a subscription ID:

```json
{"jsonrpc":"2.0","id":1,"result":"0x1"}
```

Once subscribed, the API will publish notifications using the `starknet_subscription` method, including the subscription ID:

```json
{"jsonrpc":"2.0","method":"starknet_subscription","params":{"subscription":"0x1","result":{"startingBlock":"0x0","currentBlock":"0x50","highestBlock":"0x343c19"}}}
```

Subscriptions are coupled with connections. If a connection is closed, all subscriptions created over the connection are removed.

**other potential implementation**

Instead of having a single `starknet_subscribe` method with the event in params, another alternative would be separate methods for each event.
For example:

```json
{"jsonrpc":"2.0","id":"0", "method": "starknet_subscribe_newHeads", "params": []}
{"jsonrpc":"2.0","id":"0", "method": "starknet_subscribe_sync", "params": []}
{"jsonrpc":"2.0","id":"0", "method": "starknet_subscribe_logs", "params": []}
```

This SNIP propose an implementation close to the one implemented in Ethereum clients to ease onboarding and consistency but to date there are no known benefits from having a single method instead of separate ones.

### Supported subscriptions

* [New headers](#newHeads)
* [Logs](#logs)
* [Pending transactions](#newPendingTransactions)
* [Syncing](#syncing)

#### newHeads

Fires a notification each time a new header is appended to the chain, including chain reorganizations.

In case of a chain reorganization the subscription will emit all new headers for the new chain. Therefore the subscription can emit multiple headers on the same height.

##### Example

```json
{"id": 1, "method": "starknet_subscribe", "params": ["newHeads"]}
```

```json
{
  "jsonrpc": "2.0",
  "method": "starknet_subscription",
  "params": {
    "result": {
        "status": "ACCEPTED_ON_L1",
        "block_hash": "0x0",
        "parent_hash": "0x1",
        "block_number": 0,
        "new_root": "0x2",
        "timestamp": 1,
        "sequencer_address": "0x3",
        "transactions": [
            {
                "type": "DECLARE",
                "transaction_hash": "0x4",
                "max_fee": "0x5",
                "version": "0x6",
                "signature": [
                    "0x7"
                ],
                "nonce": "0x8",
                "class_hash": "0x9",
                "sender_address": "0xa"
            },
            {
                "type": "INVOKE",
                "transaction_hash": "0x4",
                "max_fee": "0x5",
                "version": "0x6",
                "signature": [
                    "0x7"
                ],
                "nonce": "0x8",
                "contract_address": "0xb",
                "entry_point_selector": "0xc",
                "calldata": [
                    "0xd"
                ]
            },
            {
                "type": "DEPLOY",
                "transaction_hash": "0xe",
                "version": "0x1",
                "contract_address": "0xf",
                "contract_address_salt": "0xee",
                "class_hash": "0x10",
                "constructor_calldata": [
                    "0x11"
                ]
            }
        ]
    },
    "subscription": "0x9ce59a13059e417087c02d3236a0b1cc"
  }
}
```

#### logs

Returns logs that are included in new imported blocks and match the given filter criteria.

In case of a chain reorganization previous sent logs that are on the old chain will be resend with the `removed` property set to true. Logs from transactions that ended up in the new chain are emitted. Therefore a subscription can emit logs for the same transaction multiple times.

##### Parameters

1. `object` with the following (optional) fields
    * **address**, either an address or an array of addresses. Only logs that are created from these addresses are returned (optional)
    * **topics**, only logs which match the specified topics (optional)

##### Example

```json
{"id": 1, "method": "starknet_subscribe", "params": ["logs", {"address": "0x8320fe7702b96808f7bbc0d4a888ed1468216cfd", "topics": ["0xd78a0cb8bb633d06981248b816e7bd33c2a35a6089241d099fa519e361cab902"]}]}
```

```json
{"jsonrpc":"2.0","method":"starknet_subscription","params": {"subscription":"0x4a8a4c0517381924f9838102c5a4dcb7","result":{"address":"0x8320fe7702b96808f7bbc0d4a888ed1468216cfd","blockHash":"0x61cdb2a09ab99abf791d474f20c2ea89bf8de2923a2d42bb49944c8c993cbf04","blockNumber":"0x29e87","data":"0x00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003","logIndex":"0x0","topics":["0xd78a0cb8bb633d06981248b816e7bd33c2a35a6089241d099fa519e361cab902"],"transactionHash":"0xe044554a0a55067caafd07f8020ab9f2af60bdfe337e395ecd84b4877a3d1ab4","transactionIndex":"0x0"}}}
```

#### newPendingTransactions

Returns the hash for all transactions that are added to the pending state and are signed with a key that is available in the node.

When a transaction that was previously part of the canonical chain isn't part of the new canonical chain after a reogranization its again emitted.

##### Parameters

none

##### Example

```json
{"id": 1, "method": "starknet_subscribe", "params": ["newPendingTransactions"]}
```

```json
{
    "jsonrpc":"2.0",
    "method":"starknet_subscription",
    "params":{
        "subscription":"0xc3b33aa549fb9a60e95d21862596617c",
        "result":"0xd6fdc5cc41a9959e922f30cb772a9aef46f4daea279307bc5f7024edc4ccd7fa"
    }
}
```

#### syncing

Indicates when the node starts or stops synchronizing. The result can either be a boolean indicating that the synchronization has started (true), finished (false) or an object with various progress indicators.

##### Parameters

none

##### Example

```json
{"id": 1, "method": "starknet_subscribe", "params": ["syncing"]}
```

```json
{"subscription":"0xe2ffeb2703bcf602d42922385829ce96","result":{"syncing":true,"status":{"startingBlock":674427,"currentBlock":67400,"highestBlock":674432,"pulledStates":0,"knownStates":0}}}}
```

## Rationale

The `starknet_subscribe` method is based on the `eth_subscribe` method used in the Besu and Geth JSON-RPC specifications, which has proven to be a reliable and efficient way to subscribe to blockchain events. By following this established standard, we can ensure homogeneity with other Ethereum-based clients.

## Backwards Compatibility

Current implementation introduces new method to the StarkNet JSON-RPC specification, but do not introduce any backwards compatibility issues. Clients that do not support the `starknet_subscribe` will simply ignore them and continue to function as before.

## Test Cases

Test cases for these options can be found in `assets/snip-XXX/tests.json`.

## Reference Implementation

Reference implementations for the `starknet_subscribe` in <https://github.com/matthieuauger/pathfinder/pull/5>

## Security Considerations

Websocket connections introduce the potential for malicious clients to flood the node with subscription requests, potentially causing a denial of service. To mitigate this risk, we will implement rate limiting on the number of subscriptions allowed per connection.

## Copyright Waiver

Copyright and related rights waived via [MIT](../LICENSE).
