# Grammar coverage and expansion

## What “unlimited” means here

The payload and parser have no fixed word, clause, utterance or tree-depth limit. Recursive rules can generate arbitrarily long *finite* notes. This is different from accepting every possible English sentence. A finite versioned vocabulary cannot contain arbitrary words or names, and English constructions need grammatical features that the current rules may not express. The page must say which construction is missing instead of suggesting that a user's pass-key failed.

The grammar is a system of reusable productions and typed word pools. A production describes a family of notes. For example, the present-tense rules combine a base-form subject, any compatible base-form verb, and an object. That supports `i love you`, `they trust tom`, and many other combinations; those notes are not separately listed in code. The `and` and period productions make the supported families recursively extensible.

## Current families

| Family | Examples | Decoy invariant |
| --- | --- | --- |
| Past-tense clauses and coordination | `sally slept`; `tom saw bobby and alice laughed` | Subject, verb and object roles stay in their slots |
| Present-tense agreement | `i love you`; `he loves her`; `the cats love you`; `tom and bobby love you` | The public tree records base or third-person agreement and each verb entry supplies both forms |
| Noun phrases | `sally`; `the lovely cat`; `17 cats`; coordinated nouns | Count form follows quantity; number category and phrase structure remain public |
| Greetings and addresses | `hello`; `hi good morning`; `good morning, sally` | Greeting, salutation, day-part and address roles stay separate |
| Multiple utterances | `sally slept. hello`; `i love you. good morning` | Period positions stay in the public tree |

The name pool contains the 1,000 most frequent distinct names in the pinned 1880–2020 SSA national birth records, plus a preserved seed name. The source, ranking method and hashes are in [vocabulary sources](vocabulary-source.md). Present-tense verbs have 36 transitive and 27 intransitive entries. These numbers describe lexical coverage, not a count of all possible sentences.

## Known missing construction families

- Questions, commands, negation, contractions and modal verbs.
- Future and perfect tenses, progressive forms, and subordinate or relative clauses.
- General prepositional phrases, adverbs, indirect objects and quoted speech.
- Present-tense numeric subjects such as `1 cat loves you` and `2 cats love you`. Decoding a number can cross the singular/plural boundary, so this needs a quantity-driven verb form rather than a fixed agreement branch.
- Arbitrary names, words, spelling variants and all possible punctuation. The vocabulary is finite by design.

## Expansion rule

Add a construction only when its **whole family** can be represented as a grammar production with typed lexical slots and explicit features. Specify the public tree rule, the required vocabulary role and forms, and how a decoder preserves agreement and valency for every key. Then add a coverage set that varies subjects, verbs, objects and keys across the family. A single phrase passing is insufficient. The parser, next-word suggestions and decoder must use the same rule table; malformed or unsupported text must never become a wrong-key signal.

The [everyday-language corpus](../data/coverage/everyday.json) holds representative supported notes and categorized known gaps. Its automated test varies names, subjects and verbs and replays alternate-key readings through the same composer grammar. Before public release, review the corpus by construction category, expand the highest-value missing families, and add examples to the corpus. Do not represent coverage as “all English” unless that claim has evidence; the current implementation makes the narrower, testable promise above.
