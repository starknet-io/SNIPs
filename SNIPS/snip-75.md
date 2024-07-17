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

The goal of the Security Council is to entrust admin keys for the Starknet protocol's core smart contracts (core contract, bridge, verifier, etc.), over to a public, distributed set of people accountable to Starknet Governance.

Today, [Arbitrum](https://docs.arbitrum.foundation/dao-constitution#section-3-the-security-council), [Optimism](https://github.com/ethereum-optimism/OPerating-manual/blob/main/Security%20Council%20Charter%20v0.1.md) and [ZKsync Lite](https://blog.matter-labs.io/security-council-2-0-2337a555f17a) have created and are continously improving a security committee, a so-called "Security Council".

This SNIP answers the network's strong desire to create a Security Council.

## Abstract

**A Security Council is a committee of Ethereum L1 (possibly Starknet L2) multi-sig signers. It is empowered to perform certain actions on behalf of the network: Emergency Action and Non-Emergency Actions.**

The specific ways in which the Security Council functions are defined by a set of upcoming SNIPs.

Emergency Actions are the last line of defense against bugs and earthshattering events. They are defined in a specific SNIP. Similarly, Non-Emergency actions frame the normal flow of upgrade and lifetime of the network. They are scoped in a specific SNIP. The Starknet Security Council is elected with the help of the Starknet community, the Starknet Foundation, Starkware and the STRK token holders. The election process and composition of the council is described in a subsequent SNIP.

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

## Examples and hypothetical future

As a bi-product of the Security Council creation, all upgrades on the Starknet network would be delayed by an amount of time chosen by the Security Council, e.g. 1 month.
Simple minimal examples of how the Security Council could look like (inspired the current states of other rollups):

- Emergency Actions: the Security Council can reduce the upgrade delay time to zero for an emergency.
- Non-Emergency Action: the Security Council can vote to accept an upgrade proposed by Starkware, or veto upgrades that go through timelocks.
- Composition: the Security Council is composed of 12 to 15 people from broad set of sectors (Builders, Users, DeFi, Gaming, Wallet, Cryptography, Infra, etc.), covering a large amount of timezones (always 75% of the council is susceptible to be awake at all time "The Sun never sets on the Security Council" 👑 👀). Each person in the council has at least 1M vSTRK delegated to them (they must have either skin in the game or a "vote of confidence" from token holders). Council members are managed from within, using their multisig, for reelection or removal by their peers should they misbehave.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
