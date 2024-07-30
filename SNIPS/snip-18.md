---
snip: 18
title: Staking’s First Stage on Starknet
author: Natan Granit <natan@starkware.co>
discussions-to:
status: Draft
type: Standards Track
category: Core
created: July 10, 2024
---

# Staking’s First Stage on Starknet

## Abstract

As Starknet continues its decentralized journey, we present StarkWare's proposal for the first stage of staking. This is an important step in building the staking community and technology, offering new opportunities for users and developers.

This SNIP aims for the first stage of staking to be live on Starknet mainnet in Q4 2024, featuring a permissionless on-chain staking protocol and stake delegation.

In this SNIP, we will describe in detail the staking proposal, its timeline, and its relation to future steps in decentralization.

## Motivation

The first stage of staking marks another crucial step in Starknet’s decentralized [vision](https://starkware.co/integrity-matters-blog/starknet-vision/). Here are the key motivations for an incremental approach in Starknet’s decentralization process and for the proposed first step.

In the future, as part of Starknet’s Consensus protocol, Stakers will be responsible for maintaining and securing the network by producing, attesting, and proving blocks. However, it’s not feasible to hand over these responsibilities all in one day. This is why an incremental approach is necessary, as it allows for the following:

* **Gradual Implementation:** A PoS protocol is a complex structure that requires comprehensive testing and validation. By introducing its features in small, manageable milestones, we ensure that each step is carefully implemented and easily integrated. This approach also allows us to refine the process and address issues as they arise.
* **Stakers' Preparation:** Giving Stakers time to adapt to new responsibilities, ensuring they are ready for their critical roles, and maximizing network stability during the transition.
* **Proven Reliability:** By the time Stakers perform the aforementioned roles, we aim to have a proven set of sequencers that reliably produce and attest blocks, ensuring the network's stability and performance.

Specifically, in this proposed first stage, we will test the protocol’s economic incentive structure and some of its key smart contract components. The protocol reward structure must balance incentivizing participation with maintaining a sustainable inflation rate and allowing a sufficient amount of STRK to remain readily available for other network activity.

By adopting this step-by-step approach, with the proposed first stage, we can gather valuable data, perform crucial tests, and thus refine the staking protocol as we implement it.

## Specification

### Overview

The proposed first stage protocol features permissionless staking of STRK on Starknet with two staking flavors:

* **Staking:** As a Staker, you can stake any amount of STRK greater than X STRK (X is between 10K-100K). Currently, Stakers are expected to run full nodes in preparation for the following stages. In the future, they will also need to run additional software that sequences and validates Starknet blocks and possibly perform additional network liveness and security tasks.
* **Stake Delegation:** Delegators choose a Staker to whom they delegate their Stake, sharing rewards with said Staker. Stake Delegators do not need to run any software, as their chosen Staker runs it for them. This makes participation accessible to a broader audience, allowing users to participate in the Staking protocol without the technical and capital limitations.

Both Stakers and Stake Delegators can unstake their funds, subject to protocol-defined latencies that ensure network stability and security. More details on these latencies can be found in the "Latencies" section.

### Staking Rewards

Staking rewards will be based on token minting. The rewards are calculated according to a minting curve, which follows Professor Noam Nisan’s [proposal](https://starkware.co/a-token-minting-proposal-to-manage-inflation/
) (For more details on the minting curve, see the section below). Both Stakers and Stake Delegators earn rewards, depending on their respective stake and the reward-sharing constant (R) set by the Staker:

* **Stakers:** Earn rewards proportional to their own stake and the total stake delegated to them, adjusted by the reward-sharing constant. The formula is:

    `({self_stake} + {total_stake_delegated} * (1 - R)) * {rewards_constant} * {time_interval}`

* **Stake Delegators:** Earn rewards proportional to their delegated stake and the reward-sharing constant. The formula is:

    `{stake_delegated} * R * {rewards_constant} * {time_interval}`

where `{rewards_constant}` is determined by the minting curve and depends on the total amount staked in the protocol. This reward structure incentivizes both staking, stake delegation, and competition among Stakers for delegators' stake.

### Minting curve

The minting curve addresses two critical aspects of the staking protocol by making the rewards dependent on the amount of STRK locked in the protocol. Here's how it works:

* **Balancing Participation:** The more STRK tokens locked in the staking protocol, the lower the rewards become. This design ensures that not all STRK tokens are staked, allowing the Starknet community to continue using STRK for transaction fees and other activities. Additionally, it prevents unnecessary dilution of the token supply.

* **Encouraging Staking:** When fewer STRK tokens are staked, the rewards get higher. This incentivizes participation in the staking protocol, guaranteeing a minimum level of economic security for the network by ensuring that a portion of STRK tokens is always staked.
In the first stage, the minting curve will be based on Professor Noam Nisan's [proposal](https://starkware.co/a-token-minting-proposal-to-manage-inflation/), with a slight parameter variation. The minting curve is defined by the following formula:

`M = C/10 * √ S`

Where S is the staking rate in percent of the total supply of tokens, M is the annual minting rate, again in percent of the total supply of tokens and C is the maximal theoretical inflation, also in yearly percent. In Professor Nisan's suggestion, C=4, assuming all 10B STRK tokens might participate in the staking protocol. For this first stage, we propose C be in the range of 1.8-2.5, considering the current circulating supply is much lower than 10B and not all STRK tokens will participate in the staking protocol.

Deciding on a global inflation cap and exact minting curve parameters is a complex problem. Any decision made will likely require adjustments over time as market conditions change, such as the amount of circulating tokens. Given the sensitivity of this subject, we will recommend that the Starknet Foundation (SNF) hold a governance vote to decide on minting curve parameters and the processes to adjust those over time.

### Latencies

* **Today:** Entering and exiting the staking protocol is immediate, meaning that users can join or leave the staking process without delay. However, after exiting, the staked funds are subject to a security lockup period of 21 days*. During this period, users will not earn rewards and cannot withdraw their funds. This mechanism ensures network security by preventing Stakers from suddenly withdrawing significant stake and potentially destabilizing the network.
* **Future Versions:** In future versions, we would introduce the notion of epochs, which are granular measures of time on Starknet based on blocks. This means that the latency for entering or exiting the protocol will be determined by the remaining time in the current epoch plus the duration of one full epoch. The withdrawal lockup period will still apply after exiting the protocol.

*Although Stake Delegators are subject to a security lockup when withdrawing funds, they can move between Stakers without waiting the full lockup period, enhancing the delegation market's competitiveness.

### Stake Delegation threshold

The ratio between a Staker's own stake and the stake they receive from delegators is limited by a global Stake Delegation threshold (DT). The constraint is:

`{self_stake} + {delegated_stake} < {self_stake} * DT`

This requirement ensures that Stakers have a sufficient stake in the network, aligning their interests with network stability and security.

### Economical parameters

Here is a table summarising the economic parameters proposed in this version:

| **Economical Parameter**          | **Proposed value**            |
|-----------------------------------|-------------------------------|
| Minimum STRK for Staking (X)      | 10K-100K STRK                 |
| Withdrawal Security lock up (W)   | 21 days                       |
| Minting curve yearly inflation cap (C) | 1.8-2.5%                   |
| Delegation threshold (DT)         | 5                             |
| Reward-sharing parameter (R)      | Set individually by the Staker (0-1) |

These values are our proposed starting points for this version of the protocol. As part of the rationale behind this version, they are subject to change and may be adjusted to better suit the protocol's needs.

### Locked Token Participation

Locked tokens will initially be excluded from staking. When Stakers begin validating and voting on blocks sequenced by the sequencer and their consensus is proved to L1, locked tokens will be allowed to participate in the staking protocol.

### General points

* Rewards are claimed by actively sending a transaction.
* Both Stakers and Stake Delegators can add to their stake.
* There is no partial unstaking.

### Security Considerations

The staking protocol's design includes several key security measures to ensure its integrity and user safety.

#### Modular architecture

The proposed protocol will be implemented using a modular architecture, where different functionalities are separated into distinct contracts, such as staking, delegation, rewards supply, and more. This approach offers several advantages:

* **Simplifies Logic:** Each contract has a clear and specific role, making the code easier to test, audit, and understand.
* **Enhances Access Control:** By defining specific permissions for each contract, the risk of unauthorized access or misuse is reduced.
* **Allows Targeted Upgrades and Changes:** Updating only the relevant contract minimizes the potential for introducing new vulnerabilities.

#### Permissions and Key Management

The Staking protocol allows users to define different addresses for different functionalities. Thus, cold addresses with minimal activity can control important functionalities, reducing exposure to threats and enhancing user security.

Stakers register with three addresses:

* **Staking and Unstaking Address:** This address has permission to Stake, add Stake and unstake. This means that it handles large amounts of STRK tokens and is only needed when entering or exiting the protocol. Thus, it can be kept by a cold wallet (minimal activity) to maximize security.
* **Rewards Address:** This is the address where rewards will be sent to. It can also be maintained with minimal activity, i.e., as a cold wallet.
* **Operational Address:** This address represents the Staker for operational purposes (for example, block attestations in the future) and does not handle large amounts of funds. As it will be frequently used, it should be categorized as a hot address.

Stake Delegators register with two addresses:

* **Entering/Exiting Address:** This address has permission to Delegate Stake, add Stake and unstake. This means that it handles large amounts of STRK tokens and is only needed when entering or exiting the protocol. Thus, it can be kept by a cold wallet (minimal activity) to maximize security.
* **Rewards Address:** This is the address where rewards will be sent to. It can also be maintained with minimal activity, i.e., as a cold wallet.

**Permissions:** The protocol uses a hierarchical approach between user roles. Colder addresses, which control larger funds, can replace more active ones if compromised. Specifically, Staker and Stake Delegator addresses can replace the rewards address.

#### Security lockup period

When exiting, users face a 21-day lockup, during which no rewards are earned, and funds cannot be withdrawn. This disincentivises sudden large withdrawals that could destabilize the network. Future versions will tie the exit process to epochs, maintaining the lockup period for a secure exit mechanism.

## Milestones

This SNIP aims for the first stage of staking to be live on Starknet mainnet in Q4 2024, you can track the implementation progress in the following [repo](https://github.com/starkware-libs/starknet-staking).

Future stages will include Stakers gradually assigned responsibilities, eventually validating and sequencing blocks. This gradual transition ensures stability and allows for thorough testing and improvements. For more details on the decentralized protocol, check out @Ilia’s [series](https://community.starknet.io/t/starknet-decentralized-protocol-i-introduction/2671) of blog posts.

More details and proposals on subsequent stages will be introduced, as we progress. The next step is already in the research and planning stages, set to launch a few months after the first stage. Our objective is to roll out these updates smoothly, with ongoing improvements guided by community feedback.

## Copyright

This SNIP will be released under an MIT license.