**snip**: 28 (temporary number)  
**Title:** Staking v2 proposal  
**Author:** @NatanSW and @ob1337   
Status: Draft  
Type: Standards Track  
Creation date: \*\*  
Github link: 

---

## **Abstract**

By the end of 2025, we plan significant progress on the decentralization of SN. Such progress entails entrusting some core functionalities of SN to SN's Validators. As a prerequisite for such a significant milestone, we would like to test and verify two things: 

* The incentive structure makes economic sense  
* The Validator set consists of entities capable of running reliable infrastructure. 

Staking v1 was mainly focused on the former, and 


v2 will be focused on the latter.

Staking v2 should be ready to launch on Starknet mainnet in Q2 2025\. 

In this SNIP, we will describe the staking v2 proposal, its timeline, and its relation to future steps in decentralization in detail.

## **Motivation** 

Starknet continues its steady progression towards decentralization, as outlined in SNIP 18\. We see decentralization as a core requirement for a public blockchain. Currently, Validators are required to run full nodes, but there is no public way to verify this. Without public validation, the performance and reliability of these Validators remain untested. 

Based on our insights from Staking v1 and the current stake distribution, we believe the economic incentive structure also needs some improvement. To address these challenges, we propose two key enhancements in Staking v2: validator block attestation (which will be included) and an ability to increase Validator commission from its delegators (which will probably be included). 

### Motivation for validator block attestation

Before entrusting SN's validators with a role that affects SN's consensus (planned by the end of 2025), we ought to ensure that their liveness metrics are sufficient. Demanding liveness from validators will also allow Delegators to compare the liveness and reliability of different Validators, allowing them to make informed staking decisions. 

Validator block attestation will require Validators to attest to randomly selected blocks during each epoch, ensuring they actively track network activity. This mechanism will link Validator rewards to their successful attestation, encouraging consistent network participation. Introducing epochs as part of this design is another stepping stone towards the decentralized protocol version.

This upgrade also provides a valuable opportunity to test how Validators handle protocol changes and allows for improvements in future iterations based on real-world feedback before these changes affect SN stability. 

The need to allow validators to take an active role and show liveness metrics well before they get a formal role in the consensus drove this version and gives high motivation for this feature to be released well before the end of Q2. **Therefore, the other feature in V2, detailed below, has a particular risk of getting postponed to V3.**

### Motivation for commission increase feature

The current commission structure allows the commission only to decrease. While sensible in the short term, this model risks breaking whenever the cost of being a validator increases. Examples of why the validating cost might increase significantly in the long term include increased usage (which will require the validators to use more potent hardware) or the requirement to produce proofs and not only produce blocks (which is also on our decentralization roadmap). When it becomes unprofitable to be a validator, the Validator might exit the protocol entirely, automatically kicking all the users out of participating \- which is highly disruptive.

However, an unbounded, sudden  0→100 increase in commission is also something we want to avoid \- as we believe DeFi users deserve greater transparency around what commission they will pay in the future and when their commission might change \- which is why there is more to this feature than simply allowing commission increase.

## **Specification**

### Epochs 

Staking v2 is about adding a "work", or something that validators should actively do periodically, as a condition to receive rewards. In the future decentralized phase, the staking power of a validator should be an input to the work function (so the more stake you have, the more blocks you need to produce). However, to make things predictable, we can't have the staking weights map change immediately when someone stakes or unstakes. To handle this, similarly to what is done in many other protocols, we introduce the notion of epochs into the protocol. 

Epochs represent checkpoints where Staker's staking power is set. This "discrete" view of staking power will be used as an input to the consensus algorithm. Think of each epoch as 30 min to a few hours duration.

Therefore, we introduce a new latency parameter k, and update the staking power and rewards as a result of changes made in epoch i in epoch i+k. In the long term, when validators would produce blocks, k would be greater or equal to 2, as the producer of the first block of epoch j must be known before the last block of epoch j-1. However, in the staking v2 context (where validators are not yet producing blocks), k may be equal to one. 



### Block attestation section

The primary proposed change in Staking v2 is the introduction of a block attestation mechanism for Validators. This section outlines the technical details of the attestation process. For now, epochs are treated as groups of E blocks (a detailed explanation will follow in a later section).

Each Validator is assigned a block per epoch based on the following formula:

block\_number=Hash(staked\_amount,epoch\_id,validator\_address)%(E−W)

When the block\_number is the relative number within the epoch, and W represents the range of blocks applicable for attestation submittal.  
During each epoch, Validators have the opportunity to attest to their assigned block by submitting an attest transaction. This transaction includes the block hash of the attested block and must be included within a specific attestation window. If T represents the block number that meets the matching criteria, the attestation window spans from block T+11 to T+W (for instance, where W \= 20). Each Validator is required to perform only one attestation per epoch.

