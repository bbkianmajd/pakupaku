# Execution plan

## Objective

Deliver a static, entirely client-side note composer and reader that supports more than 99% of ordinary English sentences and complete notes in the defined use case. Ordinary unsupported phrases should be difficult to find. Every reader key must produce grammatical text; the author's key must recover the canonical note exactly.

Coverage is currently unmeasured. Product acceptance requires both an independent coverage benchmark and deliberate challenge testing. A known common unsupported construction blocks release even when the aggregate score passes. The implementer owns systematic testing; owner reviews assess scope, output quality and usability after the automated gates pass.

## Existing foundation

| Component | Status | Remaining work |
| --- | --- | --- |
| Static scaffold and design documents | Implemented | Finish the production UI and deployment checks |
| JavaScript encoder/decoder | Implementation complete | Integrate expanded grammar and preserve codec invariants |
| Recursive stored layout, numeric domains and iterative semantic feedback | Implemented | Validate new constructions and their decoys; complete product review |
| Vocabulary importer and version loader | Implemented | Broaden lexical coverage and grammatical classification |
| Current vocabulary | Available: 6,005 distinct words, including 1,000 sourced names | Measure missing words/forms and expand from corpus evidence |
| Browser demo | Partial implementation | Complete composer, suggestions, accessibility and device testing |

The existing [codec](codec-implementation.md) and [vocabulary pipeline](vocabulary-source.md) are inputs to the stages below. Their implementation status does not establish English coverage. Existing checks include long recursive notes, numeric boundaries, author-key recovery, alternate-key composer replay and browser worker execution. Full independent language acceptance remains outstanding.

## Delivery sequence

Complete stages 1–5 in order; stage 6 governs maintenance after release. Grammar, vocabulary, codec and composer changes within a stage must be tested together. A stage closes when its deliverables, automated checks and owner review are recorded. Stage 2 has intermediate engineering checkpoints, not separate release approvals.

| Stage | Status | Deliverable | Automated completion gate | Owner review |
| --- | --- | --- | --- | --- |
| 1. Establish the language benchmark | Baseline implemented — owner scope review pending | Corpus, construction inventory, measurement harness and baseline report | Reproducible results; source provenance and independent splits verified; all failures counted | Confirm language scope and sampling mix |
| 2. Implement broad English support | In progress — 98.3% development-trained sentences; 0/3 source notes; stage gates fail | Shared feature-aware grammar, expanded vocabulary and compatible codec | At least 99.5% development and validation sentence/note success; grammar and codec invariants pass | Review coverage report, remaining failures and representative decoys |
| 3. Complete the browser experience | Partial demo | Finished composer and reader with suggestions, key controls and accessible errors | Browser flows, prefix replay, local-only processing, responsiveness and accessibility checks pass | Use desktop and phone; review editing and reading behavior |
| 4. Validate product acceptance | Planned | Frozen candidate and independent acceptance report | Greater-than-99% statistical gate and zero-failure challenge gate both pass; no known common language gaps | Review evidence and complete one usability walkthrough |
| 5. Publish on GitHub Pages | Blocked on stages 1–4 | Static release, published vocabulary and contributor instructions | Clean checks, deployment smoke and exact vocabulary loading pass | Open the public site, exchange a note and approve release wording |
| 6. Maintain coverage | Planned — begins after release | CI regression gates and fresh release audit reports | No unexplained regressions; material language changes pass fresh acceptance | Review release report and any scope changes |

## Stage 1 — establish the language benchmark

**Deliverables:** a benchmark manifest describing scope, sources, licenses, sampling, splits and normalization; a repeatable coverage runner; a machine-readable failure inventory and readable report. Keep fixtures under `data/coverage/` and reports under `documentation/coverage/`. Implemented artifacts: [manifest](../data/coverage/manifest.json), [construction inventory](../data/coverage/inventory.json), [runner](../tools/coverage/run.js), and [baseline report](coverage/baseline.md). The initial corpus is a small independent-source pilot; representative release collection remains required. Owner scope and sampling review is pending.

