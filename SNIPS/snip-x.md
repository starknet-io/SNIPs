---
snip: $SNIP_ID
title: Include the state-diff commitment in the blockhash
author: Rian <rian@nethermind.io>
status: Draft
type: Core
created: 13-12-2023
---

## Simple Summary
Include the L2 state-diff in the block hash.

## Motivation
The motivation for this SNIP is multifold:
1. Make state-diff verification cheaper.
2. Allow nodes to sync state using L2 state-diffs at the level of L1 security (up to the last L1 commitment).
3. Allow nodes to store state without needing a state trie, allowing for more efficient state storage.

## Overview

Currently, state-diffs are not directly committed to in the blockhash. To verify an L2-state-diff, each node must 
1) maintain a state trie, 
2) apply the state-diff to the trie, and 
3) recalculate and verify the globalStateRoot every time.

However, if blocks include the L2-state-diff commitment in the blockhash, users can verify the state-diff simply by recalculating the state-diff commitment and verifying it against the blockhash. Note that this doesn’t require recalculating the globalStateRoot; therefore, nodes won’t need to maintain an expensive state trie. This feature in particular could be very useful for light clients. Further, nodes could store the state in whatever format they choose, allowing for much more efficient storage. Finally, because L2-state-diffs are periodically finalized on L1, nodes maintain L1 security of L2 state, right up until the previous L2→L1 commitment.

This SNIP only requires minimal technical changes to the protocol, namely the current blockHash would need to be updated to:

```go
PedersenHash(block number, global state root, sequencer address, block timestamp, number of transactions, transaction commitment, number of events, event commitment, zero, zero, parent block hash, **state-diff-commitment**)
```

We are excited by the tremendous benefits that this SNIP provides with such a small change, and look forward to discussing this further with the community.

## History

This SNIP is inspired by the proposal on the [community forums](https://community.starknet.io/t/snip-include-the-state-diff-commitment-in-the-blockhash/109599).

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
