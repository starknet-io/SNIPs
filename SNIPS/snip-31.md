# Bitcoin Staking on Starknet

**snip:** 31   
**Title:** Bitcoin Staking on Starknet  
**Author:** @NatanSW   
Status: Draft  
Type: Standards Track  
Creation date: June 25rd, 2025
Github link: 

# Abstract

This post proposes a novel Bitcoin (BTC) staking mechanism on Starknet, enabling BTC holders to lock their assets on Starknet and earn staking rewards in STRK. The protocol will support a curated selection of tokenized BTC representations ("wrappers") for direct staking on Starknet. Designed for simplicity and robustness, this mechanism operates independently of STRK/BTC exchange rates for consensus and minting. Staking pools and rewards rates for both BTC and STRK are governed by market dynamics, fostering a fair and flexible unified staking framework.

# Motivation

Incorporating BTC staking strengthens Starknet’s security while minimizing marginal costs. As Bitcoin is widely considered a lower-risk asset, its holders are willing to accept lower yields, which in turn reduces the per-dollar cost of securing the network.

From Bitcoin’s perspective, adding a staking utility to Bitcoin introduces a new use case for BTC holders: earn low-risk staking rewards rather than passively hold BTC in wallets. This unlocks Bitcoin's value and gives it an active role in the decentralization of Starknet and the decentralized economy.

As mentioned above, the entire Bitcoin staking protocol will be built directly on Starknet. This enhances composability with DeFi protocols, supports integration with liquid staking tokens (LSTs), and allows multiple forms of BTC (e.g. wrapped tokens) to be used seamlessly.

# Specification

This section outlines the core mechanics of the proposed Bitcoin staking protocol. It covers how Bitcoin staking affects consensus, rewards distribution, minting, and APR dynamics. Additionally, it describes how the protocol will be implemented **entirely on Starknet**, with a particular focus on the handling and integration of BTC wrappers.

## Staking Power

Bitcoin staking will modify how validator staking power is calculated. Instead of depending solely on STRK (staked and delegated), it will combine two components: STRK power and BTC power. We define $0 \leq \alpha < \frac{1}{3}$ , as the parameter determining BTC’s weight in the staking power. For a Validator with *s* STRK and *b* BTC, the staking power is calculated as the sum of the following:

**Staking power** \= **STRK Power** \+ **BTC Power** \=  $(1 - \alpha) \cdot \frac{s}{S} + \alpha \cdot \frac{b}{B}$

Where S and B are total STRK and BTC staked, respectively.

The suggested range for  is 0.20 to 0.25, meaning BTC would comprise 20%–25% of total staking power. This range strikes a balance: it creates meaningful incentives for BTC participation while ensuring that control of Starknet remains anchored with STRK holders. A more detailed discussion of the incentive and security implications follows.

## Reward distribution

As with STRK staking, Bitcoin staking rewards are also issued in STRK and are based on new token issuance (more on minting below).

In general, reward distribution is tied to staking power and the performance of expected network duties (currently block attestation). The introduction of Bitcoin staking does not change this core mechanism. **The pool of staked Bitcoin would be eligible for  a fraction of the total rewards.**

As before, Delegators receive rewards according to their share of the validator’s delegation pool, after deducting validator commission.

## Minting

As described above, Bitcoin stakers are eligible to receive an *α* fraction of the total minted rewards, assuming they fulfil the required consensus duties. The natural question is: what determines the total amount of STRK minted?

The minting of new STRKs is determined by a set minting curve, a core part of the Staking protocol. This curve adjusts the minting rate based on the total amount of STRK being staked (for more details, see [SNIP 18](https://community.starknet.io/t/snip-18-staking-s-first-stage-on-starknet/114334#p-2357184-minting-curve-7)). This proposal uses the same logic and minting curve structure, meaning the amount of staked Bitcoin will **not influence the STRK issuance rate**. This design choice enables the protocol to remain exchange-rate agnostic and keeps the minting mechanism clean and robust.

As Bitcoin Staking rewards must come from somewhere, we face an important design choice. Should we introduce Bitcoin staking by:

1) Keeping the total issuance of new STRK the same, but redistributing it. This would mean reducing the APR for STRK stakers to fund the rewards for new Bitcoin stakers.  
2) Maintaining the current APR for STRK stakers and creating new rewards for Bitcoin stakers. This would mean slightly increasing the overall inflation rate of the protocol.

