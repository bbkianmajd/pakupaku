# Technical design

> Historical stored-layout implementation. As of November 12, 2026, `codec-demo.html` uses the [whole-clause prototype](prototype-implementation.md). The retained modules described below are not the active demo flow.

## Current direction and status

The codec stores a recursive syntax tree in the public URL payload and changes its semantic leaves with the pass-key. Every reader key uses the same tree, grammatical roles, number positions, and numeric magnitude categories. The writer's key restores the exact note.

The grammar must support arbitrarily long finite notes through recursive productions, including conjunctions. There is no fixed word count, clause count, or nesting depth in the grammar or packet format. A finite rule set can generate an unbounded language; every composed note still has a finite tree. This follows the distinction between grammar rules and their individual parse trees described in the requested [parse-tree article](https://en.wikipedia.org/wiki/Parse_tree) and [Cornell's parsing notes](https://www.cs.cornell.edu/courses/cs2112/2021fa/lectures/lecture.html?id=parsing).

**Implementation status:** the recursive stored-layout JavaScript codec is implemented and tested. It supports coordinated past- and present-tense sentences, noun phrases and verb phrases, repeated adjectives, and magnitude-bounded numeric slots without fixed note-length or tree-depth limits. Semantic lookups form an iterative chain: each recovered word/number feeds the next slot's keyed mapping. See the [layout specification](layout-payload-design.md) and [exact implementation and feedback diagrams](codec-implementation.md). Internal revisions retain `1.0.0`; the old rank format has been removed without a compatibility decoder. The full word-picker UI is still planned.

## Product invariant

For every supported packet with its vocabulary present, every reader input string produces a complete note the composer could formulate. This includes empty, short, whitespace, and Unicode keys. There is no pass-key validity indicator. The minimum of three Unicode code points applies only to authoring; keys are otherwise preserved exactly and kept in memory.

Before interpreting a key, validate the packet framing, selected vocabulary, grammar production sequence, numeric categories, and encoded value domains. Every accepted layout has exactly the semantic slots the payload provides. Each keyed transformation is a permutation within the slot's finite domain, so every key yields legal words and numbers. Apply numeric agreement after decoding a quantity. No unknown-word placeholder, internal rule label, or incomplete derivation appears in the rendered note.

This gives ambiguity among readings, not a promise that the intended message cannot be inferred. Public syntax and categories, word frequencies, repeated links, and context can constrain guesses. All keys for one link have the same layout, so counting its number slots cannot distinguish them.

## Recursive language and composer

```text
sentence    -> subject verb-phrase
             | sentence and sentence
subject     -> noun-phrase | subject-pronoun
             | subject and subject | subject , and subject
object      -> noun-phrase | object-pronoun
             | object and object | object , and object
noun-phrase -> name | mass-noun
             | the adjectives count-noun
             | number adjectives count-noun
             | noun-phrase and noun-phrase
verb-phrase -> past-intransitive-verb
             | past-transitive-verb object
             | verb-phrase and verb-phrase
adjectives  -> empty | adjectives adjective
```

Present-tense clauses use a separate agreement branch: base-form subjects (`i`, `you`, `we`, `they`, plural count nouns, and coordinated singular subjects) take base-form verbs; names, singular count nouns, mass nouns, `he`, `she`, and `it` take third-person forms. Verb entries contain both forms and a transitive or intransitive role. This lets the grammar combine 1,000 common names with every compatible verb and object, rather than enumerating phrases. For example, `i love you`, `tom loves bobby`, `the cats love you`, and `tom and bobby love you` all derive from the same small rule families. The public tree records the agreement branch so every alternate key keeps it.

The public grammar also allows `S -> S , and S`, `NP -> NP , and NP`, `VP -> VP , and VP`, and `ROOT -> S` with an optional final period. Greeting utterances also support `hello`, `hello world`, `hi good morning`, and `hello, world`; addressed statements support `sally, i slept`. Periods can join any finite sequence of supported utterances, such as `sally slept. hello`. Greeting and addressee words occupy separate keyed roles. Commas occur before `and`, between a greeting and addressee, or after an addressee before a statement; they are public tree terminals, not number group separators or arbitrary clause separators. The precise production and slot table is in the [layout specification](layout-payload-design.md#a-concrete-tree-encoding). It covers the requested ability to keep adding `and`; it is not intended as a complete grammar for all English constructions. Other constructions can be added before publication without changing the underlying tree serialization strategy.

The constrained composer retains its derivation and offers grammar-valid continuations, including conjunctions at completion points. The current suggestion API filters lexical prefixes; the planned trie will index these same legal candidates. Plain-text parsing must share grammar rules, preserve ambiguous continuations, and choose a deterministic completed parse. The reader uses the explicitly recorded tree and does not need to infer a tree from the rendered text.

Fixed grammatical words such as `the` and `and` belong to the vocabulary and the grammar. Other slots use exact versioned roles and forms. Keep lowercase output; preserve an optional final period and supported comma positions in the public tree. The demo lowercases typing and marks impossible tokens in red. Whitespace is normalized when the link is created. Past-tense verb pools fit singular and plural subjects; present-tense verb pools use the recorded subject-agreement class; number-dependent nouns choose the appropriate form after decoding. Subject pronouns (`i`, `she`, `they`) and object pronouns (`me`, `her`, `them`) have separate public roles. `you` and `it` serve in both roles. Pronoun case and the separate greeting, vocative, salutation and day-part roles keep alternate-key readings within their supported constructions.

## Coverage and growth

The grammar supports unbounded *length* through recursion, but its current lexical roles and productions do not cover every English sentence. A finite vocabulary cannot express arbitrary names or words. Scaling language coverage means adding reusable constructions and lexical features (verb valency, person/number agreement, determiners, complements, tense, prepositional phrases and subordinate clauses), then testing whole families of sentences. New rules must leave every semantic slot with a nonempty, form-compatible pool; the decoder never guesses a parse. Measure coverage against a fixed everyday-language corpus and report unsupported constructions by category. Do not claim that isolated example passes imply complete English coverage.

## Encoding structure

```text
writer's selected finite tree
             |
      preorder rule IDs ---------------------- public layout
             |
      semantic leaves in traversal order
             |
      key + salt + layout + slot context
             |
      reversible word/numeric transformations
             |
version + salt + layout + encoded values
             |
          base64url URL fragment
```

The packet uses a fixed format tag, public vocabulary version, salt, a variable-length layout length, preorder production records, and encoded semantic values. A rule defines which child symbols and lexical slots follow, so the layout requires neither a global count of sentences nor closing tags for every node. Variable-length integer fields grow with the actual finite values rather than imposing a fixed word-count ceiling.

The decoder walks the stream with an explicit stack. Each nonterminal consumes a layout record. It finishes when the root's obligations are satisfied and the exact framed layout bytes are consumed. This supports recursive linguistic structure without consuming one JavaScript call-stack frame per nesting level. The format inlines children and provides no pointers that could create an infinite object graph.

Numeric slots carry a public magnitude category: small `0..99`, medium `100..9999`, large `10000..999999`, then one category per decimal digit count starting at seven digits. These are implementation choices following the owner's illustrative categories. Every nonnegative integer has a category; larger values use `BigInt`. Numeric magnitude and word-count capacity are separate concerns.

## Iterative semantic feedback

The mapper walks variable slots in surface order with a rolling keyed state. A slot's dictionary role or numeric category restricts its output domain. Its recovered semantic index, stored code, slot type and position update the state for the next slot. This carries dependence across nouns, verbs, adjectives and numbers; it does not reset for each type.

```text
pass-key + salt + public layout -> initial keyed state
                                       |
code 0 + name pool  -> recovered name  -> state 1
code 1 + verb pool  -> recovered verb  -> state 2
code 2 + noun pool  -> recovered noun  -> state 3
                                      ...
```

Encoding advances with the writer's selected index; decoding advances with the index just recovered. With the same key, those are identical at every step. With another key, every step still selects inside its permitted pool and advances normally. No previous word is checked against a stored answer. The [implementation notes](codec-implementation.md#feedback-from-the-previous-semantic-result) give the exact forward/inverse operations and state formula.

This introduces sequential dependence and change propagation, not exponential resistance to guessing. An attacker can evaluate candidate keys, use context to reject early phrases, and parallelize different guesses. The finite pools permit collisions, so no promise is made that every suffix word changes. A slow password KDF would address per-guess cost separately; the current fast SHA-256 seed does not do that. Stronger keys still matter. This custom mapping has no formal cryptographic security proof.

## Why store the tree

Each link records whether and where a number appears, keeping those positions and categories fixed for every key. We map only the finite leaf domains of that particular tree. The grammar can describe unbounded recursion without counting all possible sentences or randomly expanding branches until a token budget is reached.

## Vocabulary and publication

The active `data/semantics.json` and matching `data/semantics/1.0.0.json` contain 6,005 distinct written words in 6,092 entries. The [source and import guide](vocabulary-source.md) documents pinned inputs, stable IDs, lexical classifications, licenses, and limitations. The 45-entry starter remains an input fixture for the reproducible vocabulary importer, not a released vocabulary.

A file contains a public version, language, and entries with stable IDs, lowercase text, roles, explicit noun forms and present-verb forms. Import new vocabulary offline; browsers load static JSON only. Words may have multiple roles, but each admitted use must fit the grammar. A transitive label alone does not make a verb such as placement-sense `put` legal without its required complement.

Before first publication, grammar/schema/code changes are internal revisions. Conjunction, pronoun, greeting, vocative, salutation and day-part roles are implemented; review the recursive rule table before freezing it for publication. At publication, retain the exact `1.0.0` data at its versioned path. Later vocabulary-only releases receive new versions while the algorithm and rule meanings remain fixed. Reader packets select their exact public version; a missing file names that version and never silently substitutes the current vocabulary.

## Performance and transport

Tree serialization and structural validation should take work proportional to the actual encoded input. Avoid per-node copies of long paths, naive enumeration of ambiguous parses, and shuffling a large vocabulary separately at every word. Numeric transformations and lexical mapping need their own benchmarks.

A browser and URL transport have finite capacity. This does not justify a seven-word grammar or an arbitrary sentence-size field: the format must express every finite tree that the environment can process. Process long jobs in chunks or a worker, support cancellation, and report concrete resource/transport failures. Never truncate a note into an incomplete sentence or interpret resource failure as evidence about a key.

The earlier fixed text, suggestion-token, and payload-character checks have been removed. The demo runs codec jobs in a worker and cancels superseded reader mappings. Increasing test sizes demonstrate that there is no grammar cutoff; they do not define a maximum note length.

## Verification and execution

The [execution plan](execution-plan.md) tracks the implemented codec and remaining UI/release work. Verify recursive coordination, deep trees without call-stack overflow, long-chain round trips, numeric categories, every-key composer replay, malformed packet handling, and browser behavior. A new stored-tree regression vector replaces the old rank fixture. The owner's manual milestone is to keep extending an `and` chain and confirm that changing the key preserves its complete structure.

## Active flexibility policy

The user selected **option 3: broad parts of speech with grammatical forms preserved**. The [six-level spectrum and tradeoffs](grammar-flexibility.md) documents this decision and its implementation. Active authoring and generation relax verb-context and semantic restrictions; the older strict grammar described above remains a historical reference.
