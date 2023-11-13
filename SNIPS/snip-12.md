---
snip: 12
title: Off-chain signatures (à la EIP712)
authors: Gaëtan A. <@gaetbout>, Sergio sgc <@sgc-code>, Julien Niset <@juniset>
discussions-to: https://community.starknet.io/t/snip-off-chain-signatures-a-la-eip712/98029
status: Draft
type: Standards Track
created: 2023-11-10
---


## Abstract

Just as in EIP712, this is a standard for hashing and signing typed structured data as opposed to just hexadecimal (or felt) values in Starknet. 

The purpose is NOT to define how you should design your protocol. 

## Motivation

Signing blindly some random hexadecimal is not very user-friendly, but on top of that, it is very dangerous. It is important for the user to understand what he is about to sign by showing him values he can understand. 

This document aims to create a standard that’s compatible with existing Dapps, wallets, and smart contracts while also adding some extra functionality to express the new types to help with a better display. This document consolidates some previous efforts to create off-chain signatures in Starknet (some of which were not well documented).

Here an example of NFT sell order, and how a wallet will be able to show today, versus what can be done after the improvements in this spec

![wallet rev 0 vs rev 1](../assets/snip-9/wallet-example.jpeg)

## Specification

Inspired by EIP-712, we can define the encoding of an off-chain message as:

```jsx
signed_data = encode(PREFIX_MESSAGE, Enc[domain_separator], account, Enc[message])
```

`hash_array(array)`  
For revision `0`: It will use the `pedersen` function as hash function. See:  
https://docs.starknet.io/documentation/architecture_and_concepts/Cryptography/hash-functions/#pedersen_array_hash

For revision `1`: It will use the `poseidon` function as hash function. See:  
https://docs.starknet.io/documentation/architecture_and_concepts/Cryptography/hash-functions/#poseidon_array_hash

`starknet_keccak(str)`  
as the starknet_keccak hash on str. See:  
https://docs.starknet.io/documentation/architecture_and_concepts/Cryptography/hash-functions/#starknet_keccak

`serialise(x)`  
as the way cairo transforms the value into a felt

`escape(name)`  
For revision `0`:  Returns the same as the input.  
For revision `1`:  The double quoted name with any escaping applied. Following the spec for JSON objects. See:  
https://www.json.org/json-en.html

### Prefix message

The `PREFIX_MESSAGE` **must be** `StarkNet Message`.  
This is intended to distinguish between a message sent off-chain for future use and a transaction that will be directly sent to the sequencer for on-chain processing.

### Domain separator

The `domain_separator` is defined as the object below.

```js
"StarknetDomain": [
  { "name": "name", "type": "shortstring" }, 
  { "name": "version", "type": "shortstring" },
  { "name": "chainId", "type": "shortstring" },
  { "name": "revision", "type": "shortstring" }
]
```

This object ensures the uniqueness of messages based on:

- **name**: The name of the Dapp, can even contain the function name if your contract needs to perform multiple off-chain signatures.
- **version**: The version of the Dapp your contract is using. Prevents two versions of the same Dapp from producing the same hash. Typically, if you update your contract and the hashing behaviour changes, this field should be updated.
- **chainId**: The chain ID used by the Dapp represented as a shortstring. Prevents replay attacks from one network to another.
- **revision (optional)**: the revision of the specification to be used. If the value is omitted it will default to `0` .
    - Revision `0`: Represents the de facto spec before this SNIP was published. The purpose is to help with backwards compatibility. It’s not recommended to use it.
    - Revision `1`: Will be the initial version of the specification

Introduced in revision `0`, changed in revision `1`  
In revision `0` the fields `name` , `version` and `chainId` are of type `felt` .  
Starting with revision `1` those fields are using the type `shortstring` .

In revision `0` the domain object is named `StarkNetDomain`.  
Starting with revision `1` the domain object is named `StarknetDomain`.  
An issue arise when a user using an old version of the wallet that only supports revision `0` receives a request sign with revision `1`.  The outdated wallet, unaware of revision `1` , would calculate the hash differently and therefore produce an invalid signature.
This is the reason we introduce the change from `StarkNetDomain` to `StarknetDomain`. 
If a dapp requests the wallet to sign something using `StarknetDomain` , it should should fail as it expects `StarkNetDomain` .

### Account

The `account` is the contract address of the Account Contract that is signing. 
This prevents two accounts from producing the same hash for the same message

### Message

Is the transaction message to be signed represented as an object.

## How to work with each type

 `type_hash(x) = starknet_keccak(encode_type(x))`

**Note that** the `type_hash` is constant for a given object/enum and does not need to be calculated when running a transaction in the smart contract.

### When X is an Object

#### **encoding**

`Enc[x] = hash_array(type_hash(MyObject), Enc[param1], Enc[param2], ..., Enc[paramN])`

Example:

```js
"My Object": [
  { "name": "Param 1", "type": "u128" },
  { "name": "Param 2", "type": "u128*" },
  { "name": "Param 3", "type": "selector" },
  { "name": "Param 4", "type": "Other Object" },
  { "name": "Param 5", "type": "merkletree" },
  // ...
  { "name": "Param N", "type": "u128" }
]
```

#### **encode_type**

 `escape(name) || "(" || escape(param1_name) || ":" || escape(param1_type) || "," || ... || escape(paramN_name) || ":"|| escape(paramN_type) || ")"` 

If the object references other objects/enum which can also reference other objects/enums, the set of referenced objects/enums is collected, sorted by name, and appended to the encoding. 

If we take back our example used previously, we have:  
`type_hash(MyObject) = starknet_keccak('"My Object"("Param 1":"u128","Param 2":"u128*","Param 3":"selector","Param 4":"Other Object","Param 5":"merkletree",...,"Param N":"u128")"Other Object"("Param 1":"u128"...)')`

### When X is an array

Introduced in revision `0`

#### **encoding**

`Enc[X=(x0, x1, ..., xN)] = hash_array([Enc[x0], Enc[x1], ... Enc[xN]])`

#### **encode_type**

An array of type `InnerType` has to be encoded as `InnerType*`. 
The inner type could be any of the other types supported in this specification.

### When X is a felt

Introduced in revision `0`  
This is usually not recommended as it’s hard do display in an user friendly way. There are usually more specific types that can be used

**encoding** `Enc[x] = serialise(x)`, **encode_type** `felt`

### When X is a bool

Introduced in revision `0`

#### **encoding**

`Enc[x] =` 

`0` for false  
`1` for true

**enconde_type:** `bool` 

### When x is a string

Introduced in revision `0`, changed in revision `1`

In revision `0` this represented a string of up to 31 ASCII characters.  
Starting with revision `1` this type will represent arbitrary size strings.  
If only 31 characters are needed, the type “shortstring” type could be a better fit  
**encoding** `Enc[x] = hash_array(serialise(x))`, **encode_type** `string`

### When X is a selector

Introduced in revision `0`

This represents the name of a smart contract function.

**encoding** `Enc[x] = starknet_keccak(x)`, **encode_type** `selector`

### When X is a merkletree

Introduced in revision `0`

This type allows the wallet to sign a large amount of data, but signing just the root of it’s merkle tree, making the verification cheaper onchain. But still being able to display all the data to users

#### **encoding**

`Enc[X=(x0, x1, ..., xN)] = calculate_merkle_tree_root(x0, x1, ..., xN)`

X is a list of items of the same type that we will sign as a merkle tree.

The the hash function used for the merkle tree will be:  
For revision `0`: `pedersen`  
For revision `1`:  `poseidon`  

**encode_type** `merkletree`

On the wallet level, providing just the merkletree root without including any data isn’t safe. The wallet also needs to receive the data, which is why an additional parameter is required.
The parameter  `contains`  needs to be specified, it will refer to a object type that will be used to represent the leaves as a objects:

```js
// ...
"Example": [
  { "name": "Contract Addresses", "type": "merkletree", "contains": "Leaf" },
],
"Leaf": [
  { "name": "Contract Address", "type": "ContractAddress" }
]
// ...
```

The wallet will receive a list of leaves from the Dapp, so the leaves can be shown to the user. It should then perform the hashing on all the leaves and ensure that the root is the same:

```js
// ...
"Contract Addresses": [
  {
    "Contract Address": "0x...123"
  },
  // ...
  {
    "Contract Address": "0x..beaf"
  }
]
// ...
```

In order to calculate the Merkle root the wallet will encode each leave to a single felt (using the same encoding used in this document). 

When verifying the off-chain signature, only the root of the tree needs to be provided to the contract. Verifying a Merkle proof will require the verification of the off-chain signature plus the verification of the proof.

### When X is a u128

Introduced in revision `1`

Unsigned integer using up to 128 bits

**encoding** `Enc[x] = serialise(x)`, **encode_type** `u128`

### When X is a i128

Introduced in revision `1`

Signed integer using up to 128 bits (including the sign)

**encoding** `Enc[x] = serialise(x)`, **encode_type** `i128`

### When X is a ContractAddress

Introduced in revision `1`

Represents a starknet contract address. See:  
https://docs.starknet.io/documentation/architecture_and_concepts/Smart_Contracts/contract-address/

**encoding** `Enc[x] = serialise(x)`, **encode_type** `ContractAddress`

### When X is a ClassHash

Introduced in revision `1`

Represents a Starknet class hash. See:  
https://docs.starknet.io/documentation/architecture_and_concepts/Smart_Contracts/class-hash/

**encoding** `Enc[x] = serialise(x)`, **encode_type** `ClassHash`

### When X is a timestamp

Introduced in revision `1`

