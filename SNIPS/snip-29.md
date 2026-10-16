---
snip: 29
title: Applicative Paymaster API Standard
description:
author: Leonardo Lerer <leo@starkware.co>, AVNU
discussions-to: https://community.starknet.io/t/snip-x-applicative-paymaster-api-standard
status: Review
type: Standards Track
category: Core
created: 2025-02-05
---

## Simple Summary

This SNIP proposes a standardized interface between an applicative paymaster service and a user. A user can be a single individual, a wallet, a DApp backend, etc... The specification aims to be as minimal as possible while enabling a full applicative paymaster flow with good UX. Any paymaster service is free to expand on this specification and add more features to it.

## Motivation

The motivation of this SNIP is to make it easier for the Starknet ecosystem to integrate with an applicative paymaster. A neutral specification prevents fragmentation of interfaces of different paymaster services and simplifies paymaster integration for any entity that wishes to do so. It makes it possible for Starknet SDKs to integrate a paymaster specification which is independent of any existing vendor.


## Specification

The full JSON-RPC specification is found in `../assets/snip-x/paymaster_api.json`. The specification is modeled around the following flow:
1. A user submits to the paymaster service a list of calls that they wish to make, along with the token they wish to pay fees with.
2. The paymaster service responds with a typed object (in the sense of SNIP-12) that wraps the calls submitted by the user and which is ready for signature. They SHOULD also send the amount of ERC-20 token required from the user and the exchange rate used (with respect to STRK). This means that the fee estimation logic is handled by the paymaster and not by the user. The purpose of the typed object is to:
    1. Wrap the user calls into a format compatible with outside execution (SNIP-9).
    2. Potentially add additional calls which are necessary for the fee accounting logic of the paymaster service.
3. The user signs on the typed object and sends it (along with the signature) to the paymaster service for execution.
4. The paymaster service finally sends a transaction onchain from its relayer account, containing the signed outside execution payload.

We note that the RPC specification does not impose the previous flow upon the user and paymaster, or impose limitations on the content of the typed data that the paymaster returns from the `buildTypedData` endpoint. We expand more on this point in the Security Considerations section of this SNIP.

### Private transactions

A paymaster MAY support transactions that go through a privacy pool: a contract that applies a list of private actions (deposits, withdrawals, transfers...) verified by a zero-knowledge proof, and that charges its own fee, the pool fee, on every call. Such a transaction has two fees: the gas fee of the Starknet transaction and the pool fee. Two transaction types cover this flow:

- `apply_action`: a private action on the pool, without user calls.
- `invoke_and_apply_action`: user calls executed through outside execution (SNIP-9), followed by the private action. Typical for a deposit, where an `approve` must precede it.

The flow becomes:
1. The user calls `paymaster_buildTransaction` with the pool address, their calls when there are some, and a fee mode that says who pays each fee.
2. The paymaster responds with the fee estimate, a `fee_action` that says what the user must include in their proof to pay the fees, and the typed data to sign when there are user calls.
3. The user builds the proof with the pool's prover, including the fee action when it is a `withdraw`, and signs the typed data when there is one.
4. The user calls `paymaster_executeTransaction` with the call to the pool, the proof and its facts, and the signed typed data when there is one. The paymaster sends a single transaction onchain from its relayer account.

The fee mode says who pays each fee: `mode` is about the gas fee, `pool_fee` is about the pool fee.

```json
// The user pays the gas fee and the pool fee in gas_token, from their private balance
{ "mode": "default", "gas_token": "0x..." }

// The paymaster pays the gas fee, the user pays the pool fee in the given token, from their private balance
{ "mode": "sponsored", "pool_fee": { "paid_by": "user", "token": "0x..." } }

// The paymaster pays the gas fee and the pool fee
{ "mode": "sponsored", "pool_fee": { "paid_by": "sponsor" } }
```

When the user pays the pool fee, the `fee_action` is a `withdraw` of the fee amount to the paymaster's fee recipient, and the proof MUST include it. When the sponsor pays the pool fee, the `fee_action` is `none` and the proof MUST NOT include a fee withdrawal; the paymaster SHOULD only accept this for sponsors that explicitly allowed it, since they bear the cost. `pool_fee` is only meaningful on the two private transaction types and MUST be rejected on the others.

Below we list constant JSON objects that correspond to properties of some objects in the JSON RPC specification. These are the same as the ones that appear in SNIP-9 (outside execution) for its different versions, but we list them here as well for completeness.

### Version 1

The properties `types`, `domain` and `primaryType` of the object `OUTSIDE_EXECUTION_TYPED_DATA_V1` MUST be set as follows:

```json
"types": {
  "StarkNetDomain": [
    { "name": "name", "type": "felt" },
    { "name": "version", "type": "felt" },
    { "name": "chainId", "type": "felt" },
  ],
  "OutsideExecution": [
    { "name": "caller", "type": "felt" },
    { "name": "nonce", "type": "felt" },
    { "name": "execute_after", "type": "felt" },
    { "name": "execute_before", "type": "felt" },
    { "name": "calls_len", "type": "felt" },
    { "name": "calls", "type": "OutsideCall*" },
  ],
  "OutsideCall": [
    { "name": "to", "type": "felt" },
    { "name": "selector", "type": "felt" },
    { "name": "calldata_len", "type": "felt" },
    { "name": "calldata", "type": "felt*" },
  ],
},
"domain": {
    "name": "Account.execute_from_outside",
    "version": "1",
    "chainId": "0x534e5f4d41494e"
    
},
"primaryType": "OutsideExecution"

```

