---
snip: $SNIP_ID
title: SNIP Purpose and Guidelines
author: $SNIP_AUTHOR <$SNIP_AUTHOR_EMAIL>
status: Living
type: Meta
created: $SNIP_DATE
---

## Simple Summary

This SNIP will deal with the emergency powers the Security Council will have and how they need to communicate these emergency actions to the broader community.

## Abstract

This SNIP answers the following questions:

- What type of actions fall under “emergency action”?
- When should such actions be used?
- What is the legal quorum to make such a decision?
- Is there any mandatory delay in the action?
- How and when (before or after action?) to communicate this to the network?
- Does anyone have veto powers over their decision ?

## Motivation

The utmost priority for a rollup is to never lose user funds. The decentralization of rollup control (e.g. 7-day delay on network upgrade) might go hinder the speed of reaction needed in case of emergency. The Security Council therefore should have the power to act quickly to mitigate a critical failure.

## Specification

Let's first define what type of actions fall under emergency action: a critical vulnerability that could significantly compromise the integrity, confidentiality, or availability of a chain governed by the Starknet DAO.
After performing any Emergency Action, the Security Council must issue a full transparency report (at an appropriate time after the security emergency has passed) to explain what was done and why such Emergency Action was justified.
The security council holds a huge responsibility, and should take emergency actions in a timely manner, after an incident, such as described previously.
We propose to have two major milestones for the council in order to ensure the stability of the transition from Starkware to the Starknet community.
The first step is to add a timelock to smart-contract upgrades of the Starknet core contracts on L1, for Starkware to propose upgrades. This timelock will be skippable by the security council in case of emergency, with a super majority (75% for) to push the update immediately.
The second step, when Starkware won't be the only one able to propose upgrades to the L1 smart-contracts, is to add a pausable function on the Starknet core smart-contracts on L1, to enable the security council to stop the bridge and state upgrade contracts. This will enable to stop any potential loss of funds, and enable the L2 consensus to decide on the best path forward for the community.
The security council has the obligation to communicate, provide a post-mortem and be transparent about the reason of potential actions taken.

## Implementation

For this SNIP we need:

- an L1 multisig
- Add a timelock to Starknet core contracts on L1 + the ability for the security council's multisig to bypass it (for phase 1)
- Add a pausable function only callable by the security council's multisig (for phase 2)

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
