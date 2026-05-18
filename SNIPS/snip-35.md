---

## **snip:** SNIP-35

## **Title:** Automatically adjust base fee to STRK price

## **description:** Adjust the base fee of Starknet to the STRK price

## **author:** Ohad Barta, ohad@starkware.co

## **discussions-to:**  https://community.starknet.io/t/snip-35-automatically-adjust-base-fee-to-strk-price/116168

## **status:** Draft

## **type:** Standard

## **category:** Core

## **created:**

## **Overview**

This SNIP proposes to reshape Starknet’s base fee protocol so that it is automatically adjusted based on STRK/USD price (in addition to the congestion-based adjustment that exists today). This feature will replace the manual adjustments that have been taking place since early 2026\.

The document outlines the motivation, surveys possible designs, and specifies a concrete mechanism that improves fee predictability, preserves incentives, and aligns better with long‑term decentralization goals.

## **Motivation**

Currently, Starknet’s base fee is a static configuration, aimed to cover sequencer costs**.** Without manual adjustments, when the STRK price rises, application fees increase in USD terms even though dApp revenues typically do not. This complicates budgeting for builders, whose revenues are usually denominated in USDC or other non‑STRK assets. Conversely, when STRK price drops, sequencers face reduced USD‑denominated revenue despite largely fixed operating costs.

While manual adjustments to the base fee have been introduced to counter that, these adjustments are infrequent, fully trusted, and might come at irregular intervals. They are much weaker than an on-the-fly mechanism that makes the fee rate depend on the current price. 

This SNIP only concerns itself with the L2gas price. Other fee components (L1gas, L1\_data\_gas) are meant to be a cost-recovery component with ETH settlement and work with a similar motivation according to a STRK/ETH oracle. 

## **Rationale**

Several approaches can address these issues, but all share a core requirement: integrating a STRK/USD price oracle into the Apollo nodes. This allows the protocol to dynamically calculate Feeactual \- a fee component that covers the marginal sequencing and proving costs. Since these operational costs are USD-denominated, this fee component must remain stable in USD terms, meaning its STRK value must change with the STRK/USD price.

The key question is how to map these concepts to the Starknet protocol semantics and Apollo’s implementation.

We review here two options:

### **Option 1: Dynamic minimal tip**

In this model, sequencers would only accept transactions if the user-provided tip covers the STRK-denominated Feeactual.

**Upsides:** Maintains a clean EIP-1559 separation and avoids hard-coding "costs" into the consensus, allowing sequencers to adjust tips freely based on their own optimizations.

**Downsides:**

*  **Lack of Signal:** Users have no on-chain reference for the current Feeactual. To ensure inclusion, rational users will "over-tip" to hedge against price swings, causing the market rate to ratchet upward regardless of actual congestion.  
* **Integration Burden:** This is a de facto breaking change, as many Starknet integrations use zero tip by default. Moving the cost-recovery to the tip would require an ecosystem-wide update to SDKs and wallets.


### **Option 2 (recommended): Dynamic minimal base fee**

Under this option, the protocol's minimal base fee (the fee when there is no congestion), is defined as Feeactual. The existing `tip` field keeps its original function as an explicit priority fee. As usual, if the user specifies a value higher than the base fee, they are only charged the base fee.

The upside is that this is a gentle modification to the current protocol: as before, tip=0 is expected to work if there is no congestion. Furthermore, there is no need for exploration mechanisms \- users are safe to sign on a fee higher than the base fee, and they will only be charged the base fee.

The specification below suggests a concrete way to "agree" on a specific STRK price (recall that each sequencer may use a different oracle). It relies on an aggregate of sequencer-reported values, ensuring that a dishonest minority cannot manipulate the Feeactual.

Under this model, Feeactual acts as a dynamic floor for the base fee. While the existing EIP-1559 style mechanism may raise the base fee higher during periods of congestion, it will never drop below Feeactual. As congestion subsides, the fee will decay until it reaches this price-adjusted floor, ensuring sequencers always cover their marginal USD-denominated costs.

