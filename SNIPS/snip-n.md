---
snip: 63
title: SNIP Naming When Adapting EIPs
author: Jack Boyuan Xu <jxu@ethsign.xyz>
discussions-to: $DISCUSSION_LINK
status: Draft
type: Meta
created: 2023-12-13
---

## Abstract

We should use a different namespace for EIP-inspired SNIPs to avoid confusion and improve developer experience.

## Motivation

Although Starknet and Ethereum do not share the same virtual machine, smart contract langauge, or programming practice, the general paradigms are very comparable. This is evident as both ecosystems share the same concepts on the application layer such as fungible tokens, non-fungible tokens, smart contract accounts, etc.. In fact, despite having Starknet-native fungible ([SNIP-2](./snip-2.md)) and non-fungible ([SNIP-3](./snip-3.md)) token standards, the majority of Starknet users and developers (e.g. OpenZeppelin) still refer to those tokens as ERC-20 and ERC-721. To attract people to Starknet, we should make the barrier of entry as low as possible by reusing terminologies they are already familiar with whenever appropriate.

## Specification

_The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119._

The SNIP namespace separation is achieved by using the prefix 'E' before the SNIP number.

When a SNIP is directly adapted from an EIP with the same concept, naming, specifications, requirements, function signatures, and outcome when calling reference implementations in both Cairo and Solidity with the same input except for a difference in implementation due to differing syntax, the SNIP number MUST be the EIP number with a prefixed 'E'. For example, EIP-20 adapted to Starknet shall result in SNIP-E20.

When a SNIP is adapted from an EIP with its concept, naming, and specifications modified to uniquely fit Starknet where the same outcome is not achieved when calling reference implementations in both Cairo and Solidity with the same input, the SNIP number MUST NOT include the prefix 'E' or the EIP number.

## History

This SNIP is inspired by discussions from [https://github.com/starknet-io/SNIPs/pull/35](https://eips.ethereum.org/EIPS/eip-4361).

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
