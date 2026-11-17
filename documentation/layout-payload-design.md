# Recursive layout payload and numeric categories

> Historical stored-layout implementation. As of November 12, 2026, `codec-demo.html` uses the [whole-clause prototype](prototype-implementation.md). The retained modules described below are not the active demo flow.

## Status and purpose

This is the implemented replacement for the finite-rank prototype. The grammar and payload must support arbitrarily long, finite grammatical notes without a fixed word count, clause count, or tree-depth limit. Numeric slots retain a public magnitude category across keys. The JavaScript codec and demo now use this format; the old decoder has been removed. Internal revisions continue under the intended first public vocabulary version `1.0.0`.

A finite set of recursive grammar rules can describe infinitely many possible sentences, while every actual sentence has a finite parse tree. See the requested [parse-tree reference](https://en.wikipedia.org/wiki/Parse_tree) and [Cornell's grammar and parsing notes](https://www.cs.cornell.edu/courses/cs2112/2021fa/lectures/lecture.html?id=parsing). The earlier global completion count cannot support this language: it relies on a finite domain of all derivations. The replacement serializes the particular finite derivation chosen by the writer and transforms its semantic leaves.

## Recursive grammar

Start with coordination at sentence, noun-phrase, and verb-phrase levels, plus recursive adjective sequences. These are a controlled subset of English, not a claim to support every construction in English.

```text
ROOT    -> S | S .
         | GREETING | GREETING .
         | GREETING VOCATIVE | GREETING , VOCATIVE
         | GREETING VOCATIVE . | GREETING , VOCATIVE .
         | VOCATIVE , S | VOCATIVE , S .
         | DOC | DOC .
DOC     -> UTTERANCE | DOC . UTTERANCE
UTTERANCE -> S | GREETING | GREETING VOCATIVE | GREETING , VOCATIVE
           | VOCATIVE , S | SALUTATION TIME_OF_DAY
           | GREETING SALUTATION TIME_OF_DAY
           | GREETING , SALUTATION TIME_OF_DAY
           | SALUTATION TIME_OF_DAY VOCATIVE
           | SALUTATION TIME_OF_DAY , VOCATIVE
S       -> SUBJECT VP | S and S | S , and S
         | BASE_SUBJECT BASE_VP | THIRD_SUBJECT THIRD_VP
SUBJECT -> NP | SUBJECT_PRONOUN
         | SUBJECT and SUBJECT | SUBJECT , and SUBJECT
OBJECT  -> NP | OBJECT_PRONOUN
         | OBJECT and OBJECT | OBJECT , and OBJECT
NP      -> NAME | MASS | the ADJS COUNT_SINGULAR
         | NUMBER ADJS COUNT_AGREEMENT | NP and NP | NP , and NP
VP      -> INTRANSITIVE | TRANSITIVE OBJECT | VP and VP | VP , and VP
ADJS    -> empty | ADJS ADJECTIVE
NUMBER  -> integer in recorded magnitude category
GREETING -> greeting slot (hello, hi, hey, greetings)
VOCATIVE -> address slot (world, everyone, friends, team, and the sourced given names)
SALUTATION -> greeting modifier slot (good, pleasant, lovely)
TIME_OF_DAY -> day-part slot (morning, afternoon, evening, night)
BASE_SUBJECT -> i/you/we/they slot | the ADJS COUNT_PLURAL
              | THIRD_SUBJECT and THIRD_SUBJECT
              | BASE_SUBJECT and THIRD_SUBJECT
              | THIRD_SUBJECT and BASE_SUBJECT
THIRD_SUBJECT -> he/she/it slot | NAME | MASS | the ADJS COUNT_SINGULAR
BASE_VP -> present-base intransitive slot | present-base transitive slot OBJECT
         | BASE_VP and BASE_VP
THIRD_VP -> present-third intransitive slot | present-third transitive slot OBJECT
          | THIRD_VP and THIRD_VP
```

There is no fixed number of applications of a recursive rule. For example:

```text
sally slept
sally slept and alice ate soup
sally slept and alice ate soup and morgan bought 17 books
```

Subject coordination permits `i and sally slept`; object coordination permits `sally saw me and alice`. Verb coordination permits `sally ate soup and slept`. The pronoun roles distinguish subject forms (`i`, `she`, `they`) from object forms (`me`, `her`, `them`); `you` and `it` are allowed in both. A changed key preserves the role and therefore pronoun case. Repeated adjectives are syntactically supported even when a particular order sounds unusual. Additional constructions, such as prepositional phrases and relative clauses, require their own productions and lexical roles before publication; adding them does not require a larger length field or another encoding strategy.

Greeting rules allow `hello`, `hello world`, and `hello, world.` An addressed statement such as `sally, i slept.` is also supported. The greeting and vocative are semantic slots, so another key selects other words with those same roles. The comma is a public tree terminal; it appears in every reading of that link. A comma cannot be inserted between arbitrary words or used to join unrelated clauses, since doing so would not preserve a composer-supported reading for every key.

A one-word greeting has only four distinct readings with the current vocabulary. The expanded vocative pool gives addressed greetings many more readings, but a short note still has only finitely many *distinct* decoys. Infinitely many keys can map to each reading; review very short notes before publication if ambiguity matters.

The `DOC` rule joins any finite number of complete utterances with periods. It allows `sally slept. hello` and `hello world. hi good morning.` The paired salutation and day-part slots also allow `good morning`, `hi good morning`, `hi, good morning`, and `good morning, sally`. A greeting cannot directly follow a completed statement without a period; the editor asks for one. Every alternate key keeps the same utterance boundaries and picks an in-role greeting modifier and day part. This does not make every English phrase legal; it adds these specific constructions to the controlled grammar.

Present-tense clauses are generated from agreement classes, not a phrase list. `i`, `you`, `we`, `they`, plural count nouns and coordinated singular subjects use base verb forms (`love`, `walk`); names, singular count nouns, mass nouns, `he`, `she` and `it` use third-person forms (`loves`, `walks`). A verb entry supplies both forms and a valency role, so any compatible subject, verb and object can combine. For example, the same rules accept `i love you`, `tom loves bobby`, `the cats love you`, and `tom and bobby love you`. The agreement class is public in the tree; alternate keys only select words from its compatible pool. Numeric subjects are deferred until their decoded quantity can drive both noun and verb inflection.

Past-tense verbs must continue to fit singular and plural subjects. COUNT_AGREEMENT derives its form from the decoded quantity: `1 apple`, `0 apples`, `17 apples`. The structural words `the` and `and` are fixed terminals, remain visible for every key, and must be represented in the vocabulary and shared composer. The `and` conjunction entry is included in the pre-release vocabulary.

## A concrete tree encoding

Assign each production a stable rule ID. Each rule defines its result symbol, ordered child symbols, literal terminals, and semantic slots. IDs below are the implemented initial rule table; spelling out the symbols is for this document only.

| ID | Result | Ordered expansion |
| --- | --- | --- |
| 0 | S | SUBJECT, VP |
| 1 | S | S, literal `and`, S |
| 2 | NP | person-name slot |
| 3 | NP | mass-noun slot |
| 4 | NP | literal `the`, ADJS, singular count-noun slot |
| 5 | NP | NUMBER, ADJS, count-noun slot agreeing with NUMBER |
| 6 | NP | NP, literal `and`, NP |
| 7 | VP | past-intransitive-verb slot |
| 8 | VP | past-transitive-verb slot, OBJECT |
| 9 | VP | VP, literal `and`, VP |
| 10 | ADJS | empty |
| 11 | ADJS | ADJS, adjective slot |
| 12 | NUMBER | numeric slot, followed in the layout by a public category ID |
| 13 | S | S, literal comma, literal `and`, S |
| 14 | NP | NP, literal comma, literal `and`, NP |
| 15 | VP | VP, literal comma, literal `and`, VP |
| 16 | ROOT | S, final period |
| 17 | ROOT | S, no final period |
| 18 | SUBJECT | NP |
| 19 | SUBJECT | subject-pronoun slot |
| 20 | SUBJECT | SUBJECT, literal `and`, SUBJECT |
| 21 | SUBJECT | SUBJECT, literal comma, literal `and`, SUBJECT |
| 22 | OBJECT | NP |
| 23 | OBJECT | object-pronoun slot |
| 24 | OBJECT | OBJECT, literal `and`, OBJECT |
| 25 | OBJECT | OBJECT, literal comma, literal `and`, OBJECT |
| 26 | ROOT | greeting slot |
| 27 | ROOT | greeting slot, final period |
| 28 | ROOT | greeting slot, vocative slot |
| 29 | ROOT | greeting slot, literal comma, vocative slot |
| 30 | ROOT | greeting slot, vocative slot, final period |
| 31 | ROOT | greeting slot, literal comma, vocative slot, final period |
| 32 | ROOT | vocative slot, literal comma, S |
| 33 | ROOT | vocative slot, literal comma, S, final period |
| 34 | ROOT | DOC, no final period |
| 35 | ROOT | DOC, final period |
| 36 | DOC | UTTERANCE |
| 37 | DOC | DOC, literal period, UTTERANCE |
| 38 | UTTERANCE | S |
| 39 | UTTERANCE | greeting slot |
| 40 | UTTERANCE | greeting slot, vocative slot |
| 41 | UTTERANCE | greeting slot, literal comma, vocative slot |
| 42 | UTTERANCE | vocative slot, literal comma, S |
| 43 | UTTERANCE | salutation slot, time-of-day slot |
| 44 | UTTERANCE | greeting slot, salutation slot, time-of-day slot |
| 45 | UTTERANCE | greeting slot, literal comma, salutation slot, time-of-day slot |
| 46 | UTTERANCE | salutation slot, time-of-day slot, vocative slot |
| 47 | UTTERANCE | salutation slot, time-of-day slot, literal comma, vocative slot |
| 48 | S | BASE_SUBJECT, BASE_VP |
| 49 | S | THIRD_SUBJECT, THIRD_VP |
| 50 | BASE_SUBJECT | present-base-pronoun slot |
| 51 | BASE_SUBJECT | literal `the`, ADJS, plural count-noun slot |
| 52 | BASE_SUBJECT | THIRD_SUBJECT, literal `and`, THIRD_SUBJECT |
| 53 | BASE_SUBJECT | BASE_SUBJECT, literal `and`, THIRD_SUBJECT |
| 54 | BASE_SUBJECT | THIRD_SUBJECT, literal `and`, BASE_SUBJECT |
| 55 | THIRD_SUBJECT | present-third-pronoun slot |
| 56 | THIRD_SUBJECT | person-name slot |
| 57 | THIRD_SUBJECT | mass-noun slot |
| 58 | THIRD_SUBJECT | literal `the`, ADJS, singular count-noun slot |
| 59 | BASE_VP | present-base intransitive-verb slot |
| 60 | BASE_VP | present-base transitive-verb slot, OBJECT |
| 61 | BASE_VP | BASE_VP, literal `and`, BASE_VP |
| 62 | THIRD_VP | present-third intransitive-verb slot |
| 63 | THIRD_VP | present-third transitive-verb slot, OBJECT |
| 64 | THIRD_VP | THIRD_VP, literal `and`, THIRD_VP |

Write the production IDs in preorder: parent first, then its children from left to right. Literals and slot roles are implied by the production and need no separate layout record. Child arity is also implied, so no closing brackets are necessary.

For `sally slept and alice ate soup`:

```text
ROOT_NO_PERIOD (17)
`-- S_AND (1)
    +-- CLAUSE (0)
    |   +-- SUBJECT_NP (18)
    |   |   `-- NP_NAME (2) -> word slot: sally
    |   `-- VP_INTRANSITIVE (7) -> word slot: slept
    `-- CLAUSE (0)
        +-- SUBJECT_NP (18)
        |   `-- NP_NAME (2) -> word slot: alice
        `-- VP_TRANSITIVE (8) -> word slot: ate
            `-- OBJECT_NP (22)
                `-- NP_MASS (3) -> word slot: soup

public layout bytes: 11 01 00 12 02 07 00 12 02 08 16 03
semantic slots:     name, intransitive verb, name, transitive verb, mass noun
```

The root record indicates whether a final period is present. Comma coordination uses rule 13, 14, 15, 21 or 25; greeting/address and addressed-statement commas use rule 29, 31, 32, 33, 41, 42, 45 or 47. Rule 37 records periods between utterances. The punctuation is public and stays fixed across keys. Another key fills exactly this tree, for example `morgan laughed and sally drank water`, if those words have the required roles. It cannot insert a number or remove a clause. Adding another `and` or period-separated utterance appends another recorded subtree; it does not increase a global sentence-domain count.

## Packet framing

Binary packet before base64url encoding:

```text
format tag: PKL                         3 bytes; identifies this layout format
vocabulary-version byte length         unsigned variable-length integer
vocabulary version                     ASCII bytes, public and unkeyed
salt                                   16 bytes
layout byte length                     unsigned variable-length integer
layout                                 preorder rule IDs and category parameters
semantic body                          one encoded value per variable slot
```

The grammar establishes the exact slot count and each slot's domain. Rule IDs, lengths and category IDs use minimal unsigned base-128 variable-length integers: seven data bits per byte, the high bit indicating another byte follows. Zero is one zero byte; an unterminated value or redundant high zero group is malformed. `BigInt` permits as many groups as the finite value requires. The [Protocol Buffers encoding guide](https://protobuf.dev/programming-guides/encoding/) illustrates the continuation convention; this is not a Protobuf message.

Each semantic value instead uses a big-endian field whose width is fixed by its domain size `m`: `max(1, ceil(bitLength(m-1)/8))` bytes. This makes the body length independent of the key and lets the decoder check that numeric categories have enough actual bytes before allocating their domains. Domain width can grow with the category; it is not a fixed numeric ceiling.

The layout length frames this packet's finite tree; it is not a maximum allowed tree length. After the layout, the decoder consumes exactly the number of semantic values implied by that tree and requires the packet to end. A trailing or missing value is a format error determined before key interpretation.

## Encoding and decoding semantics

For each variable word slot, select the ordered vocabulary pool for its recorded grammatical role, using stable entry IDs. For a numeric slot, use the domain of its recorded magnitude category. The writer's selected value has an index `x` in that finite slot domain.

```text
encode slot: c = keyedPermutation(x, slotDomain, slotContext)
decode slot: x = inversePermutation(c, slotDomain, slotContext)
```

The seed includes the pass-key, public layout digest, salt and vocabulary version. Each slot adds its ordinal, role/form or numeric category, domain size and rolling state. After a slot, both encoding and decoding update that state with a keyed HMAC of the previous state, slot context, recovered semantic index and stored code. Thus the next lookup depends on previous semantic results, across grammatical types. See the [forward/inverse diagrams and exact mapping](codec-implementation.md#exact-semantic-mapping).

Every key still selects an in-domain value. No authentication tag, plaintext checksum, key-success flag, or original semantic answer is stored. Feedback requires sequential evaluation, but it adds neither key entropy nor a demonstrated exponential guessing cost. Context can still help someone select a likely reading.

The implementation uses eight-round Feistel permutations with cycle walking onto each slot domain. It walks slots iteratively, without building root-to-leaf path strings or shuffling entire dictionaries per occurrence. Fixed vectors cover the exact construction. Hash/HMAC primitives do not establish a security proof for this custom composition.

## Decoder termination without a depth or token limit

Decode with an explicit heap-backed stack of expected grammar symbols. Do not use one JavaScript function call per tree level.

```text
push ROOT
while stack is not empty:
    pop expected item
    if literal: record its fixed surface text
    if semantic slot: record its required role/domain and agreement context
    if nonterminal:
        read one rule ID from the finite layout stream
        require that rule's result matches the expected symbol
        read its public category parameter, if any
        push its ordered expansion in reverse order
require exact end of layout stream
```

Each expanded nonterminal consumes a layout record, including the empty-adjective production. Children are inlined records; there are no pointers that can form a cyclic object graph. Truncation is a malformed packet, and leftover layout bytes are malformed too. The finite record stream supplies termination; no expansion budget, maximum depth, or enumeration of all possible sentences is required.

Serialization and layout validation take work proportional to the supplied layout and semantic bytes. Stack space grows with actual unfinished branches. For browser responsiveness, process work in chunks or a worker and allow cancellation. Resource exhaustion is an environment failure, independent of the key; do not render a partial sentence or label a key incorrect.

## Composer and ambiguity

The composer should retain the selected derivation as the user chooses words and conjunctions. At a complete clause it can offer a final period, finishing, or continuing with `and` or `, and`; it must not force finishing after a particular token count. Suggestions come from all legal continuations of the shared grammar. The current demo highlights the first impossible token in red and accepts unfinished prefixes. The planned trie will index lexical prefixes, while grammar state tracks the recursive structure.

Coordination is ambiguous: `sally ate soup and alice slept` must be permitted to continue past a possible noun coordination. A parser for plain text must preserve competing parses until enough input disambiguates them. The implementation uses an Earley chart with shared parse states rather than recursively enumerating every tree. For a completed ambiguous string, choose a documented deterministic derivation; the implementation factors otherwise equivalent conjunction chains to left association. Where different attachment sites remain possible, use a stable rule-order tie-break. The serialized layout then makes the reader's interpretation unambiguous.

Using a selected tree avoids reparsing that tree at decode time. No fixed text-length or committed-token threshold belongs in the composer/parser API. Any grammar-specific ambiguity cost must be addressed by the parser, not hidden behind a seven-word ceiling.

## Numeric categories

The category examples were illustrative. The implemented disjoint domains cover all nonnegative integers:

| ID | Category | Inclusive range |
| --- | --- | --- |
| 0 | small | 0–99 |
| 1 | medium | 100–9,999 |
| 2 | large | 10,000–999,999 |
| 3 | xlarge, 7 digits | 1,000,000–9,999,999 |
| 4 and above | xlarge, `ID + 4` digits | `10^(digits-1)` through `10^digits - 1` |

Permute `value-lo` within `0..hi-lo`, then add `lo` to render. Integers use `BigInt`, with no fixed bit-width cap. Negative values, fractions and leading zeros are outside the initial grammar. A decoded quantity of one selects a singular count noun; other quantities select its plural form. No literal `#` is displayed.

Magnitude categories avoid shifting an ordinary quantity into an enormous quantity under another key. Values within a category still have different real-world frequencies; the design does not guarantee that context cannot distinguish readings.

## Practical transport

The grammar and binary format have no fixed word, clause, or nesting count. A browser still has finite memory, and a shareable URL grows with the finite note. An actually infinite note cannot fit into any finite URL. Browser or sharing-channel limitations may prevent sharing a very large note; report the concrete transport/resource failure without inventing a grammar limit or truncating the note. File-based transport can be considered separately if needed; it is not required to define this URL format.

The prototype's fixed character/token checks and global completion count have been removed. Validate lengths against actual available bytes before allocating buffers, and reject malformed lengths without trusting them as allocation requests.

## Verification and manual milestone

The codec tests round-trip 1,000 coordinated clauses under the writer's key and render another key's complete reading. The parser and renderer also process 10,000 clauses (29,999 tokens), and a separate 10,000-clause right-nested layout exercises the explicit stack. Numeric tests include values larger than 256 bits. Browser smoke tests reopen 100-clause links and check live key changes through the module worker. These are measured test cases, not supported maxima.

- Round-trip coordination of sentences, noun phrases, and verb phrases, plus repeated adjectives.
- Test chains at increasing sizes, including 1, 10, 100, 1,000 and 10,000 clauses. These are test sizes, not supported maxima.
- Verify deeply nested tree serialization without JavaScript call-stack overflow; measure plain-text parser behavior separately because ambiguity can cost more than tree decoding.
- Test variable-length fields across byte boundaries and test integer framing beyond ordinary JavaScript exact-number limits.
- Replay decoded readings through the shared composer; check that every key retains layout and numeric categories.
- Reject truncated trees, wrong-result rules, incomplete varints, extra values, and semantic values outside public slot domains before interpreting the key.
- Test numeric category boundaries and singular/plural transitions at one.
- Keep the regenerated pre-release vector and browser smoke checks aligned with the implementation.
- Owner check: compose and keep extending an `and` chain, change keys, and confirm that every full reading retains the chosen tree and numeric categories.
