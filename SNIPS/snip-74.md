---
snip: 74
title: New Sign in with Starknet Standard
author: Yudhishthra Sugumaran <yudhishthra.sugumaran@nethermind.io>
discussions-to: https://community.starknet.io/t/sign-in-with-starknet-technical-proposal/95683/9
status: Draft
type: Standards Track
category: SRC
created: 2024-05-23
---

## Simple Summary

A new Sign-in-with-Starknet (SIWS) standard that removes the 31-char limit on the `StarknetDomain` and `Message` fields.

Inspired by [Starknet.js v6.8.0](https://github.com/starknet-io/starknet.js/blob/66a5c0341eccfef0dcdf1312c15627b7d4f6b675/src/utils/typedData.ts#L50-L65).

## Abstract

The current SIWS standard introduces a lot of limitations when signing messages by enforcing a 31-char limit on the `StarknetDomain` and `Message` fields. This proposal suggests the removal of this limitation to allow for more flexibility in the use of the SIWS standard and increase adoption of the new standard for more dApps built on Starknet.

## Motivation

Initially, it was noticed that the reason why the a string of more than 31 characters could not be signed was because it exceeded the curve limit of the Pedersen hash. Further scoping into the latest starknet.js codebase (hyperlinked above) revealed another hash standard (Poseidon hash) that could be used to sign messages of any length. This proposal aims to leverage this new hash standard to remove the 31-char limit on the `StarknetDomain` and `Message` fields.

## Specification

### Sign-in Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "domain": {
      "type": "object",
      "properties": {
        "chainId": {
          "type": "string",
          "enum": ["SN_SEPOLIA", "SN_MAIN"],
          "errorMessage": "ChainId must be one of 'SN_SEPOLIA', 'SN_MAIN'"
        },
        "name": {
          "type": "string",
          "errorMessage": "Name must be a string"
        },
        "version": {
          "type": "string",
          "maxLength": 31,
          "pattern": "^\\d+\\.\\d+\\.\\d+$",
          "errorMessage": "Version must be a string in the format x.y.z"
        },
        "revision": {
          "type": "string",
          "enum": ["0", "1"],
          "errorMessage": "Revision must be a string and must be either '0' or '1'"
        }
      },
      "required": ["chainId", "name", "version", "revision"],
      "additionalProperties": false,
      "errorMessage": "Domain must include chainId, name, version, revision"
    },
    "message": {
      "type": "object",
      "properties": {
        "version": {
          "type": "string",
          "maxLength": 31,
          "pattern": "^\\d+\\.\\d+\\.\\d+$",
          "errorMessage": "Version must be a string in the format x.y.z"
        },
        "address": {
          "type": "string",
          "pattern": "^0x[a-fA-F0-9]{63,64}$",
          "errorMessage": "Address must be a hexadecimal string with 66 characters, including the '0x' prefix"
        },
        "issuedAt": {
          "type": "string",
          "format": "date-time",
          "errorMessage": "IssuedAt must be a valid date-time string"
        },
        "nonce": {
          "type": "string",
          "minLength": 8,
          "maxLength": 31,
          "pattern": "^[a-zA-Z0-9]*$",
          "errorMessage": "Nonce must be an alphanumeric string between 8 and 31 characters"
        },
        "statement": {
          "type": "string",
          "errorMessage": "Statement must be a string"
        },
        "uri": {
          "type": "string",
          "format": "uri",
          "errorMessage": "Uri must be a valid URI string"
        },
        "expirationTime": {
          "type": "string",
          "format": "date-time",
          "errorMessage": "ExpirationTime, if present, must be a valid date-time string"
        },
        "notBefore": {
          "type": "string",
          "format": "date-time",
          "errorMessage": "NotBefore, if present, must be a valid date-time string"
        }
      },
      "required": [
        "address",
        "issuedAt",
        "nonce",
        "statement",
        "uri",
        "version"
      ],
      "additionalProperties": false,
      "errorMessage": "Message must include address, issuedAt, nonce, statement, uri, version"
    },
    "primaryType": {
      "type": "string",
      "const": "Message",
      "errorMessage": "PrimaryType must be 'Message'"
    },
    "types": {
      "type": "object",
      "properties": {
        "Message": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "enum": [
                  "version",
                  "address",
                  "statement",
                  "uri",
                  "nonce",
                  "issuedAt",
                  "expirationTime",
                  "notBefore"
                ],
                "errorMessage": "Name must be one of 'version', 'address', 'statement', 'uri', 'nonce', 'issuedAt', 'expirationTime', 'notBefore'"
              },
              "type": {
                "type": "string",
                "enum": ["string", "felt"],
                "errorMessage": "Type must be either 'string' or 'felt'"
              }
            },
            "required": ["name", "type"],
            "additionalProperties": false,
            "errorMessage": "Items must include name and type"
          },
          "minItems": 6,
          "maxItems": 8,
          "uniqueItems": true,
          "errorMessage": "Message must contain min 6-8 unique items "
        },
        "StarknetDomain": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "enum": ["name", "chainId", "version", "revision"],
                "errorMessage": "Name must be one of 'name', 'chainId', 'version', 'revision'"
              },
              "type": {
                "type": "string",
                "enum": ["felt", "string"],
                "errorMessage": "Type must be 'felt' or 'string'"
              }
            },
            "required": ["name", "type"],
            "additionalProperties": false,
            "errorMessage": "Items must include name and type"
          },
          "minItems": 4,
          "maxItems": 4,
          "uniqueItems": true,
          "errorMessage": "StarknetDomain must contain exactly 3 unique items"
        }
      },
      "required": ["Message", "StarknetDomain"],
      "additionalProperties": false,
      "errorMessage": "Types must include Message and StarknetDomain"
    }
  },
  "required": ["domain", "message", "primaryType", "types"],
  "additionalProperties": false,
  "errorMessage": "Data must include domain, message, primaryType, types"
}
```

### Changes

This new schema introduces a few key changes

- New `revision` field in the `domain` object to allow for future updates to the SIWS standard. Use `1` for the latest revision that allows for signing messages using the Poseidon hash.

- `StarknetDomain` replaces `StarkNetDomain` to align with the Starknet naming convention.

- `SN_SEPOLIA` replaced `SN_GOERLI2` to align with the latest chain IDs as per this [constant file](https://github.com/starknet-io/starknet.js/blob/develop/src/constants.ts).

## Implementation

This new standard was tested on this demo [repository](https://github.com/NethermindEth/sign-in-with-starknet). Do run the frontend repo with `npm run dev` to quickly test the new standard.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
