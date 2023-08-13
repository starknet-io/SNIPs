---
snip: 8
title: Transaction V3 Structure
authors: Evyatar Oster <@evyataro>, Elin Tulchinsky <elin@starkware.co>
discussions-to: https://community.starknet.io/t/transaction-v3-snip/98228
status: Draft
type: Standards Track
category: Core
created: 2023-08-09
---

## Simple Summary

This SNIP aims to propose a new transaction structure in Starknet to accommodate future API and protocol changes, including the introduction of a fee market, Volition, Paymaster, and Nonce generalization.
The SNIP focuses on the modifications to the transaction structure and the calculation of the transaction hash.

## Motivation

The motivation behind this SNIP is to minimize the breaking changes in the transaction structure within Starknet. To achieve this, we propose the introduction of a new transaction version that can support upcoming API and protocol changes. Specifically, we consider five significant changes for the near future: 

- [Fee market](https://www.starknet.io/en/roadmap/fee-market-for-transactions): Implementing a mechanism to enable users to utilize the network even during periods of congestion. 

- [Volition](https://community.starknet.io/t/volition-hybrid-data-availability-solution/97387): Introducing a hybris state design that allows users to choose their preferred data availability mode. 

- Paymaster (see [1](https://community.starknet.io/t/starknet-account-abstraction-model-part-1/781), [2](https://community.starknet.io/t/starknet-account-abstraction-model-part-2/839)): Similar to the [EIP-4337](https://github.com/ethereum/EIPs/blob/3fd65b1a782912bfc18cb975c62c55f733c7c96e/EIPS/eip-4337.md), enriching the protocol with fee abstraction, enabling entities other than the transaction sender to pay the transaction fees. 

- Nonce generalization: The transaction structure aims to support semi-nonce abstraction, similar to the [approach suggested in EIP-4337](https://eips.ethereum.org/EIPS/eip-4337#semi-abstracted-nonce-support). The nonce field will remain the same, containing a single felt (251 bits) interpreted as 64 bits for the sequential nonce, which remains consistent with the current implementation. Additionally, the remaining 187 bits will be available for an arbitrary channel, giving users the freedom to choose. The default channel is set to 0 and will be enforced until the protocol fully supports nonce generalization. The nonce can only be sequential within each channel, and if users need parallelism, they can create new channels accordingly.

- Deploy account in the first Invoke/Declare transaction: In line with the concept presented in EIP-4337, we propose adding an account_init_code field to Invoke and Declare transactions sent from a non-existing contract, eliminating the need for a separate transaction to deploy an account.

  - account_init_code is used to deploy an account contract that contains the entrypoints: `__validate__`, `__execute__`_, and in the case of Declare, also `__validate_delcare__`.

By incorporating these changes into the transaction structure, we aim to smooth the evolution of Starknet while minimizing disruptions and preserving compatibility with existing functionality.


## Specification

### API Changes:

This chapter will describe the three new transaction structures.

**Common Fields:**

1. `version: felt` =  3

2. Fee-related fields:

   1. `resource_bounds: Dict[Resource, ResourceBounds]`

      1. `Resource(Enum)` contains:

         1. L1_GAS = "L1_GAS"
         2. L2_GAS = "L2_GAS"

      2. `ResourceBounds` contains:

         1. `max_amount: u64` - the maximum amount of the resource allowed for usage during the execution. 
         2. `max_price_per_unit: u128` - The maximum price the user is willing to pay for the resource. 

      3. Will be specified in units of 10^-18 of the fee token

   2. `tip: u64`

      1. The prioritization metric determines the sorting order of transactions in the mempool.


3. Volition-related fields:

   1. `nonce_data_availability_mode: u32`

      1. Default - L1DA

   2. `fee_data_availability_mode:  u32`

      1. Default - L1DA

DA_mode 0 is L1DA and DA_mode 1 is L2DA.

4. Paymaster-related fields:

   1. `paymaster_address: felt`

      1. The default value is 0
      2. The paymaster should pay for the execution of the tx.


5. `nonce: felt`

6. `signature: List[felt]`

   1. Additional information given by the sender, used to validate the transaction.

**Invoke Specific Fields:**

1. `sender_address: felt`

   1. The address of the account initiating the transaction.

2. `calldata: List[felt]`

   1. The arguments that are passed to the `__validate__` and `__execute__` functions.

3. `account_init_code: List[felt]`

   1. The list will contain the class_hash, salt, and the calldata needed for the constructor.
   2. In the future, we might want to use Invoke instead of deploy_account, same as in EIP-4337. In that case, the sender address does not exist - the sequencer will try to deploy a contract with the class hash specified in `account_init_code`.

**Declare Specific Fields:**

1. `sender_address: felt`

   1. The address of the account initiating the transaction.

2. `contract_class: ContractClass`

   1. The [class definition](https://docs.starknet.io/documentation/architecture_and_concepts/Contracts/class-hash/#cairo1_class).

3. `compiled_class_hash: felt`

   1. The hash of the compiled class (see[ here](https://docs.starknet.io/documentation/starknet_versions/upcoming_versions/#what_to_expect) for more information)

4. `account_init_code: List[felt]`

   1. The list will contain the class_hash and the calldata needed for the constructor.
   2. In the future, we might want to use Invoke instead of deploy_account, same as in EIP-4337. In that case, the sender address does not exist - the sequencer will try to deploy a contract with the class hash specified in `account_init_code`.

**DeployAccount Specific Fields:**

1. `contract_address_salt: felt`

   1. A random salt that determines the[ account address](https://docs.starknet.io/documentation/architecture_and_concepts/Contracts/contract-address/).

2. `constructor_calldata: List[felt]`

   1. The arguments to the account constructor.

3. `class_hash: felt`

   1. The hash of the desired account class.


### Protocol Changes:

Define: 

` common_tx_fields =  [TX_PREFIX, version, address, h(tip, resource_bounds_for_fee), paymaster_address, chain_id, nonce, nonce_data_availability_mode || fee_data_availability_mode]`

Where:

- TX_PREFIX is {“declare”, “deploy_account”, “invoke”}, accordingly.
- `address` is  `sender_address` for Daeclare and Invoke or `contract_address` for DeployAccount
- `chain_id` is a constant value that specifies the network to which this transaction is sent. See[ Chain-Id](https://docs.starknet.io/documentation/architecture_and_concepts/Blocks/transactions/#chain-id).
- `h(tip, resource_bounds_for_fee) = h(tip, (resource||max_amount||max_price_per_unit),(resource||max_amount||max_price_per_unit)...)`, where the resource order is `L1_gas`, `L2_gas`, and the resource name is at most 7 characters.
- `h` is the [Poseidon hash](https://docs.starknet.io/documentation/architecture_and_concepts/Hashing/hash-functions/#pedersen_hash)

**Transaction Hash Calculation:** 

1. Invoke transaction hash calculation:

`Invoke_v3_tx_hash = h(common_tx_fields, h(account_init_code),h(calldata))`

2. Declare transaction hash calculation:
   `Declare_v3_tx_hash=h(common_tx_fields, h(account_init_code), class_hash, compiled_class_hash)`

   1. Where:

      1. class_hash is the hash of the contract class. See[ Class Hash](https://docs.starknet.io/documentation/architecture_and_concepts/Contracts/class-hash/#computing_the_cairo_1_class_hash) for details about how the hash is computed
      2. compiled_class_hash is the hash of the[ compiled class](https://docs.starknet.io/documentation/starknet_versions/upcoming_versions/#what_to_expect) generated by the Sierra→Casm compiler which is currently used in Starknet


3. DeployAccount transaction hash calculation:
   `Deploy_account_v3_tx_hash = h(common_tx_fields, h(constructor_calldata), class_hash, contract_address_salt)`

**System Calls Changes:**

1. `get_execution_info` syscall:

   1. To support both old and new tx version, there’s a need to update the struct [TxInfo](https://github.com/starkware-libs/cairo/blob/90f813f487c85a20ebb65449ffc62506916504b4/corelib/src/starknet/info.cairo#L24). All the existing fields will remain for backward compatibility. For v3 txs the member `max_fee` will be always equal 0, and the struct will contain the following members as well:

      1. `List[Resource]`
      2. `tip: u64`
      3. `nonce_data_availability_mode: u32`
      4. `fee_data_availability_mode:  u32`
      5. `paymaster_address: felt`
      6. `account_init_code: List[felt]`

   2. Where Resource is a new struct that contains: `resource: str`, `max_price_per_unit: u128`, `max_amount: u64`

### Backward Compatibility

Starknet will provide support for the older transaction version during a transition phase. However, the older transaction version will not have access to the new features such as the Fee market, Volition, and Paymaster, once these features are implemented on Starknet.

## Security Considerations

This SNIP have no impact at all in terms of security.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
