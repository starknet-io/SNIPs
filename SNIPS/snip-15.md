# Draft---
snip: 15
title: Only an account can call its `execute`
author: Ilia Volokh <iliav@starkware.co>
discussions-to: 
status: Draft
type: Core
created: 2024-01-08
---

## Simple Summary
Restrict Starknet so only an account can call its own `execute` function, preventing internal calls from other contracts.

## Abstract

This proposal defines a protocol-level restriction that will be imposed on callers to the `execute` entrypoint of an account. The restriction requires the caller address to equal the address of the account of the `execute` in question.

## Motivation

Users act through their accounts via the `execute` entrypoint. Being able to access the execute of someone's account is tantamount to acting on their behalf. The default behavior should defend naive users and developers against such vulnerabilities.

On the other hand, the current status quo is that every account's `execute` explicitly contains a line which enforces the call is not internal. Accounts without this line are exposed.

## Specification

Execution clients will track the caller address, and fail a transaction as soon as there is a call to an `execute` entrypoint whose caller address is not the associated account.

The OS will enforce this restriction, rendering any calls which violate this restriction unprovable.

## Drawbacks

The proposed restriction will break any applicative flows which call an account's `execute` from a proxy contract.

Searching the recent history, there are several dozen transactions with such a flow. After the introduction of the restriction, such transactions will be reverted (in particular, their senders will pay fees).

In our opinion this drawback is acceptable because flows in which contracts act on behalf of accounts are possible e.g by SNIP 9 ("outside execution") https://community.starknet.io/t/snip-outside-execution/101058.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
