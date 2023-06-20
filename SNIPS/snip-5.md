---
snip: 5
title: Standard Interface Detection
author: Eric Nordelo <eric.nordelo39@gmail.com>
status: Draft
type: Standards Track
category: SRC
created: 2023-05-29
---

## Simple Summary

A standard method to publish and detect what interfaces a smart contract implements.
Inspired by [ERC-165](https://eips.ethereum.org/EIPS/eip-165).

## Abstract

This standardizes:

1. How interfaces are identified.
2. How a contract will publish the interfaces it implements.
3. How to detect if a contract implements SRC-5.
4. How to detect if a contract implements any given interface.


## Motivation

For some "standard interfaces" like the ERC-721 token interface, it is sometimes useful to query whether a contract supports the interface and if yes, which version of the interface, to adapt how the contract is to be interacted with. This proposal standardizes the concept of interfaces and standardizes the identification (naming) of interfaces.

## Specification

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### Serialization Compatibility

One of the objectives of this standard is to ensure that all the contracts which state they implement a given interface, will behave in a similar expected way for callers. In Cairo, the language doesn't enforce an encoding format for Structs and Enums, needing the developers to implement a Serde trait on these types when they are part of an external function signature, and different implementations may lead to incompatibility between contracts exposing the same interface.

We define that, to be compliant with this standard, Structs and Enums used as parameters, or return types of external functions SHOULD implement the default format given from the `[#derive(Serde)]` attribute, which is: the concatenation of the serialized fields for Structs, and the concatenation of a felt252 acting as a variant identifier and the serialized value for Enums. Other types MUST use the serialization format specified in the language core library.

### Interface

An interface is a set of function signatures with concrete type parameters, usually represented by a `trait`. These are meant to be implemented as `external` by contracts complying with such interface. For example:

```cairo
trait IMyContract {
    fn foo(some: u256) -> felt252;
}
```

#### Generic Types

Since Cairo 2.0 we can define traits leveraging generic types to represent a set of interfaces:

```cairo
#[starknet::interface]
trait IMyContract<TContractState, TNumber> {
    fn foo(self: @TContractState, some: TNumber) -> felt252;
}
```

Because these traits don't represent actual interfaces but categories, they're not covered by this standard. SRC-5 interfaces contain only concrete types since no generic type inputs are allowed in smart contract external methods.

### Extended Function Selector

In Starknet, a function selector is the `starknet_keccak` of the function name (ASCII encoded). For this standard we define the Extended Function Selector as the `starknet_keccak` of the function signature, having this signature the following format:

```
fn_name(param1_type,param2_type,...)->output_type
```

Where `fn_name` is the function name, `paramN_type` is the type of the n-th function parameter, and `output_type` is the type of the returned value.

Types are those defined as such in the corelib (ex: `type felt252`). Tuples, Structs, and Enums are treated as special types. For example, `u256` is represented as `(u128,u128)`, being `u128` a type, and `u256` a Struct.

### Special Types (Tuples, Structs, and Enums)

A definition of how to provide these parameters to the signature for getting the [Extended Function Selector](#extended-function-selector):

#### Tuples

The signature for a tuple of `n` elements is: `(elem1_type,elem2_type,...)`, where `elemN_type` is the type of the n-th tuple member.

#### Structs

The signature for a struct having `n` fields is: `(field1_type,field2_type,...)`, where `fieldN_type` is the type of the n-th struct field.

#### Enums

The signature for an enum having `n` fields is: `E(variant1_type,variant2_type,...)`, where `variantN_type` is the type of the n-th enum variant.

The leading `E` avoid clashes with similar signatures using tuples or structs.

### Examples

1. From the Cairo function:

```cairo
#[derive(Drop, Serde)]
enum MyEnum {
    FirstVariant: (felt252, u256),
    SecondVariant: Array<u128>,
}

#[derive(Drop, Serde)]
struct MyStruct {
    field1: MyEnum,
    field2: felt252,
}

fn foo(param1: @MyEnum, param2: MyStruct) -> bool;
```

The signature is:

```cairo
foo(@E((felt252,(u128,u128)),Array<u128>),(E((felt252,(u128,u128)),Array<u128>),felt252))->E((),())
```

### How Interfaces are Identified

For this standard, we define the interface identifier as the XOR of all [Extended Function Selectors](#extended-function-selector) in the [Interface](#interface). This code example shows how to calculate an interface identifier:

From this Cairo interface:

```cairo
struct Call {
    to: ContractAddress,
    selector: felt252,
    calldata: Array<felt252>
}

trait IAccount {
    fn supports_interface(felt252) -> bool;
    fn is_valid_signature(felt252, Array<felt252>) -> bool;
    fn __execute__(Array<Call>) -> Array<Span<felt252>>;
    fn __validate__(Array<Call>) -> felt252;
    fn __validate_declare__(felt252) -> felt252;
}
```

This is the Python code that computes the interface id:

```python
# pip install cairo-lang
from starkware.starknet.public.abi import starknet_keccak

# These are the public interface function signatures
extended_function_selector_signatures_list = [
    'supports_interface(felt252)->E((),())',
    'is_valid_signature(felt252,Array<felt252>)->E((),())',
    '__execute__(Array<(ContractAddress,felt252,Array<felt252>)>)->Array<(@Array<felt252>)>',
    '__validate__(Array<(ContractAddress,felt252,Array<felt252>)>)->felt252',
    '__validate_declare__(felt252)->felt252'
]

def main():
    interface_id = 0x0
    for function_signature in extended_function_selector_signatures_list:
        function_id = starknet_keccak(function_signature.encode())
        interface_id ^= function_id
    print('IAccount ID:')
    print(hex(interface_id))


if __name__ == "__main__":
    main()
```

### How a Contract will Publish the Interfaces it Implements

A contract that is compliant with SRC-5 shall implement the following interface (referred to as `ISRC5.sol`):

```cairo
trait ISRC5 {
    /// @notice Query if a contract implements an interface
    /// @param interface_id The interface identifier, as specified in SRC-5
    /// @return `true` if the contract implements `interface_id`, `false` otherwise
    fn supports_interface(interface_id: felt252) -> bool;
}
```

The interface identifier for this interface is `0x3f918d17e5ee77373b56385708f855659a07f75997f365cf87748628532a055`. You can calculate this by running `starknet_keccak('supports_interface(felt252)->E((),())')`.

Therefore the implementing contract will have a `supports_interface` function that returns:

- `true` when `interface_id` is `0x3f918d17e5ee77373b56385708f855659a07f75997f365cf87748628532a055` (SNIP-5 interface)
- `true` for any other `interface_id` this contract implements
- `false` for any other `interface_id`

This function must return a bool.

### How to Detect if a Contract Implements SRC-5

1. The source contract makes a `call_contract_syscall` to the destination address with `entrypoint_selector` as: `0xfe80f537b66d12a00b6d3c072b44afbb716e78dde5c3f0ef116ee93d3e3283` and calldata as a one element Span containing: `0x3f918d17e5ee77373b56385708f855659a07f75997f365cf87748628532a055`. This corresponds to `contract.supports_interface(0x3f918d17e5ee77373b56385708f855659a07f75997f365cf87748628532a055)`.
2. If the call fails or returns false, the destination contract does not implement SRC-5.
5. Otherwise it implements SRC-5.

### How to Detect if a Contract Implements any Given Interface

1. If you are not sure if the contract implements SRC-5, use the above procedure to confirm.
2. If it does not implement it, then you will have to see what methods it uses the old-fashioned way.
3. If it does implement it, call `supports_interface(interface_id)` to determine if it implements an interface you can use.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