This mechanism ensures Validators actively use full nodes, as they need to track block hashes continuously. Additionally, the attestation reflects their activity and is publicly verifiable. This ensures Validators' reliability is publicly tested, which is crucial before Starknet's security and liveness depend on them.

Note that in this proposal, the work is the same for all Validators, and only the rewards are proportional to their stake. This is done to simplify the implementation so time and effort may be saved for the later stages. This is essential as testing Validators' reliability is crucial before handing them core responsibilities. Also, Running a full node is the main cost and effort, which is obligatory for all Validators.

Lastly, the exact parameters of epoch length (E) and attestation window (W) will be determined later and added to this proposal, but here are some thoughts about what is bounding them:

E should be large enough to keep the Operator's cost sensible—even on a day with high gas fees, the yield for an Operator that has staked only 20K STRK over an epoch should be significantly more than the cost of the transaction it would have to submit. E should be small enough so latency on activities that depend on epoch (such as adding or removing stake) will not be too cumbersome.  
W should be small to ensure liveness. But also \- not too small. We want to incentivize people to react in real-time but also to avoid scenarios where, due to sporadic spikes in the network, the Validator failed to submit a transaction in time.

### Rewards 

Rewards are still proportional to stake and calculated using the minting curve. The only change is that they are accumulated only to Validators who performed their attestations in the epoch. Notice that this means we remove the global reward index.

In Staking V2, rewards will be "all or nothing" per epoch \- so a validator that submitted a transaction during the epoch which proves he tracked the network will receive all the rewards for the epoch based on his staked amount, while a validator that didn't do it will get zero rewards for the epoch's duration.

After performing the attestation, the rewards that go directly to the Validator will accumulate in his account, and the rest will go to this Validator's pool. When a delegator claims his rewards, instead of looking at the global index, we will accumulate all the rewards the delegator has received from all epochs since the last time he claimed rewards. The complexity of this operation will not be O(number of epochs since the last claim) but rather O(number of this delegator's balance changes since the last claim), which is assumed to be small enough to fit in one transaction in any real-world scenario. 

### Latencies 

As we introduce the notion of epochs, the latency from when a user transfers STRK in or out of the staking protocol to the time staking rewards reflects this operation is determined by the remaining time in the current epoch plus the duration of k-1 more epochs. The withdrawal lockup period will still apply after exiting the protocol. (During the withdrawal lockup period, the funds are no longer counted for staking but are still locked within the staking contract)

\*Although Stake delegates are subject to a security lockup when withdrawing funds, they can move between Stakers without waiting for the full lockup period, enhancing the delegation market's competitiveness. This pool switching will have an added latency of k epochs when exiting one pool and entering another.

### New protocol parameters

Here is a table summarising the new protocol parameters proposed in this version:

| Economical Parameter | Proposed value |
| :---- | :---- |
| Epoch size (E) | 100-1,000 Blocks (this will change as a function of block time, which is 30 seconds now, 2 seconds from 0.14) |
| modulus power for defining the work (N) | 4-8 (so modulo would be 16-256) |
| The block window range to submit an attestation (W) | 16 \- 30 Block |
| number of epochs used for latency (k) | 1 |

### Commission increase

