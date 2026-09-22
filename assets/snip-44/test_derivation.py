"""SNIP-44 reference tests; standard library only, not production crypto.

Run: python3 assets/snip-44/test_derivation.py
Curve parameters: starkware-libs/cairo-lang, src/starkware/crypto/signature/
pedersen_params.json (the generator is CONSTANT_POINTS[1]).
"""

import hashlib
import hmac
import json
from pathlib import Path
import unittest
from unittest.mock import patch


N = 0x0800000000000010FFFFFFFFFFFFFFFFB781126DCAE7B2321E66A241ADC64D2F
H = N // 2
LIMIT = 2**256 - 2**256 % N
ORDERS = {
    "stark": N,
    "secp256k1": 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141,
}
DOMAIN = b"STRK20_ACCOUNT_LEAF_V1"
P = 2**251 + 17 * 2**192 + 1
G = (
    874739451078007766457464989774322083649278607533249481151382481072868806602,
    152666792071518830868575557812948353041420400780739481342941381225525861407,
)
HERE = Path(__file__).resolve().parent
VECTORS = json.loads((HERE / "test-vectors.json").read_text())


def unhex(value):
    return bytes.fromhex(value.removeprefix("0x"))


def serialize_context(version, chain_id, account_address, pool_address, key_index):
    if version != 1 or key_index != 0:
        raise ValueError("unsupported version or key index")
    fields = (chain_id, account_address, pool_address)
    if any(not 0 <= value < P for value in fields):
        raise ValueError("context field is not a felt252")
    return (version.to_bytes(4, "big")
            + b"".join(value.to_bytes(32, "big") for value in fields)
            + key_index.to_bytes(16, "big"))


def digest_for(leaf, data):
    return hmac.new(leaf, data, hashlib.sha256).digest()


def derive(leaf, context, scheme):
    if len(leaf) != 32 or not 1 <= int.from_bytes(leaf, "big") < ORDERS[scheme]:
        raise ValueError("invalid account leaf")
    if len(context) != 116:
        raise ValueError("invalid context length")
    for counter in range(2**32):
        digest = digest_for(leaf, DOMAIN + context + counter.to_bytes(4, "big"))
        candidate = int.from_bytes(digest, "big")
        if candidate >= LIMIT:
            continue
        x = candidate % N
        k = min(x, N - x)
        if 1 <= k < H:
            return k, counter
    raise ValueError("counter exhausted")


def add(left, right):
    if left is None:
        return right
    if right is None:
        return left
    x, y = left
    u, v = right
    if x == u and (y + v) % P == 0:
        return None
    slope = (((3 * x * x + 1) * pow(2 * y, -1, P)) if left == right
             else ((v - y) * pow(u - x, -1, P))) % P
    rx = (slope * slope - x - u) % P
    return rx, (slope * (x - rx) - y) % P


def public_x(scalar):
    result, point = None, G
    while scalar:
        if scalar & 1:
            result = add(result, point)
        point = add(point, point)
        scalar >>= 1
    return result[0]


