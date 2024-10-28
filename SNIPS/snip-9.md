---
snip: 9
title: Outside execution
authors: Argent Labs <argent.xyz>, AVNU <avnu.fi>, Braavos <braavos.app>
discussions-to: https://community.starknet.io/t/snip-outside-execution/101058
status: Draft
type: Standards Track
category: SRC
created: 2023-10-11
---

## Simple summary

Executing transactions “from outside” (otherwise called meta-transactions) allows a protocol to submit transactions on behalf of a user account, as long as they have the relevant signatures.

## Motivation

Transactions originating from an entry point outside of the account contract gives flexibility to protocols:

- Delayed orders: although it’s already possible to pre-sign regular transactions for later execution, this method gives more atomic control to the protocol (for example, matching two limit orders) and avoids nonce management issues on the account.
- Fee subsidy: since the sender of the transaction pays gas fees, there’s no need for the account to be funded with any gas tokens. Although this is not the main goal, this proposal is a de-facto solution that already works while paymasters and nonce abstraction are being designed for Starknet.

## Specification

An app can execute “outside transactions” by building a struct representing the execution, having it signed in the user’s wallet, then passing it to a custom method on the account contract.

### 1. Build the `OutsideExecution` struct

An `OutsideExecution` represents a transaction to be executed on behalf of the user account, passed in by another contract. Below is a Cairo representation, but it needs to be constructed offchain.

```rust
#[derive(Copy, Drop, Serde)]
struct OutsideExecution {
    caller: ContractAddress,
    nonce: felt252,
    execute_after: u64,
    execute_before: u64,
    calls: Span<Call>
}
```

- **caller**: can be used to restrict which calling contracts can initiate this execution, although a special address `'ANY_CALLER'` can be used to allow every caller.
- **nonce**: this is different from the account’s usual nonce, it is used to prevent signature reuse across executions and doesn’t need to be incremental as long as it’s unique.
- **execute_{before,after}**: timestamp range in which the execution is allowed.
- **calls**: the usual calls to be executed by the account.

### 2. Sign it using SNIP-12 typed data hashing

#### 2.1. Version 1

