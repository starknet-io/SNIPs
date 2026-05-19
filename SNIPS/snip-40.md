## **snip: SNIP-38**

## **Title: Improving Starknet config**

## **Description: Change starknet operational parameters for better efficiency**

## **author: Ohad Barta, ohad@starkware.co**

## **discussions-to:**

## **status: Draft**

## **type: Standard**

## **category: Core**

## **created:**

## **Simple Summary**

This SNIP introduces several changes to Starknet's sequencing and gas count to improve network efficiency and responsiveness. These include adjusting the block target L2 gas, reducing block time, adjusting gas costs for read/write operations, and increasing the maximum L2 gas per transaction. The aim is to balance resource usage, improve the 1559-congestion detection mechanism, and enhance the user experience.

​

| Metric | Current | Proposed | Change |
| :---- | :---- | :---- | :---- |
| **Typical block execution slot** | 2 seconds | 1.5 seconds | \-25% |
| **Block Target L2gas** | 1.5B | 1.04B | \-30.67% |
| **StorageRead L2gas** | 18,000 | 24,000 | \+33% |
| **StorageWrite L2gas (Existing cell)** | 45,000 | 60,000 | \+33% |
| **Max Tx Size** | 1.1B | 1.11B | \+0.9% |

## **Motivation And Rationale**

Block target L2 gas: SNIP 37 changed the target L2 gas price to 1.5B. The rationale was to link congested blocks to higher fees, ensuring Starknet stays stable and serviceable under any demand. However, empirical data shows that the number of blocks reaching resource limits, i.e., those that were completely full and more transactions couldn’t be added to them because proving gas or state diff limit was reached, significantly exceeds the number of blocks reaching the 1.5B L2 gas target. For example, from 30.04 till 13.05 (inclusive), 21255 blocks were closed on resources, while only 7012 used 1.5B L2gas or more. The suggested block target gas (1.04B) balances these two numbers, as 21255 blocks had 1.042B gas or more during these two weeks.

​

However, reducing the target L2gas per block comes with a trade-off: without changing the block time, it might reduce the L2gas/sec the network can process without increasing the minimum price. Reducing the typical block time is needed to keep the L2gas/sec the network can process at a minimal price, while offering better responsiveness.

Current 2-second block times are conservative, but faster times are possible, except in rare cases such as large declarations. The first suggested step is a 25% reduction, from 2 seconds to 1.5 seconds. Subsequent reductions to subsecond blocktime may follow, depending on the results of this change.

One concrete effect of reducing the block time is a decrease in the number of typical read/write accesses per memory cell accessed per block. As block times are reduced by 25%, the average number of accesses per memory cell within a block should drop by this amount, meaning that any read/write should be 33% more expensive to offset this cost.

As in SNIP-37, increasing per-operation gas justifies a slight rise in maximum transaction L2gas.

## **Implementation**

This SNIP is limited to configuration changes and does not include new code.

## **Backwards Compatibility**

1. Applying this SNIP means that all L2 gas consumption simulations will be updated to the new version. This means that users will need to bump their fullnode version, or risk having their transactions rejected due to out-of-gas errors (as they might sign on the incorrect, smaller amount if using an old node)  
2. This SNIP might push some transactions that are very heavy in StorageRead/StorageWrite operations beyond the maximum transaction size. To mostly counter this, this SNIP suggests raising the max transaction size from 1.1B L2gas to 1.11B L2gas (enough for containing the difference for several hundred StorageReads and StorageWrites). While no existing use cases are expected to produce invalid transactions post-implementation, the theoretical risk of a transaction exceeding the new limits remains.

​

## **Security Considerations**

There are no security considerations.

## **Copyright**

Copyright and related rights waived via [MIT](https://chatgpt.com/LICENSE).

​

​