Run the current production grammar, vocabulary, codec and composer against every development item, including known gaps. Classify failures as tokenization, missing word, missing form/role, noun phrase, verb frame, agreement, clause structure, punctuation, ambiguity, codec or UI. Preserve secondary failures: after adding a missing word, a missing construction may still block the note. Prioritize construction families by the number of real failures they address and their dependencies.

**Tests and success:** reproducible counts and denominators; unsupported items remain failures; deduplication and split isolation checks pass; source and corpus hashes are recorded; baseline report clearly says coverage is unproven. **Owner review:** confirm the use-case mix and exclusions once, using a sample and the report. The owner does not supply the test corpus or enumerate missing phrases.

Include the construction inventory specified below in the baseline report. Audit it against grammar references and corpus annotations before ranking implementation tasks. The output of this stage is a measured backlog of construction families and lexical gaps, with dependencies and evidence; it is not a list of individual phrases to patch.

## Stage 2 — implement broad English support

Progress and remaining gates: [Stage 2 engineering report](coverage/stage2.md). The original 1,000-sentence baseline is retained; current measurements are in [stage2-progress.json](coverage/stage2-progress.json).

**Deliverable:** a shared grammar and vocabulary that supports ordinary language across the benchmark while preserving reversible encoding and grammatical decoys. Work through the following three checkpoints in order, using the stage 1 failure inventory to prioritize within each checkpoint. Owner review occurs after the stage completion gate.

### Shared grammar and lexical model

Represent phrases using grammatical features: person, number, case, tense, aspect, mood, countability and required complements. Define shared noun-phrase, verb-phrase, clause and utterance productions with composable optional modifiers. Model verbs by their permitted complement frames: no object, direct object, indirect object, required prepositional complement, predicative complement, infinitive and clause complement. A word can have multiple senses/roles and frames; membership in a generic verb list is insufficient.

Audit the full high-frequency function-word inventory: articles, determiners, demonstratives, pronouns, possessives, auxiliaries, conjunctions, prepositions and interrogatives. Expand sourced lexical forms systematically, including irregular forms and common regional spellings. Record ambiguous or incomplete classifications for review. Evaluate the current 10,000-entry and ASCII-only schema restrictions against corpus failures and revise them before release if necessary; these prototype restrictions must not define the coverage target.

Use one declarative grammar contract for parsing, prefix suggestions, tree serialization and rendering. Define deterministic parse selection and ambiguity handling without silently reordering or paraphrasing input. Keep iterative traversal and no fixed linguistic word/depth ceiling. Benchmark ambiguity growth; any practical resource failure counts against coverage rather than being described as supported.

For each production, specify which features are public in the layout, which lexical choices are mapped by the key, and how dependencies are preserved under every key. For example, changing a subject must preserve or correctly propagate `am/is/are`, pronoun case, determiner compatibility and required verb complements. Exact spelling distinctions such as contractions need reversible representation. Do not patch decoys after decoding in ways that lose reversibility. Flag pools with only one choice and fixed literals because they reveal content even when grammatical.

Checkpoint tests: generated combinations of grammatical features, rejection of invalid controls, parse/layout/render agreement, deterministic handling of ambiguous parses, exhaustive small-pool mapping tests, randomized larger-pool tests and composer prefix replay. Complete this foundation before expanding construction families.

### Everyday constructions

Implement the following families using the foundation, with lexical and grammar work delivered together:

- General noun phrases: `a/an/the`, demonstratives, possessives, bare plurals, mass nouns, quantified phrases, numbers and coordinated noun phrases. Support demonstratives both as pronouns (`this is ...`) and determiners (`this book ...`).
- Copular and existential clauses: noun/adjective/location complements of `be`, person/tense agreement, and `there is/are`. This covers the family containing `this is a test`, `those are my books` and `i am ready`.
- Lexical verbs plus auxiliary chains: common present/past/future, progressive and perfect forms, modals, negation and common contractions. Preserve auxiliary order and verb forms.
- Yes/no and wh questions, requests and imperatives; subject/object case and auxiliary inversion; common complements and prepositional/adverbial modifiers.
- Greetings, responses and discourse fragments through productive utterance rules, with lexical inventories for genuinely fixed expressions. Multi-sentence documents and supported punctuation must combine with every clause family.

