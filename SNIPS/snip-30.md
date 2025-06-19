---
snip: 30 
title: Starknet v0.14.0
description: Proposed features for v0.14.0
author: Leonardo Lerer (leo@starkware.co)
status: Draft
type: Standard
category: Core
---

## Simple Summary

Starknet v0.14.0 proposes a first milestone towards decentralization: decentralizing the architecture of the sequencer. This means having n > 1 independent sequencers  (instead of a single one) taking turns in building blocks and running Tendermint consensus on every block, with 1 block finality. The operation and control of the sequencers is still centralized in v0.14.0: the decentralization roadmap Starknet post-v0.14.0 consists of a gradual decentralization of those components, with the end goal of fully decentralized sequencing and proving.

This version also introduces pre-confirmations: an intermediate transaction status with subsecond latency and very good finality properties.

The purpose of this SNIP is to describe the features to be included in the v0.14.0 proposal and the current ongoing discussions.


## Motivation

The motivation for the features of v0.14.0 is decentralized sequencing. The main motivations for the decentralized sequencing are, by now, well-known:
1. Censorship resistance
2. Fair ordering of transactions (when coupled with a proposer-builder separation)
3. Neutrality
4. Fault tolerance

Trust minimization is a core value of Starknet: while validity proofs ensure that execution of the VM is trustless (regardless of the sequencing setup), decentralized sequencing is needed to ensure credibly neutral transaction inclusion and ordering.
This version (together with Staking v2) aims to be the first big step in setting much of the technical infrastructure in place for the next phases of decentralization.

## Specification

