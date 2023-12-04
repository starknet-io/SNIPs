---
snip: $SNIP_ID
title: Sign-In with Starknet
author: Jack Boyuan Xu <jxu@ethsign.xyz>
discussions-to: $DISCUSSION_LINK
status: Draft
type: Standards Track
created: 2023-12-4
requires: [SNIP-12](./snip-12.md)
---

## Abstract

Inspired by [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361), Sign-In with Starknet describes how Starknet accounts authenticate off-chain by signing a standard message format parameterized by scope, session details, and security mechanisms. The goal of this specification is to provide a consistent machine- and human-readable message format that improves clarity and user experience when using Starknet accounts to authenticate with off-chain applications.

## Motivation

While it is widely accepted across the industry that signing into off-chain applications using an on-chain identity requires a digital signature of a given message so the user can prove their private key ownership, there isn't a consensus on message formatting on Starknet yet. The lack of such standard causes both poor user experience and potential risks as users often have no idea what exactly they are signing when presented with an illegible hash. Dishonest applications may take advantage of this and ask users to sign a transaction or something completely unrelated to the message itself.

[SNIP-12](./snip-12.md) already addresses a major aspect of this problem by creating a human-readable message signing format. However, to make it possible for different wallets to consistently implement the same user friendly interface, this standardization is needed.

## Specification

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

### Overview

Sign-In with Starknet (SIWS) works as follows:

1. The application generates a structured [SNIP-12](./snip-12.md) SIWS message.
2. The wallet presents the user with a human-readable version of said message to sign using their private key.
3. The signature is sent to the application for validation. If both cryptographic validation and content validation pass, the signature is considered valid.

### Message Format

The following types should be adopted when constructing the [SNIP-12](./snip-12.md) message:

```ts
const types = {
  StarkNetDomain: [
    { name: "name", type: "shortstring" },
    { name: "version", type: "shortstring" },
    { name: "chainId", type: "shortstring" },
    { name: "revision", type: "shortstring" },
  ],
  SIWS: [
    { name: "address", type: "ContractAddress" },
    { name: "statement", type: "string" },
    { name: "uri", type: "string" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "timestamp" },
    { name: "expiresAt", type: "timestamp" },
  ],
};
```

As SIWS is intended to be used with off-chain applications, Cairo compatibility and efficiency are not considered while clarity and human legibility are prioritized.

### Message Fields

Here is an explanation of each field listed above:

- `name` REQUIRED. The name of the application that the user is attempting to sign into.
- `version` REQUIRED. The current version of said application.
- `chainId` REQUIRED. The chain ID to which the sign-in session is bound. This prevents replay attacks.
- `revision` REQUIRED. The revision of the SIWS specification to be used. The latest revision is `1`. All revision details can be checked via the commit history of this proposal.
- `address` REQUIRED. The address of the user performing the signing.
- `statement` REQUIRED. A human-readable ASCII message that sufficiently explains to the user what they are signing into. MUST NOT include any new-line characters.
  - Despite the `string` designation, some frontend frameworks still impose a `shortstring` character limit.
- `uri` REQUIRED. An [RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986) URI of the resource that is the subject of the signing.
- `nonce` REQUIRED. A random and unique string typically chosen by the application to prevent any replay attacks.
- `issuedAt` REQUIRED. The time when the message was generated. Its value MUST be a Unix timestamp in seconds.
- `expiresAt` OPTIONAL. The time when the message expires and becomes invalid. Its value MUST be a Unix timestamp in seconds.

## Implementation

```ts
import {
  json,
  Contract,
  WeierstrassSignatureType,
  typedData,
  TypedData,
  shortString,
  RpcProvider,
  constants,
  Account,
} from "starknet";
import fs from "fs";
import "dotenv/config";

interface SigningResults {
  address: string;
  message: TypedData;
  signature: WeierstrassSignatureType;
}

const types = {
  StarkNetDomain: [
    { name: "name", type: "shortstring" },
    { name: "version", type: "shortstring" },
    { name: "chainId", type: "shortstring" },
    { name: "revision", type: "shortstring" },
  ],
  SIWS: [
    { name: "address", type: "ContractAddress" },
    { name: "statement", type: "string" },
    { name: "uri", type: "string" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "timestamp" },
    { name: "expiresAt", type: "timestamp" },
  ],
};

const provider = new RpcProvider({
  nodeUrl: process.env.RPC_URL!,
  chainId: constants.StarknetChainId.SN_MAIN,
});

async function sign(): Promise<SigningResults> {
  const accountAddress = process.env.ACCOUNT_ADDRESS!;
  const privateKey = process.env.ACCOUNT_PRIVATE_KEY!;
  const account = new Account(provider, accountAddress, privateKey);
  const typedDataToSign: TypedData = {
    types: types,
    primaryType: "SIWS",
    domain: {
      name: "EthSign",
      version: "1",
      chainId: shortString.encodeShortString("SN_MAIN"),
      revision: "1",
    },
    message: {
      address: accountAddress,
      statement: "EthSign is signing you in.",
      uri: "https://ethsign.xyz",
      nonce: (Math.random() + 1).toString(36).substring(7),
      issuedAt: `${Math.floor(Date.now() / 1000)}`,
      expiresAt: "0",
    },
  };
  // This is offchain
  const signature = (await account.signMessage(
    typedDataToSign
  )) as WeierstrassSignatureType;
  return {
    address: accountAddress,
    message: typedDataToSign,
    signature: signature,
  };
}

async function verify(
  address: string,
  message: TypedData,
  signature: WeierstrassSignatureType
): Promise<boolean> {
  const compiledAccount = json.parse(
    fs.readFileSync("./ArgentAccount.json").toString("ascii")
  );
  const contractAccount = new Contract(compiledAccount.abi, address, provider);
  const typedDataHash = typedData.getMessageHash(message, address);
  // Cryptographic verification only
  const results = await contractAccount.isValidSignature(typedDataHash, [
    signature.r,
    signature.s,
  ]);
  // Perform additional data validation here (not shown)
  // For example, if the message has expired
  // Return results
  return results.isValid === 1n;
}

async function main() {
  const signingResults = await sign();
  console.log("Signing results:", signingResults);
  const verificationResults = await verify(
    signingResults.address,
    signingResults.message,
    signingResults.signature
  );
  console.log(`Verification ${verificationResults ? "successful" : "failed"}.`);
}

main();
```

## History

This SNIP is inspired by:

- [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361)
- [Web3Auth - Sign-In with Starkware](https://github.com/Web3Auth/sign-in-with-starkware)

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
