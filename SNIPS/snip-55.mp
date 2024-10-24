---
snip: 55
title: Mixed-case checksum address encoding
author: Clément Walter <clement@kakarot.org>
discussions-to: https://community.starknet.io/t/snip-55-mixed-case-checksum-address-encoding/114949
type: Standards Track
category: SRC
status: Discussion
created: 2024-10-24
---

# Specification

Code:

``` python
from starkware.starknet.public.abi import starknet_keccak

def checksum_encode(addr: int): # Takes a 32-byte binary address as input
    addr_bytes = int.to_bytes(addr, 32, "big")
    hex_addr = addr_bytes.hex()
    checksummed_buffer = ""

    # Treat the hex address as ascii/utf-8 for hashing
    hashed_address = f"{starknet_keccak(addr_bytes):064x}"

    # Iterate over each character in the hex address
    for nibble_index, character in enumerate(hex_addr):

        if character in "0123456789":
            # We can't upper-case the decimal digits
            checksummed_buffer += character
        elif character in "abcdef":
            # Check if the corresponding hex digit (nibble) in the hash is 8 or higher
            hashed_address_nibble = int(hashed_address[nibble_index], 16)
            if hashed_address_nibble > 7:
                checksummed_buffer += character.upper()
            else:
                checksummed_buffer += character
        else:
            raise eth_utils.ValidationError(
                f"Unrecognized hex character {character!r} at position {nibble_index}"
            )

    return "0x" + checksummed_buffer

checksum_encode(0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7)
# '0x049D36570D4e46f48e99674bd3fcc84644DdD6b96F7C741B1562B82f9e004dC7'
```

In English, convert the address to hex, but if the `i`th digit is a letter (ie. it's one of `abcdef`) print it in uppercase if the `4*i`th bit of the hash of the lowercase hexadecimal address is 1 otherwise print it in lowercase.

# Rationale

Benefits:
- Enfore addresses to be represented as 32-bytes hex strings
- Reduce the probability of mistyped addresses
- Remove the risk to mix EVM and Starknet addresses

See also https://github.com/ethereum/ERCs/blob/master/ERCS/erc-55.md where this SNIP and code snippet is mainly taken from.
