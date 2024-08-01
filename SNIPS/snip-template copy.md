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
We propose the following design in order to ensure decisions are made in a timely manner if an emergency arises, while not compromising the security of user's funds.

- A pause function should be added on the core Starknet smart-contracts, and should be callable by Starkware in a centralized and timely way (and also pausable by the security council by a majority vote)
- The security council can unpause the core smart-contracts at any time following a majority vote on L1.

## Implementation

For this SNIP we need:

- an L1 multisig
- Add a pausable function only callable by Starkware or the security council, and unpausable only by the security council.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