**Specification**

### **Feeactual derivation (enforced by consensus)**

`Feeactual` of the current block will be defined as the median of values published over the last 10 blocks (by the last 10 proposers \- and excluding the current one). The median here will be defined as the average of the 5th and 6th values published, rounded down to the nearest Fri unit (1 Fri equals 10\-18 STRK). We denote these values by Feeproposal. Think of it as the “recommended fee for the sequencer” going forward. Feeproposal is part of the proposal, and is available for nodes participating in the consensus.  Feeproposal  isn’t affecting the block hash. 

**Initiation:** For the first 10 blocks after this SNIP is implemented, `Feeactual` will be the base fee used at the last block before this SNIP was implemented.

### **Feeproposal derivation**

Let `Feetarget` be the fee target according to the latest STRK price tick. Explicitly, this is the configured USD cost per L2Gas defined locally within the node, divided by the most recent STRK price. Note: the protocol doesn’t assume `Feetarget` is the same for all nodes, and some deviations are expected. 

Let `Feeactual` be the fee that was chosen for the current block (by the previous 10 proposers).

The consensus will enforce:

`Feeactual/1.002 <=` Feeproposal `<= Feeactual × 1.002`

Each sequencer may choose any Feeproposal that satisfies this condition, but honest sequencers will work as follows:

If `Feetarget > Feeactual`

* Feeproposal `= min(Feetarget, Feeactual × 1.002)`

Else:

* Feeproposal `= max(Feetarget, Feeactual/1.002)`

If an oracle fails (leaving `Feetarget` undefined), the sequencers will report Feeproposal \= `Feeactual` effectively "freezing" the base fee until the oracle returns.

**Rationale.** In this design, the fee a sequencer gets, `Feeactual`, is determined by the previous 10 sequencers, reducing their motivation to lie and push the price up. Because `Feeactual` is the median of the last 10 `Feeproposal` values, it is resistant to rapid spikes. Even if consecutive sequencers propose the maximum allowed increase \+0.2%, the median (the average of the 5th and 6th values) will not shift until a majority of the 10-block window contains new values. Specifically, if a price trend shifts, it takes 6 blocks for the median to "move" from its previous position. This creates a safety buffer where the `Feeactual` effectively adjusts at a maximum rate of 0.2% approximately every 5 blocks, preventing a single malicious sequencer or a brief price spike from causing fee volatility.

This ensures that the base fee only adjusts when a majority of the network agrees on a price trend, providing high predictability for users and preventing a minority (up to 50%) of sequencers from manipulating the fee.

Additionally, the price and the configured price per L2gas in USD are not hard-coded into the check. This means that the protocol is:

1. Resilient against oracle failures  
2. Allowing changes in the expected fee in USD per L2gas without a version upgrade \- the price will slowly align to the new expected fee payment once the majority of the network switches configuration. 

**User guidance**

Transaction submission remains largely unchanged. Because users are only charged the actual base fee regardless of their `max_fee` setting, they can safely "overshoot" the base fee to protect against fluctuations. However, since this mechanism increases the variance of the base fee, SDKs and users are advised to include a slightly larger buffer in their fee estimates to ensure inclusion during price-adjustment periods.

## **Implementation**

This SNIP is published for early discussion and feedback. Implementation has not yet started. This section will be updated once implementation is underway or completed.

## **Backwards Compatibility**

* This SNIP will increase base\_fee variance. While not breaking any interface syntactically, users will need to use higher margins for the base fee they use in the transaction submission. 

## **Security Considerations**

Once Starknet block proposal is decentralized, a majority of the sequencers can collude, and it will have degrees of freedom to deviate from the recommended price. This is not treated as a major security concern, as this deviation can’t be done by a single sequencer and will require a majority of the sequencers.

**Copyright**

Copyright and related rights waived via [MIT](https://chatgpt.com/LICENSE).