Checkpoint gate: at least 95% full-pipeline sentence and complete-note success on development data. Test unseen combinations of subjects, verbs, complements and modifiers, mixed multi-sentence notes, author-key recovery and alternate-key replay. Preserve all previously accepted inputs.

### Recursive constructions and vocabulary breadth

Add recursive relative and subordinate clauses, complement clauses, conditionals, comparisons, passive constructions, infinitives and participial phrases, broader coordination and ordinary ellipsis where the corpus requires them. These are composable families, not a list of accepted sentences. Exercise nesting and combinations across families; generated long coordination chains alone do not test this.

Iteratively rank real development failures by frequency and fix their root families. Expand common verb senses/frames, adverbs, function words, names and inflections based on observed failures rather than a target dictionary size. Keep imports reproducible with attribution and classification quality checks. Names beyond the existing 1,000 must count as misses. If a closed name pool prevents the target, design and evaluate a reversible typed name mechanism whose alternate-key readings remain ordinary names; do not silently pass unknown text through unchanged or guess arbitrary grammatical roles.

Give dates, times, decimals and common numeric expressions explicit structures and compatible domains where the corpus requires them. Preserve structural dependencies such as agreement and date validity under alternate keys. Review public-layout disclosure alongside each expansion. Before the first release, grammar and payload changes may replace experimental formats in place, retaining the pre-release version convention; no backward compatibility is required for unpublished links.

**Tests and definition of success:** at least 99.5% full-pipeline development and validation sentence and complete-note success; no regressions; evidence for every required construction family. Independently review at least 1,000 alternate-key readings sampled across families and fix all discovered grammatical faults. Odd meaning is acceptable; broken agreement, impossible grammatical complements, raw markers and unknown words are defects. Record review criteria and disagreements. Profile grammar ambiguity and vocabulary growth; revise prototype schema limits when they prevent the target.

**Owner review:** inspect the coverage report, remaining failure categories, a small decoy sample and what the public layout reveals. If the target cannot be met, address the architecture or lexical constraint before marking the stage complete.

## Stage 3 — complete the browser experience

**Deliverables:** production composer and reader, trie-filtered suggestions driven by the shared grammar, automatic lowercase normalization, punctuation handling, live invalid-token highlighting, accessible feedback, copy/share actions and responsive layout. Support typing, pasting, editing, undo and continuation after a complete sentence without requiring users to rewrite supported language.

Provide a random default author key, the minimum three-character authoring rule, live key changes and an explicit reader Render action. Reader inputs, including empty and short strings, must always produce a reading for a well-formed supported payload without a key-correctness indicator. Keep the author's note fixed when changing the author key; update the link and preview. Never persist keys or transmit notes for processing.

**Tests and definition of success:** exercise complete browser flows through the actual worker, prefix suggestions, keyboard navigation, screen-reader feedback and desktop/mobile browsers. Test rapid input changes, cancellation, long notes, malformed links, missing vocabulary versions and safe rendering of hostile fragments. Verify local-only processing and absence of key storage. Establish explicit device-specific latency budgets and meet them for loading, suggestions and key changes. Show build identity so the tested assets are identifiable. The stage completes when the finished UI meets these checks and exposes the same supported language as the benchmark harness.

**Owner review:** compose, share and reopen one ordinary multi-sentence note on desktop and phone; assess editing, feedback, speed and reader behavior. The automated corpus supplies breadth testing.

## Stage 4 — validate product acceptance

