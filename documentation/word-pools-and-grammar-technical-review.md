# Word pools, grammar coverage, and structural variation

Review date: November 11, 2026. This is an assessment and design proposal. No application code, vocabulary, grammar, or packet format was changed for this review.

**We currently have 3,090 registered lexical pools. More importantly, 2,621 of them contain only one choice, and the packet fixes the clause structure before the reader supplies a key.** Broader pools help, but the largest improvement in perceived variety would come from allowing the key to select grammatical constructions as well as words.

The recommended direction is broader acceptance of ordinary language, wider compatible phrase choices, and strict grammatical realization of whatever construction the key selects. We should relax attachment to the author's particular sentence shape without abandoning subject–verb agreement, pronoun case, articles, or required complements.

## What the pool count actually means

A pool is an indexed set of entries available to a particular semantic slot. It can contain words, inflected lexical entries, or complete phrases. It is not necessarily a distinct part of speech. Different pools can overlap or contain the same entries while serving different grammatical roles.

| Pool source | Registered pools | One choice | Multiple choices | Empty |
| --- | ---: | ---: | ---: | ---: |
| Authored grammar and feature-specific pools | 212 | 25 | 186 | 1 |
| Generated development dependency pools | 2,878 | 2,596 | 282 | 0 |
| **Total** | **3,090** | **2,621** | **468** | **1** |

**84.82% of registered pools are singletons.** A different key cannot change a slot with only one choice. The median pool size is one.

There are two accounting qualifications:

- The `modifier` pool has 2,515 entries but is not referenced by stored rule expansions.
- `frame_preposition:from_gerund` is empty; a layout requiring it cannot be compiled successfully.

Excluding those two gives **3,088 nonempty pools referenced by rule expansions**. This measures static references, not proof that every pool is reachable in an ordinary note. The earlier Stage 2 report's “2,878 lexical pools” counted only the generated dependency component, not the whole runtime.

| Number of entries | Registered pools |
| --- | ---: |
| 0 | 1 |
| 1 | 2,621 |
| 2–5 | 298 |
| 6–20 | 104 |
| 21–100 | 48 |
| 101–1,000 | 7 |
| More than 1,000 | 11 |

The authored component has 73 distinct sets of entry IDs across its 212 registered pools. Inflection and context account for much of this repetition. This does not mean there are exactly 73 linguistic categories: identical membership can still be rendered differently, and different entries can share a spelling. Reducing the number of pool names alone would not increase variation.

Some useful pools illustrate the range:

| Pool or family | Choices | Scope |
| --- | ---: | --- |
| Complete singular noun phrase | 4,234 | Names, places, mass nouns, and definite count-noun phrases |
| Count nouns | 2,666 | Separate singular/plural uses share entries |
| Attributive adjectives | 2,515 | Modifiers before nouns; not all valid as predicates |
| Person names | 1,001 | Bare name choices |
| Direct address | 1,023 | Names and address words such as friend/doctor |
| Geographic names | 517 | Ordinary names; another 18 are geographic labels |
| Predicate adjectives | 387 | The adjective in “Sarah is …” |
| Reviewed transitive verbs, base form | 93 | Other forms and grammatical contexts have separate pools |
| Reviewed intransitive verbs, base form | 50 | Gerund pool has 48 |
| Legacy present transitive verbs | 36 | Some simple parses still use this smaller family |
| Object pronouns | 7 | Object-case forms |
| Compatible you/we/they subjects | 3 per pool | Same supported conjugation class |
| I-only subject | 1 | Constrained by its surrounding agreement construction |
| Greetings | 4 | hello, hi, hey, greetings |
| Significance expressions | 9 per form | “mean a lot to,” “matter very little to,” etc. |

The complete singular pool contains 2,666 count-noun phrases, 1,001 person names, 493 places, 45 mass nouns, and 29 other proper names after deduplication. Count-noun phrases occupy about 63% of that domain. Thus a large pool is not necessarily balanced across kinds of expression or everyday frequency.

