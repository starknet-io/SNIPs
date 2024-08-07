---
snip: 86
title: Sign-In with Starknet (SIWS) Standard
author: Yudhishthra Sugumaran <yudhishthra.sugumaran@nethermind.io>
discussions-to: https://community.starknet.io/t/sign-in-with-starknet-technical-proposal/95683/9
status: Draft
type: Standards Track
category: SRC
created: 2024-05-23
requires: SNIP-12
---

## Summary

The Sign-in with Starknet Standard (SIWS) enhances the flexibility and security of user authentication across Starknet by leveraging account abstraction and extended data fields. This standard supports a wider range of authentication scenarios, thereby improving user experience and expanding application development possibilities on Starknet.

## Abstract

The proposed SIWS standard introduces an advanced framework for authentication that enables signing of messages of any length, removing character limitations. This enhancement is made possible through the integration of the Poseidon hash function, which supports larger data sizes. The standard aims to facilitate broader adoption across decentralized applications by offering enhanced flexibility and robust security features.

## Motivation

SIWS aims to enhance user security by utilizing Starknet's account abstraction feature, allowing dynamic handling of signatures where any hash passing an account's `is_valid_signature` method is considered valid. This significantly improves security by enabling users to revoke signatures by changing account keys and supports future-proofing against advances in cryptographic methods. Additionally, by removing the character limit and employing structured JSON data for authentication requests, SIWS improves the clarity and detail of communication between users and services, making interactions more straightforward and secure. The flexibility offered by SIWS encourages developers to create innovative applications with diverse authentication needs, further enriching the Starknet ecosystem.

## Specification

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “NOT RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Overview

Sign-In with Starknet (SIWS) works as follows:

1. A Starknet application (the challenger) prepares a sign-in request based on the specified schema. This request includes the domain and message objects.
2. The user's wallet application displays the sign-in request, ensuring the user understands what they are signing.
3. If the user consents to the sign-in request, they sign the message using their Starknet account. This signature is then sent back to the challenger.
4. The challenger uses an RPC call to a Starknet node to verify the signature against the user’s account using the `is_valid_signature` method. Due to account abstraction, the exact signature scheme doesn’t need to be known by the challenger; it only needs to ensure that the signature is valid for the given account.

### Message Format

#### Structured JSON Message Format

A SIWS message _MUST_ follow the following JavaScript Object Notation (JSON) schema.

##### Schema Glossary:

- `$schema`: This keyword specifies the JSON Schema version being used.

- `type`: Defines the expected data type of a value.

- `enum`: Specifies a list of allowed values for a property.

- `pattern`: Defines a regular expression that a string value must match.

- `format`: Specifies a predefined format that a string value should conform to.

- `minLength` and `maxLength`: Specify the minimum and maximum length for string values.

- `const`: Specifies that a value must be exactly equal to the provided constant.

- `additionalProperties`: When set to `false`, it disallows any properties not explicitly defined in the schema.

- `errorMessage`: Provides custom error messages for validation failures.

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
          "errorMessage": "IssuedAt must be a valid ISO 8601 date-time string"
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
        "validUntil": {
          "type": "string",
          "format": "date-time",
          "errorMessage": "ExpirationTime, if present, must be a valid date-time string"
        },
        "validAfter": {
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
                  "validUntil",
                  "validAfter"
                ],
                "errorMessage": "Name must be one of 'version', 'address', 'statement', 'uri', 'nonce', 'issuedAt', 'validUntil', 'validAfter'"
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

#### Message Fields