We propose the second option—preserving STRK APR and allowing additional inflation for BTC rewards. This maintains the protocol’s original commitment to STRK stakers, while enabling Bitcoin participation without replacing STRK with BTC in consensus.

Under this choice, BTC staking rewards—equal to an *α* fraction of the total—are **minted on top** of the existing STRK rewards. This means that the total Minting rate in percentage (M) is given by:

$M = \frac{1}{1 - \alpha} \cdot \frac{c}{10} \cdot \sqrt{\sigma}$

Where σ is the % of STRK that is staked and c is the current minting coefficient. As a sanity check, let's see that the STRK Minting rate ($M_{\text{STRK}}$) is unchanged. In this proposal, STRK stake gets $(1 - \alpha)$ of the total staking power, and so, $(1 - \alpha)$ of the entire rewards minted. So,

$M_{\text{STRK}} = (1 - \alpha) \cdot M = \frac{(1 - \alpha)}{(1 - \alpha)} \cdot \frac{c}{10} \cdot \sqrt{\sigma} = \frac{c}{10} \cdot \sqrt{\sigma}$

Which is the current minting rate ([See SNIP 18](https://community.starknet.io/t/snip-18-staking-s-first-stage-on-starknet/114334#p-2357184-minting-curve-7)).

Now, let's consider the impact on the effective inflation coefficient. Let c be the inflation coefficient according to the current minting curve and protocol. The new effective coefficient, $\hat{c}$, after including BTC staking rewards, becomes:

$\hat{c} = \frac{1}{(1-\alpha)} \cdot c$​​

This is also the theoretical maximum inflation cap—i.e., the inflation rate if all STRK is staked. (For more details, see [SNIP 18](https://community.starknet.io/t/snip-18-staking-s-first-stage-on-starknet/114334#p-2357184-minting-curve-7)).

Given the current c \= 1.6%, and assuming  $\alpha=0.25$\, the effective c becomes:

$\hat{c} = \frac{1}{1-0.25} \cdot 1.6 = 2.133\$%

This 2.133% is well within the community-agreed maximum inflation cap of 4%. (See the Staking on Starknet [vote](https://governance.starknet.io/voting-proposals/5))

## APR breakdown and examples

As explained above, STRK staking APR remains unchanged, so we will focus on Bitcoin APR. For reference on STRK APR behaviour, see Staking dashboards and prior staking posts.

Bitcoin’s APR depends on the following factors:

* **STRK/BTC exchange rate** – Since rewards are distributed in STRK, the value of rewards for BTC stakers depends on this rate **linearly**.  
* **The total amount of STRK rewards minted** – BTC stakers receive a fixed fraction (*α*) of total minted STRK, so more STRK minted means higher BTC rewards. This is also a **linear** dependency.  
* **Amount of BTC staked** – Since BTC stake doesn’t affect STRK minting, more BTC staked means rewards are split among more participants, reducing APR.

You can see these dependencies in the formula for the Bitcoin APR:

$\mathrm{APR}_{BTC} = (\alpha \cdot T \cdot \frac{M}{100} \cdot \frac{STRKprice}{BTCprice}) / B$

Where B is the total Bitcoin stake, M is the minting rate in percentage, and T is the total supply of STRK.

Note that BTC stakers have a strong interest in increasing the total STRK staked in the protocol, either by compounding rewards or allocating extra STRK’s to the protocol. A higher STRK stake increases the total amount of STRK minted (even if the rewards rate for STRK decreases), which in turn boosts BTC rewards. **This creates a beneficial alignment between BTC Stakers and STRK staking.**

To get a feel for all of this, in the table below are some concrete examples using the average prices of STRK and BTC over last six weeks. (From May 9th to June 21st: BTC \= $105,827 and STRK \= $0.146.)

| Amount of BTC staked in million dollars | STRK staked | STRK Inflation cap c | Effective inflation cap $\hat{c}$ | Bitcoin APR |
| :---- | :---- | :---- | :---- | :---- |
| 100 | 315M (\~Current) | 1.6 | 2.13 | 1.3% |
| 100 | 315M (\~Current) | 3 | 4 | 2.4% |
| 100 | 600M (Expected on launch day) | 3 | 4 | 3.4% |
| 200 | 600M (Expected on launch day) | 3 | 4 | 1.7% |

## **Bitcoin (Wrappers) Staking**

As mentioned earlier, the Bitcoin staking protocol will operate entirely on Starknet. Since native BTC currently exists only on the Bitcoin network, the protocol must rely on tokenized representations ("wrappers") of BTC on Starknet.

While a trustless/trust-minimized, canonical Bitcoin representation on Starknet is a long-term goal, it's not immediately available. In the interim, the protocol will support various existing BTC wrappers.

### Functionality of Supported Wrappers

Here's how different BTC wrappers will function within the staking protocol:

* **Delegation Only:** Staking BTC will be possible exclusively through delegation to validators. The requirements for validators remain unchanged—each must stake a minimum of 20,000 STRK to participate.  
* **Dedicated Delegation Pools:** For each supported BTC wrapper, validators can open a separate delegation pool. This means if you're delegating using different types of BTC wrappers, you'll interact with distinct pools for each type.  
* **Equal Representation (1:1):** Each unit of any supported Bitcoin wrapper will be treated as one unit of staked BTC for reward and consensus calculation purposes, irrespective of minor USD price differences between the wrappers.  
* **No Mixing:** Delegators will always withdraw the same type of wrapper they initially staked. The protocol will not mix or convert between different wrapper types.  
* **Uniform Validator Settings:** Validator commissions and withdrawal security delays will be applied uniformly across both STRK and BTC staking pools they operate. (Further distinct functionalities might be considered in the future).  
* **Pool Switching:** If a delegator wishes to switch their staked BTC from one validator to another, this will only be possible if both the old and new validators support the specific BTC wrapper being staked.

### The Supported Wrapper List

A key consideration is which BTC wrappers will be supported and how this list will evolve. Taking into account security, adoption and reputability, we propose that the protocol initially support a subset of the following Bitcoin wrappers: WBTC (BitGo), LBTC (Lombard), tBTC (Threshold), SolvBTC (Solv) and PumpBTC.

The exact set that will be supported will be published closer to the launch, as it depends on technical details and integration of the wrappers, etc.

To add wrappers to the above list, we believe a governance procedure should be in place. This could be a Monetary committee review, a community vote, a combination of the two, or another suitable procedure.


## Economic Analysis

The table below presents a few sample economic scenarios. The columns are separated into  four categories:

* 🟥 **Protocol Parameters**: Inflation coefficient *(c)*, effective inflation cap $\hat{c}$, $\alpha$. 
* 🟧 **Token Prices**: STRK price in cents, BTC price in thousands.  
* 🟨 **Economic Assumptions**: Equilibrium reward rates.  
* 🟩 **Outcomes**: STRK staking rate, Total minting rate, BTC rewards in USD, total value of BTC staked.

| STRK inflation cap c 🟥| Effective inflation cap  $\hat{c}$ 🟥| $\alpha$ 🟥| STRK in cents 🟧 | BTC in $K 🟧 | STRK equilibrium rewards rate % 🟨| BTC equilibrium rewards rate % 🟨| STRK staking rate % 🟩| Total minting rate % 🟩| BTC rewards in Million USD 🟩| Value of BTC staked in Million USD 🟩|
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 3 | 4 | 0.25 | 14 | 100 | 12 | 2.5 | 6.3 | 1 | 3.5 | 140 |
| 3 | 4 | 0.25 | 17 | 100 | 9 | 2.5 | 11.1 | 1.33 | 5.7 | 227 |

We first note that both STRK and BTC staking rates, independently, are **market-driven**—i.e., as more STRK/BTC capital enters, STRK/BTC reward rates decrease, and vice versa.

This leads to a natural equilibrium: **BTC staking grows until its marginal APR matches market expectations**. This is why we assume an equilibrium reward rate per token and calculate the Staking pool sizes accordingly. Given BTC holders’ typically lower reward requirements, this enables Starknet to secure **more capital at a lower marginal cost**.

## New Protocol Parameters

Below is a table with the newly introduced economic parameters in this version:

| Parameter | Description | Reference |
| :---: | ----- | ----- |
| $\alpha$ | Determines BTC’s weight in staking power | See *Staking power* section |
| $\hat{c}$  (Effective Inflation Cap) | The effective inflation coefficient, including BTC rewards:  $\hat{c} = \frac{1}{1-\alpha} \cdot c$ | See *Minting* section |

# Backward Compatibility

Bitcoin staking is designed to stay as compatible as possible with existing projects, minimizing disruption to smart contract interfaces and off-chain integrations.

The below describes our current understanding, but things may change during development if unexpected constraints arise.

**Delegation Flows**

* **STRK Delegation:**   
  * Delegation Pool contract: Full compatibility is maintained, with no ABI or event changes.  
  * Staking contract: Events might change to differ STRK delegation from BTC delegations.  
* **Bitcoin Delegation:**   
  * Delegation Pool contract: ABI will match the STRK flow to simplify integration. Events are intended to remain unchanged.  
  * Staking contract: Events in the staking contract will differ to include Bitcoin wrapper metadata.

**Validator Flows**

* **Read ABI:** Unchanged. New view functions will be added without breaking existing ones.  
* **Write ABI:** Minor changes in the new validator entry flow. Since this is a manual process (e.g., node running), the impact is minimal.  
* **Events:** Some changes are required to support Bitcoin-specific data.

All ABI and event changes will be documented and tracked in the [repo](https://github.com/starkware-libs/starknet-staking).

# Security Considerations

## Censorship Analysis

As described in the staking power section, introducing BTC staking changes how staking power is distributed across Validators. To assess its impact, let’s analyze the **minimum percentage of STRK stake** required to **censor the network**—i.e., to reach 34% of total consensus power.

This is equivalent to asking: *If a validator controlled all BTC stake, how much STRK stake would they need to reach 34% staking power?*

The staking power of a Validator is defined as:

$(1 - \alpha) \cdot \frac{s}{S} + \alpha \cdot \frac{b}{B}$

Where:

* *s* \= STRK staked by and delegated to the validator.  
* *S* \= total STRK staked.  
* *b* \= BTC delegated to the validator.  
* *B* \= total BTC staked.  
* *α* \= BTC’s weight in staking power.

Assuming the attacker controls **all BTC** (i.e., *b / B \= 1*), we solve for $\frac{s}{S}$:

$(1 - \alpha) \cdot \frac{s}{S} + \alpha = 0.34$

$\frac{s}{S}=\frac{0.34-\alpha}{1-\alpha}$

Using the worst-case (maximum) proposed value of α \= 0.25, we get:

$\frac{s}{S}=\frac{0.34-0.25}{1-0.25}=0.12$

This means that if an attacker already controls all BTC stake, only 12% of the total STRK stake would be required to censor the network.

While this lowers the STRK threshold compared to the no-BTC case (34%), the **economic cost** of acquiring both 100% of BTC stake and 12% of STRK stake is **substantially higher** than acquiring just 34% STRK—especially under realistic price and reward equilibrium conditions. This dynamic **enhances economic security** rather than weakens it.

## Bitcoin Wrapper Vulnerability and Mitigation

The main added risk introduced by BTC staking is the reliance on third-party Bitcoin wrappers. Wrappers depend on some form of BTC \<\> Starknet bridging, which inherently involves trust assumptions.

A critical scenario to consider is the compromise of an eligible wrapper—leading to an unbacked or "infinite" amount of wrapped BTC being minted on Starknet. This could occur due to a bridge failure, a depeg event, or a vulnerability in the wrapper’s Starknet contract. In such a case, the attacker could effectively gain 20–25% of staking power at zero cost, posing a serious threat to network integrity.

To mitigate this, the protocol will can include two key protections:

* **Entry Delay**: All BTC entering the staking protocol will be subject to a delay (e.g., 24 hours) before affecting the staking power distribution. This window provides enough time to detect and react to suspicious behaviour but also is negligible in terms of impact on staking rewards but critical for security response.

* **Emergency Delisting**: If a wrapper is compromised, it can be quickly removed from the protocol, faster than the entry delay**,** by a designated role entity (either the Security Council or a security agent).

These safeguards minimize the risk of wrapper abuse impacting consensus. **Note that the above entry delay mechanism may be introduced only in a later version once validators take on broader responsibilities within the protocol.**

# Timeline

We’re targeting a Q3 release! This leaves sufficient time for developers and community members to experiment, build on top, and offer feedback.

# Feedback

We welcome input from the community on all aspects of this post. If you have suggestions, questions, or discussion points, please feel free to share them in the comments section below. 