The vocabulary contains 16,321 entries and 11,295 distinct entry spellings. Those counts include phrases and duplicated grammatical senses. They should not be described as 16,321 independent everyday words.

## What the grammar currently supports

The runtime has **8,217 stored production records**:

- 5,523 local dependency productions extracted from development annotations.
- 289 wrappers that admit generated root categories as utterances.
- 2,405 other records for the base grammar, productive constructions, numeric formats, and phrase variation.

The total includes 41 numeric records. There are 8,174 rule parse declarations plus 45 aliases; phrase recognition expands these into 8,790 runtime parser productions. These are implementation counts, not 8,217 distinct human sentence patterns. Agreement forms, attachment categories, punctuation, and lexical recognition multiply the records.

The grammar supports recursive coordination, multi-sentence notes, subjects and objects, tense and auxiliaries, questions, negation, adjective predicates, selected complements, passive constructions, some relative and embedded clauses, prepositional phrases, greetings, direct address, and several number/time/date formats. Recursion allows arbitrarily long finite derivations in the grammar; practical memory and latency still matter.

The generated component is much more narrowly partitioned than “noun,” “verb,” or “adjective.” Its signatures retain morphology, dependency attachment, complement frames, prepositions, pronunciation onset, countability, possessive spelling, determiners, and other local conditions. Unreviewed words often retain their lemma in the signature, isolating them from alternatives. Closed grammatical words frequently become fixed literals.

Some restrictions prevent actual syntax errors. Others conservatively preserve distinctions observed in a small training sample, even when a broader construction could handle them. We currently pay for that conservatism with many singleton pools and poor interchangeability between grammatical families.

The existing measurement remains **983/1,000 development sentences**, **33/33 project cases**, and **0/3 intact source notes**. It is a development-trained score, not a held-out estimate of general English coverage. Passing alternate-key parser replay establishes compatibility with our own grammar; it does not establish that a person finds the result natural.

## Why your example stays so similar

I inspected the current parse of:

> this is cool. sarah is sexy.

It has only three variable slots:

| Position | Representation | Choices |
| --- | --- | ---: |
| this | Fixed literal | 1 |
| is | Fixed literal | 1 |
| cool | Predicate adjective | 387 |
| period | Fixed literal | 1 |
| sarah | Complete singular noun phrase | 4,234 |
| is | Fixed literal | 1 |
| sexy | Predicate adjective | 387 |
| period | Fixed literal | 1 |

The current noun-phrase change already allows Sarah to become something other than a name. But every reading still has the broad structure:

> this is ADJECTIVE. SINGULAR-NOUN-PHRASE is ADJECTIVE.

There are **387 × 4,234 × 387 = 634,121,946 possible slot combinations** for that layout. That is a domain-size calculation, not a measured number of natural readings or a security claim. Hundreds of millions of combinations can still feel repetitive because their sentence skeleton is the same.

For a new packet with author key `test` and a salt of 16 zero bytes, the current implementation produces:

| Reader key | Actual reading |
| --- | --- |
| t | this is dark. the jersey is lonely. |
| te | this is smooth. ellie is ready. |
| tes | this is pink. ezra is alright. |
| test | this is cool. sarah is sexy. |

These reproduce the issue on the current build; they are not claimed to reproduce the salt or packet from your original link. Across reader keys `review-000` through `review-063`, all 64 readings were distinct, but all 64 began with “this is,” contained two “is” clauses, and retained the two sentence boundaries. Twenty-three had six space-separated words and 41 had seven, reflecting phrase-length variation inside the fixed structure.

“The jersey is lonely” also exposes a different issue: valid syntax does not guarantee ordinary meaning. We are already permissive about semantic plausibility while remaining restrictive about structural variety.

## How widespread the restriction is

The current layout audit covers the 983 passing development sentences:

