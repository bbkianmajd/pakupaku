# Development coverage above 90%

## Target and guardrails

Raise the existing 1,000-sentence development benchmark from 145 passes to at
least 901 full-pipeline passes. Keep every source sentence, ID, source hash and
failure in the denominator. Preserve the 33 project cases, malformed-input
controls, exact canonical author recovery, prefix entry and alternate-key
replay. Complete-note results remain a separate gate. This engineering target
does not replace the 99.5% Stage 2 gate or independent acceptance testing.

## Execution plan

1. Freeze the 145-pass result and its implementation for comparison. Add a
   fast parser/round-trip diagnostic so each iteration has measured evidence.
2. Remove repeated work in incremental parsing and suggestions. Use the same
   recognizer and typed layout for the composer, benchmark and reader.
3. Expand sourced lexical roles and inflections in bulk. Use the existing
   licensed sources and development annotations only; retain provenance,
   grammatical features and frame distinctions. Do not open held-out splits.
4. Address the architecture limiting coverage: supplement the hand-written
   grammar with reusable dependency productions derived from the development
   treebank. Generalize local phrase structures, not complete sentences. Each
   production must retain explicit grammatical features, function words and
   complement frames. Keyed lexical pools must have compatible grammatical
   signatures. No sentence lookup, arbitrary token-run fallback, untyped
   unknown-word acceptance or silently preserved unknown text is permitted.
5. Iterate on the largest remaining structural, lexical and surface failures.
   Test unseen combinations and reject agreement, case, complement, article,
   delimiter, clock and amount errors after each grammar expansion. Audit the
   public layout, singleton pools and sampled alternate readings; recognition
   alone does not establish English grammaticality.
6. Freeze the implementation and rerun the complete production benchmark,
   JavaScript/Python checks and actual Chromium worker/composer cases. Update
   the ranked gap analysis with new passes, regressions, notes, timings and
   remaining limitations. Record the actual outcome, even if the target fails.

## Why change the architecture

The 145-pass snapshot has 642 sentences with missing lexical forms, 197 with
only known-word construction failures and 64 with unsupported surface tokens
(overlapping counts). Small hand-picked additions cannot economically cover
this breadth. Reusable phrase rules and a sourced lexical pipeline are needed.
The development score is a training-set engineering measure; derived grammar
rules must be disclosed as development-trained. They do not constitute
independent validation, even when source sentences were independently written.

## Execution log

- Starting snapshot: 145/1000 sentences, 0/3 complete notes, 33/33 project cases.
- Implemented reproducible local dependency rules, explicit lexical classes,
  productive clause/phrase composition, indexed lexical pools and bounded caches.
- Extraction-only generalization check: 2/15 new ordinary messages passed;
  productive fixes now pass all 15. These are retained as regression fixtures.
- Fixed quoted-possessive entry, double-dash segmentation, significant joining
  and possessive-name pool separation exposed during full-pipeline testing.
- Final frozen benchmark: **983/1000 (98.3%)**, 838 newly passing cases,
  **zero regressions**, **0/3** intact source notes and **33/33** project cases.
- Verification: **47** JavaScript tests, **7** Python tests and **36** actual
  Chromium composer/worker cases pass. Generated artifacts reproduce exactly.
- Updated [stage_2_report.txt](../../stage_2_report.txt), prefix diagnostics,
  root-cause inventory, layout disclosure audit and Stage 2 engineering status.
- The requested development checkpoint is achieved. The grammar uses development
  annotations, so unseen-language coverage is unproven. Singleton/fixed-word
  disclosure, source-note failures, validation and independent decoy review
  remain open; Stage 2 is not complete.
