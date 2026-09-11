// SNIP-12 revision 2 reference encoder (draft).
//
// This file exists to make the revision 2 text executable: it implements the
// rules exactly as written in SNIPS/snip-12.md ("Revision 2") and is used to
// generate and verify assets/snip-12/rev2/vectors.json.
//
// It is NOT a production library. It depends on starknet.js only for the
// cryptographic primitives (Poseidon, starknet_keccak); every SNIP-12 rule is
// implemented here so that the spec, not a library, is the reference.
//
//   node encoder.mjs generate > vectors.json
//   node encoder.mjs verify vectors.json
//   node encoder.mjs hash typed_data.json <account>

import { readFileSync } from 'node:fs';
import { hash as snHash } from 'starknet';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const PRIME = 2n ** 251n + 17n * 2n ** 192n + 1n;
const ADDRESS_BOUND = 2n ** 251n;
export const PREFIX_MESSAGE = 'StarkNet Message';
export const REVISION = '2';

const toHex = (x) => '0x' + BigInt(x).toString(16);

/** hash_array: Poseidon over a sequence of felts (Cairo `poseidon_hash_span`). */
export function hashArray(felts) {
  return BigInt(snHash.computePoseidonHashOnElements(felts.map((f) => BigInt(f))));
}

/** type_hash = starknet_keccak(encode_type) */
export function starknetKeccak(str) {
  return BigInt(snHash.starknetKeccak(str));
}

/** Encode an ASCII string of at most 31 bytes as a felt (big-endian bytes). */
export function shortStringToFelt(s) {
  if (s.length > 31) throw new Error(`shortstring longer than 31 bytes: ${JSON.stringify(s)}`);
  let v = 0n;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c < 0x20 || c > 0x7e) throw new Error(`shortstring must be printable ASCII: ${JSON.stringify(s)}`);
    v = (v << 8n) | BigInt(c);
  }
  return v;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const UNSIGNED = { u8: 8n, u16: 16n, u32: 32n, u64: 64n, u128: 128n, timestamp: 64n };
const SIGNED = { i8: 8n, i16: 16n, i32: 32n, i64: 64n, i128: 128n };

export const BASIC_TYPES = new Set([
  'felt', 'bool', 'string', 'shortstring', 'selector', 'merkletree',
  'ContractAddress', 'ClassHash', 'bytes31', 'u256',
  ...Object.keys(UNSIGNED), ...Object.keys(SIGNED),
]);

export const DOMAIN_TYPE = 'StarknetDomain';
const DOMAIN_REQUIRED = [
  { name: 'name', type: 'shortstring' },
  { name: 'version', type: 'shortstring' },
  { name: 'chainId', type: 'shortstring' },
  { name: 'revision', type: 'shortstring' },
];
const DOMAIN_OPTIONAL = [
  { name: 'verifyingContract', type: 'ContractAddress' },
  { name: 'salt', type: 'felt' },
];

const FORBIDDEN_NAME_CHARS = new Set(['"', '\\', '(', ')', ',', ':', '*']);

function checkName(name, what) {
  if (typeof name !== 'string' || name.length === 0) throw new Error(`${what}: empty name`);
  if (name !== name.trim()) throw new Error(`${what}: name has leading or trailing whitespace: ${JSON.stringify(name)}`);
  for (const ch of name) {
    const c = ch.codePointAt(0);
    if (c < 0x20 || c > 0x7e || FORBIDDEN_NAME_CHARS.has(ch)) {
      throw new Error(`${what}: character not allowed in name: ${JSON.stringify(name)}`);
    }
  }
}

/** escape(name): revision 2 restricts names so that escaping is quoting. */
export function escapeName(name) {
  return `"${name}"`;
}

function stripArray(type) {
  let t = type;
  let depth = 0;
  while (t.endsWith('*')) { t = t.slice(0, -1); depth += 1; }
  return { base: t, depth };
}

function isEnumDefinition(def) {
  return def.length > 0 && def.every((f) => f.type.startsWith('(') && f.type.endsWith(')'));
}

function variantParams(type) {
  const inner = type.slice(1, -1).trim();
  if (inner === '') return [];
  return inner.split(',').map((s) => s.trim());
}

// ---------------------------------------------------------------------------
// Structural validation (the "MUST reject" list of the spec)
// ---------------------------------------------------------------------------