| Observation | Measurement | Implication |
| --- | ---: | --- |
| Semantic slot occurrences | 4,558 | Positions selected by the recorded parses |
| Singleton slot occurrences | 2,465 / 4,558 = 54.08% | Over half cannot change under another key |
| Generated dependency slot occurrences | 4,440 / 4,558 = 97.41% | Benchmark parses overwhelmingly use the narrow generated component |
| Fixed word-literal occurrences | 4,970 | Additional visible words outside the semantic slots |
| Sentences with no variable slots | 217 / 983 = 22.08% | Their text cannot change under any reader key |
| Unchanged readings in a deterministic sample | 10 / 50 | One sampled alternate key per selected sentence |

These percentages describe this development corpus, not all possible user notes. Fixed literals and semantic slots are different units; their counts are not a complete token-level disclosure percentage. The 50-reading sample is descriptive, not an independent probability estimate.

The practical conclusion is that adding adjectives to the broad authored pools will not automatically improve the narrow generated slots used by most benchmark parses. Pool consolidation and shared grammatical abstractions need to reach that component too.

## Which constraints should become looser?

“Less strict” can mean several different changes, with different results:

| Constraint | Proposed treatment | Reason |
| --- | --- | --- |
| Exact author's clause shape | Allow keyed alternatives | Main source of repetitive readings |
| Exact word order | Allow declared grammatical constructions and reorderings | English permits alternatives, but arbitrary permutations fail |
| Names versus places versus common nouns | Share complete compatible phrases; broaden contexts | Often the same syntactic job, provided articles and agreement travel with them |
| Person/number agreement | Preserve or regenerate from the selected subject | “They is” is an avoidable error |
| Pronoun case and required articles | Preserve or regenerate | “Me am ready” and “a apple” are not useful variation |
| Verb complements and prepositions | Keep dependencies together | “Put the book” and “depend at Sarah” are not fixed by broad POS pools |
| Exact semantic topic or plausibility | Relax substantially; prefer ordinary combinations where practical | A different key need not preserve the intended meaning |
| Informal author phrasing | Add explicit conversational constructions | Fragments, contractions, and restarts can be legitimate notes |
| Exact sentence count, tense, and punctuation pattern | Consider broader alternatives after clause variation works | High variation, but a larger encoding change |

Your intuition is partly right: broader grammar and pools can admit more notes and yield more readings. However, acceptance coverage and output diversity are independent. A permissive parser can accept a hundred new structures while the current decoder still freezes whichever one the writer used. Conversely, adding a thousand adjective choices changes many readings without accepting a single new construction.

There is also no need to demand strict real-world feasibility. “The city is asleep” can be natural metaphor; rigid person/place/object rules would reject it. The useful boundary is reliable syntax, reasonable default combinations, and room for figurative or unusual meaning.

## Ways to increase variation

| Approach | Structural variety | Effect on author coverage | Main tradeoff |
| --- | --- | --- | --- |
| Add words to existing pools | Low | Helps missing vocabulary | Same public skeleton; rare or incompatible senses can dominate |
| Merge pools at complete phrase boundaries | Medium within phrases | Helps compatible phrases and recombination | Must carry articles, inflections, and complements together |
| Generate agreement and grammatical words from selected features | Medium | Supports more combinations with fewer rigid splits | More dependencies to encode and render correctly |
| Keyed selection among whole clause constructions | High | Helps if the parser accepts the same construction family | Requires a new reversible representation |
| Keyed sentence grouping, clause order, and punctuation | Very high | Helps multi-clause and informal notes | Larger search space and discourse-coherence risks |
| General finite-budget grammar encoding | Very high | Potentially broad, but still limited to its grammar/vocabulary | Highest complexity, performance, and ambiguity risk |
| Language-model-generated or rewritten readings | Potentially high | Potentially broad | Exact recovery, determinism, versioning, and every-key validity need a separate design |

