---
snip: 10
title: Wallet Switch Ethereum Chain RPC Method (`wallet_switchStarknetChain`)
author: Darlington Nnam <darlingtonnnam@gmail.com>
discussions-to: https://community.starknet.io/t/wallet-switch-ethereum-chain-rpc-method-wallet-switchstarknetchain/102034
status: Draft
type: Standards Track
category: SRC
created: 2023-10-30
---

## Simple Summary

An RPC method for switching the wallet's active Starknet Chain.

Inspired by [EIP-3326](https://eips.ethereum.org/EIPS/eip-3326).

## Abstract

The `wallet_switchStarknetChain` RPC method allows Starknet decentralized applications (“dapps”) to request that the wallet switches its active Starknet chain. The caller must specify a chain ID, and the method returns `true` if the active chain was switched, and an error otherwise.

Important cautions for implementers of this method are included in the [Security Considerations](#security-consideration) section.

## Motivation

With the deprecation of `goerli2`, all dapps on Starknet are built on either `mainnet` or testnet - `goerli`, with some dapps implementing both e.g block explorers.

Most wallets only supports interacting with one chain at a time. We call this the wallet’s “active chain”. Since Starknet users are expected to interact with either of both chains, [`mainnet` or `goerli`], it's important to enable dapps to be able to switch the user's chain to the appropriate one.  

`wallet_switchStarknetChain` enables dapps to request that the wallet switches its active chain to whichever one is required by the dapp. This improves the UX for both dapps and wallets by a long mile.

## Specification

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### Method - `wallet_switchStarknetChain`

The method accepts a single object parameter with a `chainId` field. The method returns `true` if the wallet switched its active chain, and an error otherwise.

**NB:** The method presupposes that the wallet has a concept of a single “active chain”. The active chain is defined as the chain that the wallet is forwarding RPC requests to.

```ts
export interface SwitchStarknetChainParameter {
  chainId: string // A 0x-prefixed hexadecimal string
}
```

### Parameters

The method as specified above, accepts a single parameter `chainId`. 

The `chainId` is a shortString encoded value into felt252 representing the chain.

### Returns

The method MUST return `true` if the request was successful, and an error otherwise.

### Example

These examples use JSON-RPC, but the method could be implemented using other RPC protocols.

To switch to Mainnet:
```JSON
{
  "id": 1,
  "jsonrpc": "2.0",
  "method": "wallet_switchStarknetChain",
  "params": [
    {
      "chainId": "0x534e5f4d41494e",
    }
  ]
}
```
To switch to the Goerli testnet:
```JSON
{
  "id": 1,
  "jsonrpc": "2.0",
  "method": "wallet_switchStarknetChain",
  "params": [
    {
      "chainId": "0x534e5f474f45524c49",
    }
  ]
}
```

Code example with `get-starknet`:

**Request**
```ts
await window.starknet.request({
    type: "wallet_switchStarknetChain",
    params: {
        chainId: "SN_MAIN"
    }
});
```
**Result**
```bash
"true"
```

## Security Consideration

For wallets with a concept of an active chain, switching the active chain has significant implications for pending RPC requests and the user’s experience. If the active chain switches without the user’s awareness, a malicious dapp could induce the user to take actions for unintended chains.

In light of this, the wallet:

- SHOULD display a confirmation whenever a `wallet_switchStarknetChain` request is received, clearly identifying the requester and the chain that will be switched to.
- SHOULD cancel all pending RPC requests and chain-specific user confirmations when switching.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).