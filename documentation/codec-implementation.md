# Encoder and decoder implementation

> Historical stored-layout implementation. As of November 12, 2026, `codec-demo.html` uses the [whole-clause prototype](prototype-implementation.md). The retained modules described below are not the active demo flow.

The JavaScript codec runs entirely in the browser, with no package dependencies or application server. The recursive stored-layout codec replaces the earlier bounded-rank experiment. Pre-release data remains `1.0.0`; old experimental links are not supported. The original base vocabulary contained 6,005 distinct words in 6,092 entries, including the fixed conjunction `and`, 12 case-tagged pronouns, and greeting, vocative, salutation and day-part entries.

## Try it

From the project root, run `python3 -m http.server 8000`, then open `http://localhost:8000/codec-demo.html`.

1. Enter `Sally  ate soup, and Alice bought 17 red books.`, with writer key `sarah`, and create a link.
2. Open the link in another tab and enter `sarah` to recover the normalized note `sally ate soup, and alice bought 17 red books.`.
3. Try an empty key, `s`, spaces, and Unicode. Each produces a complete reading with the same layout and numeric categories.
4. Extend the note with more clauses, coordinated nouns/verbs, or adjectives. No fixed token or nesting limit applies.
5. Try `i slept`, `she saw him`, and `i and sally saw her`; then try `sally bought 1 apple` and `sally bought 100000000000000000000 books`. Other keys preserve each quantity's category and noun agreement.

The demo lowercases typed letters, accepts extra spaces and line breaks, and highlights the first impossible token in red. It distinguishes a word absent from the vocabulary, such as `foobarbaz`, from a known word in the wrong grammatical position, such as subject-position `me`, where it asks for a subject pronoun. A possible unfinished prefix stays neutral. The generated link contains canonical spaces and the public punctuation. Periods separate complete utterances and a final period is optional; commas are accepted immediately before `and` at sentence, noun phrase, or verb phrase coordination. Commas also separate a greeting from an addressee (`hello, world`) or an addressee from a statement (`sally, i slept`). They do not group digits or independently join clauses. `sally slept. hello` is accepted; `sally slept hello` prompts for a period. Salutation and day-part slots support `good morning`, `hi good morning`, and `hi, good morning`, and `good morning, sally`. The demo is a text validator and codec test page. The final constrained word picker, trie, and automatic writer updates remain planned. Codec jobs run in a module worker. New reader edits cancel older mapping jobs, and revision checks prevent stale readings replacing the latest result. Parsing and layout validation are synchronous inside that worker; cancellation is observed when asynchronous mapping begins. A full link is retained in the copy field if updating browser history fails.

Keys exist only in live memory and inputs. The author minimum is three Unicode code points; readers accept every string. Case, whitespace, normalization forms, empty strings, and lone JavaScript surrogate code units are preserved distinctly. The demo retains one random salt while editing a draft; reload for a new independent draft.

## API

```js
import { createGrammar, suggestNext } from './src/grammar.js';
import { loadCurrentVocabulary } from './src/vocabulary.js';
import { encodeNote, openPayload, randomSalt } from './src/codec.js';

const grammar = createGrammar(await loadCurrentVocabulary());
const salt = randomSalt();
const payload = await encodeNote(grammar,
  'sally ate soup and alice bought 17 books', 'sarah', { salt });
const reader = await openPayload(payload);
console.log(await reader.decode('sarah')); // exact original note
console.log(await reader.decode(''));      // complete alternate reading
console.log(suggestNext(grammar, ['sally', 'ate', '1'], 'app').words);
// ['apple']
```

Place `payload` after `#p=`. `payloadFromFragment` reads that fragment. `decodeNote(grammar, payload, key, {signal})` uses an already loaded vocabulary; `openPayload` selects the exact public version file. Both `encodeNote` and `reader.decode` also accept an optional abort signal. `parseNote` returns a layout and semantic indices; `compileLayout` validates the layout and assigns domains; `renderPlan` renders in-domain indices.

The parser tokenizes words, commas, and periods; it lowercases input and ignores input whitespace when building the canonical note. The editor itself lowercases on input so the displayed draft agrees. The parser uses an Earley chart with shared backpointers and stable production order. Equivalent coordination chains are factored to left association. Different attachment states survive until a complete parse is available; the first completed derivation in stable chart order wins. Pools are sorted by numeric entry ID. Duplicate surface forms choose the first entry in that pool. Decoding preserves the stored tree; reparsing an ambiguous reading need not select that identical tree.