**1. Consolidate overly narrow pools, starting with the generated component.** Rank singleton slots by their frequency in actual notes, then review which signature distinctions are essential. A noun's occurrence as an object rather than a subject often need not restrict its lexical identity if the surrounding construction handles its form. Pronunciation onset is necessary when “a/an” is frozen, but could become a rendering dependency instead. Unknown senses need review rather than blind merging. This is the most direct route to fewer unchanged words, although it will not solve fixed clause shapes by itself.

**2. Select features first and realize the dependent words together.** Instead of freezing “is” and then restricting the subject, select the subject and its number/person, then render “am/is/are” as appropriate. Likewise, select a noun phrase and generate its article; select a verb with its required frame and generate the complement arrangement. This moves strictness into construction, allowing a broader choice of complete grammatical outcomes. It also lets “this” participate in a referent choice instead of remaining a literal forever.

**3. Make a predicate or clause a keyed choice.** This is the strongest next architectural experiment. A family could include adjective predicates, intransitive events, transitive events, and location statements. Illustrative future readings of the same packet might be:

> those flowers look lovely. marcus is waiting outside.
>
> the musician found a letter. it seems unusual.
>
> after lunch, we can visit denver.

These are design targets, not outputs currently supported for this packet. They do not need to preserve the author's meaning. Each must be a complete supported derivation, and the author key must still recover the original canonical note. Start with a small reviewed family of declarative clauses; questions, commands, and variable sentence counts can follow.

**4. Use grammatical reorderings where they are useful.** Moving a time adjunct between “Tomorrow, Sarah will leave” and “Sarah will leave tomorrow” gives safe variety. Active/passive constructions and coordinated clauses offer more. But cosmetic reordering alone will not turn two adjective predicates into an event or request. Freely shuffling words is unsuitable; the alternative ordering needs its own grammar and agreement realization.

**5. Balance naturalness across whole choices.** A domain containing thousands of rare count nouns can overwhelm names and common referents. Consider construction-level and lexical-frequency weights, plus broad compatibility cues such as a human subject for “apologize.” Avoid permanently exposing the author's semantic category: the reader's key should be able to change the category and its compatible predicate together. Soft preferences should leave room for metaphor. These weights must be part of a defined reversible encoding, not a cosmetic rewrite after decoding.

**6. Broaden conversational input separately.** Add productive support for fragments, common contractions, omitted material, comparisons, stranded prepositions, and discourse connections. The remaining benchmark failures include restarts and incomplete salutations, so “all inputs must be formal complete sentences” is too narrow for the product. Supporting such constructions explicitly is different from accepting arbitrary token order. New coverage should be tested on fresh messages declared before implementation.

**7. Treat unrestricted generation as a longer-term option.** A language model might help propose vocabulary senses, constructions, or human-review candidates offline. An unconstrained rewrite at read time does not by itself provide the codec's recovery and every-key guarantees. If used for decoding, its model, tokenization, probabilities, termination, and representation would need to be reproducible and versioned. That is a different design effort, not a shortcut around the current grammar.

## Why whole-construction variation changes the codec

The present packet contains the chosen grammar tree in the public layout. The decoder validates that tree and determines the number and sizes of semantic fields before interpreting the reader key. The key transforms the field values; it does not choose the tree. The mapping seed also incorporates the public layout.

Consequently, making the parser less strict will not remove this architectural constraint. A construction with one adjective and a construction with a verb plus two arguments have different fields and different domain sizes. Selecting either at random while reusing the old fields would not preserve invertibility or even valid decoding.

A possible replacement would encode a choice from the **union of several complete grammatical construction domains**. Each construction occupies a defined part of that domain. The key transforms the encoded choice; decoding determines the construction and then its components. The writer needs an inverse mapping that recovers the original canonical derivation under the author key. Construction selection, field counts, and realization must be designed together.

Important design obligations would include:

