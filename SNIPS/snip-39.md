---
snip: 39
title: strkBTC as a Stakable Token on Starknet
description: Approve strkBTC as an eligible BTC wrapper for staking on Starknet under the framework established in SNIP-31
author: Natan Granit (natan@starkware.co), Robert Kodra (robert@starknet.org)
discussions-to: https://community.starknet.io/t/snip-39-strkbtc-as-a-stakable-token-on-starknet/116180
status: Draft
type: Meta
created: 2026-04-22
requires: 31, 38
---

## Simple Summary

Approve strkBTC (see [SNIP-38](./snip-38.md)) as an eligible BTC wrapper for staking on Starknet, under the wrapper-listing framework established in [SNIP-31](./snip-31.md) and ratified by [Starknet governance proposal 10](https://governance.starknet.io/#/sn:0x009fedaf0d7a480d21a27683b0965c0f8ded35b3f1cac39827a25a06a8a682a4/proposal/10).

## Abstract

This SNIP is a governance proposal, based on [SNIP-38](./snip-38.md) and [SNIP-31](./snip-31.md) (ratified by [governance proposal 10](https://governance.starknet.io/#/sn:0x009fedaf0d7a480d21a27683b0965c0f8ded35b3f1cac39827a25a06a8a682a4/proposal/10)). It relates the introduction of a new BTC wrapper, **strkBTC**, and the Bitcoin Staking mechanism on Starknet. Specifically, it advocates for **strkBTC** to be a stakable BTC wrapper on Starknet.

As the core Bitcoin staking protocol and its initial wrapper set have already been ratified through prior governance, the purpose of this vote is narrower in scope: **to approve strkBTC as an eligible BTC wrapper for staking on Starknet**, under the already-passed wrapper listing process.

## Motivation

**strkBTC** is part of a broader initiative to bring a credibly-neutral, trust-minimized BTC representation to Starknet. Over time, strkBTC is expected to become the canonical BTC representation on Starknet, given its federated-then-trust-minimized bridging design and strong ecosystem support. For the full technical design and trust model, see [SNIP-38](./snip-38.md).

Making strkBTC eligible for staking:

1. Aligns Starknet's canonical BTC wrapper with the Bitcoin staking protocol defined in [SNIP-31](./snip-31.md).
2. Gives strkBTC holders a productive use case consistent with Starknet's BTCFi roadmap.
3. Extends Starknet's economic security by broadening the set of stake-eligible BTC wrappers beyond the initial list.

## Specification

### Approval of strkBTC as an Eligible BTC Wrapper for Staking

This proposal seeks to add **strkBTC** to the community-approved list of BTC wrappers that may be enabled for staking on Starknet.

If approved, strkBTC will become eligible for inclusion alongside previously ratified wrappers, subject to the existing operational process defined in [SNIP-31](./snip-31.md).

### Governance and Enablement Process

As established in the wrapper listing framework specified in [SNIP-31](./snip-31.md) and ratified by [governance proposal 10](https://governance.starknet.io/#/sn:0x009fedaf0d7a480d21a27683b0965c0f8ded35b3f1cac39827a25a06a8a682a4/proposal/10), for a BTC wrapper to be supported in the staking protocol, two conditions must be met:

1. It must first be approved by a community vote.
2. An onchain transaction must then be sent by the Monetary Committee enabling the wrapper in the staking protocol.

The Monetary Committee may only enable wrappers that have been explicitly approved through governance.

Upon approval of this SNIP and the corresponding on-chain vote, strkBTC will be eligible for enablement by the Monetary Committee under this process. Enablement remains at the Monetary Committee's operational discretion, subject to readiness checks (wrapper contract deployment, bridge liveness, integration testing).

### Treatment Under SNIP-31

Once enabled, strkBTC will be treated like any other supported BTC wrapper under [SNIP-31](./snip-31.md):

- **Delegation only** — staking is via delegation to validators.
- **Dedicated delegation pool** — validators may open a separate strkBTC delegation pool.
- **Equal representation (1:1)** — each unit of strkBTC counts as one unit of staked BTC for reward and consensus calculation.
- **No mixing** — delegators withdraw the same wrapper they staked.
- **Uniform validator settings** — commission and withdrawal delays apply uniformly across pools operated by the same validator.
- **Entry delay and emergency delisting** — strkBTC is subject to the same wrapper-vulnerability safeguards described in SNIP-31's Security Considerations.

## Security Considerations

The security model for strkBTC as a staking-eligible wrapper combines:

1. **strkBTC's own trust model** — in Phase 1, a federated multisig (see [SNIP-38](./snip-38.md)); in later phases, BitVM-based and ultimately trust-minimized designs.
2. **The staking protocol's wrapper safeguards from SNIP-31**:
   - Entry delay on BTC entering the staking pool, providing time to detect and respond to wrapper compromise.
   - Emergency delisting by the Security Council (or designated security agent) if a wrapper is compromised.

A compromise of strkBTC's bridge (e.g., federation key compromise, bridge contract vulnerability) that allowed unbacked minting could, in the worst case, allow an attacker to acquire up to the BTC weight in staking power (α, currently proposed at 0.20–0.25 in SNIP-31) at low economic cost. The SNIP-31 entry delay and emergency delisting are the primary mitigations; strkBTC's own multisig design and sunset roadmap further reduce this risk over time.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