export function validateTypedData(td) {
  if (typeof td !== 'object' || td === null) throw new Error('typed data must be an object');
  const { types, primaryType, domain, message } = td;
  if (typeof types !== 'object' || types === null) throw new Error('missing types');
  if (typeof primaryType !== 'string') throw new Error('missing primaryType');
  if (typeof domain !== 'object' || domain === null) throw new Error('missing domain');
  if (typeof message !== 'object' || message === null) throw new Error('missing message');

  // Revision gate.
  if (domain.revision !== REVISION) throw new Error(`unsupported revision: ${JSON.stringify(domain.revision)}`);

  // Domain definition must be one of the allowed shapes, in order.
  const domDef = types[DOMAIN_TYPE];
  if (!Array.isArray(domDef)) throw new Error(`missing ${DOMAIN_TYPE} type`);
  const allowed = allowedDomainDefinitions();
  const domKey = JSON.stringify(domDef);
  if (!allowed.some((d) => JSON.stringify(d) === domKey)) throw new Error(`${DOMAIN_TYPE} definition is not one of the allowed shapes`);
  checkObjectKeys(domain, domDef.map((f) => f.name), 'domain');

  if (primaryType === DOMAIN_TYPE) throw new Error('primaryType cannot be the domain');
  if (!types[primaryType]) throw new Error(`unknown primaryType ${primaryType}`);
  if (Array.isArray(types[primaryType]) && isEnumDefinition(types[primaryType])) throw new Error(`primaryType ${primaryType} must be a struct, not an enum`);

  // Type definitions.
  for (const [name, def] of Object.entries(types)) {
    checkName(name, 'type');
    if (BASIC_TYPES.has(name)) throw new Error(`type name is reserved: ${name}`);
    if (!Array.isArray(def) || def.length === 0) throw new Error(`type ${name} must be a non-empty array of fields`);
    const seen = new Set();
    const isEnum = isEnumDefinition(def);
    for (const field of def) {
      checkName(field.name, `field of ${name}`);
      if (seen.has(field.name)) throw new Error(`duplicate field ${field.name} in ${name}`);
      seen.add(field.name);
      if (typeof field.type !== 'string' || field.type.length === 0) throw new Error(`field ${name}.${field.name} has no type`);
      const paren = field.type.startsWith('(');
      if (isEnum !== paren) throw new Error(`type ${name} mixes struct fields and enum variants`);
      if ('contains' in field && field.type !== 'merkletree') throw new Error(`"contains" is only allowed on merkletree fields (${name}.${field.name})`);
      const refs = isEnum ? variantParams(field.type) : [field.type];
      for (const ref of refs) {
        const { base } = stripArray(ref);
        if (base === 'merkletree') {
          if (isEnum) throw new Error(`merkletree cannot be an enum variant parameter (${name})`);
          if (!field.contains || !types[field.contains]) throw new Error(`merkletree field ${name}.${field.name} needs "contains" naming a user-defined type`);
          if (ref !== 'merkletree') throw new Error(`arrays of merkletree are not allowed (${name}.${field.name})`);
        } else if (!BASIC_TYPES.has(base) && !types[base]) {
          throw new Error(`unknown type ${ref} in ${name}.${field.name}`);
        }
        if (base === DOMAIN_TYPE) throw new Error(`${DOMAIN_TYPE} cannot be referenced from ${name}`);
      }
    }
  }

  // Every user type must be reachable from primaryType (no dangling types) and no cycles.
  const reachable = new Set();
  const visiting = new Set();
  const visit = (t) => {
    if (reachable.has(t)) return;
    if (visiting.has(t)) throw new Error(`recursive type definition involving ${t}`);
    visiting.add(t);
    for (const d of directDependencies(types, t)) visit(d);
    visiting.delete(t);
    reachable.add(t);
  };
  visit(primaryType);
  for (const name of Object.keys(types)) {
    if (name !== DOMAIN_TYPE && !reachable.has(name)) throw new Error(`dangling type ${name}`);
  }
  return true;
}

function checkObjectKeys(obj, expected, what) {
  const keys = Object.keys(obj);
  for (const k of expected) if (!(k in obj)) throw new Error(`${what}: missing field ${k}`);
  for (const k of keys) if (!expected.includes(k)) throw new Error(`${what}: undeclared field ${k}`);
}

export function allowedDomainDefinitions() {
  const [vc, salt] = DOMAIN_OPTIONAL;
  return [
    [...DOMAIN_REQUIRED],
    [...DOMAIN_REQUIRED, vc],
    [...DOMAIN_REQUIRED, salt],
    [...DOMAIN_REQUIRED, vc, salt],
  ];
}

// ---------------------------------------------------------------------------
// encode_type
// ---------------------------------------------------------------------------

function directDependencies(types, typeName) {
  const def = types[typeName];
  const deps = new Set();
  const isEnum = isEnumDefinition(def);
  for (const field of def) {
    const refs = isEnum ? variantParams(field.type) : [field.type];
    for (const ref of refs) {
      const { base } = stripArray(ref);
      if (base === 'merkletree') deps.add(field.contains);
      else if (types[base]) deps.add(base);
    }
  }
  return deps;
}

