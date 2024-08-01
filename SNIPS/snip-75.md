---
snip: 75
title: Starknet Security Council (SSC)
author: Elias Tazartes <@Eikix>, Mattéo Georges <@mattegoat>, Patrícia Gil de Brolezzi <@pat_zip>, Luca Donno <@lucadonnoh>
status: Draft
type: Meta
created: 2024-07-06
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

### Emergency and Non-Emergency Actions

#### Abstract

The utmost priority for a rollup is to never lose user funds. The decentralization of rollup control (e.g. 7-day delay on network upgrade) might go hinder the speed of reaction needed in case of emergency. The Security Council therefore should have the power to act quickly to mitigate a critical failure.

This paragraph aims to answer the following questions:

- What type of actions fall under “emergency action”?
- When should such actions be used?
- What is the legal quorum to make such a decision?
- Is there any mandatory delay in the action?
- How and when (before or after action?) to communicate this to the network?
- Does anyone have veto powers over their decision ?

#### Specification 

Let's first define what type of actions fall under emergency action: **a critical vulnerability that could significantly compromise the integrity, confidentiality, or availability of a chain governed by the Starknet DAO**.

After performing any Emergency Action, the Security Council must issue a full transparency report (at an appropriate time after the security emergency has passed) to explain what was done and why such Emergency Action was justified.
The security council holds a huge responsibility, and should take emergency actions in a timely manner, after an incident, such as described previously.

We propose the following design in order to ensure decisions are made in a timely manner if an emergency arises, while not compromising the security of user's funds:

- A pause function should be added on the core Starknet smart-contracts.
    - The `pause` toggle function and should be callable by:
        - the network operator (Starkware) in a centralized and timely way
        - the security council by a super-majority vote (75% of the votes)
    - The `unpause` function can only be called by the security council.
    - The right to call the `pause` toggle function can be given and taken away by the SSC.
- Upgrades on the core Starknet smart-contracts should now be delayed by 7-days. 
    - Every major upgrade should be approved by the Starknet Security Council with a super-majority vote.
    - The Starknet Security Council can reduce this time to zero, with a super-majority vote.
- Upgrades on the core Starknet smart-contracts should be approved by the Security Council, and can be submitted for an approval vote up to 3 months prior to being added on-chain. The on-chain approval vote triggers the 7-day time-delay on the specific upgrade.

#### Implementation

Actionables list:
- An Ethereum L1 Safe contract deployment, owned by the Security Council members after their election.
- A major upgrade to the core Starknet smart contracts to add:
    - A pause toggle on the ability to advance the Starknet chain, e.g. by finalizing new state roots.
    - An administrator role of the pauseable toggle right: the Starknet Security Council multi-sig.
    - A time-delay on major upgrades for the core Starknet smart contracts.
    - An administrator role of the time-delay: the Starknet Security Council multi-sig.

Before performing any action, we highly recommend to ask for help to Optimism and Arbitrum Security Council to learn from their operational experiences in setting up such a sensitive governance body.

### Election and Composition of the council

#### Motivation

To best enable the security council to fulfill its role, the Security Council composition criteria was designed to consider limitations that could jeopardize its operations, such as geographic limitation, technical capacity, limited members of the same organization, role responsibilities, and values alignment. 

First priority is to increase and ensure that the Security Council is always capable of executing its role despite time zones, legal limitations, critical political situation, technical limitations and potential misalignment.

#### Criteria

Limited geographic regions:

- That the 12 members have permanent residency in at least 4 different time zones, with a maximum of 50% of the members residing in the same country.

- This is due to legal limitations, existing or not-yet existing, that could impact a country due to it occurring into open war, crypto adoption barriers, etc. 

Technical capacity:

- That the council members have technical capacity such as detailed understanding of the impact from technical decisions could have, to avoid an operational breakage and/or attacks.

Limited organization members:

- That there is a maximum of 2 members per organisation, as to avoid conflict of interest.


Role responsibilities:

- That members are aware of and accept the responsibilities within the role, which must be clearly defined prior to election period.

Values alignment:

- That members are aligned with the values of Starknet Foundation.

#### Implementation

At time of election, candidates must declare:
1. What organizations they are part of;
2. Their awareness and acceptance for the role and its responsibilities, should they be elected;
3. What it means to them to be in alignment with the values of Starknet Foundation.
4. Their technical background and experience, in accordance with the role's requirements;

There should be a KYC verification by the Starknet Foundation at time of election and before onboarding.

Finally, the community and the Starknet Foundation should look to apply best of judgment when evaluating the member's applications considering the criteria above.

## Examples and hypothetical future

As a bi-product of the Security Council creation, all upgrades on the Starknet network would be delayed by an amount of time chosen by the Security Council, e.g. 1 month.
Simple minimal examples of how the Security Council could look like (inspired the current states of other rollups):

- Emergency Actions: the Security Council can reduce the upgrade delay time to zero for an emergency.
- Non-Emergency Action: the Security Council can vote to accept an upgrade proposed by Starkware, or veto upgrades that go through timelocks.
- Composition: the Security Council is composed of 12 to 15 people from broad set of sectors (Builders, Users, DeFi, Gaming, Wallet, Cryptography, Infra, etc.), covering a large amount of timezones (always 75% of the council is susceptible to be awake at all time "The Sun never sets on the Security Council" 👑 👀). Each person in the council has at least 1M vSTRK delegated to them (they must have either skin in the game or a "vote of confidence" from token holders). Council members are managed from within, using their multi-sig, for reelection or removal by their peers should they misbehave.

## Appendix

### Current upgradability structure

For reference, this is the current upgradability structure:

![Starknet Current upgradability structure in Q3 2024](../assets/snip-75/starknet-upgradability.png)

Note that Starknet would need to give up the permissions for all Proxy governors, Implementation governors, Verifier governors and bridge owners.

### Security "Stage" as per L2Beat

As per the [Risk rosette framework](https://gov.l2beat.com/t/the-risk-rosette-framework/292) and the Stages framework, the Exit window and Stage designation will stay at zero until forced transactions are implemented and proving is made permissionless.

### Definitions

These definitions are not official definitions, but rather heuristics taken as baseline by the authors of this SNIP.

- Starknet Core Smart Contracts list on Ethereum L1, based on heuristics:
    - Bridge infrastructure (Starkgate contracts)
    - Starknet proxy & implementation (Starknet core)
    - Proving related contracts (SHARPVerifierProxy, SHARPCallProxy, GPSStatementVerifier)

- Starknet DAO: the decentralized human community led by STARK ($STRK) token holders.

- Starknet Foundation: the non-profit, legal entity promoting the adoption and evolution of the Starknet ecosystem and values.

- Security Council Emergency Action: **a critical vulnerability that could significantly compromise the integrity, confidentiality, or availability of a chain governed by the Starknet DAO**.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
