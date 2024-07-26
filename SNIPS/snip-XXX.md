---
snip: XX
title: Procedure for Introducing Starknet Breaking Changes
author: Nicolas Consigny 
discussions-to:
status: Draft
type: Meta
created: 2024-06-28
---

## **Abstract**

As the Starknet network matures, breaking changes to the stack affect many protocol stakeholders. This document aims to establish best practices for making decisions on protocol changes, ensuring that enough community opinions are heard and that the changes are justified.

## **Motivation**

The purpose of this SNIP is to formalize the process for proposing, discussing, and implementing core updates that are introducing breaking changes to the Starknet protocol. By providing a clear and structured approach, we aim to facilitate community engagement and transparency in the evolution of Starknet.

## **Specification**

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.


### **Starting with SNIPs**

Every core update **MUST** start with a SNIP. The author creates a PR in the Starknet SNIPs repository. And the editor performs syntactic checks as described in [SNIP-1](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-1.md#snip-editor-responsibilities). After the SNIP is merged to the main branch, the SNIP proposal **SHOULD** change the status to `review` and start a discussion on the [Starknet Community Forum](https://community.starknet.io/).This is the opportunity for the community to discuss whether the SNIP is desired, whether it solves the problems it set out to solve, and whether there are better solutions.

### **SNIP Acceptance**

SNIPs **MUST** follow the process described in [SNIP-1](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-1.md#snip-editor-responsibilities) to reach the status `final`. The Starknet Foundation **SHOULD** organise a regular AllCoreDev call so that sufficiently widespread adoption among Starknet operators and full nodes can be reached.

### **Starknet version & Voting**

SNIPs introducing breaking changes will be coupled to a Starknet version. Each Starknet version **SHOULD** come with a meta upgrade SNIP. The meta upgrade SNIP should specify the changes included in the hard fork and contains the following fields `codename`, `activation` (comes with target block on mainnet / testnet)`included SNIPS`. Versions with significant changes **MUST** require a community vote. All SNIPs associated with the version will be part of the same vote, and if the vote passes, all changes are introduced together.

> precision on the vote mechanism to be added & precise definition of "significant breaking change needed" (IMO any breaking change is significant)



### **Breaking Change Timeline**

The timeline proposed here reflects a minimal time to allow all relevant parties to learn about the breaking change and prepare for it. It is possible that some SNIPs will take longer to reach acceptance and deployment.

- **T - 5 months:** The initial SNIP idea is discussed with relevant parties (e.g., Full Nodes, Wallets, StarkWare, etc.).
  - A discussion is opened on the Starknet Community Forum.
- **T - 4 months:** An initial SNIP draft is open as a PR to the Starknet-io SNIP repository.
- **T - 3.5 months:**
  - Initial comments on the PR are addressed and it is merged into the SNIP repository.
- **T - 2.5 months:**
  - Comments in the community forum are addressed, and there is a temperature gauge for whether the SNIP is accepted by the community.
- **T - 2 months:**
  - The SNIP is discussed in a Community Call hosted by the Starknet Foundation, where the author can discuss more details of the SNIP and its benefits. If there are no objections, the SNIP is en route to being introduced.
  - The content of the community call is summarized in a public Github repository, with decisions regarding the SNIP.
  - The SNIP is officially on the roadmap to be introduced in a Starknet version upgrade.
  - A page summarizing the changes and the effects on relevant parties is added to a SNIPs page on Starknet.io.
- **T - 1.5 months:**
  - A mailing list is sent announcing the official date when the SNIP will be introduced to Starknet testnet/integration.
  - The mailing list will include relevant links to the SNIP such as:
    - Link to GH discussions.
    - Link to the community forum.
    - Link to the relevant community call.
- **T - 2 weeks:** Additional reminder is sent with SNIP main bullet points and dates.
- **T:** The SNIP is introduced to Starknet integration.
- **T + ~1 month:** Provided no major issues, the SNIP is live on Starknet testnet.
- **T + ~2 months:** The SNIP is live on Starknet mainnet.

### **Fast track for Non-Breaking Changes**

As the Starknet network is still in a growing phase a "fast track" is needed for more agility. Thus non-protocol-level SNIPs and SNIPs that do not introduce breaking changes can be "fast-tracked" but **SHOULD** still undergo a regular process to ensure sufficient coverage and comments from relevant community members. Fast-tracked EIPs can go from `draft` to `last call` directly per editor request. However as the network matures more decentralisation will be required and the "fast-track" **MUST** end in 87,600 blocks. 

> I chose this randomnly (87,600 one year at 6 min / block) should it target a block ?

## **Roles and Responsibilities**

### **SNIP Editor**
In addition to the responsibilities described in [SNIP-1](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-1.md#snip-editor-responsibilities)
- Assess which non-core SNIPs are worthy to be fast-tracked
> Should the SNIP editor be the one in charge ? 
### **SNIP Proposer**

You are the SNIP’s owner. Seeing it through is your goal!

- Discuss improvement ideas with relevant parties, such as wallets, full nodes, Dapps, service providers, etc.
- Write a SNIP and submit a PR to Github.
- Follow discussions on Github and open a Community forum discussion.
- Address concerns and get approval from relevant parties.
- Follow the SNIP towards inclusion on Mainnet.


### **Starknet Developer**

SNIPs might require you to adapt to breaking changes. Hopefully, it's for the best. You are responsible for raising your concerns or supporting upcoming changes and making sure you are ready for them in due time.

- Follow SNIPs and comment on SNIPs concerning you.
- Comment on the community forum on relevant SNIPs and raise concerns/improvements.
- Voice your support for SNIPs you understand will help move the ecosystem forward.
- Join the community calls to discuss SNIPs relevant to you.
- Follow the mailing list to get notified of new upcoming SNIPs and breaking changes.

### **Starknet User**

While breaking changes affecting the end user are not easy, they are sometimes necessary.

- You are welcome to participate in any discussion where you feel you can contribute to the conversation.
- Follow the Starknet mailing list and Starknet official social accounts to be notified of any breaking changes where you might be affected.
- Changes affecting end users will be more vocally announced to make sure as many as possible are aware of the upcoming change.

## **Copyright**

Copyright and related rights waived via [MIT](../LICENSE).

