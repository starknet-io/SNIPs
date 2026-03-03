---
snip: 37
title: Revisit Storage access cost
description: Increase the cost gap between computation and storage in starknet
author: Ohad Barta (ohad@starkware.co)
discussions-to: https://community.starknet.io/t/snip-37-revisit-storage-access-cost
status: Draft
type: Standard
category: Core
created: 2026-03-03
---

## Simple Summary
This SNIP proposes to significantly increase the L2gas required for StorageRead and StorageWrite syscalls in Starknet. The document outlines the motivation and specifies a concrete new pricing for the proposed change. The following section discusses the motivation and rationale behind this proposal. TLDR of the proposed changes:

| Metric | Current | Proposed | Change |
| :--- | :--- | :--- | :--- |
| StorageRead | ~9,000 | 18,000 | +100% |
| StorageWrite (Exist) | ~9,600 | 45,000 | +368% |
| StorageWrite (New) | ~9,600 | 447,000 | +4,556% |
| Base L2 Gas Price | $10^{-9}$ | $0.8 \times 10^{-9}$ | -20% |
| Max Tx Size | 1B | 1.1B | +10% |
| Block Target L2gas | 4.8B | 1.5B | -68.7% |
| Block maximal L2gas | 6B | 2.5B | -58.3% |

## Motivation
Currently, StorageRead and StorageWrite operations cost roughly 9,000–10,000 L2gas each. This cost covers accessing the state cell being read or written to, updating its status, and the state of its direct parent in the Patricia Merkle tree of the Starknet state.
However, proving claims along the entire leaf-to-root path is needed for every StorageRead and StorageWrite operation. So far, this has not been included in the price of StorageRead and StorageWrite, as accurately measuring them is cumbersome and requires a refund mechanism in case of multiple StorageReads and StorageWrites to the same cell, as well as understanding the exact Patricia structure, etc.

However, not including these costs is suboptimal:

* **Unjustified expensive computation:** While Starknet as a whole is profitable, currently, all the intermediate-nodes proving of the state, which is a significant component of the proving needed per block, is done “for free”. This means that pure computational operations currently implicitly subsidize storage-access operations. This creates a situation where app builders are incentivized to optimize computation rather than storage access, while Storage access is what is costly for Starknet. This anomaly needs to be addressed.
* **Inability to measure congestion:** 1559 congestion is currently measured in L2Gas, yet blocks are closed on Starknet even when they are near the threshold and too large to prove. This means that ATM blocks with plenty of StorageRead/StorageWrite syscalls might be closed due to being full, while their “L2Gas” metric remains unjustifiably low, failing to indicate the congestion.
* **Future incompatibility:** StorageWrites that increase Starknet state create lasting costs for validators, since the new state must be stored. This proposal introduces a fee reflecting the long-term storage expense added by the new state, providing an incentive to optimize storage.

Therefore, this SNIP offers an “averaged” approach: the average computational overhead that StorageRead and StorageWrite impose on Starknet was analyzed, and the price going forward will be set accordingly. It's recommended that this analysis be re-executed to see whether changes in traffic patterns on Starknet calls can alter these average weights.

## Rationale

### Qualitative explanation of what happens on StorageRead/StorageWrite
Whenever a smart contract accesses the Starknet state via a StorageRead or StorageWrite operation, additional checks are added at the block level to ensure consistency between the block state commitment and the values fetched/written to the state. Specifically, for each such syscall, the following claims are added to the block proof:

**StorageRead:** The entire path from the accessed state cell to the main root of the Starknet state must be valid and must indicate the fetched value.

**StorageWrite (to an existing state cell):**
1. The entire path from the state cell accessed to the main state root of Starknet (before the write) is sound.
2. The entire path from the accessed state cell to the main Starknet state root (using the same sibling input as the previous claim) must lead to the root that represents the post-write state.

These two claims are aggregated per block for each unique write, meaning that for each unique write, the paths before the first write and after the last write in each block are proven.



### The alias contract state and DA
The alias contract, introduced in Starknet 0.13.5, is an optimization for the DA format and aims to reduce the length of the DA blob reported to Ethereum by attaching a new alias to each key in the starknet state. This means that whenever we write to an existing state cell, this write will translate to a DA-report (unless a subsequent write will cancel the effect after this within the same block/adjacent block, but this is a rare case that can’t be accounted for).

Writes to a new location within the state will often generate a new alias entry, creating additional 'write' overhead for the alias contract compared to StorageRead.

**StorageWrite (to a new state cell):**
* Same checks as StorageWrite to an existing cell (read from this cell for proving its 0, write for this cell and proving the new state root, read the alias contract before the alias allocation, and prove that the alias is 0)
* Allocating a new alias for this key (if such is required), and proving the new state after the alias allocation

