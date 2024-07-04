# Draft---
snip: 16
title: Deprecation of transaction versions 0,1,2
author: Ilia Volokh <iliav@starkware.co>
discussions-to: 
status: Draft
type: Core
created: July 2, 2024
---

## Simple Summary
In the context of a fee market, transaction versions 0,1,2 are inferior to and incompatible with transaction version 3: they support a different fee token and have inefrior bid structure.

We propose to depracate transaction versions 0,1,2 and to stop supporting them once the mempool is implemented in the sequencer.

## Motivation

The sequencer currently processes transactions in FIFO. During congestion block space becomes scarce. To improve UX in such cases, Starknet will have a fee market which will allow users to express value and time preference.

Transaction version 3 was introduced with a 1559-type fee market in mind. First, it facilitates fee payment in STRK, which is designated as the only native fee token. Second, its bid structure names a price per unit resource, allowing the sequencer can easily compare bids.

Transaction versions 0,1,2 only support fee payment in ETH. Moreover, they have an inferior bid structure which causes inefficiencies in economic calculation by the sequencer. Specifically, the user submits a max fee and a max amount of resources, but does not directly specify a max fee per unit resource. Such a number could be deduced from the quotient, but it is unclear how to decompose it into a "base" fee and a "tip".

## Proposal

We propose for the sequencer to stop support for transaction versions 0,1,2 in an upcoming version in preparation for integrating the mempool and fee market.

To facilitate continuation of fee payment in ETH, we propose to adopt paymasters. The decision between applicative paymasters such as the one by AVNU or protocol-level paymasters will be left to applications/wallets. (A detailed SNIP for a protocol-level paymaster is in the works.)

## Drawbacks

Transaction versions 0,1,2 facilitate native fee payment in ETH. Their deprecation means ETH will no longer be a native fee token.

At present a large portion of transactions pay fees in ETH. Consequently, a large portion of the demand will have to go through a different flow for fee payment, likely requiring changes from wallets and potentially (depending on the method of paymaster adoption) also DApps and infrastructre (SDKs).

## Alternatives

Below we present some alternative proposals and our reasoning against them.

1. Reserved but gradually decreasing block space for transaction versions ≤2, with temporary support for a designated FIFO queue.

2. Concurrent fee markets on transactions paying in ETH and in STRK, with the sequencer taking on ETH↔STRK conversion, alongside some policy of decomposing global bids into a base fee and a tip.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