- Unequal construction sizes: allocation must be explicit; simply taking a remainder or dropping unused fields can create collisions or lost information.
- Ambiguous parses and duplicate surface strings: use a deterministic canonical encoding or explicitly account for alternative derivations.
- Termination: do not try to count all derivations of an unbounded recursive grammar. A finite complexity/length budget per packet can define a finite domain, with expandable budgets for longer notes. Budget boundaries introduce their own disclosures and performance tradeoffs.
- Key derivation: derive enough state from a public version/salt/envelope to decode the keyed structure; avoid depending on a layout that is itself unknown until decoding.
- Packet length and public metadata: variable structures need a defined framing strategy. A broader domain can hide the exact tree while still revealing a length or complexity bucket.
- Versioning: existing public-layout packets cannot acquire these semantics through a vocabulary update. A new format/version and an explicit migration policy would be needed.

This would replace a deliberate simplification in the current codec. The earlier global finite-rank prototype was removed because it did not support the intended unbounded recursive language. A new proposal must address that limitation explicitly rather than resurrect it under a new name. More varied or more natural outputs also do not, by themselves, establish cryptographic security.

## Recommended order and success measures

1. **Measure and review the dominant restrictions.** Use the current counts as a baseline, then add a fresh set of ordinary user messages. Rank frequently used singleton and fixed-word positions. Review syntax and ordinary meaning separately.
2. **Unify compatible phrase interfaces and move agreement into realization.** Extend the broad noun-phrase approach into common generated contexts. Keep verb complements together. Target useful constructions rather than minimizing pool count.
3. **Prototype a separate format for keyed clause families.** Begin with adjective predicates, intransitive clauses, transitive clauses, and location statements. Demonstrate exact canonical recovery, different clause shapes across keys, deterministic replay, and total decoding within the prototype's declared finite domain before broadening it.
4. **Expand conversational grammar and complete-note handling.** Track new author coverage independently from output variety. Retain every existing failure and do not tune a held-out evaluation set.
5. **Add sentence grouping and naturalness weighting after the reversible representation works.** Review diverse alternate readings independently rather than relying only on the same parser that generated them.

Track at least these separate outcomes:

| Measure | Current evidence / desired direction |
| --- | --- |
| Fresh author-message acceptance | Not yet established; measure unseen sentences and whole notes |
| Canonical author recovery | Must remain exact for supported inputs |
| Alternate-reader syntax | Existing structural replay passes sampled keys; add independent human review |
| Distinct clause shapes per packet | One broad shape for this example; require multiple shapes in the prototype |
| Fixed-word and singleton exposure | Reduce the measured 54.08% singleton-slot share and 22.08% no-choice sentence share on the retained benchmark |
| Naturalness | Separately score syntax, plausible meaning, and conversational fluency |
| Diversity balance | Measure distribution across constructions and referent kinds, not just unique strings |
| Practical cost | Compare encoding/decoding latency, composer latency, packet size, and memory |

**My recommendation is to keep grammatical dependencies strict while making the selected construction flexible.** The current system is already permissive enough to produce odd meanings, yet it freezes too much of the author's syntax. More adjectives are useful, but keyed clause selection is the change that directly addresses why “this is cool. sarah is sexy.” still feels recognizable under every key. Coverage expansion and structural variation should proceed as separate measured objectives that share the same grammar.

## Evidence and scope

Counts were obtained directly from `createGrammar(...).pools`, the exported grammar contract, and the generated dependency grammar. The example was parsed, encoded, and decoded using the current runtime. Existing benchmark implementation hashes were checked against current files; the full benchmark was not rerun because this review made no implementation changes.

Primary local references:

- [Runtime pool construction and parser](../src/grammar.js)
- [Grammar contract and phrase choices](../src/grammar-contract.js)
- [Codec: public layout and semantic transformations](../src/codec.js)
- [Dependency extraction and signature restrictions](../tools/vocabulary/build_dependency_grammar.py)
- [Current layout audit](coverage/stage2-layout-audit.json)
- [Current development measurement](coverage/stage2-progress.json)
- [Ranked remaining gaps](../stage_2_report.txt)
- [Previous phrase-variation changes and limitations](coverage/key-variation.md)

All architectural alternatives and illustrative future readings above are proposals, not implemented capabilities or measured future coverage gains.
