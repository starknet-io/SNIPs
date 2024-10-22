---
snip: 20
title: Enshrined Paymasters for ERC-20 tokens
description: This SNIP proposes a design for enshrined paymasters for ERC-20 tokens
author: Ilia Volokh <iliav@starkware.co>, Leonardo Lerer <leo@starkware.co>
discussions-to: 
status: Review
type: Standards Track
category: Core
created: 2024-09-15
---

## Simple Summary
We propose a design for enshrined paymasters that leverages the `paymaster` field in INVOKE transactions version 3. The design allows anyone to deploy paymaster contracts that abstract token exchanges away from users. Its scope is limited to ERC-20 contracts and does not offer full fee abstraction (e.g paying transaction fees with NFTs or other assets).

In a nutshell, users send v3 transactions and specify three pieces of data in the `paymaster` field:
1. Paymaster contract address
2. ERC-20 token contract address
3. Maximal allowed exchange rate between the above token and STRK. Specifically, the max rate `r` means the user is willing to pay at most `r` tokens for a single STRK.
The target paymaster contract will receive funds from the user (denominated in their ERC-20 token of choice) and pay the transaction fee (in STRK) to the sequencer, at a rate `≤ r`. Economic calculation and choice of rate are left to each paymaster contract.

The proposal involves no reputation systems, enshrined oracles/AMMs, or other capital costs to deploy paymaster contracts.

## Motivation

The Starknet transaction fee market will act on v3 transaction, whose fees are denominated in the native fee token STRK (see also [SNIP-16](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-16.md)). However, users may wish to pay transaction fees in other tokens. Paymasters are an umbrella term for mechanisms, products, and/or services that provide users with such functionality.

In broad terms, paymasters can be applicative or enshrined/protocol-level. The latter refers to a paymaster mechanism that is recognized at the protocol level, e.g via the `paymaster` field in transaction version 3. The former is the complement of the latter, e.g architecture relying solely on outside execution (see [SNIP-9](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-9.md)).

We think the ability of users to transact on Starknet without owning STRK is an important feature. Moreover, we are in favor of enshrining such a mechanism to avoid strict dependency of such users on additional services external to the standard transaction flow. Thus we present this design proposal for enshrined paymasters.

## Proposal

We draw inspiration from [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337), although we take a slightly different route.

### Definitions

We shall say a contract is a _paymaster_ if it has a `__validate_paymaster__` entrypoint. No computational restrictions are necessary for `__validate_paymaster__` as users will pay for its failure - this is explained in detail later.

An example `__validate_paymaster__` would read an exchange rate from some chosen oracle(s) or AMM(s) and check the user's specified exchange rate is liberal enough, e.g `1.05 × oracle_rate ≤ r`.

A _paymaster transaction_ is one with a non-empty _paymaster field_. A valid paymaster transaction specifies three concatenated pieces of data in the `paymaster` field:
1. Paymaster contract address
2. ERC-20 token contract address
3. Maximal allowed exchange rate between the above token and STRK. Specifically, max rate `r` means the user is willing to pay at most `r` tokens for a single STRK.


### Flow

We now outline the steps for processing of a paymaster transaction by the sequencer. For simplicity, the initial flow will involve charging at the user's max rate `r`; the optimization of charging at discounted rates will be deferred to the next section.

#### Mempool

Users can submit unrealistically low rates; these should be interpreted as overvaluations of their designated payment tokens. Exaggerated claims should be rejected. However, we wish to avoid defining "reasonable rates" at the protocol level. To this end, each sequencer client locally defines reasonable rates via dictionary: `TOKEN → min_STRK/TOKEN_rate`. (The ratio follows exchange conventions: it is the price of one STRK in units of the TOKEN.) This dictionary can be static or dynamically updated e.g by some oracle feed. Sequencers can also choose to serve only some chosen whitelist of paymaster contracts.

Full nodes can either maintain such configs or indiscriminantly propagate paymaster transactions without looking into the `paymaster` field. In the former case, each full node filters some paymaster transactions from the P2P network according to its local  configurations. If most nodes have similar configs to sequencers, this does a service by reducing the traffic of invalid transactions on the network, essentially defending sequencer mempools. On the other hand, if full nodes configure themselves too defensively, they may filter out paymaster transactions that sequencers are willing to process. In the latter case where full nodes do not maintain any configs, all invalid transactions will need to be rejected by some sequencer from entering its mempool.

Now the flow:

