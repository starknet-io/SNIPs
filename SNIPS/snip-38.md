---
snip: 38
title: strkBTC — Bitcoin on Starknet
description: A federated Bitcoin wrapper on Starknet with a roadmap toward trust-minimized verification
author: Henri Lieutaud (henri@starknet.org)
discussions-to: https://community.starknet.io/t/snip-38-strkbtc-bitcoin-on-starknet/116174
status: Draft
type: Standards Track
category: Core
created: 2026-04-21
---

## Abstract

This proposal introduces strkBTC, a Bitcoin wrapper on Starknet that enables users to hold, transfer, trade, stake, and deploy BTC across Starknet's DeFi ecosystem. strkBTC is secured in its first phase by a Federation of independent institutional signers operating a Bitcoin multisignature system and associated Starknet bridge contracts. The Federation is a transitional step for strkBTC, with a roadmap to iterate toward BitVM and OP_CAT over time.

## Motivation

Bitcoin is the largest and most liquid digital asset. Unlocking its utility within Starknet's DeFi ecosystem for trading, liquidity provision, collateralization, and staking would require a bridge that users can trust.

Today, most Bitcoin wrappers rely on a single custodian or a small set of opaque operators. This concentrates risk as a single compromised key, a single jurisdictional action, or a single operational failure can result in the total loss of a wrapper's backing. For Starknet's BTCFi ecosystem to scale, it needs a Bitcoin asset whose trust assumptions are explicit, bounded, and on a credible path toward trust minimization.

strkBTC addresses this by starting with a federated multisignature model, which is geographically and organizationally diverse, publicly accountable, and governed by clear rules. At the same time, strkBTC commits to a roadmap toward BitVM-based verification and ultimately fully trust-minimized designs.

## Phase 1 - Federation Design

### Composition

The Federation shall consist of at least five (5) independent institutions or individuals (each a "Member"). Members jointly operate a Bitcoin multi-signature system and associated Starknet contracts supporting BTC ↔ strkBTC flows.

Members act with full independence and autonomy, free from influence by third parties including the Starknet Foundation.

#### Proposed Members

| #   | Member    |
| :-- | :-------- |
| 1   | Xverse    |
| 2   | Twinstake |
| 3   | NEAR      |
| 4   | UTXO      |
| 5   | Luganodes |

_Additional members may be added beyond the minimum of five. Geographic and organizational diversity requirements apply._

### Eligibility

Member candidates must satisfy all of the following:

1. **Technical competency** with the Starknet stack, Bitcoin infrastructure, and secure key management.
2. **Institutional reputation** and demonstrated alignment with Starknet's BTCFi ecosystem.
3. **Operational reliability**, including the ability to meet high-availability, security, and incident-response expectations appropriate for critical bridge infrastructure.
4. **Public accountability**, including willingness to be publicly identified as a Federation Member and to support the Federation's mission through public communications.
5. **Compliance screening**: all Members must pass KYC/KYB checks, sanctions screening, and sign an appointment letter accepting the terms of the Federation Charter.

### Scope of Work

Members are responsible for:

1. Operating and maintaining signer infrastructure (BTC node, Starknet node, bridge scripts, and any required hardware or software components).
2. Monitoring the Bitcoin Federation multisig address and Starknet bridge contracts.
3. Reviewing and signing valid minting and burning transactions.
4. Supporting BTC deposit and withdrawal flows between Bitcoin and Starknet.
5. Participating in integration testing and upgrades.
6. Coordinating incident response.
7. Applying software upgrades and fixes as communicated by StarkWare within specified timelines.

The signer client architecture combines a Bitcoin node, a Starknet node, and bridge-specific scripts, with on-chain signature aggregation eliminating the need for a centralized backend operator.

### Availability and SLA

- Members guarantee dedicated Federation signer infrastructure uptime with a **99.9% target SLA**.
- Members must be available for implementing upgrades, applying fixes, and coordinating incident responses to maintain SLA targets.

## Operational Flows

### Minting Flow (BTC → strkBTC)

1. A user deposits native BTC to the Federation's Bitcoin multisig address.
2. Federation Members independently verify the deposit on the Bitcoin network.
3. Once the deposit meets the required confirmation threshold, Members co-sign a minting transaction on Starknet.
4. strkBTC is minted to the user's Starknet address.

### Burning Flow (strkBTC → BTC)

1. A user initiates a burn of strkBTC on Starknet via the bridge contract.
2. Federation Members verify the burn event on Starknet.
3. Members co-sign a Bitcoin transaction releasing BTC from the multisig to the user's Bitcoin address.

## Governance

### Member Removal

Members shall only be removed by decision of the Starknet Security Council, under the following circumstances:

1. **Conflict of interest**: the Member becomes involved in activities or relationships that compromise their impartiality.
2. **Failure to meet operational responsibilities** as defined in the Scope of Work and SLA targets.
3. **Security breach or misconduct**, including violations of the Federation Code of Conduct.
4. **Loss of community trust** in the Member's ability to fulfill their role.

### Code of Conduct

All Members must adhere to the Federation Code of Conduct, which requires: active participation, accessibility, ethical behavior, positive communication, respect and non-discrimination, non-violence, no abuse of position, conflict-of-interest disclosure, and confidentiality.

The full Code of Conduct is specified in the [Federation Charter](https://drive.google.com/file/d/1pxgcEHzbhpMDzPN5ce0idpdX7A2x46h5/view?usp=sharing).

### Limitation of Liability

Members shall not be liable for losses resulting from events outside their reasonable control — including hacks, fraud, network outages, or third-party actions — unless such losses result from their own gross negligence or willful misconduct.

## Trust Model and Sunset Path

The Federation is explicitly a **transitional construct**. The initial trust model requires users to trust that a threshold of Federation Members will honestly co-sign minting and burning operations. This is a known and bounded trust assumption.

The roadmap to reduce this trust assumption proceeds through:

1. **Phase 1 (Launch):** Multisig federation as described in this SNIP.
2. **Phase 2:** Integration of BitVM-based verification, reducing reliance on federation signing for standard flows.
3. **Phase 3:** Full trust-minimized design leveraging OP_CAT (or other Bitcoin script affordance) and advanced Bitcoin scripting, with the Federation serving only as a fallback or dispute-resolution layer before eventual sunset.

Transition milestones and criteria will be defined in subsequent SNIPs as the underlying technology matures.

## Reference

The full operational details, onboarding procedures, and detailed obligations are specified in the **strkBTC Federation Charter**, available [here](https://drive.google.com/file/d/1pxgcEHzbhpMDzPN5ce0idpdX7A2x46h5/view?usp=sharing).

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
