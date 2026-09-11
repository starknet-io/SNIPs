// Source of the SNIP-12 revision 2 test vectors. `node encoder.mjs generate` turns this into vectors.json.

const ACCOUNT = '0x1234';

const DOMAIN_TYPE = [
  { name: 'name', type: 'shortstring' },
  { name: 'version', type: 'shortstring' },
  { name: 'chainId', type: 'shortstring' },
  { name: 'revision', type: 'shortstring' },
];
const DOMAIN = { name: 'SNIP-12 Rev 2 Vectors', version: '1', chainId: 'SN_SEPOLIA', revision: '2' };

const doc = (types, primaryType, message, domain = DOMAIN, domainType = DOMAIN_TYPE) => ({
  types: { StarknetDomain: domainType, ...types },
  primaryType,
  domain,
  message,
});

const U128_MAX = '340282366920938463463374607431768211455';
const U256_MAX = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
const STR31 = 'abcdefghijklmnopqrstuvwxyz01234'; // 31 bytes
const STR32 = STR31 + '5'; // 32 bytes

const merkleTypes = {
  Session: [
    { name: 'Expires At', type: 'timestamp' },
    { name: 'Allowed Methods', type: 'merkletree', contains: 'Allowed Method' },
  ],
  'Allowed Method': [
    { name: 'Contract Address', type: 'ContractAddress' },
    { name: 'Selector', type: 'selector' },
  ],
};
const leaf = (addr, sel) => ({ 'Contract Address': addr, Selector: sel });
const leaves = [leaf('0x1', 'transfer'), leaf('0x2', 'approve'), leaf('0x3', 'mint'), leaf('0x4', 'burn'), leaf('0x5', 'swap')];

const enumTypes = {
  Payment: [
    { name: 'Payer', type: 'ContractAddress' },
    { name: 'Fee', type: 'Fee Mode' },
  ],
  'Fee Mode': [
    { name: 'No Fee', type: '()' },
    { name: 'Pay Fee', type: '(Fee Transfer)' },
    { name: 'Split', type: '(u128,u128*)' },
  ],
  'Fee Transfer': [
    { name: 'Fee Amount', type: 'TokenAmount' },
    { name: 'Fee Receiver', type: 'ContractAddress' },
  ],
  TokenAmount: [
    { name: 'token_address', type: 'ContractAddress' },
    { name: 'amount', type: 'u256' },
  ],
};

