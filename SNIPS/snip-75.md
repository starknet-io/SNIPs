---
snip: $SNIP_ID
title: SNIP Purpose and Guidelines
author: $SNIP_AUTHOR <$SNIP_AUTHOR_EMAIL>
status: Living
type: Meta
created: $SNIP_DATE
---

## Simple Summary

Meta SNIP to lay out the structure, motivation and decisions of the Starknet Security Council.

Today, [Arbitrum](https://docs.arbitrum.foundation/dao-constitution#section-3-the-security-council), [Optimism](https://github.com/ethereum-optimism/OPerating-manual/blob/main/Security%20Council%20Charter%20v0.1.md) and [zkSync](https://blog.matter-labs.io/security-council-2-0-2337a555f17a) have created and are continously improving a security committee, a so-called "Security Council".

This SNIP answers the network's strong desire to create a Security Council.

## Abstract

**A Security Council is a committee of Ethereum L1 (possibly Starknet L2) multi-sig signers. It is empowered to perform certain actions on behalf of the network: Emergency Action and Non-Emergency Actions.**

The specific ways in which the Security Council functions are defined by a set of SNIPs.

Emergency Actions are the last line of defense against bugs and earthshattering events. They are defined in a specific SNIP. Similarly, Non-Emergency actions frame the normal flow of upgrade and lifetime of the network. They are scoped in a specific SNIP. The Starknet Security Council is elected by the Starknet community, the Starknet Foundation, Starkware and the STRK token holders. The election process is described in a subsequent SNIP. The composition of the council is also defined in a unique SNIP.

We rely on the following set of resources:

- [Stages update: Security Council requirements, Luca Donno](https://medium.com/l2beat/stages-update-security-council-requirements-4c79cea8ef52)
- [Introducing Stages — a framework to evaluate rollups maturity, Luca Donno](https://medium.com/l2beat/introducing-stages-a-framework-to-evaluate-rollups-maturity-d290bb22befe)
- [The Security Council, Arbitrum](https://docs.arbitrum.foundation/dao-constitution#section-3-the-security-council)
- [Security Council Charter v0.1](https://github.com/ethereum-optimism/OPerating-manual/blob/main/Security%20Council%20Charter%20v0.1.md)

## Motivation

Starknet has framed itself as a secure rollup from day 1. This is the core idea behind STARK proofs and the concept of integrity: "do the right thing, even when no one is watching". While this applies at the protocol level, i.e. for state transitions, it does not apply for actions that fall out of pure programmatic security: how the core smart contracts of the Starknet network get upgraded or who can intervene in case of a bug.

Currently, Starkware operates the Starknet network and oversees its upgrades, as well as emergency processes in case of bug. The Starknet Foundation provides support through diverse "councils" (DeFi Council, Builder Council, etc.). While Starkware acts in good faith and aims to maximize transparency, it remains a single point of failure. Additionally, partly thanks to [L2Beats](https://l2beat.com/scaling/summary) spearheading the effort, the industry is moving towards common security standards. The concept of Security Council paves the way towards sound and standardized processes with regards to network security.

## Specification

We suggest a series of 3 SNIPs, one for each important characteristic of the Security Council:

- Emergency Actions
- Non-Emergency Actions
- Election and Composition of the council

## Implementation

## History

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
