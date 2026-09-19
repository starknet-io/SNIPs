# SNIP-12 revision 2: reference encoder and test vectors (draft)

- `vectors.json`: valid documents with their `encode_type` strings, type hashes, domain hash, struct hash and message hash for the account `0x1234`, plus documents that MUST be rejected and the rule each violates.
- `encoder.mjs`: reference encoder implementing the Revision 2 section of `SNIPS/snip-12.md` rule by rule. It uses starknet.js only for Poseidon and `starknet_keccak`.
- `vectors-src.mjs`: the documents from which `vectors.json` is generated.

```bash
npm install
npm run verify      # recompute every vector and compare
npm run generate    # regenerate vectors.json after changing vectors-src.mjs
node encoder.mjs hash some-typed-data.json 0x1234
```

To check another implementation, feed it each `typed_data` under `vectors` with the `account` and compare against `expected`, then confirm it rejects every entry under `invalid`.