This specification defines the following SIWS Message fields that can be parsed from a SIWS Message by following the rules in [Structured JSON Message Format](#structured-json-message-format).

- `domain` REQUIRED. An object containing information about the domain requesting the signing.

  - `chainId` REQUIRED. The Starknet network identifier. Its value MUST be either "SN_SEPOLIA" or "SN_MAIN".
  - `name` REQUIRED. The name of the application requesting the signing.
  - `version` REQUIRED. The version of the application. Its value MUST be a string in the format x.y.z and cannot exceed 31 characters.
  - `revision` REQUIRED. The Typed Data revision. Its value MUST be a string and MUST be "1" for this specification.

- `message` REQUIRED. An object containing the core components of the SIWS message.

  - `version` REQUIRED. The version of the SIWS message. Its value MUST be a string in the format x.y.z and cannot exceed 31 characters.
  - `address` REQUIRED. The Starknet address performing the signing. Its value MUST be a hexadecimal string with 66 characters, including the '0x' prefix.
  - `statement` REQUIRED. A human-readable ASCII assertion that the user will sign.
  - `uri` REQUIRED. An RFC 3986 URI referring to the resource that is the subject of the signing.
  - `nonce` REQUIRED. A random string used to prevent replay attacks, at least 8 alphanumeric characters and no more than 31 characters.
  - `issuedAt` REQUIRED. The time when the message was generated. Its value MUST be an ISO 8601 datetime string.
  - `validUntil` OPTIONAL. The time when the signed authentication message is no longer valid. Its value MUST be an ISO 8601 datetime string.
  - `validAfter` OPTIONAL. The time when the signed authentication message will become valid. Its value MUST be an ISO 8601 datetime string.

- `primaryType` REQUIRED. Specifies the primary type of the structured data. Its value MUST be "Message".

- `types` REQUIRED. Defines the structure and types of the message and domain objects.

  - `Message` REQUIRED. An array defining the structure of the message object.
  - `StarknetDomain` REQUIRED. An array defining the structure of the domain object.

#### Examples

The following is an example of a basic SIWS message:

```json
{
  "domain": {
    "chainId": "SN_MAIN",
    "name": "Example DApp",
    "version": "1.0.0",
    "revision": "1"
  },
  "message": {
    "version": "1.0.0",
    "address": "0x1234567890123456789012345678901234567890123456789012345678901234",
    "statement": "Sign in with Starknet to Example DApp",
    "uri": "https://example.com",
    "nonce": "32891756",
    "issuedAt": "2024-05-24T12:34:56Z",
    "validUntil": "2024-05-24T13:34:56Z"
  },
  "primaryType": "Message",
  "types": {
    "Message": [
      { "name": "version", "type": "string" },
      { "name": "address", "type": "felt" },
      { "name": "statement", "type": "string" },
      { "name": "uri", "type": "string" },
      { "name": "nonce", "type": "string" },
      { "name": "issuedAt", "type": "string" },
      { "name": "validUntil", "type": "string" }
    ],
    "StarknetDomain": [
      { "name": "name", "type": "string" },
      { "name": "chainId", "type": "string" },
      { "name": "version", "type": "string" },
      { "name": "revision", "type": "string" }
    ]
  }
}
```

The following is an example of a SIWS message with optional fields:

```json
{
  "domain": {
    "chainId": "SN_SEPOLIA",
    "name": "Test Application",
    "version": "0.1.0",
    "revision": "1"
  },
  "message": {
    "version": "1.0.0",
    "address": "0x0987654321098765432109876543210987654321098765432109876543210987",
    "statement": "Sign in with Starknet to access Test Application",
    "uri": "https://test.example.org",
    "nonce": "abcdef123456",
    "issuedAt": "2024-05-24T14:00:00Z",
    "validAfter": "2024-05-24T14:05:00Z",
    "validUntil": "2024-05-24T15:00:00Z"
  },
  "primaryType": "Message",
  "types": {
    "Message": [
      { "name": "version", "type": "string" },
      { "name": "address", "type": "felt" },
      { "name": "statement", "type": "string" },
      { "name": "uri", "type": "string" },
      { "name": "nonce", "type": "string" },
      { "name": "issuedAt", "type": "string" },
      { "name": "validAfter", "type": "string" },
      { "name": "validUntil", "type": "string" }
    ],
    "StarknetDomain": [
      { "name": "name", "type": "string" },
      { "name": "chainId", "type": "string" },
      { "name": "version", "type": "string" },
      { "name": "revision", "type": "string" }
    ]
  }
}
```

The following is an example of a SIWS message with all minimal fields:

```json
{
  "domain": {
    "chainId": "SN_MAIN",
    "name": "Minimal App",
    "version": "1.0.0",
    "revision": "1"
  },
  "message": {
    "version": "1.0.0",
    "address": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "statement": "Sign in to Minimal App",
    "uri": "https://minimal.app",
    "nonce": "minimalnonce123",
    "issuedAt": "2024-05-24T16:00:00Z"
  },
  "primaryType": "Message",
  "types": {
    "Message": [
      { "name": "version", "type": "string" },
      { "name": "address", "type": "felt" },
      { "name": "statement", "type": "string" },
      { "name": "uri", "type": "string" },
      { "name": "nonce", "type": "string" },
      { "name": "issuedAt", "type": "string" }
    ],
    "StarknetDomain": [
      { "name": "name", "type": "string" },
      { "name": "chainId", "type": "string" },
      { "name": "version", "type": "string" },
      { "name": "revision", "type": "string" }
    ]
  }
}
```

### Signing and Verifiying Messages with Starknet Accounts

#### Signing Messages with Starknet Accounts

1. **Message Preparation**:

   - **Structured Data**: Messages are structured in JSON format for clarity and integrity.
   - **Poseidon Hash Function**: Used to handle larger data sizes, enabling the signing of messages of any length.

2. **Generating the Signature**:

   - **Account Abstraction**: Signature logic is defined by the account’s smart contract.
   - **Signing Process**: User’s private key signs the hashed message securely within Starknet.

#### Verifying Messages with Starknet Accounts

1. **Verification Method for EOAs**:

   - **EIP-712**: Verification involves reconstructing the signed message and comparing it against the provided signature.

2. **Verification Method for Contract Accounts**:

   - **EIP-4361**: Smart contract defines `is_valid_signature` function for verification.
   - **Chain-ID Resolution**: Ensures verification is done in the correct blockchain context.

3. **State-Dependent Verification**:

   - Verification results can depend on blockchain state. Services might use webhooks to receive notifications when state changes affect verification, invalidating matching sessions to maintain security.

### Relying Party Implementer Steps

#### Preparing the Sign-In Request

The relying party must prepare a sign-in request following the specified JSON schema. This request should include the `domain` and `message` objects as detailed in the Message Format section.

#### Specifying the Request Origin

The `domain` object in the SIWS Message MUST correspond to the origin from where the signing request is made. This includes the `chainId`, `name`, `version`, and `revision` of the application.

#### Verifying a Signed Message

After receiving the signed message from the user's wallet, the relying party MUST:

- Check for conformance to the Structured JSON Message Format.
- Verify expected values after parsing (e.g., `validUntil`, `nonce`, `uri`, etc.).
- Check the signature using the `is_valid_signature` method.

#### Chain ID Resolution

Ensure verification is done in the correct blockchain context by checking the `chainId` in the `domain` object.

#### Creating Sessions

Sessions MUST be bound to the `address` field in the message and not to further resolved resources that can change.

#### Interpreting and Resolving Resources

- Ensure that URIs in the `uri` field are human-friendly when expressed in plaintext form.
- The interpretation of any additional resources listed in the SIWS Message is out of scope for this specification.

#### Handling Optional Fields

Be prepared to handle optional fields such as `validUntil` and `validAfter` when present in the message.

#### State-Dependent Verification

Be aware that verification results can depend on blockchain state. Consider implementing mechanisms (such as webhooks) to receive notifications when state changes affect verification, potentially invalidating matching sessions to maintain security.

### Wallet Implementer Steps

#### Verifying the Message Format

Wallet implementers MUST ensure the full Sign-In with Starknet (SIWS) message conforms to the structured JSON data format specified in the proposal. This includes verifying fields like domain, address, statement, version, chain-id, URI, nonce, and issued-at timestamp.

#### Verifying the Request Origin

Wallet implementers MUST prevent phishing attacks by verifying the origin of the request against the scheme and domain fields in the SIWS message. For example, if the message begins with "example.com wants you to sign in...", the wallet checks that the request originated from https://example.com. The origin SHOULD be read from a trusted data source such as the browser window or over WalletConnect (ERC-1328) sessions for comparison against the signing message contents. Wallet implementers MAY warn instead of rejecting the verification if the origin points to localhost.

#### Algorithm for Request Origin Verification:

- Assign defaultScheme if the scheme is not provided.
- Reject the request if the scheme is not in allowedSchemes.
- Reject the request if the scheme does not match the origin scheme.
- Reject the request if the domain and origin host do not match, unless in developer mode.
- Warn if the port does not match the origin port.

#### Creating Sign-In with Starknet Interfaces

Wallet implementers MUST display to the user the following fields from the SIWS message request by default and prior to signing: scheme, domain, address, statement, and resources. Wallet implementers displaying a plaintext SIWS message to the user SHOULD require the user to scroll to the bottom of the text area prior to signing. Custom SIWS user interfaces can be constructed by parsing the JSON terms into data elements for use in the interface.

#### Supporting Internationalization (i18n)

After parsing the message into JSON terms, translation MAY happen at the UX level per human language.

### Reference Implementation

A demonstration of this sign-in protocol is available at [Sign-In with Starknet GitHub Repository](https://github.com/NethermindEth/sign-in-with-starknet).

## Rationale

### Requirements

The specification for Sign-In with Starknet (SIWS) should be clear and align with existing standards, focusing on simplicity and broad usability. It should be a decentralized, open, and non-proprietary solution with long-term viability, avoiding unnecessary features that might complicate the implementation. The goal is to ensure a streamlined approach that enhances the user experience and security without catering to lesser-used projects seeking adoption through specification inclusion.

Additional Functional Requirements:

1. The interface presented to the user should be human-understandable and mostly free of machine-targeted artifacts, except for the necessary Starknet account address.
2. Application Server Implementation: The application server must support the SIWS specification without necessitating changes in wallet implementations.
3. Upgrade Path: Both applications and wallets already using account-based signing should have a clear and straightforward upgrade path to SIWS.
4. Security Measures: Include facilities and guidelines to adequately mitigate Man-in-the-Middle (MITM) attacks, replay attacks, and malicious signing requests.

### Design Goals

1. Human-Friendly: Ensure the system is easy to understand and interact with for end-users.
2. Simple to Implement: Developers should find the specification straightforward to implement without unnecessary complexity.
3. Secure: The authentication method must provide robust security against common threats and vulnerabilities.
4. Machine Readable: Messages should be structured so that machines can easily parse and validate them.
5. Extensible: The specification should be flexible enough to accommodate future enhancements and extensions.

### Technical Decisions

#### Why Revision 1 Over 0

- Poseidon Hash Function:

  - Reason: Revision 1 leverages the Poseidon hash function, which allows handling larger message values. This decision addresses the 31-character limit in message fields, enabling the SIWS specification to support more comprehensive and detailed messages.
  - Impact: Enhances the flexibility and utility of the SIWS protocol, allowing for more extensive use cases and improving overall functionality.

#### Why Structured Data Format (EIP-712) Over Alternative Methods

- EIP-712 for Compatibility and Security:
  - Reason: Adopting the EIP-712 structured data format for message signing ensures compatibility with existing Starknet wallet implementations like Braavos and ArgentX. EIP-712 provides a standardized and secure way to handle structured data.
  - Impact: Enhances interoperability, security, and ease of integration for developers and users.

#### Why Include Starknet Account Contract Address

- Precise Identification and Validation:
  - Reason: Embedding the Starknet account contract address in the signed message allows for precise identification and validation of the user’s account. This ensures that the sign-in request is securely linked to the correct account.
  - Impact: Improves security and traceability of the authentication process.

### Out of Scope

The SIWS specification will not cover:

- Changes to the Starknet protocol are handled through separate Starknet Improvement Proposals (SNIPs) and require community and core team consensus.
- The specification will not cover non-standard account implementations that do not follow the proposed Starknet Standard Account SNIP.
- Features specific to individual applications that do not align with the core goals of simplicity, security, and interoperability will be excluded.
- The focus is solely on the Starknet ecosystem, excluding integrations or interoperability with non-Starknet systems.

### Considerations for Future Compatibility

To ensure the Sign-In with Starknet (SIWS) specification remains relevant and adaptable, the following considerations for future compatibility are proposed. These items may be supported in future iterations of this specification or through new work items using this specification as a dependency:

- Implementing versioning rules that allow for signing with minor revisions while maintaining compatibility with major versions. This will ensure that the specification can evolve without breaking existing implementations.
- Incorporating other authentication mechanisms, such as biometric or hardware-based authentication, to provide more robust security options.
- Supporting more advanced and customizable user interfaces for sign-in requests, improving user experience and clarity.

## Backwards Compatibility

Current wallet implementations in Starknet, such as Braavos and ArgentX, use EIP-712 for structured data signing. This SIWS standard builds upon these existing practices while introducing enhancements specific to Starknet's capabilities.

Requirements were gathered from existing implementations of similar sign-in workflows, including statements to allow the user to accept a Terms of Service, nonces for replay protection, and inclusion of the Starknet account contract address itself in the message.

The SIWS standard leverages Starknet's unique features, such as account abstraction, and supports larger message sizes through the use of the Poseidon hash function. These enhancements provide a more flexible and secure authentication method tailored to Starknet's ecosystem.

## Security Considerations

### Identifier Reuse

- To achieve optimal privacy, it is ideal to use a new, uncorrelated Starknet address for each interaction. This minimizes the information disclosed and enhances privacy. While early adopters may prefer identifier reuse for consistency across services, this becomes more critical with broader adoption.

- Future specifications could explore advanced privacy techniques such as HD wallets, signed delegations, and zero-knowledge proofs.

- The `address` field in the message object allows the use of a new Starknet address for each interaction.

### Key Management

- Users must manage their keys, which can be challenging, especially for mainstream users who are not used to handling private keys. Early adopters are likely more adept at key management, but this issue will grow with adoption. Wallets using smart contracts and multisigs can improve key usage and recovery, leveraging Starknet's account abstraction features.

- The `domain` field includes details like `chainId` and `name` which can be leveraged by smart contract wallets for key recovery mechanisms.

### Preventing Replay Attacks

- Include a unique nonce with each sign-in request to prevent replay attacks. The nonce should have enough entropy to ensure each session initiation is unique and secure. Privacy-preserving nonce values, such as those derived from recent Starknet block hashes or Unix timestamps, can be used.

- The `nonce` field in the message object is used to prevent replay attacks, ensuring each sign-in request is unique.

### Minimizing Wallet and Server Interaction

- To protect user privacy, generate the SIWS message client-side to reduce server interaction. When server interaction is necessary, take precautions to safeguard user information. The wallet may consult the user for preferences before signing.

- Fields like `version`, `address`, and `nonce` in the message object are filled client-side, reducing the need for server interaction.

### Preventing Phishing Attacks

- Wallets must verify the origin of the sign-in request against the domain specified in the message to prevent phishing attacks. This ensures the request comes from a trusted source.

- The `domain` field in the message object is used by wallets to verify the origin of the sign-in request, ensuring it matches the expected domain.

### Channel Security

- Use secure channels like HTTPS for all communications between the wallet and the application server to prevent man-in-the-middle attacks. Employ appropriate measures for other protocols to ensure confidentiality, data integrity, and authenticity.

- The `uri` field in the message object specifies the resource URI, ensuring secure communication channels are used.

### Session Invalidation

- Implement mechanisms to invalidate sessions when there are relevant state changes. If an account's state or any specified resources in the message change, the server should invalidate the affected sessions to maintain security and integrity.

Example: The issuedAt and validUntil fields in the message object help manage session validity, allowing for automatic session invalidation when necessary.

## History

Discussion and development of this SNIP were inspired by the community's demand for more flexible and secure authentication methods within the Starknet ecosystem as dicussed in this [forum](https://community.starknet.io/t/sign-in-with-starknet-technical-proposal/95683/1)

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
