# Simple summary
A syscall to access current and historical L1 block hashes, removing the need for using the messaging bridge.

# Abstract
This proposal describes how with minimal changes to the rollup contraction smart contracts on starknet can get access to arbitrary L1 block hashes making e.g. the verification of storage proofs almost instant.

# Motivation
As of today storage proof solutions such as e.g. [Herodotus](https://herodotus.dev/) have latency in accessing historical L1 data on Starknet mostly because of the latency coming from the native messaging system.
The latency comes from the necessity of sending a block hash from L1 to Starknet in order to verify a proof against it.
Nowadays this latency is around 5 minutes which is a significant amount of time in these workflows that prove the access to recent data.

# Specification
Add a new syscall get_l1_block_hash.

### Syntax
```
extern fn get_l1_block_hash_syscall(
    l1_block_number: u64
) -> SyscallResult<u256> implicits(GasBuiltin, System) nopanic;
```
### Description
Gets the hash of a specific L1 block within the range of `[0, current_l1_block - reorg_safe_threshold]`.

### Arguments
block_number u64 The number of the L1 block whose hash you want to get.

### Return values
The hash of the specified L1 block.

### Common library
`syscalls.cairo`

### Error messages
Block number out of range → l1_block_number is greater than current_l1_block - reorg_safe_threshold.

# Implementation
The implementation of this proposal would require changes to both the L1 contracts that allow Starknet to settle as well as the StarknetOS itself.

### Historical block hash accumulator
Part of the work done by Herodotus is maintaining the historical block hash accumulator described [here](https://docs.herodotus.dev/herodotus-docs/protocol-design/historical-block-hash-accumulator) generated in collaboration with Starkware during [this](https://starkware.co/resource/proving-ethereums-state-on-starknet-with-herodotus/) event.

This accumulator lives on L1 and allows L1 smart contracts to arbitrary block hashes from the past.

### OS carried outputs
Currently the starknetOS implements a structure called `OsCarriedOutputs` defined [here](https://github.com/starkware-libs/cairo-lang/blob/efa9648f57568aad8f8a13fbf027d2de7c63c2c0/src/starkware/starknet/core/os/output.cairo#L57C8-L57C24).
The implementation of this SNIP would require introducing a new property to it called `accessed_l1_block_hashes.`

### Block header structure
It would also most likely require adding a field to the block header specifying which root of the MMR has been used to verify inclusion proofs for the accessed l1 block hashes.

### MMR inclusion proofs
Once a MMR root is available on L1 it can be passed as a “public” input to the OS through the L1 verifier contract, such that within the OS inclusion proofs can be verified in order to authenticate any sequencer response to a syscall invocation.

### Loading the MMR root to the verifier contract
In order to make the syscall sound despite the proof verification within the StarknetOS, also ensuring that the root used for the verification is valid.
This should be done in [this](https://github.com/starkware-libs/cairo-lang/blob/efa9648f57568aad8f8a13fbf027d2de7c63c2c0/src/starkware/starknet/solidity/Starknet.sol#L301) part of the verifier.
A new function should be added to the library [OnchainDataFactTreeEncoder](https://github.com/starkware-libs/cairo-lang/blob/efa9648f57568aad8f8a13fbf027d2de7c63c2c0/src/starkware/solidity/components/OnchainDataFactTreeEncoder.sol) such that it takes a root retrieving by calling [this](https://github.com/HerodotusDev/offchain-evm-headers-processor/blob/b64bf032e165b8690f5815733d70bdf5a9bb60f1/solidity-verifier/src/SharpFactsAggregator.sol#L450) getter.