In what follows we briefly describe the main changes of the version and point to the [release notes](https://community.starknet.io/t/sn-0-14-0-pre-release-notes/115618) for a wider discussion.

### Block times and transaction size

In v0.14.0 the maximum block time will be around 4 to 6 seconds. More precisely, the proposer of the block has a timeout of `t` to propose a block: 
1. If there are enough available transactions or big enough transactions that can fill a block, then the proposer will close the block earlier than the timeout. 
2. Otherwise (i.e. in the steady state without congestion), the proposer will propose the block just before timeout `t`.

**Note**: v0.14.0 introduces pre-confirmations (see the corresponding section in this SNIP): this is a transaction status which is available to the user much earlier than block publication, and with finality comparable to (but weaker than) `ACCEPTED_ON_L2`. The latency of pre-confirmation is uncoupled from maximum block time. This means that for the vast majority of use cases, UX is not affected by the decision on the value of `t`.

#### Tradeoffs around block time

There is a tradeoff between how low the timeout `t` can be and how large (in terms of `l2_gas`, i.e. steps) a Starknet transaction can be.

The proposer of a block needs to be able to run a max size transaction in less than `t`. In particular, `t` needs to be larger than `max_l2_gas_per_tx / throughput`, where `throughput` is measured in `l2_gas` per unit of time. At the moment, a conservative estimation of `throughput` is 200M `l2_gas` per sec.

In v0.13.5 and v0.13.6 `max_l2_gas_per_tx` is 1B, leading to a timeout `t` of at least **5 seconds**. 

After feedback from the ecosystem, in v0.14.0 `max_l2_gas_per_tx` will remain equal to 1B, leading to block times of around 6 seconds.


#### Block times roadmap

Over the next versions we strive to further decrease block times (the maximum block time and/or the average block time), for example by enabling Cairo native.

### Pre-confirmations

v0.14.0 supports RPC 0.7.* (for all endpoints except those in the `write_api`), 0.8.* and introduces a new RPC 0.9.0. The main changes introduced in RPC 0.9 are:
1. New transaction statuses, `CANDIDATE` and `PRE_CONFIRMED`.
2. Renaming the `pending` block of past Starknet versions to `pre_confirmed` block.

A pre-confirmed transaction is a transaction that was executed by the block proposer and will be part of their proposal for the current height. In the vast majority of cases, the block will then be finalized by consensus and the transaction will become `ACCEPTED_ON_L2`. The only cases in which this fails to happen are when the consensus fails to agree on a block: in v0.14.0, this scenario is only possible if at least 2 of the sequencers are down or there are connectivity problems.

Under normal circumstances (when the network is not congested), an average transaction should reach the status of `PRE_CONFIRMED` in ~0.5 seconds.

The status `CANDIDATE` is an even faster status, albeit with weaker finality properties. A transaction reaches this status when it is selected to be executed by the block proposer. In the majority of cases, a `CANDIDATE` transaction will proceed to status `PRE_CONFIRMED` and then be included in a block. However, a roughly constant percentage of transactions (those which are selected for execution just before the timeout and fail to be part of the proposal) will reach status `CANDIDATE` and then revert to status `RECEIVED` &mdash; even in this flow it's very likely that the transaction will be included in the next one or two blocks.

For a wider discussion on the status, check the release notes.

### Fees and minimum base price

This version introduces a fee market on the l2_gas resource, following Ethereum’s EIP 1559. Each block will have three integers associated with it: `l1_gas_price`, `l2_gas_price`, `l1_data_gas_price`, which are the base fee (in FRI) of the corresponding resource. Every transaction defines a bid on each of the three resources in the form of a pair (`max_amount`, `price_per_unit`) and a `tip`. A necessary condition for a transaction to enter a block is that, for each resource, the bid `price_per_unit` is greater than or equal to the corresponding base fee. The tip is a further addition to the `price_per_unit` for l2_gas: the sequencer will receive `(base_fee + tip) * l2_gas_used`. Two remarks:

1. In v0.14.0 the base fee won't be burned.
2. There will be a minimum base price, denominated in FRI, per unit of `l2_gas`. Concretely, when there is no congestion in the network, the base price per unit of l2_gas will be equal to this minimum.

#### Minimum base price

There are ongoing discussions with the community on how to set the minimum base price for `l2_gas`, so at the moment of writing, the exact value is TBD. 

On the one hand, this value should be low enough as to keep Starknet among the cheapest existing rollups, having subcent fees on an average transaction. On the other hand, this value should be as close as possible to the marginal cost of the transaction, in terms of offchain and onchain costs.

Up until v0.14.0, fees were largely set in order to cover only the "marginal" onchain cost of verification (here the term "marginal" is in quotes because the verification cost is actually almost a fixed cost of the operation of Starknet). As Starknet moves towards decentralization, fees should cover at least the true offchain marginal cost of the transaction (sequencing and proving cost). The minimum base price in v0.14.0 should go in this direction: concretely, we expect a minimum base fee which is roughly twice the current average `l2_gas_price`.


### Sequencer architecture

There will be three sequencers running Tendermint consensus with threshold 1/2 (i.e. 2 out of 3 is enough to finalize a block).

Why 1/2 instead of 2/3? The threshold of 1/2 gives the same guarantees as the usual 2/3 threshold, provided that the only possible faults are crash faults and network delays (instead of the more general fault of Byzantine behavior). Because in v0.14.0 the sequencers will be operated by StarkWare, this assumption holds.

All three sequencers participate in block proposals by taking turns, pseudo-randomly.


### Mempool

Each sequencer holds a mempool, i.e. a data structure capable of holding, deleting, adding and replacing transactions that are received. The sequencers' mempools are connected in a p2p network, so their view of transactions is mostly synced when there is no congestion.

As with client mempools in other chains, the mempool of the Starknet sequencers implements some rules/heuristics for resiliency and defence from spamming attacks.
Some relevant features are:
1. Nonce management:  Transactions with a nonce greater than current sender nonce will be accepted to the mempool, provided that the nonce is not too far in the future.
2. Replacement: A transaction can be replaced if a more profitable transaction, i.e. with a higher tip, from the same sender and nonce is sent.


### Multiblock OS

Up until v0.14.0, after building a block, the sequencer would run the Starknet OS “on it” to prove that the Starknet state is advanced correctly. The OS of v0.14.0 has been modified to receive as inputs multiple blocks: this solves the issue of running wasteful recursions (which have constant cost, regardless of block size) and also amortizes certain non-negligible costs over a larger number of blocks, such as loading contract code in the OS.

### Upgrade flow

The upgrade to 0.14.0 is a non-trivial process which involves scaling down centralized services, deploying the decentralized ones, and re-routing the traffic to the new gateway.

The upgrade will include downtime of the chain: this means that transactions will be rejected by the gateway, and blocks won't be produced. The duration of this downtime is expected to be around 15 minutes.

The motivation to block transaction submission during the critical part of the upgrade is to provide a clearcut feedback to the user: the alternative would be to allow transaction submission but having the user wait for 15 minutes without knowing the fate of their transaction and possibly not having it included in a block, in the worst case.

## Implementation

Most of the features of v0.14.0 are implemented in the repo https://github.com/starkware-libs/sequencer. Here is a rough mapping between the above features and the relevant crates in `sequencer/crates/`:
1. Consensus: `apollo_consensus_*`
2. Mempool: `apollo_mempool_*`
3. Fee market: `apollo_consensus_orchestrator/src/fee_market/` and configs in `apollo_consensus_orchestrator/resources/orchestrator_versioned_constants_0_14_0.json`

The multiblock OS is implemented in `https://github.com/starkware-libs/cairo-lang/blob/master/src/starkware/starknet/core/os`.

Other infra specifications:
1. RPC 0.9.0: `https://github.com/starkware-libs/starknet-specs/`
2. Paymaster API: `https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-29.md`

## Security Considerations

The mempool is a new component that didn’t exist before and can be attacked with spam. The attack would consist of sending transactions that get added to the mempool but never enter a block (thus never pay fees). Of course the success of such attacks depends on the defenses that are implemented by the mempool.

During a (sustained) successful DoS on the mempool, blocks would be created with very few or no transactions, and possibly many benign transactions would be evicted from the mempool because of the congestion.

## History

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
