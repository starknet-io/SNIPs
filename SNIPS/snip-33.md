---  
snip: 33 (temporary number)  
title: Starknet decentralized validation  
description: Discuss a concrete proposal for Starknet decentralized validation milestone  
author: Ohad Barta (@ob1337)   
status: Draft  
type: Standard  
category: Core  
 ---

## Simple Summary 
Starknet v0.14 symbolizes the first stepping stone towards complete decentralization, with several sequencers StarkWare operates internally that already agree on Starknet blocks via the Tendermint algorithm. This SNIP describes a suggested implementation for the next Starknet decentralization phase: decentralized validation. 
Decentralizing the network is complicated and will be done over time. This SNIP justifies the milestone selected, briefly details which challenges this milestone will tackle and which are saved for later, and then moves to describe the milestone itself. 
Lastly, this SNIP is an unpolished draft for initial community feedback. Feel free to make suggestions to modify anything - and your feedback will be used to alter, or even completely pivot, this thinking direction for Starknet v0.15. 


## Motivation

### Motivation for decentralization
Decentralization is a core value of Starknet, both ideologically and pragmatically. From the ideology perspective, Starknet aims to bring it to the masses: a place that has great UX and stores unlimited possibilities without settling on security or reverting de facto to a centralized or small set of players that control the ecosystem. Decentralization is a cornerstone for achieving this vision—allowing anyone to participate in the network and decide how its state would roll.
Pragmatically, decentralization can be a key differentiator of SN compared to many other chains. SN aims to be the execution layer of Bitcoin, with many BTCFi projects and opportunities spawned within the last several months. We cannot expect this brand to hold with a centralized environment or vision.

### Motivation for having a decentralized validation as a milestone
Decentralization of a living network is all but trivial. We aim to do so through a series of incremental upgrades, each including a higher level of control on Starknet given to STRK stakers, and each introduces new edge cases and things that could go wrong - allowing the protocol evolution to tackle them separately. Thus, to justify decentralized validation as a milestone, we need to explain why:
 It is a significant technical step forward compared to 0.14   
There is a significant step to be done from this step to a decentralized block proposing.

#### Why is decentralized validation a significant step forward compared to 0.14?
ATM, StarkWare runs all the sequencers that validate the next SN block. The sequencers are executed in close geographical proximity, and are very few in number (between three and five). Several assumptions around the privacy of the p2p security network allow for simpler implementation for the 0.14-version of decentralization. All of these assumptions will probably not hold when any staker can take part in the protocol, even if its just validating - hence complicating the protocol substantially. 
In addition, decentralized validation will correlate for the first time the decentralized protocol of SN with its staking protocol - a significant change to the staking protocol and its reward mechanisms, as well as the expectations from different staking parties - which should be carefully tested. 

#### Why the gap between decentralized validation and complete decentralization is still far and wide?  
With complete decentralization, SW is no longer the only block proposer. Therefore, several system elements must be redesigned.
 Take fees, for example - currently, all fees go to the current block producer. However, if a transaction has 100 L2->L1 messages - this is a significant cost that will be paid to the sequencer, while the Prover (short-term SW and long-term potentially someone else in the protocol) will have to pay. A second area to look on is the feeder gateway that currently fetches all the network data through a centralized database. When SW offers all the blocks this is fine, but synchronizing against the latest chain tip would need to be revisited when anyone may propose the next block and SW sequencer doesn’t have a special role or permission. In particular, this will force a public mempool p2p (for decentralized validation only, it suffices to make only the p2p the sequencers use public) 

## Specification  
Here are the decentralized validation requirements that will dictate the exact implementation. 

### Starknet performance  
Decentralized validation is a setback for a well-performing system, as it's clear that decentralizing a system comes with latency and additional costs. Thus, we will require the following:

#### Throughput  
Despite the need to finalize each block only after a consensus is reached,  SN throughput should not change by more than 5% compared to its 0.14 performance. This intuitive requirement, which can also be parsed as "performance should stay the same," might require additional protocol features,  or define restrictions on who can be valdiator, for example - requiring all validators to set up their machines within a given geographical cluster. 