Freeze the grammar, vocabulary, codec, corpus manifest and normalizer by hash. Run the locked benchmark and publish the confidence calculations and complete failure report. Run the full acceptance set through the actual browser worker/composer path in a reference browser, not just a parser CLI. Run a representative cross-family end-to-end subset across supported desktop and mobile browsers; test paste, typing, suggestions, encoding, reopening the link and recovering with the original key. Ensure a fresh local server serves the tested assets and show build identity so stale pages are diagnosable.

Profile vocabulary loading, parsing, incremental suggestions, key changes and long-note behavior. Record device/browser details and input lengths; establish explicit responsiveness budgets before the run. Timeouts, crashes, unusable stalls and transport failures count as end-to-end failures and must be reported separately from grammatical rejection. Resource handling must never masquerade as a wrong-key response.

**Tests and success:** both lower confidence bounds strictly exceed 99%, the category safeguards and independent challenge gate pass, the construction inventory has evidence for all required everyday families, no known common unsupported construction or codec invariant failure remains, and browser results match the benchmarked implementation. Coverage alone cannot excuse an incorrect author-key round trip. **Owner review:** the report plus one optional ordinary note and a usability walkthrough. The owner approves usability and scope; automated acceptance establishes breadth. If the gate fails, return to the responsible stage and use fresh acceptance data after fixing it.

## Stage 5 — publish on GitHub Pages