export const VALID = [
  {
    name: 'integers',
    description: 'Every integer basic type, including negative signed values (encoded as P + v) and timestamp (u64).',
    typed_data: doc(
      { Integers: [
        { name: 'a', type: 'u8' }, { name: 'b', type: 'u16' }, { name: 'c', type: 'u32' }, { name: 'd', type: 'u64' }, { name: 'e', type: 'u128' },
        { name: 'f', type: 'i8' }, { name: 'g', type: 'i16' }, { name: 'h', type: 'i32' }, { name: 'i', type: 'i64' }, { name: 'j', type: 'i128' },
        { name: 'k', type: 'timestamp' },
      ] },
      'Integers',
      { a: 255, b: 65535, c: '4294967295', d: '0xffffffffffffffff', e: U128_MAX, f: -128, g: '-1', h: 0, i: '-9223372036854775808', j: -1000, k: 1700000000 },
    ),
  },
  {
    name: 'felts-and-bool',
    description: 'felt, ContractAddress, ClassHash, bytes31 accept JSON numbers, decimal strings and 0x strings; bool is a JSON boolean.',
    typed_data: doc(
      { Felts: [
        { name: 'Felt Hex', type: 'felt' }, { name: 'Felt Dec', type: 'felt' }, { name: 'Felt Num', type: 'felt' },
        { name: 'Address', type: 'ContractAddress' }, { name: 'Class', type: 'ClassHash' }, { name: 'Bytes', type: 'bytes31' },
        { name: 'Yes', type: 'bool' }, { name: 'No', type: 'bool' },
      ] },
      'Felts',
      { 'Felt Hex': '0x1234', 'Felt Dec': '1000', 'Felt Num': 42, Address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', Class: '0x01', Bytes: '0x00ff', Yes: true, No: false },
    ),
  },
  {
    name: 'strings',
    description: 'shortstring is always the ASCII bytes ("2" encodes as 0x32); string is the Cairo ByteArray serialisation of the UTF-8 bytes, hashed.',
    typed_data: doc(
      { Strings: [
        { name: 'Short', type: 'shortstring' }, { name: 'Numeric Short', type: 'shortstring' }, { name: 'Empty Short', type: 'shortstring' },
        { name: 'Empty', type: 'string' }, { name: 'Hello', type: 'string' }, { name: 'Exactly 31', type: 'string' }, { name: 'Exactly 32', type: 'string' }, { name: 'Unicode', type: 'string' },
      ] },
      'Strings',
      { Short: 'hello', 'Numeric Short': '2', 'Empty Short': '', Empty: '', Hello: 'hello', 'Exactly 31': STR31, 'Exactly 32': STR32, Unicode: 'héllo wörld ✓' },
    ),
  },
  {
    name: 'selector',
    description: 'selector is always starknet_keccak of the entrypoint name.',
    typed_data: doc({ Call: [{ name: 'Selector', type: 'selector' }] }, 'Call', { Selector: 'transfer' }),
  },
  {
    name: 'u256',
    description: 'u256 is a basic type encoded as two felts (low, high) inside the parent hash input; the type string is just "u256".',
    typed_data: doc(
      { Amounts: [{ name: 'Small', type: 'u256' }, { name: 'Max', type: 'u256' }, { name: 'High Limb', type: 'u256' }, { name: 'List', type: 'u256*' }] },
      'Amounts',
      { Small: 1000, Max: U256_MAX, 'High Limb': '0x100000000000000000000000000000005', List: [1, '0x100000000000000000000000000000000', U256_MAX] },
    ),
  },
  {
    name: 'nested-structs-and-arrays',
    description: 'Struct references, arrays of structs, arrays of basic types, nested arrays and an empty array.',
    typed_data: doc(
      {
        Order: [{ name: 'Maker', type: 'ContractAddress' }, { name: 'Items', type: 'Item*' }, { name: 'Tags', type: 'shortstring*' }, { name: 'Matrix', type: 'u8**' }],
        Item: [{ name: 'Token', type: 'ContractAddress' }, { name: 'Amount', type: 'u256' }],
      },
      'Order',
      { Maker: '0xabc', Items: [{ Token: '0x1', Amount: 1 }, { Token: '0x2', Amount: U256_MAX }], Tags: [], Matrix: [[1, 2], [3], []] },
    ),
  },
  {
    name: 'enum-empty-variant',
    description: 'Enum referenced by name; variant with no parameters hashes as [type_hash, index].',
    typed_data: doc(enumTypes, 'Payment', { Payer: '0x1', Fee: { 'No Fee': [] } }),
  },
  {
    name: 'enum-struct-variant',
    description: 'Variant carrying a struct that itself contains u256 (flattened) and a nested struct dependency.',
    typed_data: doc(enumTypes, 'Payment', { Payer: '0x1', Fee: { 'Pay Fee': [{ 'Fee Amount': { token_address: '0x4', amount: '0x100000000000000000000000000000001' }, 'Fee Receiver': '0x5' }] } }),
  },
  {
    name: 'enum-tuple-variant',
    description: 'Variant with several parameters including an array.',
    typed_data: doc(enumTypes, 'Payment', { Payer: '0x1', Fee: { Split: [7, [1, 2, 3]] } }),
  },
  { name: 'merkletree-1-leaf', description: 'A single leaf is the root.', typed_data: doc(merkleTypes, 'Session', { 'Expires At': 1700000000, 'Allowed Methods': leaves.slice(0, 1) }) },
  { name: 'merkletree-2-leaves', description: 'Pair hashed commutatively with hash_array.', typed_data: doc(merkleTypes, 'Session', { 'Expires At': 1700000000, 'Allowed Methods': leaves.slice(0, 2) }) },
  { name: 'merkletree-3-leaves', description: 'Odd node is promoted unchanged.', typed_data: doc(merkleTypes, 'Session', { 'Expires At': 1700000000, 'Allowed Methods': leaves.slice(0, 3) }) },
  { name: 'merkletree-5-leaves', description: 'Two levels with promotion.', typed_data: doc(merkleTypes, 'Session', { 'Expires At': 1700000000, 'Allowed Methods': leaves }) },
  {
    name: 'merkletree-of-enums',
    description: 'Leaves may be enums.',
    typed_data: doc(
      {
        Policy: [{ name: 'Rules', type: 'merkletree', contains: 'Rule' }],
        Rule: [{ name: 'Allow', type: '(ContractAddress)' }, { name: 'Deny All', type: '()' }],
      },
      'Policy',
      { Rules: [{ Allow: ['0x1'] }, { 'Deny All': [] }, { Allow: ['0x2'] }] },
    ),
  },
  {
    name: 'single-variant-enum',
    description: 'A type whose only field type is parenthesised is a one-variant enum, not a tuple; nested in a struct it is valid.',
    typed_data: doc(
      { Wrapper: [{ name: 'pair', type: 'Pair' }], Pair: [{ name: 'Values', type: '(felt,u128)' }] },
      'Wrapper',
      { pair: { Values: [1, 2] } },
    ),
  },
  {
    name: 'domain-verifying-contract',
    description: 'Optional verifyingContract in the domain.',
    typed_data: doc({ Ping: [{ name: 'n', type: 'u8' }] }, 'Ping', { n: 1 }, { ...DOMAIN, verifyingContract: '0x0777' }, [...DOMAIN_TYPE, { name: 'verifyingContract', type: 'ContractAddress' }]),
  },
  {
    name: 'domain-salt',
    description: 'Optional salt in the domain.',
    typed_data: doc({ Ping: [{ name: 'n', type: 'u8' }] }, 'Ping', { n: 1 }, { ...DOMAIN, salt: '0x5a17' }, [...DOMAIN_TYPE, { name: 'salt', type: 'felt' }]),
  },
  {
    name: 'domain-verifying-contract-and-salt',
    description: 'Both optional domain fields, in the required order.',
    typed_data: doc({ Ping: [{ name: 'n', type: 'u8' }] }, 'Ping', { n: 1 }, { ...DOMAIN, verifyingContract: '0x0777', salt: '0x5a17' }, [...DOMAIN_TYPE, { name: 'verifyingContract', type: 'ContractAddress' }, { name: 'salt', type: 'felt' }]),
  },
];

const ping = (over = {}) => doc({ Ping: [{ name: 'n', type: 'u8' }] }, 'Ping', { n: 1 }, { ...DOMAIN, ...over });

export const INVALID = [
  { name: 'revision-as-number', reason: 'revision must be the JSON string "2"', typed_data: ping({ revision: 2 }) },
  { name: 'revision-1-document', reason: 'a revision 1 document is not a revision 2 document', typed_data: ping({ revision: '1' }) },
  { name: 'domain-extra-field', reason: 'domain object has a field the domain type does not declare', typed_data: ping({ extra: 1 }) },
  { name: 'domain-chain_id-key', reason: 'legacy chain_id key', typed_data: (() => { const d = ping(); delete d.domain.chainId; d.domain.chain_id = 'SN_SEPOLIA'; return d; })() },
  { name: 'domain-fields-reordered', reason: 'domain type fields must be in the specified order', typed_data: (() => { const d = ping(); d.types.StarknetDomain = [DOMAIN_TYPE[0], DOMAIN_TYPE[2], DOMAIN_TYPE[1], DOMAIN_TYPE[3]]; return d; })() },
  { name: 'domain-optional-out-of-order', reason: 'salt must come after verifyingContract', typed_data: doc({ Ping: [{ name: 'n', type: 'u8' }] }, 'Ping', { n: 1 }, { ...DOMAIN, salt: '0x1', verifyingContract: '0x2' }, [...DOMAIN_TYPE, { name: 'salt', type: 'felt' }, { name: 'verifyingContract', type: 'ContractAddress' }]) },
  { name: 'primary-type-is-domain', reason: 'primaryType cannot be StarknetDomain', typed_data: (() => { const d = ping(); d.primaryType = 'StarknetDomain'; d.message = d.domain; return d; })() },
  { name: 'unknown-type', reason: 'field type is neither basic nor declared', typed_data: doc({ Ping: [{ name: 'n', type: 'uint256' }] }, 'Ping', { n: 1 }) },
  { name: 'dangling-type', reason: 'declared type not reachable from primaryType', typed_data: doc({ Ping: [{ name: 'n', type: 'u8' }], Unused: [{ name: 'x', type: 'u8' }] }, 'Ping', { n: 1 }) },
  { name: 'recursive-type', reason: 'recursive type definitions are not allowed', typed_data: doc({ Node: [{ name: 'children', type: 'Node*' }] }, 'Node', { children: [] }) },
  { name: 'message-undeclared-field', reason: 'message has a field the type does not declare', typed_data: (() => { const d = ping(); d.message.extra = 2; return d; })() },
  { name: 'message-missing-field', reason: 'message lacks a declared field', typed_data: (() => { const d = ping(); d.message = {}; return d; })() },
  { name: 'u8-out-of-range', reason: 'value exceeds the type range', typed_data: (() => { const d = ping(); d.message.n = 256; return d; })() },
  { name: 'u64-negative', reason: 'unsigned type given a negative value', typed_data: doc({ T: [{ name: 'n', type: 'u64' }] }, 'T', { n: -1 }) },
  { name: 'i8-out-of-range', reason: 'signed value below the type range', typed_data: doc({ T: [{ name: 'n', type: 'i8' }] }, 'T', { n: -129 }) },
  { name: 'felt-at-prime', reason: 'felt must be below the field prime', typed_data: doc({ T: [{ name: 'n', type: 'felt' }] }, 'T', { n: '0x800000000000011000000000000000000000000000000000000000000000001' }) },
  { name: 'address-above-bound', reason: 'ContractAddress must be below 2^251', typed_data: doc({ T: [{ name: 'a', type: 'ContractAddress' }] }, 'T', { a: '0x800000000000000000000000000000000000000000000000000000000000000' }) },
  { name: 'selector-hex', reason: 'selector values must be entrypoint names, never hashes', typed_data: doc({ T: [{ name: 's', type: 'selector' }] }, 'T', { s: '0x1' }) },
  { name: 'selector-invalid-identifier', reason: 'selector must be a Cairo identifier', typed_data: doc({ T: [{ name: 's', type: 'selector' }] }, 'T', { s: 'trans fer' }) },
  { name: 'shortstring-too-long', reason: 'shortstring longer than 31 bytes', typed_data: doc({ T: [{ name: 's', type: 'shortstring' }] }, 'T', { s: STR32 }) },
  { name: 'shortstring-non-ascii', reason: 'shortstring must be printable ASCII', typed_data: doc({ T: [{ name: 's', type: 'shortstring' }] }, 'T', { s: 'héllo' }) },
  { name: 'shortstring-as-number', reason: 'shortstring values must be JSON strings', typed_data: doc({ T: [{ name: 's', type: 'shortstring' }] }, 'T', { s: 2 }) },
  { name: 'bool-as-string', reason: 'bool must be a JSON boolean', typed_data: doc({ T: [{ name: 'b', type: 'bool' }] }, 'T', { b: 'true' }) },
  { name: 'reserved-type-name', reason: 'user types cannot use a basic type name', typed_data: doc({ u256: [{ name: 'low', type: 'u128' }], T: [{ name: 'a', type: 'u256' }] }, 'T', { a: { low: 1 } }) },
  { name: 'tuple-as-primary-type', reason: 'an all-parenthesised type is an enum, and primaryType must be a struct', typed_data: doc({ T: [{ name: 'n', type: '(felt,u128)' }] }, 'T', { n: [1, 2] }) },
  { name: 'tuple-next-to-struct-field', reason: 'a type mixes struct fields and enum variants', typed_data: doc({ T: [{ name: 'n', type: '(felt,u128)' }, { name: 'm', type: 'u8' }] }, 'T', { n: [1, 2], m: 1 }) },
  { name: 'enum-as-primary-type', reason: 'primaryType must be a struct', typed_data: doc(enumTypes, 'Fee Mode', { 'No Fee': [] }) },
  { name: 'contains-on-non-merkletree', reason: '"contains" is only allowed on merkletree fields', typed_data: doc({ P: [{ name: 'n', type: 'u8', contains: 'NoSuchType' }] }, 'P', { n: 1 }) },
  { name: 'duplicate-field-name', reason: 'field names within a type must be unique', typed_data: doc({ T: [{ name: 'a', type: 'u8' }, { name: 'a', type: 'u8' }] }, 'T', { a: 1 }) },
  { name: 'name-with-quote', reason: 'names cannot contain the double quote character', typed_data: doc({ T: [{ name: 'a"b', type: 'u8' }] }, 'T', { 'a"b': 1 }) },
  { name: 'name-with-colon', reason: 'names cannot contain the colon character', typed_data: doc({ T: [{ name: 'a:b', type: 'u8' }] }, 'T', { 'a:b': 1 }) },
  { name: 'name-trailing-space', reason: 'names cannot start or end with whitespace', typed_data: doc({ T: [{ name: 'a ', type: 'u8' }] }, 'T', { 'a ': 1 }) },
  { name: 'type-name-with-star', reason: 'type names cannot end with *', typed_data: doc({ 'T*': [{ name: 'a', type: 'u8' }] }, 'T*', { a: 1 }) },
  { name: 'enum-two-keys', reason: 'an enum value has exactly one variant key', typed_data: doc(enumTypes, 'Payment', { Payer: '0x1', Fee: { 'No Fee': [], Split: [1, []] } }) },
  { name: 'enum-unknown-variant', reason: 'variant not declared', typed_data: doc(enumTypes, 'Payment', { Payer: '0x1', Fee: { Free: [] } }) },
  { name: 'enum-param-count', reason: 'variant parameters must match the declaration', typed_data: doc(enumTypes, 'Payment', { Payer: '0x1', Fee: { Split: [1] } }) },
  { name: 'enum-with-contains', reason: 'revision 2 references enums by name; the "enum" pseudo-type is gone', typed_data: doc({ ...enumTypes, Payment: [{ name: 'Payer', type: 'ContractAddress' }, { name: 'Fee', type: 'enum', contains: 'Fee Mode' }] }, 'Payment', { Payer: '0x1', Fee: { 'No Fee': [] } }) },
  { name: 'merkletree-missing-contains', reason: 'merkletree fields must name their leaf type', typed_data: doc({ T: [{ name: 'm', type: 'merkletree' }], L: [{ name: 'x', type: 'u8' }] }, 'T', { m: [{ x: 1 }] }) },
  { name: 'merkletree-empty', reason: 'a merkletree must have at least one leaf', typed_data: doc(merkleTypes, 'Session', { 'Expires At': 1, 'Allowed Methods': [] }) },
  { name: 'merkletree-basic-leaf', reason: 'leaves must be user-defined structs or enums', typed_data: doc({ T: [{ name: 'm', type: 'merkletree', contains: 'u8' }] }, 'T', { m: [1, 2] }) },
  { name: 'array-given-scalar', reason: 'array-typed field given a scalar', typed_data: doc({ T: [{ name: 'a', type: 'u8*' }] }, 'T', { a: 1 }) },
  { name: 'struct-given-array', reason: 'struct-typed field given an array', typed_data: doc({ T: [{ name: 'i', type: 'Item' }], Item: [{ name: 'x', type: 'u8' }] }, 'T', { i: [1] }) },
];

export function buildVectors(describe, messageHash) {
  const vectors = VALID.map((v) => ({ ...v, expected: describe(v.typed_data, ACCOUNT) }));
  for (const v of INVALID) {
    let threw = false;
    try { messageHash(v.typed_data, ACCOUNT); } catch { threw = true; }
    if (!threw) throw new Error(`invalid vector was accepted: ${v.name}`);
  }
  return {
    snip: 12,
    revision: '2',
    status: 'draft',
    generated_by: 'assets/snip-12/rev2/encoder.mjs',
    account: ACCOUNT,
    notes: [
      'message_hash = hash_array(["StarkNet Message", domain_hash, account, struct_hash]) with hash_array = Poseidon (poseidon_hash_span).',
      'All hex values are 0x-prefixed field elements without zero padding.',
      'Every document under "invalid" MUST be rejected by a conforming implementation; "reason" names the rule.',
    ],
    vectors,
    invalid: INVALID,
  };
}