class DerivationTests(unittest.TestCase):
    def setUp(self):
        self.context = serialize_context(1, int.from_bytes(b"SN_SEPOLIA", "big"),
                                         0x1234, 0x5678, 0)
        self.leaf = (1).to_bytes(32, "big")

    def test_constants_and_serialization(self):
        constants = VECTORS["constants"]
        for field, expected in (("stark_curve_order", N),
                                ("lower_half_boundary", H),
                                ("rejection_limit", LIMIT)):
            self.assertEqual(int(constants[field], 16), expected)
        self.assertEqual(constants["domain_separator_ascii"].encode(), DOMAIN)
        self.assertEqual(unhex(constants["domain_separator_hex"]), DOMAIN)
        context = VECTORS["context"]
        self.assertEqual(len(self.context), context["context_bytes_length"])
        self.assertEqual(self.context, unhex(context["context_bytes"]))
        offset = 0
        for field, width in (("version", 4), ("chain_id", 32),
                             ("account_address", 32), ("pool_address", 32),
                             ("key_index", 16)):
            encoded = unhex(context[f"{field}_be{width}"])
            value = context[field]
            value = int(value, 16) if isinstance(value, str) else value
            self.assertEqual(encoded, value.to_bytes(width, "big"))
            self.assertEqual(self.context[offset:offset + width], encoded)
            offset += width

    def test_published_vectors(self):
        for vector in VECTORS["vectors"]:
            with self.subTest(vector=vector["id"]):
                leaf = unhex(vector["account_leaf_private_key_be32"])
                for attempt in vector["attempts"]:
                    counter = attempt["counter"].to_bytes(4, "big")
                    self.assertEqual(counter, unhex(attempt["counter_be4"]))
                    data = DOMAIN + self.context + counter
                    self.assertEqual(data, unhex(attempt["hmac_input"]))
                    self.assertEqual(len(data), attempt["hmac_input_length"])
                    digest = digest_for(leaf, data)
                    self.assertEqual(digest, unhex(attempt["hmac_sha256_output"]))
                    candidate = int.from_bytes(digest, "big")
                    self.assertEqual(candidate, int(attempt["candidate"], 16))
                    self.assertEqual(candidate < LIMIT, attempt["result"] == "accepted")
                for scheme in vector["account_key_schemes"]:
                    key, counter = derive(leaf, self.context, scheme)
                    self.assertEqual(counter, vector["accepted_counter"])
                    self.assertEqual(key, int(vector["viewing_key"], 16))
                    self.assertEqual(public_x(key), int(vector["public_key_x"], 16))
                self.assertEqual(candidate % N, int(vector["reduced_scalar"], 16))

    def test_markdown_matches_vectors(self):
        markdown = (HERE.parent.parent / "SNIPS" / "snip-44.md").read_text()
        for vector in VECTORS["vectors"]:
            for field in ("account_leaf_private_key_be32", "reduced_scalar",
                          "viewing_key", "public_key_x"):
                self.assertIn(vector[field], markdown)
            for attempt in vector["attempts"]:
                self.assertIn(attempt["hmac_sha256_output"], markdown)

    def test_endianness_is_interpretation_not_rejection(self):
        self.assertEqual(self.leaf, b"\x00" * 31 + b"\x01")
        reversed_leaf = (1).to_bytes(32, "little")
        self.assertEqual(int.from_bytes(reversed_leaf, "big"), 2**248)
        self.assertLess(2**248, N)
        key, _ = derive(self.leaf, self.context, "stark")
        other, _ = derive(reversed_leaf, self.context, "stark")
        self.assertNotEqual(key, other)

    def test_invalid_leaf_ranges_and_widths(self):
        for scheme, order in ORDERS.items():
            for scalar in (0, order, order + 1):
                with self.subTest(scheme=scheme, scalar=scalar):
                    with self.assertRaises(ValueError):
                        derive(scalar.to_bytes(32, "big"), self.context, scheme)
            for leaf in (b"", b"\x01", self.leaf[1:], b"\x00" + self.leaf):
                with self.assertRaises(ValueError):
                    derive(leaf, self.context, scheme)
            for scalar in (1, order - 1):
                key, _ = derive(scalar.to_bytes(32, "big"), self.context, scheme)
                self.assertTrue(1 <= key < H)

    def test_invalid_context(self):
        for context in (b"", self.context[:-1], self.context + b"\x00"):
            with self.assertRaises(ValueError):
                derive(self.leaf, context, "stark")
        for fields in ((2, 1, 2, 3, 0), (1, 1, 2, 3, 1),
                       (1, P, 2, 3, 0), (1, 1, -1, 3, 0), (1, 1, 2, P, 0)):
            with self.assertRaises(ValueError):
                serialize_context(*fields)

    def test_mapping_boundaries(self):
        # Inject candidates to exercise events too rare for ordinary HMAC vectors.
        cases = ((LIMIT - 1, 1), (1, 1), (N - 1, 1),
                 (H - 1, H - 1), (H + 2, H - 1))
        for candidate, expected in cases:
            with self.subTest(candidate=candidate):
                with patch(__name__ + ".digest_for", return_value=candidate.to_bytes(32, "big")):
                    self.assertEqual(derive(self.leaf, self.context, "stark"), (expected, 0))
        for rejected in (LIMIT, 2**256 - 1, 0, N, H, H + 1):
            with self.subTest(rejected=rejected):
                outputs = [rejected.to_bytes(32, "big"), (1).to_bytes(32, "big")]
                with patch(__name__ + ".digest_for", side_effect=outputs) as mock:
                    self.assertEqual(derive(self.leaf, self.context, "stark"), (1, 1))
                    self.assertEqual(mock.call_args_list[0].args[1], DOMAIN + self.context + bytes(4))
                    self.assertEqual(mock.call_args_list[1].args[1], DOMAIN + self.context + b"\x00\x00\x00\x01")

    def test_no_domain_or_counter_override(self):
        for override in ({"domain": b"OTHER"}, {"counter": 1}):
            with self.assertRaises(TypeError):
                derive(self.leaf, self.context, "stark", **override)


if __name__ == "__main__":
    unittest.main(verbosity=2)