**Deliverables:** deployable static files, a release tag, retained published vocabulary files, source/license attribution, setup instructions and contribution guidance. Document URL size/transport behavior and the distinction between compact local links and third-party shortening. Review public-layout disclosure and the [key-guessing tradeoffs](codec-implementation.md#does-this-make-guessing-harder); iterative feedback is not a demonstrated exponential increase in guessing cost.

**Tests and definition of success:** run all required checks from a clean checkout; verify relative asset paths, CSP, the vocabulary version selected by the payload and explicit missing-version errors. Test create/share/recover on the actual Pages URL using the same candidate accepted in stage 4. No backend or remote dictionary lookup is required. For later releases, verify retained published links; unpublished experimental links do not require compatibility.

**Owner review:** open the public site, exchange one note and approve release wording based on the acceptance evidence. Release is complete when the deployed behavior and documented claims match the accepted candidate.

## Stage 6 — maintain coverage

Run the full known-good grammar corpus, composer replay and deterministic codec checks in CI; run the broader alternate-key and performance suite on release candidates. A newly reported sentence becomes a regression case and triggers analysis of its entire construction family. Add independently authored related cases and generated variations; a one-line phrase exception is not a completed fix.

Maintain versioned reports with corpus hashes, implementation hashes, source mix, denominators, per-category results and unresolved failures. Refresh independent audit data for public releases that materially change language support. Update the coverage documentation from measured results; keep claims scoped to the tested population. Published vocabulary retention follows the release policy; internal edits do not require new vocabulary versions.

**Tests and success:** zero unexplained loss of previously supported behavior; fresh release evidence meets stage 4; no unreviewed weakening of decoder grammar guarantees. **Owner review:** a concise release report and any proposed scope changes, not repeated phrase-by-phrase testing.

## Acceptance specification

The following requirements are shared across the stages. Stage 1 defines the corpus and inventory, stage 2 targets development coverage, and stage 4 evaluates untouched acceptance and challenge data.

### Required construction inventory

Before implementing further families, create a tracked inventory covering the following dimensions. Mark each cell implemented, tested, or blocked, with links to evidence; an untested cell is not supported. Use established grammar descriptions and licensed corpus annotations to check completeness, recording sources. The implementer owns this inventory and cannot rely on owner examples to populate it.

| Dimension | Required everyday coverage |
| --- | --- |
| Communicative use | Statements, yes/no and wh questions, requests, commands, greetings, replies, thanks, apologies, wishes, exclamations and conversational fragments |
| Noun phrases | Articles, demonstratives, pronouns, names, possessives, singular/plural, count/mass, quantifiers, modifiers and coordinated phrases |
| Predicates | Copulas, existence, intransitive/transitive/ditransitive verbs, required prepositions, adjective/noun/location complements and clause complements |
| Verb features | Person/number agreement, ordinary tenses and aspects, modals, negation, contractions, active/passive and combinations of auxiliaries |
| Clause composition | Coordination, subordination, relative clauses, conditionals, reported speech, questions within clauses, infinitives, participles and ordinary ellipsis |
| Surface variation | Common word order, optional modifiers, adverb positions, punctuation, apostrophes, quotation, regional spellings, casing and whitespace |
| Message content | Relationships, work, school, home, plans, travel, food, feelings, instructions, names, dates, times, quantities and multi-sentence conversations |

This inventory is a starting specification to audit against reference material, not a claim that the rows exhaust English. Identify additional ordinary constructions during corpus analysis and challenge testing. Track lexical breadth and grammatical breadth separately. Tests must combine dimensions: supporting questions and perfect tense independently is insufficient if perfect-tense questions fail.

### Coverage measurement

The initial target population is ordinary contemporary English personal messages: greetings, affection, everyday updates, arrangements, requests, questions, explanations, and short or multi-sentence notes. Include ordinary contractions, apostrophes, commas, sentence punctuation, names, possessives, dates, times and numbers. Include common regional spellings and informal grammatical fragments used in messages. Lowercasing and whitespace normalization are allowed and documented; paraphrasing, dropping words, replacing names or changing meaning are not successful support.

A finite dictionary cannot guarantee a 99% acceptance probability for every person's arbitrary input. The evidence will estimate coverage for the declared sampling population, with per-category results exposing weaknesses. Before collection, document treatment of typos, emoji, URLs, code, non-English text and specialist jargon. Retain their counts and report a separate all-submitted-input score; never silently exclude a failing ordinary English sentence, unfamiliar name or inconvenient construction. Changing the population or exclusions requires a new benchmark and owner review, not a retroactive improvement in the score.

For each sampled sentence or note, count success only when all of these work:

1. The actual composer normalization and tokenizer preserve the agreed canonical text, including punctuation.
2. Every word/form is supported and the entire input has a complete parse, without manual repair.
3. The accepted parse encodes, and the author key recovers that canonical text exactly.
4. Every prefix can be entered through the real composer and suggestion API; complete intermediate sentences do not prevent continuation.
5. A fixed, reproducible sample of alternate keys produces complete readings that parse and replay through that same composer. Any failed sample makes the item fail.

Alternate-key sampling tests the implementation; the stronger requirement that every key yields a grammatical reading must also follow from grammar and mapping invariants. Re-parsing alone is insufficient evidence of English grammaticality if the grammar accepts malformed output; independent decoy review is required below. Odd meanings such as `the river ate a clock` remain acceptable.

Report full-pipeline sentence success and full-note success separately. A note fails if any part fails; passing 99% of individual sentences does not imply passing 99% of multi-sentence notes. Also report lexical coverage, parse coverage, round-trip failures, composer failures and decoy failures as diagnostics. Word coverage and generated sentence counts must never substitute for the two primary measures.

### Benchmark and release threshold

- Collect independently authored, legally reusable text from multiple sources representing the agreed use case. Preserve source attribution, license, content hashes and sampling procedure. Use public or explicitly consented text; never collect users' secret notes or keys through production telemetry.
- Keep development data, validation data and a locked acceptance set separate. Split by source document/conversation/author where possible and remove exact and near duplicates across splits. Generated examples and the owner's reported bugs belong in development; they cannot establish real-world coverage.
- Build an acceptance set of at least 10,000 standalone sentence/utterance items and at least 2,000 complete notes, including naturally occurring multi-sentence notes. Do not fill quotas with slight rewrites or thousands of sentences from one author. Keep complete notes intact and do not count their component sentences as additional independent sentence samples.
- Fix category proportions before measuring results, using observed use-case frequencies where available. Publish both the deployment-weighted score and unweighted counts, plus per-source, category, length and name/number breakdowns. Record any uncertain assumptions about the sampling mix.
- Release requires the **one-sided 95% lower confidence bound to exceed 99%** for both full-pipeline sentence success and full-note success. For independent unweighted items use a Wilson bound; for weighted or clustered samples use an appropriate stratified/cluster resampling analysis with a documented method. Sample size alone is not a pass, and a point estimate of exactly 99% fails this gate.
- In addition, each predeclared major use-case category must reach at least 99% observed success, with at least 200 acceptance items per category; collect more data if a stratum is too small. Report uncertainty rather than claiming 99% statistical confidence per category. No known common construction family may be entirely unsupported behind a high aggregate score.
- Aim for at least 99.5% on development and validation to leave room for unseen failures. All acceptance failures stay in the report, classified by underlying cause. Once an acceptance set is used to guide fixes it becomes development/regression data; evaluate the revised candidate on a fresh independent acceptance set.

### Independent challenge gate

1. Before candidate freeze, prepare independently authored challenge batches unavailable to the implementation work. Use independent human-authored sources and a separate review pass with the explicit task of finding ordinary inputs that fail. Automated variation supplements that material; it must not generate only from the implemented grammar.
2. Cover every inventory family, every everyday-use category, short fragments and mixed multi-sentence notes. Include varied names, function words and frequent verb senses. Sample these deliberately rather than letting easy declaratives dominate.
3. Systematically vary valid inputs by tense, person, number, polarity, question form, pronoun/name substitution, modifier insertion, contraction, punctuation and clause embedding. Use grammatically checked transformations; malformed mutations are negative controls, not coverage failures. Exercise pairwise interactions across dimensions and targeted three-way interactions where dependencies exist.
4. For each final candidate, run at least 2,000 unseen, distinct ordinary challenge inputs across at least two independently prepared batches. Require **zero unsupported in-scope inputs in those batches**, zero author-key recovery failures and zero observed structural decoy defects. This finite challenge gate does not prove universal English support, but it is stricter than accepting an easy 99% average.
5. A failure triggers a construction/lexical-family fix, related regression tests and a fresh challenge batch after the candidate changes. Re-running the same corrected examples does not count as an independent pass. Keep scope decisions fixed; do not classify an ordinary failing phrase as out of scope after seeing it.
6. Publish the challenge composition, results, known limitations and unresolved failures alongside the statistical report. **Any known common unsupported construction blocks release**, even if both numerical gates pass. If architecture or vocabulary constraints prevent this, keep the project marked incomplete and address the constraint before requesting owner acceptance.

The owner receives the evidence and a usable candidate after these gates. Their manual test is a final usability review, not the next source of basic English requirements. Absolute support for every possible English string is not promised; making ordinary failures difficult to discover is an explicit acceptance condition, backed by independent sampling and deliberate attempts to break the candidate.

## Implementation constraints

- Use reusable grammatical productions and typed lexical slots. Fix construction families rather than adding phrase exceptions. Parsing, suggestions, layout encoding and decoding must share the same contract.
- Keep recursive composition without a hard-coded linguistic token or nesting limit. Benchmark practical browser and URL limits and report failures honestly.
- Preserve exact canonical author-key recovery and grammatical readings for every reader key. Test these throughout grammar expansion; passing coverage cannot excuse a codec defect.
- Build vocabulary offline from pinned, attributed sources; deliver static JSON to browsers. Keep ambiguous roles and missing verb frames reviewable. Schema and dictionary-size limits are implementation choices to revisit when they block required coverage.
- Keep the pre-release vocabulary at `1.0.0`. Internal revisions need neither a version bump nor backward compatibility. After publication, retain exact published vocabulary files and freeze the algorithm; any later algorithm change requires an explicit compatibility design.
- Keep known failures in coverage denominators. Generated examples test invariants; independently authored text measures coverage. Once acceptance data guides fixes, move it into regression data and obtain fresh independent acceptance samples.
