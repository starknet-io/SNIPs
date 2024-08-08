---
snip: 15
title: Only an account can call its `execute`
description: This SNIP proposes to restrict calls to an account's `execute` method to externals calls and calls coming from the account itself.
author: Ilia Volokh <iliav@starkware.co>
discussions-to: TBD
status: Draft
type: Standards Track
category: Core
created: 2024-01-08
---

## Simple Summary
Restrict Starknet so only an account can call its own `execute` function, preventing internal calls from other contracts.

## Abstract

This proposal defines a protocol-level restriction that will be imposed on callers to the `execute` entrypoint of an account. The restriction requires the caller address to equal the address of the account of the `execute` in question.

## Motivation

Users act through their accounts via the `execute` entrypoint. Being able to access the execute of someone's account is tantamount to acting on their behalf.

The current status quo is that all safe account implementations explicitly contain a line in their `execute` entrypoint which enforces that the call is not internal. Accounts without this line are exposed to having others act on their behalf.

## Specification

Execution clients will track the caller address and fail a transaction as soon as there is a call to an `execute` entrypoint whose caller address is not the associated account.

The OS will enforce this restriction, rendering any calls that violate this restriction unprovable.

## Rationale

We submit that the default behavior should defend naive users and developers against such a counterintuitive vulnerability that lets anyone act on behalf of another's account.

## Drawbacks

The proposed restriction will break any applicative flows that call an account's `execute` from a proxy contract.

In recent history, there have been several dozen transactions with such a flow. After the introduction of the restriction, such transactions will be reverted (in particular, their senders will pay fees).

In our opinion, this drawback is acceptable because flows in which contracts act on behalf of accounts are possible e.g by SNIP 9 ("outside execution") https://community.starknet.io/t/snip-outside-execution/101058.

## Backwards Compatibility

This proposal will break any flow that involves foreign internal calls to an account's `execute` method.

## Security Considerations

This proposal aims to improve security by relieving account writers of the responsibility to prevent foreign internal calls to `execute`. In general, we want to give freedom to account writers. In this case, however, we think the consequences of a developer being unaware of the threat of foreign control of the account justifies a protocol-level restriction.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
