---

## **snip:** SNIP-

## **Title:** Meaningful separation of tip from the base fee

## **description:** Meaningful separation of tip from the base fee

## **author:** Ohad Barta, ohad@starkware.co

## **discussions-to:**  https://community.starknet.io/t/snip-35-automatically-adjust-base-fee-to-strk-price/116168

## **status:** Draft

## **type:** Standard

## **category:** Core

## **created:**

## **Simple Summary**

This SNIP proposes significantly reducing Starknet’s base fee and instead relying on the transaction tip to cover the marginal cost of execution. The document outlines the motivation, surveys possible designs, and specifies a concrete mechanism that improves fee predictability, preserves incentives, and aligns better with long‑term decentralization goals.

## **Motivation**

Currently, Starknet’s base fee covers sequencer costs, and StarkWare—operating the sequencer today—receives the full base fee. In addition, except under congestion, the base fee is effectively constant and denominated in STRK. This design has two major drawbacks:

**Unpredictable prices.** When the STRK price rises, application fees increase in USD terms even though dApp revenues typically do not. This complicates budgeting for builders, whose revenues are usually denominated in USDC or other non‑STRK assets. Conversely, when STRK price drops, sequencers face reduced USD‑denominated revenue despite largely fixed operating costs.

**Future incompatibility.** Allocating the base fee to the block producer deviates from EIP‑1559 as implemented on Ethereum, where the base fee is burned rather than paid to the proposer. This deviation is problematic long‑term: if base fees are paid directly to sequencers, a small set of colluding sequencers can simulate congestion and extract additional value from users at no cost to the network. The 1559 mechanism relies on the base fee being neutral with respect to proposer incentives; paying it to sequencers breaks this property.

## **Rationale**

At a high level, there are three plausible approaches to addressing these issues. All of them share a common element: introducing a STRK/USD (or STRK/USDC) price oracle into Apollo, and splitting fees into two conceptual components:

* **fee_dividend** – a network‑aligned fee component intended for burning, redistribution, treasury funding, staking rewards, or similar mechanisms. This fee should be significantly lower than today’s base fee (initial suggestion: \~2 gFri/L2Gas) and should increase with congestion, reflecting network demand. The exact handling of this component is explicitly out of scope for this SNIP.  
* **fee_sequencer** – a cost‑recovery component intended to cover marginal sequencing and proving costs, which are largely USD‑denominated. This component should be stable in USD terms and therefore vary with the STRK price.

The key question is how to map these concepts onto Starknet protocol semantics and Apollo’s implementation.

### **Option 1: Base fee \= fee_dividend \+ fee_sequencer**

Under this option, the protocol base fee is defined as the sum of fee_dividend and fee_sequencer. Only fee_sequencer is paid to the sequencer; fee_dividend is handled according to a future mechanism (burn, redistribution, etc.). The existing `tip` field remains an explicit priority fee that always goes to the sequencer. Any base fee specified above fee_dividend \+ fee_sequencer is not charged to the user.

**Downside.** Because the base fee must be agreed upon by all sequencers, determining “how many USD cover execution costs” becomes a governance problem rather than an economic decision made independently by each node. Over time, this prevents individual sequencers from immediately passing efficiency gains (e.g., better proving stacks) on to users via lower fees. It also requires global agreement on a STRK/USD oracle, complicating consensus.

### **Option 2: Base fee \= fee_dividend, tip covers costs implicitly**

Here, the base fee is reduced to fee_dividend  only. Sequencers are expected to accept transactions only if the tip is large enough to cover execution costs, meaning the minimal accepted tip implicitly tracks STRK price.

**Downside.** Users have no reliable on‑chain signal for the required fee_sequencer. Rational users who strongly prefer inclusion will slightly outbid the currently observed minimal tip to hedge against price movement. If all users behave this way, the minimal accepted tip ratchets upward over time even without congestion, leading to persistent overpayment.

### **Option 3 (Recommended): Explicit fee_sequencer publication**

This option refines Option 2 by adding explicit, user‑friendly discovery of fee_sequencer with minimal behavioral changes:

* Each block proposer publishes an expected fee_sequencer value. The proposer can technically choose any value here.   
* Proposers that follow this SNIP will change their fee_sequencer slowly and predictably between blocks.

Let `Feemin` denote the minimal tip among transactions included in a block. User behavior is then:

