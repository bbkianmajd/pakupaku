# Language benchmark baseline

**Coverage is unproven.** Only development items were measured. Reserved validation and acceptance pilot splits remain unmeasured. No release gate is satisfied.

Run `python3 tools/coverage/build.py` to reconstruct fixtures, `npm run coverage` to verify provenance/isolation and reproduce this report. No network is needed.

| Independent items | Passed | Total |
| --- | ---: | ---: |
| sentence | 1 | 1000 |
| note | 0 | 3 |

Project regressions (including all known gaps): 27/33.

See [manifest](../../data/coverage/manifest.json) for fixed sampling, license attribution, normalization and provisional weights; [machine report](baseline.json) for every failure, lexical miss, secondary candidate and source/category/length/name/number breakdown. Equal-source weighted scores are exploratory, not deployment estimates. No exclusions were applied, so all-submitted and pilot scores coincide.

## Construction audit

Inventory audited against [UD syntax](https://universaldependencies.org/u/overview/syntax.html), [English relations](https://universaldependencies.org/en/dep/) and pinned EWT/GUM annotation evidence. Annotation flags identify candidate dependencies, not a complete grammar diagnosis. Untested cells remain blocked.

| Dimension | Required cells | Status and evidence |
| --- | --- | --- |
| Communicative use | statements; yes/no questions; wh questions; requests; commands; greetings; replies; thanks; apologies; wishes; exclamations; fragments | blocked: cell-specific evidence required before support claim; baseline.json results and retained items.json UD annotations; project regressions cover a subset only |
| Noun phrases | articles; demonstratives; pronouns; names; possessives; singular/plural; count/mass; quantifiers; modifiers; coordination | blocked: cell-specific evidence required before support claim; baseline.json results and retained items.json UD annotations; project regressions cover a subset only |
| Predicates | copulas; existence; intransitive; transitive; ditransitive; required prepositions; adjective complements; noun complements; location complements; clause complements | blocked: cell-specific evidence required before support claim; baseline.json results and retained items.json UD annotations; project regressions cover a subset only |
| Verb features | person/number agreement; present; past; future; progressive; perfect; modals; negation; contractions; active/passive; auxiliary combinations | blocked: cell-specific evidence required before support claim; baseline.json results and retained items.json UD annotations; project regressions cover a subset only |
| Clause composition | coordination; subordination; relatives; conditionals; reported speech; embedded questions; infinitives; participles; ellipsis | blocked: cell-specific evidence required before support claim; baseline.json results and retained items.json UD annotations; project regressions cover a subset only |
| Surface variation | word order; optional modifiers; adverb positions; punctuation; apostrophes; quotation; regional spelling; casing; whitespace | blocked: cell-specific evidence required before support claim; baseline.json results and retained items.json UD annotations; project regressions cover a subset only |
| Message content | relationships; work; school; home; plans; travel; food; feelings; instructions; names; dates; times; quantities; multi-sentence conversations | blocked: cell-specific evidence required before support claim; baseline.json results and retained items.json UD annotations; project regressions cover a subset only |
| Interactions | perfect questions; negative modals; plural copulas; passive relatives; contractions in questions; names with possessives; numeric subject agreement | blocked: cell-specific evidence required before support claim; baseline.json results and retained items.json UD annotations; project regressions cover a subset only |
| Additional UD audit | apposition; parataxis; discourse markers; multiword expressions; dislocation; comparative clauses | blocked: cell-specific evidence required before support claim; baseline.json results and retained items.json UD annotations; project regressions cover a subset only |

## Measured backlog

Counts overlap: lexical and structural blockers can affect the same input. These are family-level triage candidates; agreement and ambiguity require targeted analysis, not inference from a generic parse error.

- clause structure: 1008 items (direct failures or annotated secondary candidates).
- UI: 1008 items (direct failures or annotated secondary candidates).
- missing word: 964 items (direct failures or annotated secondary candidates).
- punctuation: 507 items (direct failures or annotated secondary candidates).
- noun phrase: 491 items (direct failures or annotated secondary candidates).
- agreement: 365 items (direct failures or annotated secondary candidates).
- verb frame: 243 items (direct failures or annotated secondary candidates).

Dependencies: shared feature/verb-frame model → noun phrases and copulas → auxiliaries/questions → recursive clauses. Lexical form/role audit runs alongside each family. Punctuation/tokenization and composer continuation must preserve exact canonical round trips.

## Limits and owner review

This small convenience pilot uses workplace email and transcribed conversation rather than a representative contemporary personal-message sample. Document isolation is verified; unknown shared authors/threads remain a clustering risk. Notes are whole source documents, including long ones. No component sentence of a sampled note is separately counted.

The harness calls production parser, codec, draft analysis and suggestion APIs. It does not claim browser DOM/worker transport, latency, independent decoy grammaticality or every-key proof; those remain required later gates. Failed parse items retain null codec/decoy diagnostics and count as full-pipeline failures.

Owner review pending: confirm personal-message scope, equal-source pilot mix, normalization and treatment of typos/emoji/URLs/code/jargon. Inspect examples in items.json and baseline.json. Larger representative collection, category labeling, fresh human challenge batches and acceptance quotas remain outstanding.