The `"chainId"` property of the `"domain"` object is set to the chainId of Starknet mainnet. For Starknet testnet, the corresponding chainId should be used.

### Version 2

The properties `types`, `domain` and `primaryType` object `OUTSIDE_EXECUTION_TYPED_DATA_V2` MUST be set as follows:
```json
"types": {
  "StarknetDomain": [
      { "name": "name", "type": "shortstring" }, 
      { "name": "version", "type": "shortstring" },
      { "name": "chainId", "type": "shortstring" },
      { "name": "revision", "type": "shortstring" }
  ],
  "OutsideExecution": [
      { "name": "Caller", "type": "ContractAddress" },
      { "name": "Nonce", "type": "felt" },
      { "name": "Execute After", "type": "u128" },
      { "name": "Execute Before", "type": "u128" },
      { "name": "Calls", "type": "Call*" }
  ],
  "Call": [
    { "name": "To", "type": "ContractAddress" },
    { "name": "Selector", "type": "selector" },
    { "name": "Calldata", "type": "felt*" }
  ]
},
"domain": {
    "name": "Account.execute_from_outside",
    "version": "2",
    "chainId": "0x534e5f4d41494e"
},
"primaryType": "OutsideExecution"
```
The field `"revision"` of the `"domain` object above is omitted: it should follow the revision of SNIP-12 that is being used (either the integer `1` or the shortstring `"2"`).

The `"chainId"` property of the `"domain"` object is set to the chainId of Starknet mainnet. For Starknet testnet, the corresponding chainId should be used.

### Version 3-rc

```json
"types": {
  "StarknetDomain": [
        { "name": "name", "type": "shortstring" }, 
        { "name": "version", "type": "shortstring" },
        { "name": "chainId", "type": "shortstring" },
        { "name": "revision", "type": "shortstring" }
    ],
  "OutsideExecution": [
      { "name": "Caller", "type": "ContractAddress" },
      { "name": "Nonce", "type": "felt" },
      { "name": "Execute After", "type": "u128" },
      { "name": "Execute Before", "type": "u128" },
      { "name": "Calls", "type": "Call*" },
      { "name": "Fee", "type": "Fee Mode" }
    ],
    "Call": [
    { "name": "To", "type": "ContractAddress" },
    { "name": "Selector", "type": "selector" },
    { "name": "Calldata", "type": "felt*" }
    ],
    "Fee Mode": [
      { "name": "No Fee", "type": "()" },
      { "name": "Pay Fee", "type": "(FeeTransfer)" }
    ],
    "Fee Transfer": [
      { "name": "Fee Amount", "type": "TokenAmount" },
      { "name": "Fee Receiver", "type": "ContractAddress" }
    ]
},
"domain": {
    "name": "Account.execute_from_outside",
    "version": "3",
    "chainId": "0x534e5f4d41494e"
},
"primaryType": "OutsideExecution"
```

The field `"revision"` of the `"domain` object above is omitted: it should follow the revision of SNIP-12 that is being used (either the integer `1` or the shortstring `"2"`).

The `"chainId"` property of the `"domain"` object is set to the chainId of Starknet mainnet. For Starknet testnet, the corresponding chainId should be used.

## Backwards Compatibility

This specification may be breaking for existing paymaster services: more precisely, compliance with this specification may incur breaking upgrades for existing paymaster services.

## Security Considerations

From the point of view of the user, the critical juncture during a "full" interaction with a paymaster (i.e. one that involves calling method `buildTypedData` and then `execute`) is the inspection of the typed data returned to them by the `buildTypedData` endpoint. In case the user account is already deployed, the array of calls in this object SHOULD either
1. Be exactly equal to the array of calls submitted by the user.
2. Be equal to the array of calls submitted by the user with an additional call appended at the end. The last call must be a `Transfer` call originating from the user account and calling the ERC-20 contract of the requested token.

The user and the SDKs SHOULD parse the returned typed data according to option 1. or option 2. In case of option 2. the user should double-check locally that the `Transfer` call involves the chosen ERC-20 contract and decide whether the amount is acceptable or not. Wallets and Dapps that are integrated with a paymaster should make this critical information as clear as possible to the user.

Note that when using OutsideExecution v3 as described in the Specification, the previous flow does not apply: the information about the fee transfer is part of the typed data but not of the array of calls. The user should only check equality of this array with the one they submitted, which is a better state of affairs for the user.

For private transactions, the fee payment is not a call in the typed data but the `fee_action` returned by `buildTransaction`, which the user includes in their proof. Before building the proof, the user SHOULD check that the `recipient` of a `withdraw` fee action is the paymaster's fee recipient and that its `token` and `amount` are acceptable, and that the fee action is `none` when they asked for the pool fee to be sponsored. Wallets SHOULD make this information as clear to the user as the fee transfer of a standard transaction.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
