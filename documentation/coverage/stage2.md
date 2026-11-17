# Stage 2 engineering status

**The requested 90% development checkpoint is met; Stage 2 remains open.** The fixed benchmark now passes **983/1,000 sentences (98.3%)**, up from 145/1,000: 838 newly passing cases and zero regressions. Complete source notes remain **0/3**. All **33/33** project cases pass. Every original input and failure remains in the denominator.

This is explicitly a **development-trained measurement**. Local dependency rules and lexical classes were extracted from development annotations. The result does not establish 90% coverage of unseen English. Validation and acceptance were not used or measured. The 99.5% development/validation sentence-and-note gate and independent decoy review remain unsatisfied.

The [execution plan and outcome](road-to-90.md), [ranked gap analysis](../../stage_2_report.txt), [complete measurement](stage2-progress.json), and [previous 145-pass snapshot](stage2-before-90.json) record the evidence.

## Implementation

The shared [grammar contract](../../src/grammar-contract.js) now combines the existing feature grammar, [productive constructions](../../src/productive-grammar.js), and generated local dependency productions. Parsing, suggestions, stored layouts and rendering consume the same records. There is no runtime sentence lookup or arbitrary unknown-text fallback.

Productive additions cover finite coordination, passive/auxiliary chains, relative and object gaps, embedded questions, selected verb/adjective complements, indefinite pronouns, gerund phrases and modifiers. Reviewed nouns, adjectives, verb senses and explicit inflections expand alongside these rules. Learned utterances and productive clauses combine in complete notes. [The dependency grammar design](dependency-grammar.md) documents training selection, licenses and limitations.

Bounded caches reuse recognition results and suggestions for repeated prefixes; lexical indexes avoid repeatedly scanning the vocabulary. Significant joining is preserved in stored layouts. Quoted possessives remain usable while typing an apostrophe, and doubled dashes are separate structural tokens. Possessive names have separate lexical classes from ordinary names. Unknown pronunciations remain separate rather than being assigned guessed article compatibility.

The original examples `hello. i love you. can you help me? meet me at 1530.  ` and `meet me at 2 30 pm` continue to pass. Clock/date validity, numeric agreement, case, article restrictions, required complements, malformed delimiters and monetary controls remain tested.

## Verification

- 55 JavaScript tests pass, including deterministic codec vectors, feature constraints, negative controls, exact recovery, alternate-key replay and real character-by-character quote/dash entry.
- Seven Python vocabulary/import tests pass.
- 43 desktop Chromium composer/worker cases pass, including mixed notes and quote/dash regressions. Requests remain local. See [browser evidence](stage2-browser.json).
- The initial extraction-only experiment passed 2/15 newly authored ordinary messages. Productive grammar changes now pass all 15 through the full pipeline. These are now regression fixtures, not independent acceptance evidence.
- Every successful benchmark sentence passes character-prefix entry, exact author recovery and four alternate-reader replays. The final result has no parser-success/composer, author-recovery or sampled alternate-reader failures.
- Generated grammar, vocabulary/archive and audit outputs reproduce byte for byte. Recorded corpus/source/implementation hashes are checked before producing the gap analysis.

Reproduce using `npm run vocabulary:stage2`, `npm run coverage:stage2`, `node tools/coverage/stage2-diagnostics.js`, `node tools/coverage/layout-audit.js`, and `python3 tools/coverage/stage2-report.py`. Run `npm test` and the Python discovery command in the root README for checks. Browser smoke requires a separately installed Playwright module; `PAKUPAKU_PLAYWRIGHT_MODULE` can identify its entry point.

## Remaining limitations

The 17 failed sentences retain lexical and structural gaps: comparisons, stranded prepositions, layered discourse, interrupted/restarted speech, mathematical labels/ellipsis and unfinished salutations. Their ranked counts and complete texts are in the gap report. The three intact source documents remain separate failed note cases; passing short mixed notes does not replace them.

Sparse lexical classes and distinctive phrase rules disclose content. Many generated pools have one choice; some notes have no variable lexical slots. [The layout audit](stage2-layout-audit.json) measures this and retains a deterministic 50-reading sample. Structural replay is not independent English grammaticality review, and source annotations/transcripts contain errors and disfluencies. The required independent review of 1,000 alternate readings is outstanding.

Next work is fresh, predeclared generalization measurement; broader productive constructions; complete-source-note support; and reviewed lexical equivalence classes that reduce content disclosure without introducing grammatical faults. Do not advance to acceptance or publication on this development score alone.

## Geography follow-up

[The geographic catalog](../geography-vocabulary.md) adds all states, 250 city/state selections including all capitals, and 200 country/territory entities. Complete names share mapped lexical domains; their words are not exchanged independently. Every spelling is tested through parser, renderer and composer, with exhaustive geographic-pool substitution and browser coverage for multiword names. The previous 983-pass implementation is retained as `stage2-before-geography.json`; the current gap report records the comparison.

## Passkey and phrase variation follow-up

[The key/variation audit](key-variation.md) verifies that the complete exact key already enters SHA-256 before mapping; the derivation and fixed codec vector are unchanged. Compatible singular positions now share 4,234 complete noun phrases across names, places, mass nouns and definite count nouns. Agreement-compatible pronouns share pools, 297 predicate adjectives were added (387 total), and selected significance expressions preserve their complements. Both reported messages pass composer/worker checks. The benchmark remains 983/1,000 with zero regressions against `stage2-before-variation.json`; public clause structure and sparse pools remain limitations.
