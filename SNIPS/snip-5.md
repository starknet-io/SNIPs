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
3. How to detect if a contract implements SRC-165.
4. How to detect if a contract implements any given interface.


## Motivation

For some "standard interfaces" like the ERC-721 token interface, it is sometimes useful to query whether a contract supports the interface and if yes, which version of the interface, to adapt how the contract is to be interacted with. This proposal standardizes the concept of interfaces and standardizes the identification (naming) of interfaces.

## Specification

### Extended Function Selector

In Starknet, a function selector is the `starknet_keccak` of the function name (ASCII encoded). For this standard we define the extended function selector as the `starknet_keccak` of the function signature, having this signature the following format:

```
fn_name(param1_type,param2_type,...)
```

Where `fn_name` is the function name, and `paramN_type` is the type of the n-th function parameter. Next, we will define how to treat complex types for this signature definition.

### Special types (Tuples, Structs, Enums, and Generics)

We define how to provide these parameters to the signature for getting the extended function selector:

#### Tuples

The signature for a tuple of `n` elements is: `(elem1_type,elem2_type,...)`, where `elemN_type` is the type of the n-th tuple member.

#### Structs

The signature for a struct having `n` fields is: `S(field1_type,field2_type,...)`, where `fieldN_type` is the type of the n-th struct field.

The leading `S` avoid clashes with similar signatures using tuples.

#### Enums

The signature for an enum having `n` fields is: `E(variant1_type,variant2_type,...)`, where `variantN_type` is the type of the n-th enum variant.

The leading `E` avoid clashes with similar signatures using tuples or structs.

#### Generics

The signature for a generic argument required to implement `n` traits is: `{trait1_name,trait2_name,...}`, where `traitN_name` is the type of the n-th trait required from the function signature in the same specified order.

#### Examples

1. From the Cairo function:

```cairo
fn foo<T, impl TDrop: Drop<T>>(param1: Array<T>) -> bool;
```

The signature is:

```cairo
foo(Array<{Drop}>)
```

2. From the Cairo function:

```cairo
enum MyEnum<T> {
    FirstVariant: (felt252, u32),
    SecondVariant: Array<T>,
}

impl MyEnumDrop<T, impl TDrop: Drop<T>> of Drop<MyEnum<T>>;

struct MyStruct<T, E> {
    field1: MyEnum<T>,
    field2: E,
}

impl MyStructDrop<T, E, impl TDrop: Drop<T>, impl EDrop: Drop<E>> of Drop<MyStruct<T, E>>;

fn foo<T, E, impl TDrop: Drop<T>, impl EDrop: Drop<E>>(
    param1: MyEnum<T>, param2: MyStruct<T, E>
) -> bool {
    return true;
}
```

The signature is:

```cairo
foo(E((felt252,u32),Array<{Drop}>),S(E((felt252,u32),Array<{Drop}>),{Drop}));
```

### How Interfaces are Identified

For this standard, an *interface* is a set of [extended function selectors](#extended-function-selector-efns).

We define the interface identifier as the XOR of all extended function selectors in the interface. This code example shows how to calculate an interface identifier:

From this Cairo interface:

```cairo
struct Call {
    to: ContractAddress,
    selector: felt252,
    calldata: Array<felt252>
}

trait IAccount {
    fn supports_interface(felt252);
    fn is_valid_signature(felt252, Array<felt252>);
    fn __execute__(Array<Call>);
    fn __validate__(Array<Call>);
    fn __validate_declare__(felt252);
}
```

This is the python code that computes the interface id:

```python
# pip install cairo-lang
from starkware.starknet.public.abi import starknet_keccak

# This is the interface
extended_function_selector_list = [
    'supports_interface(felt252)',
    'is_valid_signature(felt252,Array<felt252>)',
    '__execute__(Array<(ContractAddress,felt252,Array<felt252>)>)',
    '__validate__(Array<(ContractAddress,felt252,Array<felt252>)>)',
    '__validate_declare__(felt252)'
]

def main():
    interface_id = 0x0
    for function in extended_function_selector_list:
        function_id = starknet_keccak(function.encode())
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

The interface identifier for this interface is `0x1ba86cc668fafde77705c7bfcafa3ee47934b5631ff0e32841dcdcd4e100a60`. You can calculate this by running `starknet_keccak('supports_interface(felt252)')`.

Therefore the implementing contract will have a `supports_interface` function that returns:

- `true` when `interface_id` is `0x1ba86cc668fafde77705c7bfcafa3ee47934b5631ff0e32841dcdcd4e100a60` (SNIP-5 interface)
- `true` for any other `interface_id` this contract implements
- `false` for any other `interface_id`

This function must return a bool.

### How to Detect if a Contract Implements SRC-5

1. The source contract makes a `call_contract_syscall` to the destination address with `entrypoint_selector` as: `0xfe80f537b66d12a00b6d3c072b44afbb716e78dde5c3f0ef116ee93d3e3283` and calldata as a one element Span containing: `0x1ba86cc668fafde77705c7bfcafa3ee47934b5631ff0e32841dcdcd4e100a60`. This corresponds to `contract.supports_interface(0x1ba86cc668fafde77705c7bfcafa3ee47934b5631ff0e32841dcdcd4e100a60)`.
2. If the call fails or returns false, the destination contract does not implement SRC-5.
5. Otherwise it implements SRC-5.

### How to Detect if a Contract Implements any Given Interface

1. If you are not sure if the contract implements SRC-5, use the above procedure to confirm.
2. If it does not implement it, then you will have to see what methods it uses the old-fashioned way.
3. If it does implement it, call `supports_interface(interface_id)` to determine if it implements an interface you can use.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