#### Cost  
Setting up a validator node will not cost more than $1000/month. This cost range is in line with costs in other decentralized systems such as [Solana](https://www.cherryservers.com/blog/how-to-become-a-solana-validator) and [Cosmos](https://www.allnodes.com/atom/host), and what ensures that the aggregated network cost will stay in a reasonable range even with dozens of validators. Also, this implies that base fees will not change with this version, keeping Starknet scaled.

#### Finality
Moving to a decentralized validation phase should have no effect on the preconfirmation time from the SW sequencer, which should stay in the subsecond area. We are inspecting ways to reduce block times further - efforts that are decoupled from this feature. 

### Staking protocol and reward distribution  
This feature is the first time the SN roadmap meets the SN staking protocol, giving real responsibility to stakers to attest blocks. 

#### Who can attest blocks?
The current suggestion is to have a committee of Stakers, consisting of the top-100 largest stakers, weighted according to their amount of stake (such that it sums up to 100%). The set of stakers and their respective weight will be decided at the beginning of every epoch, according to the weight they had at the start of the previous epochs. Therefore, a staker not in the top-100 will not get rewards during the epoch. A staker in the committee will be expected to sign on blocks through the p2p network. 

#### What is the attestation needed for a block to be confirmed? And how are rewards distributed?  
More than two-thirds of this epoch's committee should sign on the block (weighted by staking amount) for the block to be accepted into the consensus. In addition, for each block during the epoch,  a "rewarded proposer" of the block that will be treated as a "must signer" (meaning that even if two-thirds of the stake signed but this rewarded proposer didn't, the block will be thrown) is defined. This rewarded proposer will then get the block reward, which will be constant per block. 
At this stage, the exact mechanism for deciding ahead of time who the rewarded proposer is is still TBD, but the requirement is that the rewarded proposer of each block be known at least 5 minutes in advance. 

#### Centralization-lever
As described above, this feature introduces a threat to SN liveness, as a bug within this feature might cause SN to freeze until the bug is resolved and validators upgrade to the newest software stack. To mitigate this scenario and prevent significant network downtime, this suggestion also includes an additional and **optional** "plugin" - a mechanism to nullify signature validation, as explained above, reverting Starknet to a centralized state.
**Automatically detect freeze** - If an epoch included less than ⅔  of the blocks an epoch should have (assuming max configured block time), Starknet would automatically move to a centralized state, and SW would continue to produce new blocks without waiting for validation for some time of up to X hours (Think on X as a significant time that allows proper investigation but still relatively short. Probably between 12 hours and 3 days). In this period, validators will not be required to participate in the protocol, and staking rewards will not be distributed.
**Revert to decentralized flavor**—when X hours eclipses, Starknet would have to return to a decentralized flavor unless the Security Council approved prolonging the centralized period because the correction and upgrade processes require more time. Furthermore, the Security Council needs to explicitly allow SW to use the lever again in the future, preventing SW from continuously moving to a centralized state without real justification. 

### No breaking changes  
This feature will entail no breaking changes to SN, meaning that all transactions valid with V0.14 will stay valid after this feature, and that there would be no RPC change. Shall a conclusion be made that breaking changes are necessary to secure one of the above requirements - this SNIP will be altered to present the tradeoffs and decide together on a path forward. 

## Implementation
Once we agree on the specifications, this section will contain the concrete design and suggestions for SN OS behavior.

## Security Considerations  
To never actually use the [optional lever](#Centralization-lever) detailed above, this feature will require thorough testing of its code and the resiliency of the validators participating in the protocol. The following testing mechanisms are suggested, and more checks and validation ideas are welcome:
* Have a dedicated testing network for test the reliability of stakers for a few weeks, before moving even to the testnet phase   
* This period will also include at least one stress test to ensure costs and throughput are up to expectation and that many transactions don't cause the network to slow down
## History
## Copyright
Copyright and related rights waived via [MIT](../LICENSE).