`parseNote` and `suggestNext` share the recognition grammar. Suggestions currently filter allowed vocabulary prefixes directly; the trie is a later indexing improvement. The rule table and its iterative traversal are specified in [the layout design](layout-payload-design.md).

## Exact semantic mapping

Every variable slot has a finite domain of size `m`: a role's word-pool indices or offsets within a numeric category. Subject and object pronouns use separate ordered pools. A subject-pronoun slot always selects from the subject pool, and an object-pronoun slot always selects from the object pool. The words `you` and `it` occur in both pools. Present-tense subject pools distinguish base-form (`i`, `you`, `we`, `they`) and third-person (`he`, `she`, `it`) agreement. Present verb entries provide base and third-person forms in separate transitive/intransitive pools. Greeting, vocative, salutation and day-part slots also use separate ordered pools. Fixed terminals `the` and `and` and the public punctuation are implied by the layout and consume no semantic slots.

### Setup

All JSON below means JavaScript `JSON.stringify`, encoded as UTF-8. Hexadecimal strings are lowercase without leading zeros for integer values (zero is `"0"`); byte arrays use two hex characters per byte.

```text
layoutHash = hex(SHA256(layoutBytes))
seed = SHA256(JSON([
  "pakupaku-layout-seed", version, hex(salt), layoutHash, passkey
]))
K = seed imported as an HMAC-SHA-256 key
state = layoutHash
context = [zero-based slot ordinal, role or "number",
           numeric category ID as a string or word form, domain size as a string]
```

Word forms in context are `text`, `singular`, `plural`, `quantity`, `base`, or `third`. Numeric count-noun agreement is derived at rendering time. JSON escaping preserves lone surrogate code units in keys. A salt is 16 bytes from `crypto.getRandomValues`.

### Per-slot reversible permutation

For `m=1`, the only output is zero. Otherwise use an eight-round balanced Feistel permutation on the smallest even-bit power-of-two domain containing `0..m-1`:

```text
b = ceil(bitLength(m - 1) / 2)       # bits in each half
(L, R) = split the value into two b-bit halves
round r, r = 0..7: (L, R) = (R, L XOR F(R, r))
combine the halves
if result >= m, apply the whole permutation again until result < m
```

`F` concatenates HMAC-SHA-256 blocks numbered from zero, interpreted as big-endian integers, then keeps its low `b` bits. Each block signs:

```text
JSON(["slot-round", context, state, r, rightHalfHex, blockNumber])
```

Use `ceil(b / 256)` blocks, supporting numeric domains larger than 256 bits. Decoding reverses rounds 7 through 0 using `(L,R) = (R XOR F(L,r), L)`, repeating the inverse until back inside the domain. This is cycle walking: a permutation cycle containing an in-domain starting value must eventually revisit an in-domain value. The enclosing domain is less than four times the slot domain; individual walks can still take more than four iterations. There is no arbitrary iteration cutoff that could make some key fail.

### Feedback from the previous semantic result

After encoding a slot, both its original semantic index `x` and stored code `c` are known. After decoding, both its recovered index `x` and the same stored code `c` are known. Both sides advance with:

```text
state = hex(HMAC-SHA256(K, JSON([
  "slot-chain", state, context, hex(x), hex(c)
])))
```

This is one iterative chain across **all** variable slots, not a separate chain that resets for each type. The type remains part of the context. Thus a noun influences the next verb, and all intervening results influence the next noun. No decoded value is stored in the link or checked against an expected answer.

```text
                         ENCODER                         DECODER
state 0 + name pool   sally index -> code 0       code 0 -> recovered name
                         | x,c                           | x,c
                         v                               v
                      state 1                         state 1
state 1 + verb pool   ate index   -> code 1       code 1 -> recovered verb
                         | x,c                           | x,c
                         v                               v
                      state 2                         state 2
state 2 + mass pool   soup index  -> code 2       code 2 -> recovered noun
```

The writer's key gives identical states on both sides by induction over slots. Another key recovers different in-domain results and continues through its own states. It never needs the writer's previous word to proceed. A change can propagate through the suffix, but a particular word can still coincide because its pool is finite. If the salt or layout changes, the initial mapping changes too.