With [domain_separator](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-12.md#domain-separator) parameters:
- `name` is set to  `Account.execute_from_outside`
- `version` is set to  `1`

and `OutsideExecution` type defined as:
```rust
  OutsideExecution: [
    { name: "caller", type: "felt" },
    { name: "nonce", type: "felt" },
    { name: "execute_after", type: "felt" },
    { name: "execute_before", type: "felt" },
    { name: "calls_len", type: "felt" },
    { name: "calls", type: "OutsideCall*" },
  ],
  OutsideCall: [
    { name: "to", type: "felt" },
    { name: "selector", type: "felt" },
    { name: "calldata_len", type: "felt" },
    { name: "calldata", type: "felt*" },
  ]
```

The type hash of `OutsideExecution` is then:
**`H('OutsideExecution(caller:felt,nonce:felt,execute_after:felt,execute_before:felt,calls_len:felt,calls:OutsideCall*)OutsideCall(to:felt,selector:felt,calldata_len:felt,calldata:felt*)')`**

which results in `0x11ff76fe3f640fa6f3d60bbd94a3b9d47141a2c96f87fdcfbeb2af1d03f7050`

And the type hash of `OutsideCall` is:
**`H('OutsideCall(to:felt,selector:felt,calldata_len:felt,calldata:felt*)')`**

which results in `0xf00de1fccbb286f9a020ba8821ee936b1deea42a5c485c11ccdc82c8bebb3a`

Refer to this implementation: [https://github.com/argentlabs/argent-contracts-starknet/blob/main/lib/outsideExecution.ts](https://github.com/argentlabs/argent-contracts-starknet/blob/main/lib/outsideExecution.ts)

#### 2.2. Version 2

In [domain_seperator](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-12.md#domain-separator):
- `version` is set to `2`

In `OutsideExecution` type definition:

- **caller**: changed to type `ContractAddress`
- **execute_{before,after}**: changed to type `u128`
- **calls_len**: **removed** from hash
- **calls**: changed to Corelib's type `Call*`

So the version `2` type definition to sign is:
```rust
  OutsideExecution: [
    { name: "Caller", type: "ContractAddress" },
    { name: "Nonce", type: "felt" },
    { name: "Execute After", type: "u128" },
    { name: "Execute Before", type: "u128" },
    { name: "Calls", type: "Call*" },
  ],
  Call: [
    { name: "To", type: "ContractAddress" },
    { name: "Selector", type: "selector" },
    { name: "Calldata", type: "felt*" },
  ]
```
The type hash of `OutsideExecution` is then:

**`H('"OutsideExecution"("Caller":"ContractAddress","Nonce":"felt","Execute After":"u128","Execute Before":"u128","Calls":"Call*")"Call"("To":"ContractAddress","Selector":"selector","Calldata":"felt*")')`**

which results in `0x312b56c05a7965066ddbda31c016d8d05afc305071c0ca3cdc2192c3c2f1f0f`

And the type hash of `Call` is:
**`H('"Call"("To":"ContractAddress","Selector":"selector","Calldata":"felt*")')`**

which results in `0x3635c7f2a7ba93844c0d064e18e487f35ab90f7c39d00f186a781fc3f0c2ca9`

See [SNIP 12](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-12.md) for more info on offchain signatures on Starknet

### 3. Pass the structure and signature to the account

Check if the account supports this SNIP:

```rust
let account = ISRC5Dispatcher { contract_address: acount_address };
let is_supported = account.supports_interface(SRC5_OUTSIDE_EXECUTION_INTERFACE_ID); // see below for actual value
```

Call the `execute_from_outside` method on the account:

```rust
let account = IOutsideExecutionDispatcher { contract_address: acount_address };
// pre-execution logic...
let results = account.execute_from_outside(outside_execution, signature);
// post-execution logic...
```

### For account builders

#### Version 1

This version implements [SNIP-12 revision 0](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-12.md#specification). To accept such outside transactions with [domain_separator](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-12.md#domain-separator) parameter `version` set to  `1`, the account contract must implement the following interface:

```rust
/// Interface ID: 0x68cfd18b92d1907b8ba3cc324900277f5a3622099431ea85dd8089255e4181
#[derive(Copy, Drop, Serde)]
struct OutsideExecution {
    caller: ContractAddress,
    nonce: felt252,
    execute_after: u64,
    execute_before: u64,
    calls: Span<Call>
}

#[starknet::interface]
trait IOutsideExecution<TContractState> {
    /// This method allows anyone to submit a transaction on behalf of the account as long as they have the relevant signatures.
    /// This method allows reentrancy. A call to `__execute__` or `execute_from_outside` can trigger another nested transaction to `execute_from_outside` thus the implementation MUST verify that the provided `signature` matches the hash of `outside_execution` and that `nonce` was not already used.
    /// # Arguments
    /// * `outside_execution ` - The parameters of the transaction to execute.
    /// * `signature ` - A valid signature on the SNIP-12 message encoding of `outside_execution`.
    fn execute_from_outside(
        ref self: TContractState,
        outside_execution: OutsideExecution,
        signature: Array<felt252>,
    ) -> Array<Span<felt252>>;

    /// Get the status of a given nonce, true if the nonce is available to use
    fn is_valid_outside_execution_nonce(
        self: @TContractState,
        nonce: felt252
    ) -> bool;
}
```

#### Version 2

This version implements [SNIP-12 revision 1](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-12.md#specification). To accept such outside transactions with [domain_separator](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-12.md#domain-separator) parameter `version` set to the integer `2` (and not the shortstring `'2'` despite having this type ), the account contract must implement the following interface:

```rust
/// Interface ID: 0x1d1144bb2138366ff28d8e9ab57456b1d332ac42196230c3a602003c89872
#[derive(Copy, Drop, Serde)]
struct OutsideExecution {
    caller: ContractAddress,
    nonce: felt252,
    // note that the type here is u64 and not u128 as defined in the type hash definition
    // u64 matches the type of block_timestamp in Corelib's BlockInfo struct
    execute_after: u64,
    execute_before: u64,
    calls: Span<Call>
}

#[starknet::interface]
trait IOutsideExecution_V2<TContractState> {
    /// This method allows anyone to submit a transaction on behalf of the account as long as they have the relevant signatures.
    /// This method allows reentrancy. A call to `__execute__` or `execute_from_outside` can trigger another nested transaction to `execute_from_outside` thus the implementation MUST verify that the provided `signature` matches the hash of `outside_execution` and that `nonce` was not already used.
    /// The implementation should expect version to be set to 2 in the domain separator.
    /// # Arguments
    /// * `outside_execution ` - The parameters of the transaction to execute.
    /// * `signature ` - A valid signature on the SNIP-12 message encoding of `outside_execution`.
    fn execute_from_outside_v2(
        ref self: TContractState,
        outside_execution: OutsideExecution,
        signature: Span<felt252>,
    ) -> Array<Span<felt252>>;

    /// Get the status of a given nonce, true if the nonce is available to use
    fn is_valid_outside_execution_nonce(
        self: @TContractState,
        nonce: felt252
    ) -> bool;
}
```

**NOTE**: The interface id for version 2 is computed with a Cairo v2.5.0 compatible `Call` struct where `calldata` is a `Span<felt252>`


Indicative implementation outline:

```rust
fn execute_from_outside(ref self: ContractState, outside_execution: OutsideExecution, signature: Array<felt252>) -> Array<Span<felt252>> {
    // 1. Checks
    if outside_execution.caller.into() != 'ANY_CALLER' {
        assert(get_caller_address() == outside_execution.caller, 'argent/invalid-caller');
    }

    let block_timestamp = get_block_timestamp();
    assert(
        outside_execution.execute_after < block_timestamp && block_timestamp < outside_execution.execute_before,
        'argent/invalid-timestamp'
    );
    let nonce = outside_execution.nonce;
    assert(!self.outside_nonces.read(nonce), 'argent/duplicated-outside-nonce');

    let outside_tx_hash = hash_outside_execution_message(@outside_execution);

    let calls = outside_execution.calls;

    self.assert_valid_calls_and_signature(calls, outside_tx_hash, signature.span(), is_from_outside: true);

    // 2. Effects
    self.outside_nonces.write(nonce, true);

    // 3. Interactions
    let retdata = execute_multicall(calls);

    self.emit(TransactionExecuted { hash: outside_tx_hash, response: retdata.span() });
    retdata
}
```

### Copyright

Copyright and related rights waived via [MIT](../LICENSE).