function encodeSingleType(types, typeName) {
  const def = types[typeName];
  if (isEnumDefinition(def)) {
    const variants = def.map((v) => `${escapeName(v.name)}(${variantParams(v.type).map(escapeName).join(',')})`);
    return `${escapeName(typeName)}(${variants.join(',')})`;
  }
  const fields = def.map((f) => `${escapeName(f.name)}:${escapeName(f.type)}`);
  return `${escapeName(typeName)}(${fields.join(',')})`;
}

/** encode_type(T) = encoding of T followed by the encodings of all transitively referenced user types, sorted by byte order. */
export function encodeType(types, typeName) {
  const all = new Set();
  const stack = [...directDependencies(types, typeName)];
  while (stack.length) {
    const t = stack.pop();
    if (t === typeName || all.has(t)) continue;
    all.add(t);
    stack.push(...directDependencies(types, t));
  }
  const deps = [...all].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)); // code-point order == byte order for ASCII names
  return [typeName, ...deps].map((t) => encodeSingleType(types, t)).join('');
}

export function typeHash(types, typeName) {
  return starknetKeccak(encodeType(types, typeName));
}

// ---------------------------------------------------------------------------
// Value encoding. Every encoder returns an array of felts (length 1, or 2 for u256).
// ---------------------------------------------------------------------------

function parseInteger(value, what) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error(`${what}: number is not a safe integer`);
    return BigInt(value);
  }
  if (typeof value === 'string') {
    if (/^-?[0-9]+$/.test(value)) return BigInt(value);
    if (/^0x[0-9a-fA-F]+$/.test(value)) return BigInt(value);
  }
  throw new Error(`${what}: expected an integer (JSON number, decimal string or 0x hex string), got ${JSON.stringify(value)}`);
}

function inRange(v, lo, hi, what) {
  if (v < lo || v > hi) throw new Error(`${what}: value ${v} out of range [${lo}, ${hi}]`);
  return v;
}

function encodeBasic(type, value, what) {
  switch (type) {
    case 'felt':
      return [inRange(parseInteger(value, what), 0n, PRIME - 1n, what)];
    case 'ContractAddress':
    case 'ClassHash':
      return [inRange(parseInteger(value, what), 0n, ADDRESS_BOUND - 1n, what)];
    case 'bytes31':
      return [inRange(parseInteger(value, what), 0n, 2n ** 248n - 1n, what)];
    case 'bool':
      if (typeof value !== 'boolean') throw new Error(`${what}: bool must be a JSON boolean`);
      return [value ? 1n : 0n];
    case 'shortstring':
      if (typeof value !== 'string') throw new Error(`${what}: shortstring must be a JSON string`);
      return [shortStringToFelt(value)];
    case 'selector':
      if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`${what}: selector must be a Cairo identifier`);
      return [starknetKeccak(value)];
    case 'string':
      if (typeof value !== 'string') throw new Error(`${what}: string must be a JSON string`);
      return [encodeByteArray(value)];
    case 'u256': {
      const v = inRange(parseInteger(value, what), 0n, 2n ** 256n - 1n, what);
      return [v & (2n ** 128n - 1n), v >> 128n];
    }
    default:
      if (type in UNSIGNED) return [inRange(parseInteger(value, what), 0n, 2n ** UNSIGNED[type] - 1n, what)];
      if (type in SIGNED) {
        const bits = SIGNED[type];
        const v = inRange(parseInteger(value, what), -(2n ** (bits - 1n)), 2n ** (bits - 1n) - 1n, what);
        return [v < 0n ? PRIME + v : v];
      }
      throw new Error(`${what}: not a basic type: ${type}`);
  }
}

/** string: Cairo ByteArray serialisation of the UTF-8 bytes, hashed. */
export function encodeByteArray(str) {
  const bytes = new TextEncoder().encode(str);
  const words = [];
  let i = 0;
  for (; i + 31 <= bytes.length; i += 31) words.push(bytesToFelt(bytes.subarray(i, i + 31)));
  const pending = bytes.subarray(i);
  return hashArray([BigInt(words.length), ...words, bytesToFelt(pending), BigInt(pending.length)]);
}

function bytesToFelt(bytes) {
  let v = 0n;
  for (const b of bytes) v = (v << 8n) | BigInt(b);
  return v;
}

export function encodeValue(types, type, value, what, contains) {
  const { base, depth } = stripArray(type);
  if (depth > 0) {
    if (!Array.isArray(value)) throw new Error(`${what}: expected an array`);
    const inner = type.slice(0, -1);
    const felts = value.flatMap((v, i) => encodeValue(types, inner, v, `${what}[${i}]`, contains));
    return [hashArray(felts)];
  }
  if (base === 'merkletree') return [merkleRoot(types, contains, value, what)];
  if (BASIC_TYPES.has(base)) return encodeBasic(base, value, what);
  if (!types[base]) throw new Error(`${what}: unknown type ${base}`);
  return [isEnumDefinition(types[base]) ? encodeEnum(types, base, value, what) : encodeStruct(types, base, value, what)];
}