### Does this make guessing harder?

It prevents treating a later slot as an independent fixed substitution: reaching it requires processing the earlier semantic results for that guessed key. Repeated words need not have repeated codes. The cost is sequential processing and recomputing the suffix after edits.

There is **no demonstrated exponential increase in attack cost**. An attacker can try candidate keys and judge their readings, reject a guess after a short prefix, and process different guesses in parallel. Chaining adds no entropy to a weak pass-key and does not make implausible readings equally likely to be real messages. There is no formal security proof for this custom mapping.

The current seed uses a fast SHA-256 hash. If resistance to guessing is a release goal, choose stronger user keys and evaluate a deliberately expensive password KDF, such as Argon2id, before freezing the algorithm. [RFC 9106](https://www.rfc-editor.org/rfc/rfc9106.html) specifies Argon2's memory-hard construction. That is a separate improvement, not currently implemented; browser timing/memory measurements and parameters would be needed. It would not require adding a key-success check.

## Exact packet

| Field | Encoding |
| --- | --- |
| Marker | ASCII `PKL`, three bytes |
| Vocabulary version byte length | Minimal unsigned base-128 varint |
| Vocabulary version | Unmodified ASCII |
| Salt | 16 bytes |
| Layout byte length | Minimal unsigned base-128 varint |
| Layout | Preorder production IDs, root period choice, comma coordination choice, and numeric category IDs, all minimal unsigned base-128 varints |
| Semantic body | One big-endian fixed-width field per variable slot |

For a domain of size `m`, a semantic field occupies `max(1, ceil(bitLength(m-1)/8))` bytes. Its value must be below `m`. Body length is derived from the public layout and vocabulary, and must match exactly. Layout lengths are checked against actual available bytes before slicing. Numeric category size is checked against supplied body capacity before exponentiation, preventing a tiny packet from requesting an enormous numeric domain.

Canonical base64url omits `=` padding. Unsupported markers, malformed versions/varints, truncated trees, wrong-result productions, missing/extra fields, out-of-domain values, and missing vocabulary files fail before interpreting a key. There is no authentication tag, checksum of plaintext, or key verifier. Old rank packets are not decoded.

Versions have three decimal components, each one to six digits, without leading zeros except `0`. Stage 2 removed the prototype 10,000-entry and ASCII-only vocabulary restrictions. Explicitly typed development lexemes also represent supported numeric/partial surfaces; arbitrary unknown input is not accepted. See the Stage 2 grammar and vocabulary reports for the current schema and disclosure limits. The packet has no fixed sentence, byte, integer, or tree-depth ceiling; actual browser memory and transport capacity still apply.

[The fixed vector](../tests/vector.json) records the current vocabulary, salt, key, original note, layout and packet. It is a regression fixture for this pre-release implementation, not a promise to preserve experimental links.

## Tests and review

Run `npm test` with Node.js 22 or newer, and `python3 -m unittest discover -s tests -p 'test_*.py'` for vocabulary tooling. Tests cover red-token draft analysis, whitespace and case normalization, period/comma recovery, reversible finite-domain permutations, semantic feedback, grammatical replay for empty/short/Unicode keys, numeric category boundaries, integers above 256 bits, malformed framing, exact version loading, and the fixed vector.

Long-note tests encode and decode 1,000 clauses (2,999 tokens), parse/render 10,000 clauses (29,999 tokens), and walk a separate right-nested 10,000-clause layout. These are tested sizes, not maxima. Browser smoke checks cover the module worker, link reopening, 100-clause notes, rapid key edits, empty/Unicode inputs, numeric categories, local requests and no browser-storage writes. Phone performance, other browsers, the full composer, and manual release checks remain in the execution plan.

## Compatible phrase variation

The [key variation audit](coverage/key-variation.md) explains why nearby keys can
produce similarly structured readings despite full-key SHA-256 derivation.
Compatible complete singular noun phrases now share a stored semantic domain,
and compatible `you/we/they` subject choices share conjugation. A semantic slot
can render several words; fixed token offsets and identical word counts across
keys are no longer invariants. Exact author recovery and typed agreement remain
required. Selected expressions such as `mean a lot to` map as complete units.
The overall public sentence layout remains constrained.
