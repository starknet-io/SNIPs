---
snip: 49
title: Introducing Privacy-Preserving Transactions on StarkNet
status: Draft
type: Standards Track
author: Tudor, Pintea <tudorpintea98@gmail.com>
discussions-to: https://community.starknet.io/t/snip-10-introducing-privacy-preserving-transactions-on-starknet/104115
category: CORE
created: November 1, 2023
---

## Simple Summary

This SNIP proposes a new feature to enhance user privacy on StarkNet by introducing privacy-preserving transactions using zk-SNARKs.

## Abstract

This SNIP proposes the introduction of privacy-preserving transactions on StarkNet using zk-SNARKs.
The goal is to enable users to transact on StarkNet without revealing the transaction amount or the parties involved, enhancing user privacy.

## Motivation

While StarkNet offers scalability and efficiency, user transactions are currently transparent, similar to many other blockchains.
As privacy becomes a growing concern among users, introducing privacy-preserving transactions will make StarkNet more appealing to a broader audience and enhance its utility.

## Specification

   1. zk-SNARKs Integration: Integrate zk-SNARKs proofs to validate transactions without revealing transaction data.
   2. New Transaction Type: Introduce a new transaction type, PrivateTransaction, which will utilize zk-SNARKs to keep transaction details hidden.
   3. Gas Fees: Gas fees for PrivateTransaction will be slightly higher due to the computational complexity of zk-SNARKs.
   4. Opt-in Privacy: Users can choose between regular transactions and privacy-preserving transactions.


## Rationale

zk-SNARKs have been successfully implemented in other blockchain platforms for privacy.
They allow for transaction validation without revealing the transaction’s details, making them a suitable choice for this feature.

## Backwards Compatibility

This proposal introduces a new transaction type but does not alter the existing transaction structure. 
Therefore, it is backward compatible with current StarkNet implementations.

## Test cases

Private Transaction Validation: Ensure that PrivateTransaction is validated and processed without revealing transaction details.
Gas Consumption: Confirm that gas fees for PrivateTransaction are consistent with the proposal.

## Reference Implementation

A reference implementation will be provided on the StarkNet GitHub repository under the branch feature/private-transactions.

## Security Considerations

While zk-SNARKs are considered secure, thorough auditing and testing will be necessary to ensure that the privacy feature does
not introduce vulnerabilities into StarkNet.



## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
