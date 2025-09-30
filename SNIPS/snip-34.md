---
snip: 34
Title: More efficient CASM hashes
description: Move to Blake hash function in calculating the CASM hash
author: Ohad Barta, ohad@starkware.co
discussions-to: 
status: Draft
type: Standard
category: Core
created: Sep 30th 2025
---

<!-- Refer to: <https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-1.md#snip-header-preamble> -->


## Simple Summary

With the introduction of S-Two (expected to hit mainnet in mid-October 2025), many calculations embedded in Starknet’s infrastructure that were optimized initially for Stone can be re-optimized. The most sensible place to start is changing the hash function to calculate the CASM hash. This SNIP describes the motivation for doing so as well as the exact mechanism, including migration of all the already existing CASM hashes. 

## Motivation
A large overhead ATM within each Starknet block proves that the correct code is being executed. To be exact, the first time each block, when a Cairo opcode is executed, it is proven (with a Merkle proof) that this Cairo opcode is indeed the Cairo instruction committed by the CASM hash of the relevant smart contract. As a result, each Starknet block includes many, typically 100Ks, of hash calculations to attest to the validity of the Cairo instructions executed. 

These hashes take a significant amount of space within each block, and thus optimizing them is crucial, mainly to improve Starknet’s cost. Optimizing the hash function will mean that the same user operations produce a smaller proving trace, and are thus substantially cheaper to prove

To be concrete, Blake hash functions are 3x cheaper to prove with S-Two compared to Poseidon, and additional optimization is suggested to hash several Cairo opcodes together, creating additional savings in the number of hashes invoked. Together, the projected savings on this component are 8x. This improvement means that “proving the correct Cairo instructions are executed overhead” will diminish from a significant portion of a block’s capacity to a few percent.

 Another motivation for tackling the Poseidon hashes used to calculate the CASM hashes (and not, for example, the Pedersen hash function used to make storage updates, which is also not as efficient as Blake) is that this change can be 100% transparent for Starknet users and existing apps, as the CASM hash is never explicitly referred to on-chain.

## Specification and Implementation

* Declare transactions will now expect `compiled_class_hash` to be [computed](https://github.com/starkware-libs/sequencer/blob/8b140e199e21e87d0480d1c0a8f34b419801c1af/crates/starknet_api/src/contract_class/compiled_class_hash.rs#L150) with the new blake hash function (HashVersion - V2). The specification of the hash is as follows:
	* Use the [blake2s](https://datatracker.ietf.org/doc/html/rfc7693.html#section-2.1) (no key, output of 32 bytes)  function, which takes an array of 32-bit inputs and outputs 256 bits.
	* Encoding felts that need hashing into an array of 32-bit inputs is done [here](https://github.com/starknet-io/types-rs/blob/main/crates/starknet-types-core/src/hash/blake2s.rs#L62). Notice that if the felt is smaller than 2**63, optimization is performed to squeeze more felts together with fewer hashes. 
	* The output is converted to one felt as specified [here] (https://github.com/starknet-io/types-rs/blob/main/crates/starknet-types-core/src/hash/blake2s.rs#L101)

* Gradually, existing classes in the [state commitment](https://docs.starknet.io/learn/protocol/state#state-commitment) will migrate to the new computation. A class hash will be migrated the first time the SNOS executes an instruction within a contract with this class hash. In particular:
	* For every successful (i.e. non-reverted) transaction, the classes used throughout the transaction will be updated in the `class_hash` → `compiled_class_hash` trie. 
	* For reverted transactions, contracts that the SNOS proved their execution as part of proving the execution until the reversion point are also migrated. For example:
		* The account contract’s class hash (as for reverting, the __validate__ endpoint had to run successfully) 
		* When a non-existent entry point within a contract was invoked, this failure is proven, and the class hash will be migrated.  
* The changes in compiled class hashes will be applied at the end of the block. Note that the execution environment is unaware of compiled class hashes (system calls only specify class hash, never compiled class hash), thus these changes will not affect execution, only the resulting state root.


 * The feeder gateway will add such classes whose compiled class hash was updated to the `get_state_update` response, under a new field called `migrated_compiled_classes`
* The suggestion is also to adapt the RPC specification accordingly, exposing it to users to allow re-execution and state reconstruction.

## Backwards compatibility
SNIP34 introduces two backward (in)compatibility issues; however, both can be mitigated if the correct, careful steps are taken

### Changing the meaning of the compiled_class_hash field in declare V3 
The compiled_class_hash field in declare V3 transactions will be calculated with the Blake hash function instead of Posidon. Therefore, when SNIP34 lands, all declares will be needed to adapt. 

**Mitigation tactic**: SDK providers will ensure that the same SDK version will support both hash types (depending on the current SN version), making the transition (ignoring the few minutes right when the upgrade is performed) totally transparent to developers that are updating their SDK versions somewhat regularly. 

### Potentially creating too-large transactions upon migrating
Since the calculation of the migrated hash is done on the fly within the transaction execution, it is theoretically possible that a transaction that was already really close to the maximal transaction size before SNIP34 is applied will be too large with the migration of the class hashes involved, leading to rejection of the transaction until migration of the relevant class hashes is completed.

**Mitigation tactic**: Calling an inexistent endpoint within the contract can trigger a migration of a class hash to Blake. To prevent transaction failure after the migration period starts, contracts that are typically involved in frequent, large transactions should be migrated manually using this flow. 


## Security Considerations
There are no security considerations associated with this change

## Copyright
Copyright and related rights waived via [MIT](../LICENSE).

