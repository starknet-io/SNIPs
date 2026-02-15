---
snip: 36
title: In protocol S-Two verification
author: Ohad Barta <ob1337>
description: Introduce capability of verifying S-Two proofs within Starknet
discussions-to: https://community.starknet.io/t/snip-36-in-protocol-proof-verification
status: Draft
type: Standards Track
category: Core
created: 2026-02-15
---

## **Simple Summary**

This SNIP proposes adding support for S-Two proof verification within the Starknet protocol. The document outlines the motivation and specifies a concrete mechanism to facilitate applications that use client-side proving on top of Starknet.

## **Motivation**

Enabling applications to execute logic off-chain and prove it to Starknet unlocks two major domains that are impractical with naïve on-chain execution:

**Infinite scaling with ZKthreads and sharding** \- Starknet, despite being cost-effective, still has finite resources (storage, execution power, etc.). Transactions from one app must compete with others. Even ignoring congestion, networking, database, and sequencing expenses are not always aligned with application preferences. Enabling multiple Shards for application-specific logic anchored to Starknet would empower applications with more control over their environment while seamlessly leveraging Starknet’s liquidity and ecosystem.

**Privacy:** Proof-verification allows transactions to modify hidden/encrypted parts of a state in a secure way, which is still unknown to Starknet’s users and fullnodes.  

Currently, Starknet lacks native proof verification. While creating an S-Two Verifier as a smart contract and submitting an S-Two proof in transaction calldata is possible, this approach is insufficient. Including the full proof (often tens of thousands of felts) in calldata exceeds the present transaction limit (5K felts). This configurable cap limits block usage to prevent excess burden on the Starknet p2p network. Further, large proofs are expensive for the feeder gateway to relay.

Although proofs can be split across multiple transactions (as Starknet does on Ethereum), this remains prohibitively expensive and degrades the usability of L3 and privacy-focused use cases.

​

## **Rationale**

### **What is proven?**

While any claim can be theoretically proven to Starknet, this SNIP suggests **focusing on proving one particular claim: An execution of a Starknet transaction.**

### **Reasons for proving a Starknet transaction:**

* **Significantly simpler:**  
  1. **For protocols:** developers can write standard Starknet contracts and rely on SNOS functionality without implementing custom Cairo proof systems.  
  2. **For Starknet:** The set of acceptable programs to prove is constrained (e.g., tied to known Starknet OS program hashes), simplifying verification logic and bounding proof size variability.  
* **Sufficient for the main motivations:**  
  1. ZKThreads can execute large transactions off-chain and prove them via a cheaper on-chain transaction.  
  2. Privacy applications can implement business logic in Cairo, use Starknet accounts and wallets, and prove a virtual block to Starknet.

### **Mindset behind the design \- this is Phase 1**

The following is knowingly omitted from the scope of this SNIP. Depending on adoption and feedback of this feature, these follow-up features will get prioritized and implemented:

* **Trustlessness** \- In Phase 1, proofs are verified solely by Starknet consensus. A future phase will integrate SHARP so proofs are ultimately verified on Ethereum, ensuring correctness beyond Starknet consensus.  
* **Better support for ZKThreads** \- Future versions may allow a single proof to attest to multiple transactions or entire blocks.  
* **Better support for privacy** \-Currently, privacy is de facto (data is computationally infeasible to extract). A future phase may support fully zero-knowledge proofs.

### **High-level design and the rationale behind it**

The aim is to enable transactions to reference off-chain execution via proofs, minimizing costs and avoiding issues seen in purely contract-based approaches.

Initially, proof verification is performed by Starknet consensus. Users need only rely on the assertion that “Starknet consensus has verified it.”

​

Therefore, a new optional field, proof, is introduced for an invoke tx*.* This field will be sent with the transaction to the gateway and will be echoed within the Starknet mempool network \- but it will not be available for consumption through the feeder gateway, and will not appear explicitly in the block, and thus its networking footprint will be reduced.

​

However, some elements should reach Starknet itself to correlate the execution with the proof. Thus, another field that will be added to the transactions is *proof\_facts*. Think of it as a TLDR of the proof that Starknet needs to care about. The exact structure is discussed in the “implementation” section, but it roughly includes:

* Program hash \- the actual program that *proof* proved  
* Block hash \- the real Starknet block that the “virtual Starknet block proven” continued.  
* MessageHashes \- a list of instructions to perform on Starknet as a result of these proofs.

