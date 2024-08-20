---
snip: 16
title: Deprecation of transaction versions 0,1,2
description: This SNIP proposes to deprecate transaction versions 0,1,2 and stop support for them around the end of Q1 of 2025.
author: Ilia Volokh <iliav@starkware.co>
discussions-to: https://community.starknet.io/t/snip-16-deprecation-of-transaction-versions-0-1-2/114443
status: Review
type: Standards Track
category: Core
created: 2024-07-02
---

## Simple Summary
In the context of a fee market, transaction versions 0,1,2 are inferior to and incompatible with transaction version 3: they support a different fee token and have inferior bid structure.

We propose to deprecate transaction versions 0,1,2 and to stop supporting them once the mempool is implemented in the sequencer.

## Motivation

The sequencer currently processes transactions in FIFO. During congestion block space becomes scarce. To improve UX in such cases, Starknet will have a fee market which will allow users to express value and time preference.

Transaction version 3 was introduced with a 1559-type fee market in mind. First, it facilitates fee payment in STRK, which is designated as the only native fee token. Second, its bid structure names a price per unit resource, allowing the sequencer to easily compare bids.

Transaction versions 0,1,2 only support fee payment in ETH. Moreover, they have an inferior bid structure which causes inefficiencies in economic calculation by the sequencer. Specifically, the user submits a max fee, but does not directly specify a max fee per unit resource nor a max amount. There is no way to deduce either of these numbers from max fee. Consequently, there's no intelligent way to decompose the user's bid into a "base" fee and a "tip".

## Proposal

We propose for the sequencer to stop support for transaction versions 0,1,2 in an upcoming version in preparation for integrating the mempool and fee market, which is expected to happen within 6-8 months. Concretely, we propose for these transaction versions to be rejected at the gateways to the mempool.

To facilitate continuation of fee payment in ETH, we propose to adopt paymasters. The decision between applicative paymasters such as the one by AVNU or protocol-level paymasters will be left to applications/wallets. (A detailed SNIP for a protocol-level paymaster is in the works.)

## Rationale
We submit that paymasters are the correct solution for multiple fee tokens. Consequently there is no justification for contrived solution to facilitate continued support for old transaction versions.

## Drawbacks

1. Transaction versions 0,1,2 facilitate native fee payment in ETH. Their deprecation means ETH will no longer be a native fee token.

2. At present a large portion of transactions pay fees in ETH. Consequently, a large portion of the demand will have to go through a different flow for fee payment, likely requiring changes from wallets and potentially (depending on the method of paymaster adoption) also DApps and infrastructre (SDKs).

3. Old accounts, namely those predating the separation of `validate` and `execute`, can only be accessed via transactions v0. Hence deprecating this transaction version renders all such accounts (and their assets) inaccessible. We will address this issue in a separate SNIP.

## Alternatives

Below we present some alternative proposals and our reasoning against them.

1. Reserved but gradually decreasing block space for transaction versions ≤2, with temporary support for a designated FIFO queue.

2. Concurrent fee markets on transactions paying in ETH and in STRK, with the sequencer taking on ETH↔STRK conversion. Note it's unclear how to implement a fee market for transaction versions 0,1,2 since merely sorting according to max fee disregards the computational resources expended by the tx.

## Backwards Compatibility
This proposal kills off the currently supported flows of sending transaction versions 0,1,2. Moreover, a separate proposal is required to address access to old accounts.

## Security Considerations
This proposal introduces no vulnerabilities, but necessitates a separate discussion about accounts which predate the separation of `validate` and `execute`.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
