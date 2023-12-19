---
snip: 9
title: Outside execution
authors: Argent Labs <argent.xyz>, AVNU <avnu.fi>
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

### 2. Sign it using ERC-712 typed data hashing

Reference implementation: [https://github.com/argentlabs/argent-contracts-starknet/blob/main/tests/lib/outsideExecution.ts](https://github.com/argentlabs/argent-contracts-starknet/blob/main/tests/lib/outsideExecution.ts)

See this SNIP for more info on offchain signatures on Starknet: [https://community.starknet.io/t/snip-off-chain-signatures-a-la-eip712/98029](https://community.starknet.io/t/snip-off-chain-signatures-a-la-eip712/98029)

### 3. Pass the structure and signature to the account

Check if the account supports this SNIP:

```rust
let account = IErc165Dispatcher { contract_address: acount_address };
let is_supported = account.supports_interface(ERC165_OUTSIDE_EXECUTION_INTERFACE_ID); // see below for actual value
```

Call the `execute_from_outside` method on the account:

```rust
let account = IOutsideExecutionDispatcher { contract_address: acount_address };
// pre-execution logic...
let results = account.execute_from_outside(outside_execution, signature);
// post-execution logic...
```

### For account builders

To accept such outside transactions, the account contract must implement the following interface:

```rust
/// Interface ID: 0x68cfd18b92d1907b8ba3cc324900277f5a3622099431ea85dd8089255e4181
#[starknet::interface]
trait IOutsideExecution<TContractState> {
    /// This method allows anyone to submit a transaction on behalf of the account as long as they have the relevant signatures. This method allows reentrancy. A call to `__execute__` or `execute_from_outside` can trigger another nested transaction to `execute_from_outside`.
    /// # Arguments
    /// * `outside_execution ` - The parameters of the transaction to execute.
    /// * `signature ` - A valid signature on the ERC-712 message encoding of `outside_execution`.
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
