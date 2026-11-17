# Development-trained dependency grammar

The Stage 2 implementation supplements the manually specified feature grammar
with local dependency productions extracted from the **development split** of
the pinned UD EWT and GUM sources. This changes how the development measurement
must be interpreted: it is now explicitly a training-set engineering score,
not evidence of 90% coverage of unseen English. Validation and acceptance have
not been read or used to generate these productions.

`tools/vocabulary/build_dependency_grammar.py` verifies the corpus/source hashes
and selects only development sentence IDs and the constituent sentences of the
three development notes. It aligns UD tokens with the production tokenization,
collapses contractions, and compiles projective dependency neighborhoods to
phrase rules. The browser receives rules and finite lexical pools, without
sentence IDs, a sentence index, or whole-sentence matching. The audit file
retains readable grammatical signatures and reasons for skipped training trees.

Phrase types preserve attachment, morphology, case/markers, article onset,
delimiter interfaces and significant joining. Content slots retain observed
complement frames, reviewed lexical roles and inflections. Grammatical operators
and a declared inventory of fixed expressions remain literal. Unreviewed senses
are separated by lemma and explicitly recorded as singleton pools instead of
being swapped with arbitrary words sharing a POS tag. Numeric classes preserve
width, padding, singular/non-singular counts and conservative value ranges.
The same production records drive recognition, suggestions, layout validation
and decoding. Sentence endings use the shared document grammar so learned
utterances can combine with manually implemented constructions in notes.

The generated grammar is sparse and strongly influenced by its training data.
Source annotations contain inconsistencies and transcripts contain interrupted
speech and authored errors. The browser does not correct these into standard
English. Alternate-key replay checks structural closure; it is not independent
English grammaticality review. Narrow pools and fixed words expose content in
the public layout, and some messages have no variable slots. The measured layout
audit must accompany any coverage claim. This is a pre-release limitation, not a
claim of semantic secrecy or Stage 2 completion.

A separate productive grammar implements cross-family coordination, auxiliary
chains, question/relative gaps, selected complements and gerund phrases without
using source phrase patterns. A set of 15 newly authored ordinary messages
exposed poor recombination in the first extraction-only candidate (2/15 passed).
Those messages are now explicit regression fixtures; their subsequent success
is not independent acceptance evidence.

Reproduce offline, in order:

```
python3 tools/vocabulary/build_dependency_grammar.py
python3 tools/vocabulary/extend_stage2.py
node tools/coverage/run.js --stage2
node tools/coverage/stage2-diagnostics.js
node tools/coverage/layout-audit.js
python3 tools/coverage/stage2-report.py
```

The dependency rules and lexical extracts are derived from Universal
Dependencies English EWT r2.15 (CC BY-SA 4.0) and English GUM r2.15 (CC BY-NC-SA
4.0). Preserve the source credits, license notices and upstream links in
`data/coverage/sources/ewt-README.md`, `gum-README.md` and the manifest when
redistributing derivatives. The generated audit records each source hash,
license and attribution. CMUdict supplies pronunciation onsets under its retained
license. The executable extraction code is project code; it does not remove the
attribution or license obligations of the derived grammar and lexical data.
