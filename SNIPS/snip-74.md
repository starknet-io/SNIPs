---
snip: 74
title: Sign-in-with-Starknet (SIWS) Standard
author: Yudhishthra Sugumaran <yudhishthra.sugumaran@nethermind.io>
discussions-to: https://community.starknet.io/t/sign-in-with-starknet-technical-proposal/95683/9
status: Draft
type: Standards Track
category: SRC
created: 2024-05-23
---

## Summary

The Sign-in with Starknet Standard (SIWS) enhances the flexibility and security of user authentication across Starknet by leveraging account abstraction and extended data fields. This standard supports a wider range of authentication scenarios, thereby improving user experience and expanding application development possibilities on Starknet.

## Abstract

The proposed SIWS standard introduces an advanced framework for authentication that enables signing of messages of any length, removing character limitations. This enhancement is made possible through the integration of the Poseidon hash function, which supports larger data sizes. The standard aims to facilitate broader adoption across decentralized applications by offering enhanced flexibility and robust security features.

## Motivation

SIWS aims to enhance user security by utilizing Starknet's account abstraction feature, allowing dynamic handling of signatures where any hash passing an account's `is_valid_signature` method is considered valid. This significantly improves security by enabling users to revoke signatures by changing account keys and supports future-proofing against advances in cryptographic methods. Additionally, by removing the character limit and employing structured JSON data for authentication requests, SIWS improves the clarity and detail of communication between users and services, making interactions more straightforward and secure. The flexibility offered by SIWS encourages developers to create innovative applications with diverse authentication needs, further enriching the Starknet ecosystem.

## Specification

### Sign-In Schema Structure

Domain Object:

- chainId: Identifies the Starknet network to confirm the correct context for authentication, aligning with protocol-level standards for network identification.
- name: The application's name, clarifying for users which service is initiating a sign-in request, thus ensuring transparency.
- version: Indicates the version of the application, ensuring that the authentication interaction adheres to compatible protocols.
- revision: The Typed Data revision, '0' marks legacy Typed Data, while '1' indicates the active Typed Data standard.

Message Object:

- address: Specifies the wallet address responsible for verifying the user’s signature.
- nonce: A one-time, unique number that makes each authentication request distinct to prevent replay attacks.
- issuedAt: Timestamp indicating when the authentication request was generated, helping to establish its temporal validity.
- statement: A user-readable message that the signer is agreeing to by providing their signature. This increases transparency and informs users about the purpose of their authentication.
- uri: The identifier of the resource or the specific service that the authentication request is associated with, helping to contextualize the sign-in attempt.
- version: The protocol version used in the message, ensuring compatibility between the user’s client and the dApp.
- expirationTime (optional): The timestamp until which the authentication request remains valid, securing the process by limiting the time frame for a valid sign-in.
- notBefore (optional): The earliest timestamp at which the authentication request can be considered valid, preventing its use before a certain time.

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
          "errorMessage": "StarknetDomain must contain exactly 4 unique items"
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

## Implementation

### Full Flow of Sign-In Process

1. Challenge Preparation: A Starknet application (the challenger) prepares a sign-in request based on the specified schema. This request includes the domain and message objects.

2. Signature Request: The user's wallet application displays the sign-in request, ensuring the user understands what they are signing.

3. User Consent and Signature: If the user consents to the sign-in request, they sign the message using their Starknet account. This signature is then sent back to the challenger.

4. Verification: The challenger uses an RPC call to a Starknet node to verify the signature against the user's account using the isValidSignature method. Due to account abstraction, the exact signature scheme doesn’t need to be known by the challenger; it only needs to ensure that the signature is valid for the given account.

### Verification Example

```typescript
import { Contract, RpcProvider, BigNumberish } from "starknet";
import abiAccountContract from "./account-contract-abi.json";

class SiwsTypedData {
  // ... other methods and properties

  async verifyMessageHash(
    hash: BigNumberish,
    signature: string[],
    provider: RpcProvider
  ): Promise<boolean> {
    try {
      const accountContract = new Contract(
        abiAccountContract,
        this.message.address,
        provider
      );
      await accountContract.call("is_valid_signature", [hash, signature]);
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  async verifyMessage(
    data: TypedData,
    signature: string[],
    provider: RpcProvider
  ): Promise<boolean> {
    const hash = await getMessageHash(data, this.message.address);
    return this.verifyMessageHash(hash, signature, provider);
  }
}
```

### Demonstration Repository

A demonstration of this sign-in protocol is available at [Sign-in with Starknet GitHub Repository](https://github.com/NethermindEth/sign-in-with-starknet). This repository includes example code and documentation that illustrates how to implement and test the sign-in protocol in a Starknet application.

### History

Discussion and development of this SNIP were inspired by the community's demand for more flexible and secure authentication methods within the Starknet ecosystem as dicussed in this [forum](https://community.starknet.io/t/sign-in-with-starknet-technical-proposal/95683/1)

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