export function encodeStruct(types, typeName, value, what = typeName) {
  const def = types[typeName];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${what}: expected an object`);
  checkObjectKeys(value, def.map((f) => f.name), what);
  const felts = [typeHash(types, typeName)];
  for (const field of def) felts.push(...encodeValue(types, field.type, value[field.name], `${what}.${field.name}`, field.contains));
  return hashArray(felts);
}

export function encodeEnum(types, typeName, value, what = typeName) {
  const def = types[typeName];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${what}: enum value must be an object`);
  const keys = Object.keys(value);
  if (keys.length !== 1) throw new Error(`${what}: enum value must have exactly one key`);
  const [variantName] = keys;
  const index = def.findIndex((v) => v.name === variantName);
  if (index < 0) throw new Error(`${what}: unknown variant ${variantName}`);
  const params = variantParams(def[index].type);
  const args = value[variantName];
  if (!Array.isArray(args) || args.length !== params.length) throw new Error(`${what}: variant ${variantName} expects ${params.length} parameter(s)`);
  const felts = [typeHash(types, typeName), BigInt(index)];
  params.forEach((p, i) => felts.push(...encodeValue(types, p, args[i], `${what}.${variantName}[${i}]`)));
  return hashArray(felts);
}

/** merkletree: leaves are Enc[leaf]; pairs hashed commutatively with hash_array; an odd node is promoted. */
export function merkleRoot(types, leafType, leaves, what) {
  if (!Array.isArray(leaves) || leaves.length === 0) throw new Error(`${what}: merkletree needs at least one leaf`);
  let level = leaves.map((leaf, i) => {
    const enc = encodeValue(types, leafType, leaf, `${what}[${i}]`);
    if (enc.length !== 1) throw new Error(`${what}: merkletree leaves must encode to a single felt`);
    return enc[0];
  });
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) next.push(level[i]);
      else next.push(hashPair(level[i], level[i + 1]));
    }
    level = next;
  }
  return level[0];
}

export function hashPair(a, b) {
  return a <= b ? hashArray([a, b]) : hashArray([b, a]);
}

// ---------------------------------------------------------------------------
// Message hash
// ---------------------------------------------------------------------------

export function domainHash(td) {
  return encodeStruct(td.types, DOMAIN_TYPE, td.domain, 'domain');
}

export function primaryStructHash(td) {
  return encodeStruct(td.types, td.primaryType, td.message, 'message');
}

export function messageHash(td, account) {
  validateTypedData(td);
  const acc = inRange(parseInteger(account, 'account'), 0n, ADDRESS_BOUND - 1n, 'account');
  return hashArray([shortStringToFelt(PREFIX_MESSAGE), domainHash(td), acc, primaryStructHash(td)]);
}

export function describe(td, account) {
  validateTypedData(td);
  const userTypes = Object.keys(td.types);
  const encode_type = Object.fromEntries(userTypes.map((t) => [t, encodeType(td.types, t)]));
  const type_hash = Object.fromEntries(userTypes.map((t) => [t, toHex(typeHash(td.types, t))]));
  return {
    encode_type,
    type_hash,
    domain_hash: toHex(domainHash(td)),
    struct_hash: toHex(primaryStructHash(td)),
    message_hash: toHex(messageHash(td, account)),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const [, , cmd, ...args] = process.argv;
if (cmd === 'hash') {
  const td = JSON.parse(readFileSync(args[0], 'utf8'));
  console.log(JSON.stringify(describe(td, args[1] ?? '0x1234'), null, 2));
} else if (cmd === 'verify') {
  const file = JSON.parse(readFileSync(args[0], 'utf8'));
  let failures = 0;
  for (const v of file.vectors) {
    const got = describe(v.typed_data, file.account);
    const exp = v.expected;
    const same = JSON.stringify(got) === JSON.stringify(exp);
    if (!same) { failures += 1; console.error(`MISMATCH ${v.name}\n got ${JSON.stringify(got)}\n exp ${JSON.stringify(exp)}`); }
    else console.log(`ok       ${v.name}`);
  }
  for (const v of file.invalid) {
    let threw = null;
    try { messageHash(v.typed_data, file.account); } catch (e) { threw = e.message; }
    if (!threw) { failures += 1; console.error(`ACCEPTED ${v.name} (should have been rejected: ${v.reason})`); }
    else console.log(`rejected ${v.name}: ${threw}`);
  }
  if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
  console.log('all vectors verified');
} else if (cmd === 'generate') {
  const { buildVectors } = await import('./vectors-src.mjs');
  console.log(JSON.stringify(buildVectors(describe, messageHash), null, 2));
}