### The analysis performed
It is impossible to deterministically assign each StorageRead or StorageWrite operation to the actual system cost:
* It's undetermined what the read/write distribution is within the Patricia Merkle tree.
* Writing to a new state cell may or may not generate a new alias entry (aliases for the same key across contracts are shared).
* Repeated StorageWrite operations could revert a state cell to its original value, making them cheaper than a single StorageWrite.

Therefore, a statistical analysis was performed to build a multilinear regression that explains the number of commitment facts (which roughly captures the number of pedersens done to prove the internal nodes of the Patricia tree) as a function of the unique reads, unique writes (to non-empty places), and unique writes (to empty places). The analysis, done over 148K Starknet blocks spanning over several days, showed an extremely linear dependency ($R^2 = 0.998$ with 0 intercept) between the number of pedersens to calculate and these variables (number of unique reads, number of unique writes to an existing place, number of unique writes to a new cell). The formula found is:

$$Number\ of\ fact\_checks = 8.312 \cdot unique\_reads + 67.999 \cdot write\_from\_zero + 39.764 \cdot write\_from\_nonzero$$

The cost of an internal fact check is one pedersen plus roughly 16 Cairo steps, or **5,700 L2Gas**.

The contribution of unique reads and unique writes (to an existing/nonzero cell) was then divided by the number of StorageRead and StorageWrite (minus the number of StorageWrite that wrote into a new place), to estimate the marginal contribution of each and every syscall, on average.

## Specification

### The new suggested weights
* **StorageRead:** On average, the ratio between StorageReads and unique state cells being read is 1:5.2. This means that each StorageRead should account for $8.31/5.2$ fact checks (approximately 9,000 extra L2gas), for a total cost of **18,000 L2gas** (up from the current 9,000).
* **StorageWrite for an existing state cell:** On average, the ratio between StorageWrite (excluding writes to new cells) and unique nonzero state cells being written to is 1:6.4. This means each StorageWrite should account for $39.76/6.4$ fact checks (worth 5,700 gas each), totaling **45,000 L2gas** (up from the current 9,600).
* **StorageWrite for a new state cell:** This type of operation is unique per write and must cover all 67.99 extra fact checks itself, amounting to roughly 387,000 extra L2gas. Writing a new state cell also incurs the storage cost across all Starknet sequencers. The suggestion is to add **50,000 L2gas** for that, which should compensate for a few dozen validators storing the associated data for a decade. Thus, the overall cost is **447,000 L2gas** for writing a new state cell. While there are currently no mechanisms or rewards for “clearing” storage, this SNIP assumes that in 10 years' time, such mechanisms will be introduced, if needed.


### Additional changes suggested
**Max L2 gas per transaction:** To improve the chances that the vast majority of transactions that were legal before this SNIP stay legal after it, the proposal is to increase the maximum allowed L2 gas per transaction from 1B to 1.1B. While this is not a hermetic bound (a transaction that initiates 2,000 new state cells will be ~890M L2 gas more expensive due to that alone), this change is sufficient to make typical large transactions sent by Starknet top apps still valid. Furthermore, notice that the max L2Gas per transaction can’t be too close to the maximal L2gas per block, since block-size transitions prevent parallel execution and their toll on the network is much higher than that of normal-sized transactions.

**Base L2 gas price:** As this suggestion increases L2 gas consumption for existing logic, the intention is to reward storage-light use cases. Thus, the suggestion is to decrease the base cost of L2gas by 20%. Such a reduction will allow use-cases that heavily optimize storage access to become cheaper, while taxing use-cases that more heavily rely on state operations.

**Max and target L2 gas price:** While the proposal here successfully addresses the “hidden overhead” of repeated reads and writes, several other anomalies in Starknet prevent some of the block's logic from being counted toward the L2 gas metric. An analysis of the 150,000 blocks detected shows that blocks are near-full (i.e., close to being closed on prover capabilities) when the L2gas used is within the 1.5-2B gas range. Only few blocks had more than 2B L2gas before they were closed on proving resources. Thus, the suggestion is to change the max L2gas per block to 2.5B and the target L2gas per block to 1.5B, to better detect congestion and allow 1559 to behave as expected.

## Implementation
This SNIP is limited to configuration changes and does not include new code.

## Backwards Compatibility
Applying this SNIP means that all L2 gas consumption simulations will be updated to the new version. This means that users will need to bump their fullnode version, or risk having their transactions rejected due to out-of-gas errors (as they might sign on the incorrect, smaller amount if using an old node).

As noted in the “Additional changes suggested” section, this SNIP might push some transactions that are very heavy in StorageRead/StorageWrite operations beyond the maximum transaction size. To mostly counter this, this SNIP suggests raising the max transaction size from 1B L2gas to 1.1B L2gas (enough for thousands of StorageReads and StorageWrites at existing locations). While we are unaware of any use cases that would result in illegal transactions after the SNIP is implemented, the theoretical possibility exists.

## Security Considerations
There are no security considerations.

## Copyright
Copyright and related rights waived via [MIT](https://opensource.org/licenses/MIT).