The raw messages to perform appear in the transaction's calldata, so the on-chain logic can access them freely and check their connection to message hashes that appear within the proof\_facts.

​

On-chain, proof facts are retrieved by calling a new version (v3) of the *get\_execution\_info* syscall. Notice:

* The above fields are **optional**. If they don’t exist, the tx hash will not include them in the calculation. This means that transaction v3, as it is today, will not be changed.  
* Same with get\_execution\_info: the answer for current contracts that call this syscall will not change. Contracts will need to specify that they call the new version to retrieve the proof.

## **Implementation**

## **The program to prove:**

The program proves the execution of a “virtual/offchain” transaction that occurs on top of a given Starknet block, resulting in a virtual Starknet block to be proven. The OS of the virtual Starknet block is slightly different from the regular Starknet OS and has somewhat reduced functionality. The reason: some OS calls in Starknet are currently trusted. For example, the timestamp. The return values from these calls could have been tampered with by the app if the vanilla Starknet OS had been invoked.

​

The OS program of the virtual block is thus very similar to, but different from, the regular OS. You can notice some files in the SNOS [repo](https://github.com/starkware-libs/sequencer/tree/c3ca79918a1ee87ac8197590f43412ae91cd55a7/crates/apollo_starknet_os_program/src/cairo/starkware/starknet/core/os) have “virtual” in their name. These files replace the equivalent files (w/o “Virtual” in the name) when having the virtual OS.

​

## **The claim to prove:**

Applications that integrate with this feature should deploy to Starknet contracts that include the logic that should be proven to Starknet. The proper execution of these transactions is the claim to be proved.

​

## **Verification process:**

A S-Two Verifier written in Rust is added to the gateway, and the sequencer has the responsibility of verifying the proof , checking the connection between the proof and the proof facts, and propagating the transaction to other sequences only if these checks have passed.

Details and code are available [here](https://github.com/starkware-libs/sequencer/blob/c487b79fae578e4512f9ba6cd5ad67cc1bae096b/crates/apollo_transaction_converter/src/transaction_converter.rs#L413C1-L443C2).

​

## **How to invoke the prover:**

The proving service is a JSON-RPC 2.0 server (implemented in the starknet\_os\_runner crate within the Starknet sequencer repo) that generates proofs for Starknet transactions.

​

Users can request transaction proving by calling the starknet\_proveTransaction JSON-RPC method (see implementation [here](https://github.com/starkware-libs/sequencer/blob/a3497657d2b1c23ee00bbbdcd51ad74444beab99/crates/starknet_os_runner/src/server/rpc_impl.rs#L54-L74)). The method takes a block Id and an invoke transaction, executes the transaction against that block's state, and returns a proof.

​

Here is an example request:

​

curl \-X POST http://localhost:3000 \\

 \-H "Content-Type: application/json" \\

 \-d '{

   "jsonrpc": "2.0",

   "method": "starknet\_proveTransaction",

   "params": \[

     {"block\_number": 800000},

     {

       "type": "INVOKE",

       "version": "0x3",

       "sender\_address": "0x...",

       "calldata": \["0x..."\],

       "signature": \["0x...", "0x..."\],

       "nonce": "0x...",

       "resource\_bounds": {

         "l1\_gas": {"max\_amount": "0x...", "max\_price\_per\_unit": "0x..."},

         "l2\_gas": {"max\_amount": "0x0", "max\_price\_per\_unit": "0x0"},

         "l1\_data\_gas": {"max\_amount": "0x0", "max\_price\_per\_unit": "0x0"}

       },

       "tip": "0x0",

       "paymaster\_data": \[\],

       "account\_deployment\_data": \[\],

       "nonce\_data\_availability\_mode": "L1",

       "fee\_data\_availability\_mode": "L1"

     }

   \],

   "id": 1

 }'

​

The response contains:

​

* proof — The generated proof (base64-encoded).  
* proof\_facts — Proof facts for verification (array of felts).  
* l2\_to\_l1\_messages — Messages sent from L2 to L1 during execution.

## **New tx \- v3 structure and how new fields are treated**

The exact suggested transaction structure can be found [here](https://github.com/starkware-libs/sequencer/blob/de1fd6f26572f16018dba309574f78cf2d5f654f/crates/starknet_api/src/rpc_transaction.rs#L550-L567). Specifically, it contains the new fields “proof” (array of uint32) and “proof facts” (array of felt252).

​

The “proof fact” array is accessible only through a dedicated syscall, “get execution info,” and only within the context of the transaction that included it.

You can see the new syscall [here.](https://github.com/starkware-libs/cairo/blob/70998624b30b749a7f07b91b56d862cde1c28479/corelib/src/starknet/syscalls.cairo#L111)  

A small example of the new syscall usage:

​

use starknet::SyscallResultTrait;  

\#\[starknet::contract\]

mod Example {

   \#\[external(v0)\]

   \#\[raw\_output\]

   fn get\_proof\_facts(self: @ContractState) \-\> Span\<felt252\> {

       let info \= starknet::syscalls::get\_execution\_info\_v3\_syscall()

           .unwrap\_syscall()

           .unbox();  

       info.tx\_info.unbox().proof\_facts

   }

}

​

## **Updates for RPC 0.10.1 that are offered as part of this feature**

New RPC & Transaction Capabilities

* [Added](https://github.com/starkware-libs/starknet-specs/commit/c7526ba297274260954d4e2d7b4a3ad741a9f14f) support for proof submission in Invoke V3 transactions (\`proof\` and \`proof\_facts\`)  
* [Added](https://github.com/starkware-libs/starknet-specs/commit/7da520db8609eccfb29c5cb0599fe1a183bf1c35) \`initial\_reads\` flag to transaction simulation  
* [Added](https://github.com/starkware-libs/starknet-specs/commit/e981f01f1e89bda9cd56154e80bcf91ccbfe57b5) \`initial\_reads\` flag for block tracing  
* [Added](https://github.com/starkware-libs/starknet-specs/commit/479518666a73e40d14918dd8b66426ee1e95786e) \`proof\_facts\` flag support to websocket subscriptions and state update requests

Compatibility & Clarifications

* [Improved backwards compatibility](https://github.com/starkware-libs/starknet-specs/commit/30fa8c4c0a154c86d89f9423992e7a6cedc1d6b6) for initial read responses  
* [Clarified](https://github.com/starkware-libs/starknet-specs/commit/732cd68c4a1e11c477270e2946389d8119ca61d4) semantics for cases where initial proofs are absent in traces

## **Sending the new tx type**

All major SDKs ([starknet.js/py/rs](http://starknet.js/py/rs)/go and more) are currently working on being compatible with RPC 0.10.1. Their support is a prerequisite for having this feature on the Starknet testnet.  

## **Proofs are stored within each Apollo.**

Proofs will be stored in a new component inside each Apollo, called “proof manager”. Proofs will be saved there, after being verified, for a finite (TBD exactly what, but at least a few weeks) period of time, to optimize verification (i.e., avoid verifying again in the consensus) and to allow syncing of the proofs by new nodes that enter the consensus.

​

It will have the following interface:

* \`set\_proof(proof\_facts, proof)\`,  
* \`get\_proof(proof\_facts)-\> Proof\`  
* \`contains\_proof(proof\_facts) \-\> bool\`.

Details and code can be found [here](https://github.com/starkware-libs/sequencer/blob/581eb3a771bad515c009684e62e2adfa8759c07c/crates/apollo_proof_manager/src/proof_manager.rs)

​

## **Pricing**

Pricing of these new transactions (on top of the regular L2gas counting for on-chain operations) will be based on three main components:

* Proof propagation between Apollos \- price proof as calldata is priced today. Price will go linearly with the proof length (as the “proof facts” structure would claim), and take the relevant STRKs according to the L2Gas price.  
* Storing the proof sent by users (at least until milestone 2, when these proofs are proven to be correct)  
* Prove the verification of these proofs  (after this follow-up will be implemented)

The first two components are linearly dependent on the proof size, and their exact prices might change as we see how small proofs can be. The price per byte of proof is 125 L2gas for proof propagation (reflecting 4,000 L2gas/felt \- which is 20% cheaper than calldata as the proof shouldn’t be transmitted to fullnodes), and an additional 5 L2gas/byte for storage. This results in 130 L2gas/byte, or, with proofs of 500K bytes, 65M L2gas.

​

10M additional L2gas will be added to cover future verification costs, resulting in a final price of 75M L2gas.

​

## **Backwards Compatibility**

This SNIP is fully backwards compatible. All it does is introduce new functionality via a new transaction structure.

## **Security Considerations**

In the first phase, all proofs will be verified by the Starknet consensus but not by the SNOS. This means that applications built with this feature will have degraded security compared to native Starknet applications. This will be mitigated in a follow-up release of this feature.

## **Copyright**

Copyright and related rights waived via [MIT](https://chatgpt.com/LICENSE).