1. Syntactic checks (transaction is properly formatted).
2. User submitted rate should be at least client's locally configured rate. `min_STRK/TOKEN_rate ≤ r`
3. Balance checks:
    * User token balance should cover their bid given their specified max exchange rate `balance(user) ≥ max_amount × r(base_price(current_block)+tip)`.
    * Paymaster STRK balance should cover user bid `balance(paymaster) ≥ max_amount × (base_price(current_block)+tip)`.

#### Block builder

A paymaster contract should be used only by those who trust its code. Such users know the paymaster's exchange policies, and therefore know which rates they should submit to pass, and which rates are too frugal and may cause `__validate_paymaster__` to fail. Hence, we consider it justified to "blame" users for failed `__validate_paymaster__` and to consequently charge them. Now arises a problematic scenario: the user may hold zero STRK and the paymaster rejected the request to cover its transaction fee. In this particular case we allow the sequencer to charge the transaction fee directly in the user's designated token.

In the naive example above, `__validate_paymaster__` will fail during block building if and only if `min_STRK/TOKEN_rate ≤ r ≤ 1.05 × oracle_rate`, meaning the user's rate was high enough to enter the client's mempool but too low for the paymaster.

Now the flow:

1. Balance checks:
    * User token balance should cover their bid given their specified max rate `balance(user) ≥ max_amount × r(base_price(current_block)+tip)`. If success, CONTINUE; else, REJECT.
    * Paymaster STRK balance should cover user bid `balance(paymaster) ≥ max_amount × (base_price(current_block)+tip)`. If success, CONTINUE; else, REJECT.
2. Run account `__validate__`. If success CONTINUE, else REJECT.
3. Run paymaster `__validate_paymaster__`. If success, CONTINUE; else, REVERT and skip to fee invocations below.
4. Run account `__execute__`. If success, CONTINUE; else, REVERT and skip to fee invocations below.
5. Fee invocations:
    * If failure was in `__validate_paymaster__`, user pays sequencer in designated fee token:
        * Burn `used_amount × r × base_price`.
        * Transfer `used_amount × r × tip`.
    * If failure was later:
        1. Paymaster pays transaction fee to sequencer:
            * Burn `used_amount × base_price`.
            * Transfer `used_amount × tip`.
        2. User pays paymaster: transfer `used_amount × r × (base_price(current_block)+tip)`.
    * In case of failure during fee invocations, REVERT all state changes and return to it directly (skipping `__validate_paymaster__` and `execute`). This ensures both user and paymaster have sufficient balances due to both balance checks.

### Optimization: discounted paymaster rates

In the above flow, the paymaster always charges at the user's max rate `r`. This encourages strategic "bidding" on the rate. It's better to allow paymaster contracts to charge users at a smaller rate than their submitted max rate. To this end, we allow `__validate_paymaster__` to output a `charging_rate` satisfying `charging_rate ≤ r`. If `__validate_paymaster__` executes successfully, the fee invocation will proceed with the user's max rate replaced by the paymaster's `charging_rate`.

### SDK and Wallet integration

For a truly seamless experience, wallets should:
1. Integrate with paymasters to support paymaster transactions.
2. Integrate with oracles to suggest accurate max rates.
3. Integrate the above into their UI, so an end user can choose a payment token and receive a suggested bid (rate included) to confirm in one click.

Behind the scenes, SDKs should also support sending paymasters transactions.

## Rationale

We submit that the above design facilitates simple and safe paymaster contracts providing the desired functionality of letting users pay transaction fees with arbitrary ERC-20 tokens.

## Drawbacks

1. A user who set their max rate in the range `min_STRK/TOKEN_rate ≤ r ≤ min_STRK/TOKEN_rate_accepted_by_paymaster` will experience a reverted `__validate_paymaster__` and pay for the reversion. As noted above, this is easily remedied by submitting high rates, especially for paymasters who charge at discounted rates.

2. The functionality of the proposed design is limited to ERC-20 tokens, and does not achieve any loftier goals of fee abstraction. Of course this is not a drawback compared to having no functionality at all.

3. Sequencers will need to actively (re)configure their setup to support new tokens and/or paymaster contracts. Hence, if some token/contract is sparsely adopted, associated paymaster transactions will only be sporadically included within blocks.

4. As with any protocol addition, the paymaster flow is another complication of Starknet. We think its benefits are worthwhile, and hope the drawback remains theoretical.

5. This proposal does not facilitate AMMs as paymasters: the fee invocation logic is fixed.

## Backwards Compatibility
This proposal is backward compatible as it merely proposes semantics for transactions with a non-empty `paymaster` field, which was hitherto unused.

## Security Considerations

If the sequencer's locally configured minimal rates are too low, it exposes itself to being potentially underpaid in case of failed `__validate_paymaster__`.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