The will be treated like a `u128` representing a timestamps in seconds. The purpose is the type is to allow wallets to format the value accordingly

**encoding** `Enc[x] = serialise(x)`, **encode_type** `timestamp`

### When X is a u256

Introduced in revision `1`

It will be encoded as the following object, splitting the low/high 128 bits. This type does NOT need to be declared on the `types` section.

```js
"u256": [
  { "name": "low", "type": "u128" },
  { "name": "high", "type": "u128" }
]
```

### When X is a Token Amount

Introduced in revision `1`

It will be encoded as the following object. This type does NOT need to be declared on the `types` section.

This allows wallets to group the token with the amount for better display. Wallets would be able to should correct decimals, fiat value, icon…)

```js
"TokenAmount": [
  { "name": "token_address", "type": "ContractAddress" },
  { "name": "amount", "type": "u256" }
]
```

### When X is a Nft ID

Introduced in revision `1`

It will be encoded as the following object. This type does NOT need to be declared on the `types` section.

This allows wallets to group the token id with the contract address for better display. Wallets will be able to show correct token info, image, and other attributes)

```js
"NftId": [
  { "name": "collection_address", "type": "ContractAddress" },
  { "name": "token_id", "type": "u256" }
]
```

### When x is a shortstring

Introduced in revision `1`

If you are using revision `0` you should use the type “string”

This type only allows a maximum of 31 ASCII characters.

Eventually this spec should allow for longer strings but we are waiting until the spec is finalized on the Cairo language (ideally address this on revision1)

**encoding** `Enc[x] = serialise(x)`, **encode_type** `shortstring`

### When X is an enum

Introduced in revision `1`

Example:

```js
{
  "types": {
    // ...
    "Example": [
      { "name": "some_enum", "type": "enum", "contains": "My Enum" },
    ],
    "My Enum": [
      { "name": "Variant 1", "type": "()" }
      { "name": "Variant 2", "type": "(u128, u128*)," }
      // ...
      { "name": "Variant N", "type": "(u128)" }
    ]
  },
  // ...
  "message": {
    // ...
    "Some Enum": { "Variant 2": [32, [12, 32]] }
    "Some Other Enum": { "Variant 1": [] }
  }
}

```

#### **encoding**

`Enc[enum] = hash_array(type_hash(enum), variant_index, Enc[chosen_variant_parameter1],..., Enc[chosen_variant_parameterN])`  

#### **encode_type**

`escape(enum_name) || "(" || escape(variant_1_name) || "(" || escape(param1_type) || "," || ... ||  escape(paramN_type) || ")," || ... || escape(variant_n_name) || "(" || ... || ")" || ")"`

If the enum references other objects/enum which can also reference other objects/enum, the set of referenced objects/enum is collected, sorted by name, and appended to the encoding. 

If we take back our example used previously, we have:  
`type_hash(MyEnum) = starknet_keccak('"My Enum"("Variant 1"(),"Variant 2"("u128","u128*"),...,"Variant N"("u128"))')`

### When X is some other type

The request should be considered invalid

### JSON example

```js
{
  "types": {
    "StarknetDomain": [
      { "name": "name", "type": "shortstring" },
      { "name": "version", "type": "shortstring" },
      { "name": "chainId", "type": "shortstring" },
      { "name": "revision", "type": "shortstring" } 
    ],
    "Example Message": [
      { "name": "Name", "type": "string" },
      { "name": "Some Array", "type": "u128*" },
      { "name": "Some Object", "type": "My Object" }
    ],
    "My Object": [
      { "name": "Some Selector", "type": "selector" },
      { "name": "Some Contract Address", "type": "ContractAddress" },
    ],
  },
  "primaryType": "Example Message",
  "domain": {
    "name": "Starknet Example",
    "version": "1",
    "chainId": "SN_MAIN",
    "revision" : "1"
  },
  "message": {
    "Name": "some name"
    "Some Array": [1, 2, 3, 4],
    "Some Object": {
      "Some Selector": "transfer",
      "Some Contract Address": "0x0123"
    },
  }
}
```

## Implementation

Find here an example repository for more detailed examples.  
Note that this implementation uses Pedersen as the hashing function.  
https://github.com/argentlabs/starknet-off-chain-signature

## References

1. https://github.com/argentlabs/argent-x/discussions/14
2. https://www.starknetjs.com/docs/guides/signature/#sign-and-verify-following-eip712
3. https://eips.ethereum.org/EIPS/eip-712
4. https://github.com/0xs34n/starknet.js/blob/develop/\_\_mocks\_\_/typedDataExample.json
5. [https://github.com/0xs34n/starknet.js/blob/develop/src/utils/typedData.ts](https://github.com/0xs34n/starknet.js/blob/develop/src/types/typedData.ts)

## Security Considerations

This SNIP have no impact at all in terms of security.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