After [exposing](https://community.starknet.io/t/learning-from-staking-v1-a-discussion-on-commission-policy-and-stake-distribution/115163) some routes for allowing commission increase, the current suggestion is to opt for something close to option three which was detailed there. Namely:

* Validators will be able to commit to a certain maximum commission M, and the last date (in Epochs) for which this commitment is relevant. Until this last date arrives, validators will not be able to increase their commission beyond M but can freely change their commission in the range \[0, M\]  
* Once given, the Validator cannot change the commitments.  
* Commitments may not refer to more than one year from the date they are given. This is to be future-compatible with other features around commission (such as imposing minimal commission for large stakes) that may be added in the future. When the protocol stabilizes, the period the commitment refers to will be extended.  
* Future extensions, such as commitment extensions or future commitment support, will be considered based on community demand and actual usage.

Validators are encouraged to impose limitations on their commission to give maximal transparency to the users. The plan is that staking platforms and dashboards would highlight validators without commitment or validators where the current commitment will expire within the next month to increase user visibility.

## **Backward compatibility** 

**Rewards**  
All rewards accumulated before the upgrade will be accessible and will be accounted the first-time Validator or delegator performs an operation on the contract (claim, deposit, or withdraw STRK for delegators, perform work for validators). As usual, these rewards will be transferred only upon claim. 

Accumulating rewards after the upgrade will happen only if the Validator will attest to blocks  
Getting rid of the Index structure on the Staking contract altogether.  
The cost of a reward claim by a delegator will now depend on the number of times this delegator changed his balance since the last claim.

**Epochs upon entering and exiting.**

* Users that enter the protocol on epoch i will start getting rewards on epoch i+k  
* Users that intend  to exit the protocol on epoch i will still get rewards on epoch i till i+k \- 1

**Economical feature**

* Validators will be able to increase the commission

**Actual potential ABI and events \- we will update here when we know more.**

## **Security Considerations**

### New security considerations 

1. **Operational address is now used** \- the operational address Validators provided upon registration will now be used for submitting transactions to the network. Hacking the operational address can now lead to a loss of yield for the Validator and its delegators  
2. Preventing fast switching between validators \- to prevent delegator behaviors where delegators that see their Validator fails to perform work to too-quickly move a validator and enjoy the work it has performed. To prevent this, switching declared on epoch i will take effect in epoch i+1. 

The security considerations are the same as they have been on Staking V1 ([SNIP 18](https://community.starknet.io/t/snip-18-staking-s-first-stage-on-starknet/114334)). They are restated below for the sake of self-containment. 

The staking protocol's design includes several key security measures to ensure its integrity and user safety.

**Modular architecture** 

The proposed protocol will be implemented using a modular architecture, where different functionalities are separated into distinct contracts, such as staking, delegation, rewards supply, and more. This approach offers several advantages:

* **Simplifies Logic:** Each contract has a clear and specific role, making the code easier to test, audit, and understand.  
* **Enhances Access Control:** By defining specific permissions for each contract, the risk of unauthorized access or misuse is reduced.  
* **Allows Targeted Upgrades and Changes:** Updating only the relevant contract minimizes the potential for introducing new vulnerabilities.

### **Permissions and Key Management**  

The Staking protocol allows users to define different addresses for different functionalities. Thus, cold addresses with minimal activity can control important functionalities, reducing exposure to threats and enhancing user security.

Stakers register with three addresses:

* **Staking and Unstaking Address**: This address has permission to stake, add stake, and unstake. This means that it handles large amounts of STRK tokens and is only needed when entering or exiting the protocol. Thus, it can be kept in a cold wallet (minimal activity) to maximize security.  
* **Rewards Address**: This is where rewards will be sent. It can also be maintained with minimal activity, i.e., as a cold wallet.  
* **Operational Address**: This address represents the Staker for operational purposes, such as block attestations and, in the future, block proposing. Note that this address does not handle large amounts of funds. As it will be frequently used, it should be categorized as a hot address.

Stake Delegators register with two addresses:

* **Entering/Exiting address**: This address has permission to Delegate stake, add stake, and unstake. It handles large amounts of STRK tokens and is only needed when entering or exiting the protocol. Thus, it can be kept in a cold wallet (minimal activity) to maximize security.  
* **Rewards Address**: This is the address where rewards will be sent. It can also be maintained with minimal activity, i.e., as a cold wallet.

**Permissions:** The protocol uses a hierarchical approach between user roles. Colder addresses, which control larger funds, can replace more active ones if compromised. Specifically, Staker and Stake Delegator addresses can replace the rewards address.

## **Security lockup period**

When exiting, users face a 21-day lockup, during which no rewards are earned, and funds cannot be withdrawn. This disincentivizes sudden large withdrawals that could destabilize the network. Future versions will tie the exit process to epochs, maintaining the lockup period for a secure exit mechanism.

# **Timeline**

The development work is well underway, and the first stage of stakes is planned to go live as early as Q2 2024\. You can follow the development on our open-source [repo](https://github.com/starkware-libs/starknet-staking).

Future stages will include Stakers gradually assigned responsibilities, eventually validating and sequencing blocks. This gradual transition ensures stability and allows for thorough testing and improvements. For more details on the decentralized protocol, check out @Ilia's [series](https://community.starknet.io/t/starknet-decentralized-protocol-i-introduction/2671) of blog posts.

More details and proposals on subsequent stages will be introduced, as we progress. The next step is already in the research and planning stages, and it is set to launch a few months after the second stage. Our objective is to roll out these updates smoothly, with ongoing improvements guided by community feedback.

# **Feedback**

We want you to share your feedback and ask questions. You can comment on the community blog post and follow our development on our open-source [repo](https://github.com/starkware-libs/starknet-staking).

## **Copyright**

This SNIP will be released under an MIT license.