* If `Feemin ≤ fee_sequencer × MaxPriceRateChange` (where `MaxPriceRateChange` is slightly above 1), there is no congestion. Users can submit transactions with a tip of `MaxPriceRateChange × min(Feemin, fee_sequencer)` and expect inclusion.  
* If `Feemin` is significantly larger than `fee_sequencer`, congestion is present and users behave as they do today.

When prices are stable, fee_sequencer remains stable (especially across blocks proposed by the same sequencer), ensuring predictable USD‑denominated fees.

## **Specification**

* The first transaction in each block publishes `fee_sequencer` via an event.  
* `fee_sequencer` is not consensus‑enforced. Sequencers may choose any value, but large deviations from the recommended derivation make it difficult for users to price transactions correctly, disincentivizing irrational behavior.

### **Recommended fee_sequencer derivation**

Let:

* `Tp` be the tip implied by the latest STRK price tick and the configured cost per L2Gas.  
* `Tp' = Tp / 1.01`.  
* `Tprev` be the median `fee_sequencer` published in the last 10 blocks.

On bootstrap or consensus join, an Apollo node initializes `Tp'` as the median of the last 10 published values.

Define:

* If `Tp' > Tprev`:  
  * `fee_sequencer = min(Tp', Tprev × 1.002)`  
* Else:  
  * `fee_sequencer = max(Tp', Tprev / 1.002)`

If the node lacks a current STRK price, it reuses the previous proposer’s price.

**Rationale.** Using a rolling median over multiple blocks smooths out variance when proposers are decentralized and not all sequencers follow the recommendation. Some sequencers may rationally deviate due to different cost structures; the median dampens these effects and improves predictability for users.

### **User guidance**

This mechanism guarantees the following:

* If `Feemin > fee_sequencer × 1.02`, congestion exists and fee setting follows current practices.  
* If `fee_sequencer ≤ Feemin ≤ fee_sequencer × 1.02`, the sequencer charges fees consistent with its published value, and there is no strong congestion. Users can submit transactions with a tip of `fee_sequencer × 1.02` and expect inclusion.  
* If `Feemin < fee_sequencer`, the proposer is not following this SNIP. Users should ignore the published `fee_sequencer` and rely on `Feemin`

The constants are chosen intentionally. In the event of a sharp STRK price drop (requiring higher STRK‑denominated tips), these constants will dictate `fee_sequencer` increase at a rate of \~1.2% per minute:  With a 10‑block median, price-step will happen every 5 blocks. As the step size suggested here is 0.2%, it means that  there would be at most 0.2% increase every \~5 blocks, translating to  \~1.2% per minute. Users who pay 2% above the published `fee_sequencer` can be confident of inclusion for \~100 seconds in the absence of congestion.

## **Implementation**

This SNIP is published for early discussion and feedback. Implementation has not yet started. This section will be updated once implementation is underway or completed.

## **Backwards Compatibility**

This SNIP significantly changes transaction fee semantics, but the intent is to preserve existing client behavior via SDK updates. The following workflow should continue to function unchanged:

```
current_base_fee = estimate_fee(current_block)
current_tip = estimate_tip(current block)
calculate_fee_for_transaction(current_base_fee, current_tip)
```

SDKs will update the `estimate_tip` endpoint to incorporate `fee_sequencer`  and its logic described above, rather than returning the minimal observed tip. A new endpoint, `minimum_tip`, will expose the raw minimal value.

Clients that upgrade to newer SDK versions will thus be compatible with this SNIP. Even without explicit SDK upgrade, this code is expected to continue and function ok, as current SDKs either take significant buffer on top of minimal fee ([starknet.js](http://starknet.js)) or return the median tip and not the minimal one ([starknet.py](http://starknet.py) and several others). This means that once enough clients upgrade to be compatible with this SNIP, existing clients will work just fine without upgrading their SDK. 

The following patterns to sending transactions will break, though:

* Clients that always submit transactions with `tip = 0`; such transactions will no longer be accepted. Notice that such logics will not function also today when there is congestion (happened a couple of times since 0.14 launch).   
* Asynchronously signed transactions (e.g., multisig flows over long time spans) may need to specify larger tips to account for STRK price movement over hours. Notice that these transactions are sent very infrequently. 

## **Security Considerations**

When the Starknet block proposal will be decentralized, sequencers will have degrees of freedom to set arbitrary `fee_sequencer.` This is not treated as a major security concern compared to moving forward without this SNIP, as proposers will also be able to choose whatever tip they want in general, adjust the minimum tip for current demand and their economical model. 

## **Copyright**

Copyright and related rights waived via [MIT](https://chatgpt.com/LICENSE).

