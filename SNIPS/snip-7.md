---
snip: 7
title: Addition of Starknet Appchain Info RPC Endpoint
author: Abdelhamid Bakhta <@abdelhamidbakhta>
discussions-to: https://community.starknet.io/t/addition-of-starknet-appchain-info-rpc-endpoint/97884
status: Review
type: Standards Track
category: Interface
created: 2023-07-27
---

## Simple Summary

This proposal suggests the implementation of a new RPC endpoint to retrieve relevant information concerning Starknet appchains.

## Abstract

As Starknet appchains become increasingly integral to the Starknet ecosystem, the ability to conveniently retrieve data concerning a particular appchain has emerged as a critical requirement. This proposal outlines the design and rationale behind a new RPC endpoint that can provide such information. This endpoint will be leveraged by wallets and other applications to display relevant details about the appchain and facilitate interaction with it.

## Motivation

The introduction of the Starknet Stack has enabled the creation of Starknet appchains, independent from the main Starknet chain, and used as platforms for application deployment and operation. It's important to note that Starknet appchains aren't exclusively Layer 2 (L2) chains and may not be entirely compatible with the public Starknet mainnet.

We need to clarify what kind of data we wish to expose concerning these appchains, which will enable seamless integration across all Starknet Stack tools, such as wallets, block explorers, and indexers.

The increasing shift towards a more modular design necessitates the categorization of an appchain and the disclosure of relevant information. This proposal serves to address this requirement. Broadly, an appchain can be classified based on:

- Its identity as a Starknet Appchain (as opposed to public Starknet mainnet and testnets)
- Its chosen settlement layer (e.g., Starknet mainnet, Ethereum, etc.)
- The type of data availability solution it supports (e.g., Starknet mainnet, Ethereum (calldata / blob transactions), Celestia, Avail, etc.)
- Its fee mechanism, i.e., does it utilize a custom token or the Starknet mainnet token? Does it support a custom fee market?

## Specification

### RPC Endpoint

The proposed endpoint name: `starknet_appchainInfo`.

OpenRPC specification:

```json
{
   "name":"starknet_appchainInfo",
   "summary":"Returns information about the Starknet Appchain",
   "params":[],
   "result":{
      "name":"result",
      "description":"Details about the Appchain, if relevant",
      "schema":{
         "$ref":"#/components/schemas/APPCHAIN_INFO"
      }
   }
}
```

The schema for the `APPCHAIN_INFO` result will be as follows:

```json
{
   "APPCHAIN_INFO":{
      "title":"Appchain Information",
      "type":"object",
      "properties":{
         "is_appchain":{
            "title":"Is Appchain",
            "type":"boolean"
         },
         "chain_id":{
            "title":"Chain ID",
            "$ref":"#/components/schemas/CHAIN_ID"
         },
         "fee_token_address":{
            "title":"Fee Token Address",
            "description":"The address of the fee token",
            "$ref":"#/components/schemas/FELT"
         },
         "settlement_layer":{
            "title":"Settlement Layer",
            "description":"Details about the settlement layer",
            "$ref":"#/components/schemas/SETTLEMENT_LAYER"
         },
         "data_availability_mode":{
            "title":"Data Availability Layer",
            "description":"Details about the Data Availability",
            "$ref":"#/components/schemas/DATA_AVAILABILITY"
         }
      }
   }
}
```

The schemas for `SETTLEMENT_LAYER` and `DATA_AVAILABILITY` will be defined at a later stage in the specification development process.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
